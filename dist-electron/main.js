import { app, ipcMain, BrowserWindow, dialog } from "electron";
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
app.whenReady().then(createMainWindow);
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
  const settingsFile = path.join(rootFolder, "settings.json");
  await fs.promises.mkdir(templatesDir, { recursive: true });
  await fs.promises.mkdir(dailyTasksDir, { recursive: true });
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
//# sourceMappingURL=main.js.map
