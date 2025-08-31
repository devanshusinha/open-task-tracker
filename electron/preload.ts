// The preload is compiled to CommonJS in development/build, so wrap the import
// logic in a dynamic require which works in both CJS and ESM transpilation.
(function () {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { contextBridge, ipcRenderer } = require("electron");

  contextBridge.exposeInMainWorld("api", {
    selectFolder: async (): Promise<{ folderPath: string } | null> => {
      return ipcRenderer.invoke("select-folder");
    },
    getSavedFolder: async (): Promise<string | null> => {
      return ipcRenderer.invoke("get-saved-folder");
    },
    listDailyTasks: async (): Promise<
      { fileName: string; fullPath: string }[]
    > => {
      return ipcRenderer.invoke("list-daily-tasks");
    },
    listTemplates: async (): Promise<
      { fileName: string; fullPath: string }[]
    > => {
      return ipcRenderer.invoke("list-templates");
    },
    readJsonFile: async (fullPath: string): Promise<any | null> => {
      return ipcRenderer.invoke("read-json-file", fullPath);
    },
    writeJsonFile: async (
      fullPath: string,
      data: unknown
    ): Promise<boolean> => {
      return ipcRenderer.invoke("write-json-file", { fullPath, data });
    },
  });
})();
