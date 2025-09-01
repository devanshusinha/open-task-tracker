import { app as f, Menu as y, ipcMain as u, BrowserWindow as v, dialog as S } from "electron";
import t from "node:path";
import a from "node:fs";
import { fileURLToPath as D } from "node:url";
const h = t.dirname(D(import.meta.url));
let d = null;
function b() {
  const s = t.join(process.cwd(), "build", "icon.png"), e = process.platform === "win32" || process.platform === "linux" ? s : void 0;
  if (d = new v({
    fullscreen: !1,
    backgroundColor: "#000000",
    show: !1,
    icon: e,
    // Use hidden inset titleBar on macOS so traffic lights float in content
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : void 0,
    trafficLightPosition: process.platform === "darwin" ? { x: 14, y: 14 } : void 0,
    webPreferences: {
      contextIsolation: !0,
      // When running un-packaged (during development), the compiled preload script
      // lives in the project-root/dist-electron folder. After the app is
      // packaged the preload will sit next to the compiled main.js inside the
      // app bundle, so we can reference it directly. Resolve accordingly so
      // the renderer always gets the preload script and therefore the
      // window.api bridge.
      preload: (() => {
        if (f.isPackaged)
          return t.join(h, "preload.js");
        const o = t.join(h, "../dist-electron/preload.js"), i = t.join(h, "preload.js");
        return a.existsSync(o) ? o : i;
      })()
    }
  }), process.platform === "darwin" && !f.isPackaged)
    try {
      f.dock.setIcon(s);
    } catch {
    }
  const n = process.env.VITE_DEV_SERVER_URL;
  if (n ? d.loadURL(n) : d.loadFile(t.join(h, "../dist/index.html")), !f.isPackaged)
    try {
      d.webContents.openDevTools({ mode: "detach" });
    } catch {
    }
  if (process.platform === "darwin")
    try {
      d.setTitleBarOverlay({
        color: "#00000000",
        symbolColor: "#FFFFFF",
        height: 48
      });
    } catch {
    }
  d.once("ready-to-show", () => {
    d?.maximize(), d?.show();
  }), d.on("closed", () => {
    d = null;
  });
}
f.whenReady().then(() => {
  if (b(), process.platform === "darwin") {
    const s = "Open Task Tracker", e = [
      {
        label: s,
        submenu: [
          {
            label: `About ${s}`,
            click: () => {
              try {
                d && d.webContents.send("open-about");
              } catch {
              }
            }
          },
          { type: "separator" },
          { role: "services", submenu: [] },
          { type: "separator" },
          { role: "hide", label: `Hide ${s}` },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit", label: `Quit ${s}` }
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
    ], n = y.buildFromTemplate(e);
    y.setApplicationMenu(n);
  }
});
f.setAboutPanelOptions?.({
  applicationName: "Open Task Tracker",
  applicationVersion: "0.0.1",
  version: "0.0.1",
  authors: ["Devanshu Sinha"],
  copyright: `© ${(/* @__PURE__ */ new Date()).getFullYear()} Devanshu Sinha`,
  website: ""
});
u.handle("app-info", async () => ({
  name: "Open Task Tracker",
  version: "0.0.1",
  author: "Devanshu Sinha"
}));
function F() {
  return t.join(f.getPath("userData"), "app-settings.json");
}
function p() {
  try {
    const s = F();
    if (!a.existsSync(s)) return {};
    const e = a.readFileSync(s, "utf-8");
    return JSON.parse(e);
  } catch {
    return {};
  }
}
function P(s) {
  try {
    const e = F();
    a.mkdirSync(t.dirname(e), { recursive: !0 }), a.writeFileSync(e, JSON.stringify(s, null, 2), "utf-8");
  } catch {
  }
}
async function x(s) {
  const e = t.join(s, "templates"), n = t.join(s, "daily tasks"), o = t.join(s, "backgrounds"), i = t.join(s, "settings.json");
  await a.promises.mkdir(e, { recursive: !0 }), await a.promises.mkdir(n, { recursive: !0 }), await a.promises.mkdir(o, { recursive: !0 });
  try {
    await a.promises.access(i, a.constants.F_OK);
  } catch {
    await a.promises.writeFile(i, `{}
`, "utf-8");
  }
}
u.handle("get-saved-folder", async () => (console.log("ipc:get-saved-folder"), p().selectedFolder ?? null));
u.handle("select-folder", async () => {
  if (console.log("ipc:select-folder invoked"), !d) return null;
  const s = await S.showOpenDialog(d, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (s.canceled || s.filePaths.length === 0) return null;
  const e = s.filePaths[0];
  try {
    await x(e);
  } catch {
  }
  const n = p();
  return P({ ...n, selectedFolder: e }), console.log("ipc:select-folder selected:", e), { folderPath: e };
});
u.handle("list-daily-tasks", async () => {
  const e = p().selectedFolder;
  if (!e) return [];
  const n = t.join(e, "daily tasks");
  try {
    return (await a.promises.readdir(n, {
      withFileTypes: !0
    })).filter((r) => r.isFile() && r.name.toLowerCase().endsWith(".json")).map((r) => ({
      fileName: r.name.replace(/\.json$/i, ""),
      fullPath: t.join(n, r.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-templates", async () => {
  const e = p().selectedFolder;
  if (!e) return [];
  const n = t.join(e, "templates");
  try {
    return (await a.promises.readdir(n, {
      withFileTypes: !0
    })).filter((r) => r.isFile() && r.name.toLowerCase().endsWith(".json")).map((r) => ({
      fileName: r.name.replace(/\.json$/i, ""),
      fullPath: t.join(n, r.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-backgrounds", async () => {
  const e = p().selectedFolder;
  if (!e)
    return [];
  const n = t.join(e, "backgrounds");
  try {
    const o = await a.promises.readdir(n, {
      withFileTypes: !0
    }), i = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"], r = o.filter(
      (l) => l.isFile() && i.includes(t.extname(l.name).toLowerCase())
    ).map((l) => t.join(n, l.name));
    return await Promise.all(
      r.map(async (l) => {
        try {
          const m = await a.promises.readFile(l), g = t.extname(l).toLowerCase(), w = g === ".png" ? "image/png" : g === ".gif" ? "image/gif" : g === ".webp" ? "image/webp" : g === ".svg" ? "image/svg+xml" : "image/jpeg", j = m.toString("base64"), k = `data:${w};base64,${j}`;
          return { fileName: t.basename(l), fullPath: l, url: k };
        } catch {
          return { fileName: t.basename(l), fullPath: l, url: "" };
        }
      })
    );
  } catch {
    return [];
  }
});
u.handle("get-background-data-url", async (s, e) => {
  try {
    const o = p().selectedFolder;
    if (!o) return null;
    const i = t.resolve(e), r = t.resolve(o);
    if (!i.startsWith(r)) return null;
    const c = t.extname(i).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(c)) return null;
    const m = await a.promises.readFile(i), g = c === ".png" ? "image/png" : c === ".gif" ? "image/gif" : c === ".webp" ? "image/webp" : c === ".svg" ? "image/svg+xml" : "image/jpeg", w = m.toString("base64");
    return `data:${g};base64,${w}`;
  } catch {
    return null;
  }
});
u.handle("read-root-settings", async () => {
  try {
    const e = p().selectedFolder;
    if (!e) return {};
    const n = t.join(e, "settings.json");
    try {
      const o = await a.promises.readFile(n, "utf-8");
      return JSON.parse(o);
    } catch {
      return {};
    }
  } catch {
    return {};
  }
});
u.handle(
  "write-root-settings",
  async (s, e) => {
    try {
      const o = p().selectedFolder;
      if (!o) return !1;
      const i = t.join(o, "settings.json");
      let r = {};
      try {
        const m = await a.promises.readFile(i, "utf-8");
        r = JSON.parse(m);
      } catch {
        r = {};
      }
      const c = { ...r, ...e ?? {} }, l = JSON.stringify(c, null, 2) + `
`;
      return await a.promises.writeFile(i, l, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
f.on("window-all-closed", () => {
  process.platform !== "darwin" && f.quit();
});
f.on("activate", () => {
  v.getAllWindows().length === 0 && b();
});
u.handle("read-json-file", async (s, e) => {
  try {
    const o = p().selectedFolder;
    if (!o) return null;
    const i = t.resolve(e), r = t.resolve(o);
    if (!i.startsWith(r) || !i.toLowerCase().endsWith(".json")) return null;
    const c = await a.promises.readFile(i, "utf-8");
    return JSON.parse(c);
  } catch {
    return null;
  }
});
u.handle(
  "write-json-file",
  async (s, e) => {
    try {
      if (!e || !e.fullPath) return !1;
      const { fullPath: n, data: o } = e, r = p().selectedFolder;
      if (!r) return !1;
      const c = t.resolve(n), l = t.resolve(r);
      if (!c.startsWith(l) || !c.toLowerCase().endsWith(".json")) return !1;
      const m = JSON.stringify(o, null, 2) + `
`;
      return await a.promises.writeFile(c, m, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
u.handle("delete-json-file", async (s, e) => {
  try {
    const o = p().selectedFolder;
    if (!o) return !1;
    const i = t.resolve(e), r = t.resolve(o);
    return !i.startsWith(r) || !i.toLowerCase().endsWith(".json") ? !1 : (await a.promises.unlink(i), !0);
  } catch {
    return !1;
  }
});
//# sourceMappingURL=main.js.map
