(function() {
  const { contextBridge: t, ipcRenderer: e } = require("electron");
  t.exposeInMainWorld("api", {
    selectFolder: async () => e.invoke("select-folder"),
    getSavedFolder: async () => e.invoke("get-saved-folder"),
    listDailyTasks: async () => e.invoke("list-daily-tasks"),
    listTemplates: async () => e.invoke("list-templates"),
    listBackgrounds: async () => e.invoke("list-backgrounds"),
    getBackgroundDataUrl: async (n) => e.invoke("get-background-data-url", n),
    readRootSettings: async () => e.invoke("read-root-settings"),
    writeRootSettings: async (n) => e.invoke("write-root-settings", n),
    readJsonFile: async (n) => e.invoke("read-json-file", n),
    writeJsonFile: async (n, r) => e.invoke("write-json-file", { fullPath: n, data: r }),
    deleteJsonFile: async (n) => e.invoke("delete-json-file", n)
  });
})();
//# sourceMappingURL=preload.js.map
