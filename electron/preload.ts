// The preload is compiled to CommonJS in development/build, so wrap the import
// logic in a dynamic require which works in both CJS and ESM transpilation.
(function () {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { contextBridge, ipcRenderer } = require("electron");

  contextBridge.exposeInMainWorld("api", {
    onOpenAbout: (handler: () => void) => {
      const channel = "open-about";
      const wrapped = () => handler();
      ipcRenderer.on(channel, wrapped);
      return () => ipcRenderer.removeListener(channel, wrapped);
    },
    getAppInfo: async (): Promise<{
      name: string;
      version: string;
      author: string;
    }> => {
      return ipcRenderer.invoke("app-info");
    },
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
    listBackgrounds: async (): Promise<
      { fileName: string; fullPath: string; url: string }[]
    > => {
      return ipcRenderer.invoke("list-backgrounds");
    },
    getBackgroundDataUrl: async (fullPath: string): Promise<string | null> => {
      return ipcRenderer.invoke("get-background-data-url", fullPath);
    },
    readRootSettings: async (): Promise<Record<string, unknown>> => {
      return ipcRenderer.invoke("read-root-settings");
    },
    writeRootSettings: async (
      partial: Record<string, unknown>
    ): Promise<boolean> => {
      return ipcRenderer.invoke("write-root-settings", partial);
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
    deleteJsonFile: async (fullPath: string): Promise<boolean> => {
      return ipcRenderer.invoke("delete-json-file", fullPath);
    },
    renameJsonFile: async (
      oldFullPath: string,
      newBaseName: string
    ): Promise<{ ok: boolean; newFullPath?: string } | false> => {
      return ipcRenderer.invoke("rename-json-file", {
        oldFullPath,
        newBaseName,
      });
    },
  });
})();
