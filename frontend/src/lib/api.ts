import type {
  CompareResult,
  EvidenceResult,
  Explanation,
  GeometryModel,
  MetaResponse,
  Preference,
  TaskResponse,
  WorkflowResult,
} from "@/types/api";

const API_BASE = "/api";

async function responseError(response: Response): Promise<Error> {
  const raw = await response.text();
  try {
    const payload = JSON.parse(raw) as { detail?: string; message?: string };
    const detail = payload.detail || payload.message;
    return new Error(detail ? `${detail}（HTTP ${response.status}）` : `请求失败（HTTP ${response.status}）`);
  } catch {
    return new Error(
      raw && !raw.trim().startsWith("<")
        ? `${raw}（HTTP ${response.status}）`
        : `服务暂时不可用（HTTP ${response.status}）`,
    );
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<T>;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const workbenchApi = {
  getMeta: () => request<MetaResponse>("/meta"),
  createTask: (body: { preference: Preference; budget: number; with_defect?: boolean }) =>
    post<TaskResponse>("/tasks", body),
  getModel: (taskId: string) => request<GeometryModel>(`/tasks/${taskId}/model`),
  fix: (taskId: string, body: { budget: number; mode: "A0" | "A1" | "A2" }) =>
    post<WorkflowResult>(`/tasks/${taskId}/fix`, body),
  compare: (taskId: string) => request<CompareResult>(`/tasks/${taskId}/compare`),
  getReport: (taskId: string) =>
    request<Record<string, unknown>>(`/tasks/${taskId}/report`),
  evidence: (taskId: string) => post<EvidenceResult>(`/tasks/${taskId}/evidence`),
  explain: (taskId: string) => post<Explanation>(`/tasks/${taskId}/explain`),
  createFromDrawing: async (
    file: File,
    options: { preference: Preference; budget: number; autoThreshold?: number },
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("preference", options.preference);
    form.append("budget", String(options.budget));
    form.append("auto_threshold", String(options.autoThreshold ?? 0.55));
    const response = await fetch(`${API_BASE}/tasks/from-drawing`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw await responseError(response);
    return response.json() as Promise<TaskResponse>;
  },
};
