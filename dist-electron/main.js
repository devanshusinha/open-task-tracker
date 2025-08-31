import { app as p, ipcMain as u, BrowserWindow as y, dialog as k } from "electron";
import t from "node:path";
import a from "node:fs";
import { fileURLToPath as S } from "node:url";
const w = t.dirname(S(import.meta.url));
let d = null;
function F() {
  const s = t.join(process.cwd(), "build", "icon.png"), e = process.platform === "win32" || process.platform === "linux" ? s : void 0;
  if (d = new y({
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
        if (p.isPackaged)
          return t.join(w, "preload.js");
        const r = t.join(w, "../dist-electron/preload.js"), o = t.join(w, "preload.js");
        return a.existsSync(r) ? r : o;
      })()
    }
  }), process.platform === "darwin" && !p.isPackaged)
    try {
      p.dock.setIcon(s);
    } catch {
    }
  const i = process.env.VITE_DEV_SERVER_URL;
  if (i ? d.loadURL(i) : d.loadFile(t.join(w, "../dist/index.html")), !p.isPackaged)
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
p.whenReady().then(F);
function v() {
  return t.join(p.getPath("userData"), "app-settings.json");
}
function f() {
  try {
    const s = v();
    if (!a.existsSync(s)) return {};
    const e = a.readFileSync(s, "utf-8");
    return JSON.parse(e);
  } catch {
    return {};
  }
}
function P(s) {
  try {
    const e = v();
    a.mkdirSync(t.dirname(e), { recursive: !0 }), a.writeFileSync(e, JSON.stringify(s, null, 2), "utf-8");
  } catch {
  }
}
async function x(s) {
  const e = t.join(s, "templates"), i = t.join(s, "daily tasks"), r = t.join(s, "backgrounds"), o = t.join(s, "settings.json");
  await a.promises.mkdir(e, { recursive: !0 }), await a.promises.mkdir(i, { recursive: !0 }), await a.promises.mkdir(r, { recursive: !0 });
  try {
    await a.promises.access(o, a.constants.F_OK);
  } catch {
    await a.promises.writeFile(o, `{}
`, "utf-8");
  }
}
u.handle("get-saved-folder", async () => (console.log("ipc:get-saved-folder"), f().selectedFolder ?? null));
u.handle("select-folder", async () => {
  if (console.log("ipc:select-folder invoked"), !d) return null;
  const s = await k.showOpenDialog(d, {
    properties: ["openDirectory", "createDirectory"]
  });
  if (s.canceled || s.filePaths.length === 0) return null;
  const e = s.filePaths[0];
  try {
    await x(e);
  } catch {
  }
  const i = f();
  return P({ ...i, selectedFolder: e }), console.log("ipc:select-folder selected:", e), { folderPath: e };
});
u.handle("list-daily-tasks", async () => {
  const e = f().selectedFolder;
  if (!e) return [];
  const i = t.join(e, "daily tasks");
  try {
    return (await a.promises.readdir(i, {
      withFileTypes: !0
    })).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".json")).map((n) => ({
      fileName: n.name.replace(/\.json$/i, ""),
      fullPath: t.join(i, n.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-templates", async () => {
  const e = f().selectedFolder;
  if (!e) return [];
  const i = t.join(e, "templates");
  try {
    return (await a.promises.readdir(i, {
      withFileTypes: !0
    })).filter((n) => n.isFile() && n.name.toLowerCase().endsWith(".json")).map((n) => ({
      fileName: n.name.replace(/\.json$/i, ""),
      fullPath: t.join(i, n.name)
    }));
  } catch {
    return [];
  }
});
u.handle("list-backgrounds", async () => {
  const e = f().selectedFolder;
  if (!e)
    return [];
  const i = t.join(e, "backgrounds");
  try {
    const r = await a.promises.readdir(i, {
      withFileTypes: !0
    }), o = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"], n = r.filter(
      (l) => l.isFile() && o.includes(t.extname(l.name).toLowerCase())
    ).map((l) => t.join(i, l.name));
    return await Promise.all(
      n.map(async (l) => {
        try {
          const g = await a.promises.readFile(l), m = t.extname(l).toLowerCase(), h = m === ".png" ? "image/png" : m === ".gif" ? "image/gif" : m === ".webp" ? "image/webp" : m === ".svg" ? "image/svg+xml" : "image/jpeg", j = g.toString("base64"), b = `data:${h};base64,${j}`;
          return { fileName: t.basename(l), fullPath: l, url: b };
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
    const r = f().selectedFolder;
    if (!r) return null;
    const o = t.resolve(e), n = t.resolve(r);
    if (!o.startsWith(n)) return null;
    const c = t.extname(o).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(c)) return null;
    const g = await a.promises.readFile(o), m = c === ".png" ? "image/png" : c === ".gif" ? "image/gif" : c === ".webp" ? "image/webp" : c === ".svg" ? "image/svg+xml" : "image/jpeg", h = g.toString("base64");
    return `data:${m};base64,${h}`;
  } catch {
    return null;
  }
});
u.handle("read-root-settings", async () => {
  try {
    const e = f().selectedFolder;
    if (!e) return {};
    const i = t.join(e, "settings.json");
    try {
      const r = await a.promises.readFile(i, "utf-8");
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
      const r = f().selectedFolder;
      if (!r) return !1;
      const o = t.join(r, "settings.json");
      let n = {};
      try {
        const g = await a.promises.readFile(o, "utf-8");
        n = JSON.parse(g);
      } catch {
        n = {};
      }
      const c = { ...n, ...e ?? {} }, l = JSON.stringify(c, null, 2) + `
`;
      return await a.promises.writeFile(o, l, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
p.on("window-all-closed", () => {
  process.platform !== "darwin" && p.quit();
});
p.on("activate", () => {
  y.getAllWindows().length === 0 && F();
});
u.handle("read-json-file", async (s, e) => {
  try {
    const r = f().selectedFolder;
    if (!r) return null;
    const o = t.resolve(e), n = t.resolve(r);
    if (!o.startsWith(n) || !o.toLowerCase().endsWith(".json")) return null;
    const c = await a.promises.readFile(o, "utf-8");
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
      const { fullPath: i, data: r } = e, n = f().selectedFolder;
      if (!n) return !1;
      const c = t.resolve(i), l = t.resolve(n);
      if (!c.startsWith(l) || !c.toLowerCase().endsWith(".json")) return !1;
      const g = JSON.stringify(r, null, 2) + `
`;
      return await a.promises.writeFile(c, g, "utf-8"), !0;
    } catch {
      return !1;
    }
  }
);
u.handle("delete-json-file", async (s, e) => {
  try {
    const r = f().selectedFolder;
    if (!r) return !1;
    const o = t.resolve(e), n = t.resolve(r);
    return !o.startsWith(n) || !o.toLowerCase().endsWith(".json") ? !1 : (await a.promises.unlink(o), !0);
  } catch {
    return !1;
  }
});
//# sourceMappingURL=main.js.map
