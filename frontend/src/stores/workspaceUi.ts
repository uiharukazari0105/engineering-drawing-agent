import { defineStore } from "pinia";
import { ref } from "vue";

export const useWorkspaceUiStore = defineStore(
  "workspace-ui",
  () => {
    const projectOpen = ref(true);
    const dockOpen = ref(false);
    const dockTab = ref("issues");

    return {
      projectOpen,
      dockOpen,
      dockTab,
    };
  },
  {
    persist: {
      key: "edm-workspace-ui-v1",
      storage: localStorage,
      pick: ["projectOpen", "dockOpen", "dockTab"],
    },
  },
);
