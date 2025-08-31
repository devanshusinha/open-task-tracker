(function() {
  const { contextBridge, ipcRenderer } = require("electron");
  contextBridge.exposeInMainWorld("api", {
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
    readJsonFile: async (fullPath) => {
      return ipcRenderer.invoke("read-json-file", fullPath);
    },
    writeJsonFile: async (fullPath, data) => {
      return ipcRenderer.invoke("write-json-file", { fullPath, data });
    }
  });
})();
//# sourceMappingURL=preload.js.map
