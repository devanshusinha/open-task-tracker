(function() {
  const { contextBridge: o, ipcRenderer: e } = require("electron");
  o.exposeInMainWorld("api", {
    onOpenAbout: (n) => {
      const t = "open-about", r = () => n();
      return e.on(t, r), () => e.removeListener(t, r);
    },
    getAppInfo: async () => e.invoke("app-info"),
    selectFolder: async () => e.invoke("select-folder"),
    getSavedFolder: async () => e.invoke("get-saved-folder"),
    listDailyTasks: async () => e.invoke("list-daily-tasks"),
    listTemplates: async () => e.invoke("list-templates"),
    listBackgrounds: async () => e.invoke("list-backgrounds"),
    getBackgroundDataUrl: async (n) => e.invoke("get-background-data-url", n),
    readRootSettings: async () => e.invoke("read-root-settings"),
    writeRootSettings: async (n) => e.invoke("write-root-settings", n),
    readJsonFile: async (n) => e.invoke("read-json-file", n),
    writeJsonFile: async (n, t) => e.invoke("write-json-file", { fullPath: n, data: t }),
    deleteJsonFile: async (n) => e.invoke("delete-json-file", n),
    renameJsonFile: async (n, t) => e.invoke("rename-json-file", {
      oldFullPath: n,
      newBaseName: t
    })
  });
})();
