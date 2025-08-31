import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const iconPathDev = path.join(process.cwd(), "build", "icon.png");

  // On Windows/Linux, BrowserWindow icon shows in title/taskbar. macOS ignores this and uses app bundle icon.
  const windowIcon =
    process.platform === "win32" || process.platform === "linux"
      ? iconPathDev
      : undefined;

  mainWindow = new BrowserWindow({
    fullscreen: false,
    backgroundColor: "#000000",
    show: false,
    icon: windowIcon,
    // Use hidden inset titleBar on macOS so traffic lights float in content
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    trafficLightPosition:
      process.platform === "darwin" ? { x: 14, y: 14 } : undefined,
    webPreferences: {
      contextIsolation: true,
      // When running un-packaged (during development), the compiled preload script
      // lives in the project-root/dist-electron folder. After the app is
      // packaged the preload will sit next to the compiled main.js inside the
      // app bundle, so we can reference it directly. Resolve accordingly so
      // the renderer always gets the preload script and therefore the
      // window.api bridge.
      preload: (() => {
        // Packaged: preload sits next to main.js inside the asar bundle
        if (app.isPackaged) {
          return path.join(__dirname, "preload.js");
        }

        // Development: the preload TS gets bundled into dist-electron/preload.js
        // relative to project root. However depending on whether Electron is
        // running the built JS or ts-node, __dirname can be either
        //   - <projectRoot>/electron             (when ts-node executes *.ts)
        //   - <projectRoot>/dist-electron        (when built JS is executed)
        // Try both locations and pick the first that exists.
        const devPath1 = path.join(__dirname, "../dist-electron/preload.js");
        const devPath2 = path.join(__dirname, "preload.js");
        return fs.existsSync(devPath1) ? devPath1 : devPath2;
      })(),
    },
  });

  // Set dock icon on macOS during development
  if (process.platform === "darwin" && !app.isPackaged) {
    try {
      app.dock.setIcon(iconPathDev);
    } catch {}
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
    } catch {}
  }

  // Enable titlebar overlay so the window controls render above the webview
  if (process.platform === "darwin") {
    try {
      mainWindow.setTitleBarOverlay({
        color: "#00000000",
        symbolColor: "#FFFFFF",
        height: 48,
      });
    } catch {}
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

// Simple app-level settings stored under userData
type AppSettings = {
  selectedFolder?: string;
};

function getAppSettingsPath(): string {
  return path.join(app.getPath("userData"), "app-settings.json");
}

function readAppSettings(): AppSettings {
  try {
    const filePath = getAppSettingsPath();
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as AppSettings;
  } catch {
    return {};
  }
}

function writeAppSettings(settings: AppSettings) {
  try {
    const filePath = getAppSettingsPath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
    // ignore
  }
}

async function ensureFolderStructure(rootFolder: string) {
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
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];

  try {
    await ensureFolderStructure(folderPath);
  } catch {
    // ignore creation errors but still return selection
  }

  const current = readAppSettings();
  writeAppSettings({ ...current, selectedFolder: folderPath });
  console.log("ipc:select-folder selected:", folderPath);
  return { folderPath };
});

ipcMain.handle("list-daily-tasks", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder) return [] as { fileName: string; fullPath: string }[];
  const tasksDir = path.join(rootFolder, "daily tasks");
  try {
    const entries = await fs.promises.readdir(tasksDir, {
      withFileTypes: true,
    });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
      .map((e) => ({
        fileName: e.name.replace(/\.json$/i, ""),
        fullPath: path.join(tasksDir, e.name),
      }));
    return files;
  } catch {
    return [] as { fileName: string; fullPath: string }[];
  }
});

ipcMain.handle("list-templates", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder) return [] as { fileName: string; fullPath: string }[];
  const templatesDir = path.join(rootFolder, "templates");
  try {
    const entries = await fs.promises.readdir(templatesDir, {
      withFileTypes: true,
    });
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
      .map((e) => ({
        fileName: e.name.replace(/\.json$/i, ""),
        fullPath: path.join(templatesDir, e.name),
      }));
    return files;
  } catch {
    return [] as { fileName: string; fullPath: string }[];
  }
});

ipcMain.handle("list-backgrounds", async () => {
  const settings = readAppSettings();
  const rootFolder = settings.selectedFolder;
  if (!rootFolder)
    return [] as { fileName: string; fullPath: string; url: string }[];
  const backgroundsDir = path.join(rootFolder, "backgrounds");
  try {
    const entries = await fs.promises.readdir(backgroundsDir, {
      withFileTypes: true,
    });
    const exts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
    const filePaths = entries
      .filter(
        (e) => e.isFile() && exts.includes(path.extname(e.name).toLowerCase())
      )
      .map((e) => path.join(backgroundsDir, e.name));

    const results = await Promise.all(
      filePaths.map(async (fullPath) => {
        try {
          const buf = await fs.promises.readFile(fullPath);
          const ext = path.extname(fullPath).toLowerCase();
          const mime =
            ext === ".png"
              ? "image/png"
              : ext === ".gif"
                ? "image/gif"
                : ext === ".webp"
                  ? "image/webp"
                  : ext === ".svg"
                    ? "image/svg+xml"
                    : "image/jpeg";
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
    return [] as { fileName: string; fullPath: string; url: string }[];
  }
});

ipcMain.handle("get-background-data-url", async (_evt, fullPath: string) => {
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
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".svg"
              ? "image/svg+xml"
              : "image/jpeg";
    const b64 = buf.toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
});

// Read settings.json stored inside the currently selected root folder
ipcMain.handle("read-root-settings", async () => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return {} as Record<string, unknown>;
    const settingsFile = path.join(rootFolder, "settings.json");
    try {
      const raw = await fs.promises.readFile(settingsFile, "utf-8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  } catch {
    return {} as Record<string, unknown>;
  }
});

// Merge and write settings.json inside the currently selected root folder
ipcMain.handle(
  "write-root-settings",
  async (
    _evt,
    partial: Record<string, unknown> | undefined
  ): Promise<boolean> => {
    try {
      const settings = readAppSettings();
      const rootFolder = settings.selectedFolder;
      if (!rootFolder) return false;
      const settingsFile = path.join(rootFolder, "settings.json");
      let current: Record<string, unknown> = {};
      try {
        const raw = await fs.promises.readFile(settingsFile, "utf-8");
        current = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        current = {};
      }
      const next = { ...current, ...(partial ?? {}) };
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

ipcMain.handle("read-json-file", async (_evt, fullPath: string) => {
  try {
    const settings = readAppSettings();
    const rootFolder = settings.selectedFolder;
    if (!rootFolder) return null;
    // Ensure path is within the selected root for safety
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
  async (
    _evt,
    args: { fullPath: string; data: unknown } | undefined
  ): Promise<boolean> => {
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

ipcMain.handle("delete-json-file", async (_evt, fullPath: string) => {
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
