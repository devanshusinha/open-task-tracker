(function() {
  const { contextBridge, ipcRenderer } = require("electron");
  contextBridge.exposeInMainWorld("api", {
    onOpenAbout: (handler) => {
      const channel = "open-about";
      const wrapped = () => handler();
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    },
    getAppInfo: async () => {
      return ipcRenderer.invoke("app-info");
    },
    selectFolder: async () => {
      return ipcRenderer.invoke("select-folder");
    },
    getSavedFolder: async () => {
      return ipcRenderer.invoke("get-saved-folder");
    },
    listDailyTasks: async () => {
      return ipcRenderer.invoke("list-daily-tasks");
    },
    listTemplates: async () => {
      return ipcRenderer.invoke("list-templates");
    },
    listBackgrounds: async () => {
      return ipcRenderer.invoke("list-backgrounds");
    },
    getBackgroundDataUrl: async (fullPath) => {
      return ipcRenderer.invoke("get-background-data-url", fullPath);
    },
    readRootSettings: async () => {
      return ipcRenderer.invoke("read-root-settings");
    },
    writeRootSettings: async (partial) => {
      return ipcRenderer.invoke("write-root-settings", partial);
    },
    readJsonFile: async (fullPath) => {
      return ipcRenderer.invoke("read-json-file", fullPath);
    },
    writeJsonFile: async (fullPath, data) => {
      return ipcRenderer.invoke("write-json-file", { fullPath, data });
    },
    deleteJsonFile: async (fullPath) => {
      return ipcRenderer.invoke("delete-json-file", fullPath);
    },
    renameJsonFile: async (oldFullPath, newBaseName) => {
      return ipcRenderer.invoke("rename-json-file", {
        oldFullPath,
        newBaseName
      });
    }
  });
})();
//# sourceMappingURL=preload.js.map
