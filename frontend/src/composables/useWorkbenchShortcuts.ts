import { onBeforeUnmount, onMounted } from "vue";
import { useWorkbenchStore } from "@/stores/workbench";

export function useWorkbenchShortcuts(options: { onFix: () => void; onOpen: () => void }) {
  const workbench = useWorkbenchStore();

  function handleKeydown(event: KeyboardEvent) {
    const modifier = event.ctrlKey || event.metaKey;
    const target = event.target as HTMLElement | null;
    const typing =
      target?.tagName === "INPUT" ||
      target?.tagName === "SELECT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable;
    if (typing || workbench.busy) return;

    if (modifier && event.key === "Enter") {
      event.preventDefault();
      void workbench.parseBlueprint();
      return;
    }
    if (modifier && event.key.toLowerCase() === "o") {
      event.preventDefault();
      options.onOpen();
      return;
    }
    if (!modifier && event.shiftKey && event.key === "Enter") {
      event.preventDefault();
      if (workbench.task && !workbench.result) options.onFix();
      return;
    }
    if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (workbench.result) void workbench.exportReport();
    }
  }

  onMounted(() => window.addEventListener("keydown", handleKeydown));
  onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
}
