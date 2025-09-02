import { app, Menu, ipcMain, BrowserWindow, shell, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
function createMainWindow() {
  const iconPathDev = path.join(process.cwd(), "build", "icon.png");
  const windowIcon = process.platform === "win32" || process.platform === "linux" ? iconPathDev : void 0;
  mainWindow = new BrowserWindow({
    fullscreen: false,
    backgroundColor: "#000000",
    show: false,
    icon: windowIcon,
    // Use hidden inset titleBar on macOS so traffic lights float in content
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : void 0,
    trafficLightPosition: process.platform === "darwin" ? { x: 14, y: 14 } : void 0,
    webPreferences: {
      contextIsolation: true,
      // When running un-packaged (during development), the compiled preload script
      // lives in the project-root/dist-electron folder. After the app is
      // packaged the preload will sit next to the compiled main.js inside the
      // app bundle, so we can reference it directly. Resolve accordingly so
      // the renderer always gets the preload script and therefore the
      // window.api bridge.
      preload: (() => {
        if (app.isPackaged) {
          return path.join(__dirname, "preload.js");
        }
        const devPath1 = path.join(__dirname, "../dist-electron/preload.js");
        const devPath2 = path.join(__dirname, "preload.js");
        return fs.existsSync(devPath1) ? devPath1 : devPath2;
      })()
    }
  });
  if (process.platform === "darwin" && !app.isPackaged) {
    try {
      app.dock.setIcon(iconPathDev);
    } catch {
    }
  }
  const pageUrl = process.env.VITE_DEV_SERVER_URL;
  if (pageUrl) {
    mainWindow.loadURL(pageUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  if (!app.isPackaged) {
    try {
      mainWindow.webContents.openDevTools({ mode: "detach" });
    } catch {
    }
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        shell.openExternal(url);
        return { action: "deny" };
      }
    } catch {
    }
    return { action: "deny" };
  });
  if (process.platform === "darwin") {
    try {
      mainWindow.setTitleBarOverlay({
        color: "#00000000",
        symbolColor: "#FFFFFF",
        height: 48
      });
    } catch {
    }
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
app.whenReady().then(() => {
  createMainWindow();
  if (process.platform === "darwin") {
    const appName = "Open Task Tracker";
    const template = [
      {
        label: appName,
        submenu: [
          {
            label: `About ${appName}`,
            click: () => {
              try {
                if (mainWindow) {
                  mainWindow.webContents.send("open-about");
                }
              } catch {
              }
            }
          },
          { type: "separator" },
          { role: "services", submenu: [] },
          { type: "separator" },
          { role: "hide", label: `Hide ${appName}` },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit", label: `Quit ${appName}` }
        ]
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "pasteAndMatchStyle" },
          { role: "delete" },
          { role: "selectAll" }
        ]
      },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      {
        label: "Window",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          { type: "separator" },
          { role: "front" },
          { role: "window" }
        ]
      },
      {
        role: "help",
        submenu: [
          {
            label: "Learn More",
            click: () => {
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
});
app.setAboutPanelOptions?.({
  applicationName: "Open Task Tracker",
  applicationVersion: "0.0.1",
  version: "0.0.1",
  authors: ["Devanshu Sinha"],
  copyright: `© ${(/* @__PURE__ */ new Date()).getFullYear()} Devanshu Sinha`,
  website: ""
});
ipcMain.handle("app-info", async () => {
  return {
    name: "Open Task Tracker",
    version: "0.0.1",
    author: "Devanshu Sinha"
  };
});
function getAppSettingsPath() {
  return path.join(app.getPath("userData"), "app-settings.json");
}
function readAppSettings() {
  try {
    const filePath = getAppSettingsPath();
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
function writeAppSettings(settings) {
  try {
    const filePath = getAppSettingsPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
  }
}
async function ensureFolderStructure(rootFolder) {
  const templatesDir = path.join(rootFolder, "templates");
  const dailyTasksDir = path.join(rootFolder, "daily tasks");
  const backgroundsDir = path.join(rootFolder, "backgrounds");
  const settingsFile = path.join(rootFolder, "settings.json");
  await fs.promises.mkdir(templatesDir, { recursive: true });
  await fs.promises.mkdir(dailyTasksDir, { recursive: true });
  await fs.promises.mkdir(backgroundsDir, { recursive: true });
  try {
    await fs.promises.access(settingsFile, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(settingsFile, "{}\n", "utf-8");
  }
}
ipcMain.handle("get-saved-folder", async () => {
  console.log("ipc:get-saved-folder");
  const settings = readAppSettings();
  return settings.selectedFolder ?? null;
});
ipcMain.handle("select-folder", async () => {
  console.log("ipc:select-folder invoked");
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  try {
    await ensureFolderStructure(folderPath);
  } catch {
  }
  const current = readAppSettings();
  writeAppSettings({ ...current, selectedFolder: folderPath });
  console.log("ipc:select-folder selected:", folderPath);
  return { folderPath };
});
ipcMain.handle("list-daily-tasks", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder) return [];
  const tasksDir = path.join(rootFolder, "daily tasks");
  try {
    const entries = await fs.promises.readdir(tasksDir, {
      withFileTypes: true
    });
    const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json")).map((e) => ({
      fileName: e.name.replace(/\.json$/i, ""),
      fullPath: path.join(tasksDir, e.name)
    }));
    return files;
  } catch {
    return [];
  }
});
ipcMain.handle("list-templates", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder) return [];
  const templatesDir = path.join(rootFolder, "templates");
  try {
    const entries = await fs.promises.readdir(templatesDir, {
      withFileTypes: true
    });
    const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json")).map((e) => ({
      fileName: e.name.replace(/\.json$/i, ""),
      fullPath: path.join(templatesDir, e.name)
    }));
    return files;
  } catch {
    return [];
  }
});
ipcMain.handle("list-backgrounds", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder)
    return [];
  const backgroundsDir = path.join(rootFolder, "backgrounds");
  try {
    const entries = await fs.promises.readdir(backgroundsDir, {
      withFileTypes: true
    });
    const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
    const filePaths = entries.filter(
      (e) => e.isFile() && exts.includes(path.extname(e.name).toLowerCase())
    ).map((e) => path.join(backgroundsDir, e.name));
    const results = await Promise.all(
      filePaths.map(async (fullPath) => {
        try {
          const buf = await fs.promises.readFile(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
          const b64 = buf.toString("base64");
          const url = `data:${mime};base64,${b64}`;
          return { fileName: path.basename(fullPath), fullPath, url };
        } catch {
          return { fileName: path.basename(fullPath), fullPath, url: "" };
        }
      })
    );
    return results;
  } catch {
    return [];
  }
});
ipcMain.handle("get-background-data-url", async (_evt, fullPath) => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return null;
    const resolved = path.resolve(fullPath);
    const resolvedRoot = path.resolve(rootFolder);
    if (!resolved.startsWith(resolvedRoot)) return null;
    const ext = path.extname(resolved).toLowerCase();
    const allowed = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
    if (!allowed.includes(ext)) return null;
    const buf = await fs.promises.readFile(resolved);
    const mime = ext === ".png" ? "image/png" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "image/jpeg";
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
});
ipcMain.handle("read-root-settings", async () => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return {};
    const settingsFile = path.join(rootFolder, "settings.json");
    try {
      const raw = await fs.promises.readFile(settingsFile, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  } catch {
    return {};
  }
});
ipcMain.handle(
  "write-root-settings",
  async (_evt, partial) => {
    try {
      const settings = readAppSettings();
      const rootFolder = settings.selectedFolder;
      if (!rootFolder) return false;
      const settingsFile = path.join(rootFolder, "settings.json");
      let current = {};
      try {
        const raw = await fs.promises.readFile(settingsFile, "utf-8");
        current = JSON.parse(raw);
      } catch {
        current = {};
      }
      const next = { ...current, ...partial ?? {} };
      const content = JSON.stringify(next, null, 2) + "\n";
      await fs.promises.writeFile(settingsFile, content, "utf-8");
      return true;
    } catch {
      return false;
    }
  }
);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
ipcMain.handle("read-json-file", async (_evt, fullPath) => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return null;
    const resolved = path.resolve(fullPath);
    const resolvedRoot = path.resolve(rootFolder);
    if (!resolved.startsWith(resolvedRoot)) return null;
    if (!resolved.toLowerCase().endsWith(".json")) return null;
    const raw = await fs.promises.readFile(resolved, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
});
ipcMain.handle(
  "write-json-file",
  async (_evt, args) => {
    try {
      if (!args || !args.fullPath) return false;
      const { fullPath, data } = args;
      const settings = readAppSettings();
      const rootFolder = settings.selectedFolder;
      if (!rootFolder) return false;
      const resolved = path.resolve(fullPath);
      const resolvedRoot = path.resolve(rootFolder);
      if (!resolved.startsWith(resolvedRoot)) return false;
      if (!resolved.toLowerCase().endsWith(".json")) return false;
      const content = JSON.stringify(data, null, 2) + "\n";
      await fs.promises.writeFile(resolved, content, "utf-8");
      return true;
    } catch {
      return false;
    }
  }
);
ipcMain.handle("delete-json-file", async (_evt, fullPath) => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return false;
    const resolved = path.resolve(fullPath);
    const resolvedRoot = path.resolve(rootFolder);
    if (!resolved.startsWith(resolvedRoot)) return false;
    if (!resolved.toLowerCase().endsWith(".json")) return false;
    await fs.promises.unlink(resolved);
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle(
  "rename-json-file",
  async (_evt, args) => {
    try {
      if (!args) return false;
      const { oldFullPath, newBaseName } = args;
      const settings = readAppSettings();
      const rootFolder = settings.selectedFolder;
      if (!rootFolder) return false;
      const resolvedOld = path.resolve(oldFullPath);
      const resolvedRoot = path.resolve(rootFolder);
      if (!resolvedOld.startsWith(resolvedRoot)) return false;
      if (!resolvedOld.toLowerCase().endsWith(".json")) return false;
      const dir = path.dirname(resolvedOld);
      const safeBase = newBaseName.trim().replace(/[\\\/:*?"<>|]/g, "").replace(/\s+/g, " ").slice(0, 120);
      if (!safeBase) return false;
      const target = path.join(dir, `${safeBase}.json`);
      if (path.basename(resolvedOld).toLowerCase() === `${safeBase}.json`.toLowerCase()) {
        return { ok: true, newFullPath: resolvedOld };
      }
      try {
        await fs.promises.access(target, fs.constants.F_OK);
        return { ok: false };
      } catch {
      }
      await fs.promises.rename(resolvedOld, target);
      return { ok: true, newFullPath: target };
    } catch {
      return false;
    }
  }
);
//# sourceMappingURL=main.js.map
