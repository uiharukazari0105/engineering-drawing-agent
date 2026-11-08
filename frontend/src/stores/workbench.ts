import { computed, markRaw, ref } from "vue";
import { defineStore } from "pinia";
import JSZip from "jszip";
import { workbenchApi } from "@/lib/api";
import { useToastStore } from "@/stores/toast";
import type {
  BusyState,
  CompareResult,
  Explanation,
  GeometryModel,
  MetaResponse,
  Preference,
  TaskResponse,
  WorkflowResult,
} from "@/types/api";

export interface WorkbenchDocument {
  id: string;
  title: string;
  task: TaskResponse;
  result: WorkflowResult | null;
  compare: CompareResult | null;
  geometry: GeometryModel | null;
  highlight: string[];
  explanation: Explanation | null;
  exportedAt: string | null;
  createdAt: string;
  folderId: string | null;
  sourceFile: Blob | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
}

export interface AssemblyFinding {
  level: "pass" | "warn" | "error";
  title: string;
  detail: string;
}

function holeFlagFrom(constraintId?: string | null) {
  const match = (constraintId || "").match(/^c_h(\d+)_inside$/);
  return match ? `hole_h${match[1]}` : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export const useWorkbenchStore = defineStore("workbench", () => {
  const toast = useToastStore();
  const preference = ref<Preference>("auto");
  const budget = ref(5);
  const file = ref<File | null>(null);
  const meta = ref<MetaResponse | null>(null);
  const busy = ref<BusyState>(null);
  const error = ref<string | null>(null);
  const documents = ref<WorkbenchDocument[]>([]);
  const folders = ref<ProjectFolder[]>([]);
  const activeDocumentId = ref<string | null>(null);
  const activeFolderId = ref<string | null>(null);
  const requestSequence = ref(0);

  const activeDocument = computed(
    () => documents.value.find((document) => document.id === activeDocumentId.value) ?? null,
  );
  const task = computed(() => activeDocument.value?.task ?? null);
  const result = computed(() => activeDocument.value?.result ?? null);
  const compare = computed(() => activeDocument.value?.compare ?? null);
  const geometry = computed(() => activeDocument.value?.geometry ?? null);
  const highlight = computed(() => activeDocument.value?.highlight ?? []);
  const explanation = computed(() => activeDocument.value?.explanation ?? null);
  const exportedAt = computed(() => activeDocument.value?.exportedAt ?? null);
  const issues = computed(() => result.value?.issues ?? task.value?.issues ?? []);
  const pendingCount = computed(
    () => result.value?.pending_confirmation.length ?? task.value?.parse.pending.length ?? 0,
  );
  const pageState = computed(() => {
    if (busy.value) return "执行中";
    if (result.value) return result.value.state === "DONE" ? "验证完成" : "待人工处理";
    return task.value ? "等待修复" : "待启动";
  });
  const pageTone = computed(() => {
    if (busy.value) return "running";
    if (result.value) return result.value.state === "DONE" ? "done" : "warn";
    return "idle";
  });
  const stage = computed(() => (compare.value ? 3 : result.value ? 2 : task.value ? 1 : 0));

  const assemblyReadyDocuments = computed(() =>
    documents.value.filter((document) => document.geometry),
  );
  const assemblyFindings = computed<AssemblyFinding[]>(() => {
    const parts = assemblyReadyDocuments.value;
    if (parts.length < 2) {
      return [
        {
          level: "warn",
          title: "组合样本不足",
          detail: "至少需要两份已生成几何的图纸才能执行零件组合检查。",
        },
      ];
    }

    const findings: AssemblyFinding[] = [];
    const geometries = parts.map((part) => ({
      title: part.title,
      geometry: part.geometry!,
    }));
    const thicknessValues = new Set(
      geometries.map((item) => item.geometry.bbox.height.toFixed(3)),
    );
    if (thicknessValues.size > 1) {
      findings.push({
        level: "warn",
        title: "板厚不一致",
        detail: geometries
          .map((item) => `${item.title}: ${item.geometry.bbox.height} mm`)
          .join("；"),
      });
    }

    const diameterValues = new Set(
      geometries.flatMap((item) =>
        item.geometry.holes
          .map((hole) => hole.d?.toFixed(3))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    if (diameterValues.size > 1) {
      findings.push({
        level: "warn",
        title: "孔径规格不一致",
        detail: `检测到 ${diameterValues.size} 种孔径：${[...diameterValues].join(" / ")} mm`,
      });
    }

    const holeCounts = new Set(geometries.map((item) => item.geometry.hole_count));
    if (holeCounts.size > 1) {
      findings.push({
        level: "warn",
        title: "孔数模式不一致",
        detail: geometries.map((item) => `${item.title}: ${item.geometry.hole_count} 孔`).join("；"),
      });
    }

    if (!findings.length) {
      findings.push({
        level: "pass",
        title: "基础组合接口一致",
        detail: `已核对 ${parts.length} 个零件的板厚、孔径与孔数模式，未发现基础冲突。`,
      });
    }
    return findings;
  });

  function selectDocument(id: string) {
    if (documents.value.some((document) => document.id === id)) activeDocumentId.value = id;
  }

  function closeDocument(id: string) {
    const index = documents.value.findIndex((document) => document.id === id);
    if (index < 0) return;
    documents.value.splice(index, 1);
    if (activeDocumentId.value === id) {
      activeDocumentId.value =
        documents.value[Math.max(0, index - 1)]?.id ?? documents.value[0]?.id ?? null;
    }
  }

  function createFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const folder: ProjectFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
    };
    folders.value.push(folder);
    activeFolderId.value = folder.id;
    return folder.id;
  }

  function selectFolder(id: string | null) {
    activeFolderId.value = id;
  }

  function moveDocument(documentId: string, folderId: string | null) {
    const document = documents.value.find((item) => item.id === documentId);
    if (document) document.folderId = folderId;
  }

  function updateActiveDocument(patch: Partial<WorkbenchDocument>) {
    const index = documents.value.findIndex((document) => document.id === activeDocumentId.value);
    if (index >= 0) {
      documents.value[index] = { ...documents.value[index]!, ...patch };
    }
  }

  async function loadMeta() {
    try {
      meta.value = await workbenchApi.getMeta();
    } catch {
      meta.value = null;
    }
  }

  async function appendTask(
    response: TaskResponse,
    title: string,
    sourceFile: Blob | null = null,
  ) {
    let geometry: GeometryModel | null = null;
    try {
      geometry = await workbenchApi.getModel(response.task_id);
    } catch {
      geometry = null;
    }
    const document: WorkbenchDocument = {
      id: response.task_id,
      title,
      task: response,
      result: null,
      compare: null,
      geometry,
      highlight: response.issues
        .map((issue) => holeFlagFrom(issue.constraint_id))
        .filter((value): value is string => Boolean(value)),
      explanation: null,
      exportedAt: null,
      createdAt: new Date().toISOString(),
      folderId: activeFolderId.value,
      sourceFile: sourceFile ? markRaw(sourceFile) : null,
    };
    const existingIndex = documents.value.findIndex((item) => item.id === response.task_id);
    if (existingIndex >= 0) {
      documents.value[existingIndex] = document;
    } else {
      documents.value.push(document);
    }
    activeDocumentId.value = response.task_id;
    file.value = null;
  }

  async function parseBlueprint() {
    const sequence = ++requestSequence.value;
    busy.value = "parse";
    error.value = null;
    try {
      const response = await workbenchApi.createTask({
        preference: preference.value,
        budget: budget.value,
      });
      if (sequence !== requestSequence.value) return;
      await appendTask(response, `内置图样 ${documents.value.length + 1}`);
      toast.push({
        tone: "ok",
        title: "图纸已解析",
        description: `预算 ${budget.value} 步 · 模式 ${preference.value}`,
      });
    } catch (caught) {
      if (sequence !== requestSequence.value) return;
      error.value = errorMessage(caught);
      toast.push({ tone: "err", title: "解析失败", description: error.value });
    } finally {
      if (sequence === requestSequence.value) busy.value = null;
    }
  }

  async function parseDrawing(selectedFile = file.value) {
    if (!selectedFile) return;
    const sequence = ++requestSequence.value;
    busy.value = "parse";
    error.value = null;
    try {
      const response = await workbenchApi.createFromDrawing(selectedFile, {
        preference: preference.value,
        budget: budget.value,
      });
      if (sequence !== requestSequence.value) return;
      await appendTask(response, selectedFile.name, selectedFile);
      toast.push({
        tone: "ok",
        title: "图纸文件已解析",
        description: selectedFile.name,
      });
    } catch (caught) {
      if (sequence !== requestSequence.value) return;
      error.value = errorMessage(caught);
      toast.push({ tone: "err", title: "图纸解析失败", description: error.value });
    } finally {
      if (sequence === requestSequence.value) busy.value = null;
    }
  }

  async function runFix() {
    if (!task.value || busy.value) return;
    busy.value = "fix";
    error.value = null;
    updateActiveDocument({ explanation: null, exportedAt: null });
    const mode = preference.value === "auto" ? "A0" : preference.value === "manual" ? "A2" : "A1";
    try {
      const value = await workbenchApi.fix(task.value.task_id, {
        budget: budget.value,
        mode,
      });
      let nextGeometry = activeDocument.value?.geometry ?? null;
      let nextCompare: CompareResult | null = null;
      try {
        nextGeometry = await workbenchApi.getModel(task.value.task_id);
      } catch {
        nextGeometry = null;
      }
      try {
        nextCompare = await workbenchApi.compare(task.value.task_id);
      } catch {
        nextCompare = null;
      }
      updateActiveDocument({ result: value, geometry: nextGeometry, compare: nextCompare });
      const done = value.state === "DONE";
      toast.push({
        tone: done ? "ok" : "warn",
        title: done ? "修复闭环完成" : "部分问题待人工确认",
        description: done
          ? `成功修复 ${value.resolved} 处 · 预算 ${value.budget.used}/${value.budget.total}`
          : `剩余 ${value.remaining.length} 项 · 待确认 ${value.pending_confirmation.length} 项`,
      });
    } catch (caught) {
      error.value = errorMessage(caught);
      toast.push({ tone: "err", title: "修复失败", description: error.value });
    } finally {
      busy.value = null;
    }
  }

  async function exportReport() {
    if (!task.value || busy.value) return;
    busy.value = "export";
    try {
      const [report, evidence] = await Promise.all([
        workbenchApi.getReport(task.value.task_id),
        workbenchApi.evidence(task.value.task_id).catch(() => null),
      ]);
      const payload = evidence ? { ...report, evidence } : report;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${task.value.task_id}-report.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      updateActiveDocument({ exportedAt: new Date().toISOString() });
      toast.push({
        tone: "ok",
        title: "报告已导出",
        description: evidence?.verification
          ? `证据包校验：${evidence.verification.all_ok ? "通过" : "失败"}`
          : "包含审查与修复记录",
      });
    } catch (caught) {
      toast.push({ tone: "err", title: "导出失败", description: errorMessage(caught) });
    } finally {
      busy.value = null;
    }
  }

  async function explainWorkflow() {
    if (!task.value || !result.value || busy.value) return null;
    busy.value = "explain";
    try {
      const value = await workbenchApi.explain(task.value.task_id);
      updateActiveDocument({ explanation: value });
      toast.push({
        tone: "ok",
        title: "过程说明已生成",
        description: value.source === "llm" ? "由已配置模型生成" : "由确定性结果生成",
      });
      return value;
    } catch (caught) {
      toast.push({ tone: "err", title: "说明生成失败", description: errorMessage(caught) });
      return null;
    } finally {
      busy.value = null;
    }
  }

  function setHighlight(value: string[]) {
    updateActiveDocument({ highlight: value });
  }

  async function exportProject() {
    const zip = new JSZip();
    const serializedDocuments = documents.value.map((document) => {
      const archiveFilename = document.title.replace(/[^\w.\-]+/g, "_");
      const archivePath = document.sourceFile
        ? `drawings/${document.id}/${archiveFilename}`
        : null;
      const { sourceFile: _sourceFile, ...serializable } = document;
      return { ...serializable, archivePath };
    });
    const metadata = {
      format: "edm-project",
      version: 1,
      project: {
        id: "EDM-01",
        name: "EDM-01",
        savedAt: new Date().toISOString(),
      },
      folders: folders.value,
      activeFolderId: activeFolderId.value,
      activeDocumentId: activeDocumentId.value,
      documents: serializedDocuments,
    };
    zip.file("project.json", JSON.stringify(metadata, null, 2));

    for (const document of documents.value) {
      if (!document.sourceFile) continue;
      const filename = document.title.replace(/[^\w.\-]+/g, "_");
      zip.file(`drawings/${document.id}/${filename}`, await document.sourceFile.arrayBuffer());
    }

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const date = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
    }).format(new Date());
    anchor.download = `EDM-01-project-${date}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.push({
      tone: "ok",
      title: "工程已保存",
      description: `${documents.value.length} 份图纸 · ZIP + project.json`,
    });
  }

  async function importProject(file: File) {
    try {
      const zip = await JSZip.loadAsync(file);
      const metadataFile = zip.file("project.json");
      if (!metadataFile) throw new Error("压缩包缺少 project.json");
      const metadata = JSON.parse(await metadataFile.async("string")) as {
        format?: string;
        version?: number;
        folders?: ProjectFolder[];
        activeFolderId?: string | null;
        activeDocumentId?: string | null;
        documents?: Array<Omit<WorkbenchDocument, "sourceFile"> & { archivePath?: string | null }>;
      };
      if (metadata.format !== "edm-project" || metadata.version !== 1) {
        throw new Error("工程文件版本不受支持");
      }

      const restored = await Promise.all(
        (metadata.documents ?? []).map(async (item) => {
          let sourceFile: Blob | null = null;
          if (item.archivePath) {
            const archiveFile = zip.file(item.archivePath);
            if (archiveFile) sourceFile = markRaw(await archiveFile.async("blob"));
          }
          const { archivePath: _archivePath, ...document } = item;
          return { ...document, sourceFile } as WorkbenchDocument;
        }),
      );
      documents.value = restored;
      folders.value = metadata.folders ?? [];
      activeFolderId.value = metadata.activeFolderId ?? null;
      activeDocumentId.value =
        metadata.activeDocumentId ?? restored[0]?.id ?? null;
      toast.push({
        tone: "ok",
        title: "工程已读取",
        description: `${restored.length} 份图纸 · ${folders.value.length} 个文件夹`,
      });
    } catch (caught) {
      toast.push({
        tone: "err",
        title: "工程读取失败",
        description: errorMessage(caught),
      });
    }
  }

  return {
    preference,
    budget,
    file,
    meta,
    busy,
    error,
    documents,
    folders,
    activeDocumentId,
    activeFolderId,
    activeDocument,
    task,
    result,
    compare,
    geometry,
    highlight,
    explanation,
    exportedAt,
    issues,
    pendingCount,
    pageState,
    pageTone,
    stage,
    assemblyReadyDocuments,
    assemblyFindings,
    loadMeta,
    parseBlueprint,
    parseDrawing,
    runFix,
    exportReport,
    explainWorkflow,
    setHighlight,
    selectDocument,
    closeDocument,
    createFolder,
    selectFolder,
    moveDocument,
    exportProject,
    importProject,
  };
}, {
  persist: {
    key: "edm-workbench-progress-v1",
    storage: localStorage,
    pick: [
      "preference",
      "budget",
      "documents",
      "folders",
      "activeDocumentId",
      "activeFolderId",
    ],
    serializer: {
      serialize: (state) =>
        JSON.stringify(state, (key, value) => (key === "sourceFile" ? undefined : value)),
      deserialize: (value) => {
        const state = JSON.parse(value) as {
          documents?: Array<Record<string, unknown>>;
        };
        state.documents = (state.documents ?? []).map((document) => ({
          ...document,
          sourceFile: null,
        }));
        return state;
      },
    },
  },
});
