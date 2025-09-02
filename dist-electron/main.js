import { app as m, Menu as y, ipcMain as u, BrowserWindow as v, shell as S, dialog as P } from "electron";
import t from "node:path";
import i from "node:fs";
import { fileURLToPath as O } from "node:url";
const w = t.dirname(O(import.meta.url));
let d = null;
function F() {
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
        if (m.isPackaged)
          return t.join(w, "preload.js");
        const r = t.join(w, "../dist-electron/preload.js"), a = t.join(w, "preload.js");
        return i.existsSync(r) ? r : a;
      })()
    }
  }), process.platform === "darwin" && !m.isPackaged)
    try {
      m.dock.setIcon(s);
    } catch {
    }
  const o = process.env.VITE_DEV_SERVER_URL;
  if (o ? d.loadURL(o) : d.loadFile(t.join(w, "../dist/index.html")), !m.isPackaged)
    try {
      d.webContents.openDevTools({ mode: "detach" });
    } catch {
    }
  if (d.webContents.setWindowOpenHandler(({ url: r }) => {
    try {
      if (r.startsWith("http://") || r.startsWith("https://"))
        return S.openExternal(r), { action: "deny" };
    } catch {
    }
    return { action: "deny" };
  }), process.platform === "darwin")
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
m.whenReady().then(() => {
  if (F(), process.platform === "darwin") {
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
    ], o = y.buildFromTemplate(e);
    y.setApplicationMenu(o);
  }
});
m.setAboutPanelOptions?.({
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
function b() {
  return t.join(m.getPath("userData"), "app-settings.json");
}
function p() {
  try {
    const s = b();
    if (!i.existsSync(s)) return {};
    const e = i.readFileSync(s, "utf-8");
    return JSON.parse(e);
  } catch {
    return {};
  }
}
function W(s) {
  try {
    const e = b();
    i.mkdirSync(t.dirname(e), { recursive: !0 }), i.writeFileSync(e, JSON.stringify(s, null, 2), "utf-8");
  } catch {
  }
}
async function D(s) {
  const e = t.join(s, "templates"), o = t.join(s, "daily tasks"), r = t.join(s, "backgrounds"), a = t.join(s, "settings.json");
  await i.promises.mkdir(e, { recursive: !0 }), await i.promises.mkdir(o, { recursive: !0 }), await i.promises.mkdir(r, { recursive: !0 });
  try {
    await i.promises.access(a, i.constants.F_OK);
  } catch {
    await i.promises.writeFile(a, `{}
`, "utf-8");
  }
}
u.handle("get-saved-folder", async () => (console.log("ipc:get-saved-folder"), p().selectedFolder ?? null));
u.handle("select-folder", async () => {
  if (console.log("ipc:select-folder invoked"), !d) return null;
  const s = await P.showOpenDialog(d, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (s.canceled || s.filePaths.length === 0) return null;
  const e = s.filePaths[0];
  try {
    await D(e);
  } catch {
  }
  const o = p();
  return W({ ...o, selectedFolder: e }), console.log("ipc:select-folder selected:", e), { folderPath: e };
});
u.handle("list-daily-tasks", async () => {
  const e = p().selectedFolder;
  if (!e) return [];
  const o = t.join(e, "daily tasks");
  try {
    return (await i.promises.readdir(o, {
      withFileTypes: !0
    })).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".json")).map((n) => ({
      fileName: n.name.replace(/\.json$/i, ""),
      fullPath: t.join(o, n.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-templates", async () => {
  const e = p().selectedFolder;
  if (!e) return [];
  const o = t.join(e, "templates");
  try {
    return (await i.promises.readdir(o, {
      withFileTypes: !0
    })).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".json")).map((n) => ({
      fileName: n.name.replace(/\.json$/i, ""),
      fullPath: t.join(o, n.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-backgrounds", async () => {
  const e = p().selectedFolder;
  if (!e)
    return [];
  const o = t.join(e, "backgrounds");
  try {
    const r = await i.promises.readdir(o, {
      withFileTypes: !0
    }), a = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"], n = r.filter(
      (c) => c.isFile() && a.includes(t.extname(c.name).toLowerCase())
    ).map((c) => t.join(o, c.name));
    return await Promise.all(
      n.map(async (c) => {
        try {
          const g = await i.promises.readFile(c), f = t.extname(c).toLowerCase(), h = f === ".png" ? "image/png" : f === ".gif" ? "image/gif" : f === ".webp" ? "image/webp" : f === ".svg" ? "image/svg+xml" : "image/jpeg", j = g.toString("base64"), k = `data:${h};base64,${j}`;
          return { fileName: t.basename(c), fullPath: c, url: k };
        } catch {
          return { fileName: t.basename(c), fullPath: c, url: "" };
        }
      })
    );
  } catch {
    return [];
  }
});
u.handle("get-background-data-url", async (s, e) => {
  try {
    const r = p().selectedFolder;
    if (!r) return null;
    const a = t.resolve(e), n = t.resolve(r);
    if (!a.startsWith(n)) return null;
    const l = t.extname(a).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(l)) return null;
    const g = await i.promises.readFile(a), f = l === ".png" ? "image/png" : l === ".gif" ? "image/gif" : l === ".webp" ? "image/webp" : l === ".svg" ? "image/svg+xml" : "image/jpeg", h = g.toString("base64");
    return `data:${f};base64,${h}`;
  } catch {
    return null;
  }
});
u.handle("read-root-settings", async () => {
  try {
    const e = p().selectedFolder;
    if (!e) return {};
    const o = t.join(e, "settings.json");
    try {
      const r = await i.promises.readFile(o, "utf-8");
      return JSON.parse(r);
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
      const r = p().selectedFolder;
      if (!r) return !1;
      const a = t.join(r, "settings.json");
      let n = {};
      try {
        const g = await i.promises.readFile(a, "utf-8");
        n = JSON.parse(g);
      } catch {
        n = {};
      }
      const l = { ...n, ...e ?? {} }, c = JSON.stringify(l, null, 2) + `
`;
      return await i.promises.writeFile(a, c, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
m.on("window-all-closed", () => {
  process.platform !== "darwin" && m.quit();
});
m.on("activate", () => {
  v.getAllWindows().length === 0 && F();
});
u.handle("read-json-file", async (s, e) => {
  try {
    const r = p().selectedFolder;
    if (!r) return null;
    const a = t.resolve(e), n = t.resolve(r);
    if (!a.startsWith(n) || !a.toLowerCase().endsWith(".json")) return null;
    const l = await i.promises.readFile(a, "utf-8");
    return JSON.parse(l);
  } catch {
    return null;
  }
});
u.handle(
  "write-json-file",
  async (s, e) => {
    try {
      if (!e || !e.fullPath) return !1;
      const { fullPath: o, data: r } = e, n = p().selectedFolder;
      if (!n) return !1;
      const l = t.resolve(o), c = t.resolve(n);
      if (!l.startsWith(c) || !l.toLowerCase().endsWith(".json")) return !1;
      const g = JSON.stringify(r, null, 2) + `
`;
      return await i.promises.writeFile(l, g, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
u.handle("delete-json-file", async (s, e) => {
  try {
    const r = p().selectedFolder;
    if (!r) return !1;
    const a = t.resolve(e), n = t.resolve(r);
    return !a.startsWith(n) || !a.toLowerCase().endsWith(".json") ? !1 : (await i.promises.unlink(a), !0);
  } catch {
    return !1;
  }
});
u.handle(
  "rename-json-file",
  async (s, e) => {
    try {
      if (!e) return !1;
      const { oldFullPath: o, newBaseName: r } = e, n = p().selectedFolder;
      if (!n) return !1;
      const l = t.resolve(o), c = t.resolve(n);
      if (!l.startsWith(c) || !l.toLowerCase().endsWith(".json")) return !1;
      const g = t.dirname(l), f = r.trim().replace(/[\\\/:*?"<>|]/g, "").replace(/\s+/g, " ").slice(0, 120);
      if (!f) return !1;
      const h = t.join(g, `${f}.json`);
      if (t.basename(l).toLowerCase() === `${f}.json`.toLowerCase())
        return { ok: !0, newFullPath: l };
      try {
        return await i.promises.access(h, i.constants.F_OK), { ok: !1 };
      } catch {
      }
      return await i.promises.rename(l, h), { ok: !0, newFullPath: h };
    } catch {
      return !1;
    }
  }
);
