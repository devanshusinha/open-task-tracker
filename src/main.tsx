import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import "./styles.css";
import { motion, AnimatePresence } from "framer-motion";
import "./lib/utils";
import Checkbox from "./components/Checkbox";
import {
  ChevronLeft,
  ChevronRight,
  PanelsTopLeft,
  Folder,
  Hash,
  ChevronDown,
  X,
  Plus,
  LayoutGrid,
  History,
  FilePlus,
  Image as ImageIcon,
  Info,
  Pencil,
} from "lucide-react";
import { TrashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
const aboutIconUrl = new URL("../build/icon.png", import.meta.url).href;
const AboutContent: React.FC = () => {
  const [info, setInfo] = useState<{
    name: string;
    version: string;
    author: string;
  } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const v = await (window as any)?.api?.getAppInfo?.();
        if (v) setInfo(v);
      } catch {}
    })();
  }, []);
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -top-28 -right-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-500/30 via-cyan-400/25 to-emerald-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400/30 via-cyan-400/25 to-blue-500/30 blur-3xl" />

      <div className="relative z-10 flex items-start gap-4">
        <img
          src={aboutIconUrl}
          alt="Open Task Tracker icon"
          className="h-12 w-12 rounded-xl border border-white/10 shadow"
          draggable={false}
        />
        <div>
          <div className="text-lg font-semibold tracking-tight">
            {info?.name ?? "Open Task Tracker"}
          </div>
          <div className="text-xs text-muted-foreground">
            Version {info?.version ?? "0.0.1"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            By {info?.author ?? "Devanshu Sinha"}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm leading-relaxed text-foreground/90">
        A fully open source task tracker
      </div>

      <div className="mt-4 text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Devanshu Sinha. All rights reserved.
      </div>
    </div>
  );
};

const RecycleIcon: React.FC<{ className?: string; title?: string }> = ({
  className,
  title,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="1.5"
    stroke="currentColor"
    className={className}
    aria-hidden={!title}
    role={title ? "img" : undefined}
  >
    {title ? <title>{title}</title> : null}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

type SubTask = {
  id: string;
  name: string;
  description: string;
  notes?: string | null;
  isComplete?: boolean;
  createdAt: string;
  updatedAt: string;
  templateSubTaskId: string;
};

type TaskItem = {
  id: string;
  name: string;
  templateTaskId: string;
  description: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  isComplete?: boolean;
  recycle?: boolean;
  subTasks: SubTask[];
};

type TaskGroup = {
  id: string;
  name: string;
  templateTaskGroupId: string;
  description: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tasks: TaskItem[];
};

type TaskDocument = {
  type: "task" | "template";
  id: string;
  name: string;
  description: string;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  taskGroups: TaskGroup[];
};

const GlobalRainbowCaret: React.FC<{ active?: boolean }> = ({
  active = false,
}) => {
  const [caret, setCaret] = useState<{
    visible: boolean;
    top: number;
    left: number;
    height: number;
  }>({ visible: false, top: 0, left: 0, height: 16 });
  const rafRef = useRef<number | null>(null);

  const updateCaret = () => {
    try {
      if (!active) {
        if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
        return;
      }
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        !activeEl ||
        !activeEl.isContentEditable ||
        !activeEl.classList.contains("rainbow-caret-hidden-caret")
      ) {
        if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
        return;
      }
      let range = selection.getRangeAt(0);
      if (!selection.isCollapsed) {
        try {
          const focusNode = selection.focusNode as Node | null;
          const focusOffset = selection.focusOffset ?? 0;
          if (focusNode) {
            const caretRange = document.createRange();
            caretRange.setStart(focusNode, Math.max(0, focusOffset));
            caretRange.setEnd(focusNode, Math.max(0, focusOffset));
            range = caretRange;
          }
        } catch {}
      }
      const anchorNode = selection.anchorNode as Node | null;
      let nodeElement: Element | null = null;
      if (anchorNode) {
        nodeElement =
          anchorNode.nodeType === 1
            ? (anchorNode as Element)
            : (anchorNode.parentElement as Element | null);
      }
      const host = nodeElement?.closest(
        ".rainbow-caret-hidden-caret"
      ) as HTMLElement | null;
      if (!host) {
        if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
        return;
      }
      const rects = range.getClientRects();
      let rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
      let usedFallback = false;
      if (!rect) {
        if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
        return;
      }
      // Fallback for empty editors where range rect can be zero-sized
      if ((rect.width === 0 && rect.height === 0) || !isFinite(rect.top)) {
        const hostRect = host.getBoundingClientRect();
        rect = hostRect;
        usedFallback = true;
      }
      const computed = window.getComputedStyle(host);
      let lineHeight = parseFloat(computed.lineHeight || "0");
      if (!isFinite(lineHeight) || lineHeight <= 0) {
        const fontSize = parseFloat(computed.fontSize || "16");
        lineHeight = isFinite(fontSize) && fontSize > 0 ? fontSize * 1.2 : 16;
      }
      let base = rect.height || lineHeight || 16;
      if (usedFallback) {
        base = lineHeight || 16;
      }
      const displayHeight = Math.max(base + 2, 12);
      setCaret({
        visible: true,
        top: rect.top,
        left: rect.left,
        height: displayHeight,
      });
    } catch {
      if (caret.visible) setCaret((c) => ({ ...c, visible: false }));
    }
  };

  useEffect(() => {
    if (!active) {
      // When deactivated, ensure caret is hidden and listeners removed
      setCaret((c) => ({ ...c, visible: false }));
    }
    const schedule = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateCaret);
    };
    if (active) {
      document.addEventListener("selectionchange", schedule, true);
      document.addEventListener("keydown", schedule, true);
      document.addEventListener("keyup", schedule, true);
      document.addEventListener("input", schedule, true);
      document.addEventListener("mousedown", schedule, true);
      document.addEventListener("mouseup", schedule, true);
      document.addEventListener("scroll", schedule, true);
      document.addEventListener("focusout", schedule, true);
      document.addEventListener("blur", schedule, true);
      document.addEventListener("focusin", schedule, true);
      document.addEventListener("visibilitychange", schedule, true);
      window.addEventListener("resize", schedule);
      // kick once
      schedule();
    }
    return () => {
      if (active) {
        document.removeEventListener("selectionchange", schedule, true);
        document.removeEventListener("keydown", schedule, true);
        document.removeEventListener("keyup", schedule, true);
        document.removeEventListener("input", schedule, true);
        document.removeEventListener("mousedown", schedule, true);
        document.removeEventListener("mouseup", schedule, true);
        document.removeEventListener("scroll", schedule, true);
        document.removeEventListener("focusout", schedule, true);
        document.removeEventListener("blur", schedule, true);
        document.removeEventListener("focusin", schedule, true);
        document.removeEventListener("visibilitychange", schedule, true);
        window.removeEventListener("resize", schedule);
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!caret.visible) return null;
  return (
    <div
      className="rainbow-caret"
      style={{
        top: caret.top + "px",
        left: caret.left + "px",
        height: caret.height + "px",
      }}
    />
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [hasBridge, setHasBridge] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [isCreateTaskListOpen, setIsCreateTaskListOpen] = useState(false);
  const [isBackgroundsOpen, setIsBackgroundsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<
    { fileName: string; fullPath: string; url: string }[]
  >([]);
  const [isLoadingBackgrounds, setIsLoadingBackgrounds] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplateForCreate, setSelectedTemplateForCreate] = useState<{
    name: string;
    path: string;
    createdAt?: string;
  } | null>(null);
  const [selectedPreviousForCreate, setSelectedPreviousForCreate] = useState<{
    name: string;
    path: string;
    createdAt?: string;
  } | null>(null);
  const [createSource, setCreateSource] = useState<
    "template" | "previous" | null
  >(null);
  const [newTaskListName, setNewTaskListName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dailyTaskFiles, setDailyTaskFiles] = useState<
    { name: string; path: string; createdAt?: string }[]
  >([]);
  const [templateFiles, setTemplateFiles] = useState<
    { name: string; path: string; createdAt?: string }[]
  >([]);
  const [dailyProgress, setDailyProgress] = useState<
    { date: string; total: number; completed: number; percent: number }[]
  >([]);
  const [hoveredHeatmapDate, setHoveredHeatmapDate] = useState<string | null>(
    null
  );
  const [selectedKind, setSelectedKind] = useState<"task" | "template" | null>(
    null
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<TaskDocument | null>(null);
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({});
  const [openTaskIds, setOpenTaskIds] = useState<Record<string, boolean>>({});
  const [openTaskNotesIds, setOpenTaskNotesIds] = useState<
    Record<string, boolean>
  >({});
  const [openSubtaskNotesIds, setOpenSubtaskNotesIds] = useState<
    Record<string, boolean>
  >({});
  const [taskNotesHeights, setTaskNotesHeights] = useState<
    Record<string, number>
  >({});
  const BASE_CONNECTOR_OVERLAP_PX = 16; // matches previous -top-4
  const taskNotesRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<
    string | null
  >(null);

  // Countdown Timer state
  const timerOptions = [5, 10, 15, 20, 25, 30, 45, 60] as const;
  type TimerMinutes = (typeof timerOptions)[number];
  const [timerMinutes, setTimerMinutes] = useState<TimerMinutes>(25);
  const [timerRemainingSec, setTimerRemainingSec] = useState<number>(
    timerMinutes * 60
  );
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Keep remaining seconds in sync with selected minutes when not running
  useEffect(() => {
    if (!timerRunning) {
      setTimerRemainingSec(timerMinutes * 60);
    }
  }, [timerMinutes, timerRunning]);

  // Tick the timer every second while running
  useEffect(() => {
    if (!timerRunning) return;
    if (timerRemainingSec <= 0) {
      setTimerRunning(false);
      return;
    }
    const id = window.setInterval(() => {
      setTimerRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerRemainingSec]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Circular timer ring derived values
  const totalTimerSeconds = timerMinutes * 60;
  const ringSizePx = 160; // matches w-40 h-40 (10rem)
  const ringStrokeWidth = 2;
  const ringCenter = ringSizePx / 2;
  const ringRadius = ringCenter - ringStrokeWidth / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const timerFraction =
    totalTimerSeconds > 0
      ? Math.max(0, Math.min(1, timerRemainingSec / totalTimerSeconds))
      : 0;
  const ringDashArray = `${timerFraction * ringCircumference} ${ringCircumference}`;
  const ringHue = Math.round(120 * timerFraction); // 120 (green) -> 0 (red)
  const ringStrokeColor = `hsl(${ringHue}, 90%, 55%)`;

  type EditingTarget =
    | {
        kind: "task";
        groupId: string;
        taskId: string;
        field: "name" | "description" | "notes";
      }
    | {
        kind: "subtask";
        groupId: string;
        taskId: string;
        subTaskId: string;
        field: "name" | "description" | "notes";
      }
    | {
        kind: "group";
        groupId: string;
        field: "name" | "description" | "notes";
      };
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editValue, setEditValue] = useState("");
  useEffect(() => {
    if (!editing) return;
    const key =
      editing.kind === "task"
        ? `${editing.groupId}:${editing.taskId}:${editing.field}`
        : editing.kind === "subtask"
          ? `${editing.groupId}:${editing.taskId}:${(editing as any).subTaskId}:${(editing as any).field}`
          : `${editing.groupId}:${editing.field}`;
    const focusLater = () => {
      const el = document.querySelector(
        `[data-editor-key="${key}"]`
      ) as HTMLElement | null;
      if (el) {
        // Inject a zero-width space for empty editors so caret becomes visible
        if (!el.textContent || el.textContent.length === 0) {
          el.textContent = "\u200B";
        }
        el.focus();
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          if (el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE) {
            const text = el.firstChild as Text;
            const len = text.data?.length ?? 0;
            range.setStart(text, len);
            range.setEnd(text, len);
          } else {
            range.selectNodeContents(el);
            range.collapse(false);
          }
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {}
      }
    };
    // Run after paint to ensure the editor is mounted
    requestAnimationFrame(() => {
      requestAnimationFrame(focusLater);
    });
  }, [editing]);
  const [shimmerOnceKeys, setShimmerOnceKeys] = useState<
    Record<string, boolean>
  >({});
  const [groupShimmerKeys, setGroupShimmerKeys] = useState<
    Record<string, boolean>
  >({});
  const prevGroupPercentRef = useRef<Record<string, number>>({});
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: "task" | "template";
    file: { name: string; path: string };
  } | null>(null);

  const [renameDialog, setRenameDialog] = useState<{
    kind: "task" | "template";
    file: { name: string; path: string };
  } | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Save-as-template dialog state
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [saveTemplateInput, setSaveTemplateInput] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  type EditableDivProps = {
    initial: string;
    multiline: boolean;
    className?: string;
    onEnter: (value: string) => void;
    onEscape: () => void;
  };

  const EditableDiv: React.FC<EditableDivProps> = ({
    initial,
    multiline,
    className,
    onEnter,
    onEscape,
  }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, []);

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
        e.preventDefault();
        const value = ref.current?.innerText ?? "";
        onEnter(value);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
      }
    };

    return (
      <div
        ref={ref}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        className={className}
        onKeyDown={handleKeyDown}
      >
        {initial}
      </div>
    );
  };

  useLayoutEffect(() => {
    Object.keys(openTaskNotesIds).forEach((taskId) => {
      if (openTaskNotesIds[taskId]) {
        const el = taskNotesRefs.current[taskId];
        if (el) {
          const height = el.offsetHeight;
          setTaskNotesHeights((prev) =>
            prev[taskId] !== height ? { ...prev, [taskId]: height } : prev
          );
        }
      }
    });
  }, [openTaskNotesIds, selectedDoc]);

  // Force dark-only UI across the app
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    // Load saved folder on start
    window.api?.getSavedFolder?.().then((p: string | null) => {
      if (p) setSelectedFolder(p);
    });
    setHasBridge(!!window.api?.selectFolder);
  }, []);

  useEffect(() => {
    if (isCreateTaskListOpen && createStep === 3) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [isCreateTaskListOpen, createStep]);

  useEffect(() => {
    const loadDailyTasks = async () => {
      if (!window.api?.listDailyTasks) return;
      try {
        const files = await window.api.listDailyTasks();
        const enriched = await Promise.all(
          files.map(async (f) => {
            let createdAt: string | undefined;
            try {
              const data = await window.api?.readJsonFile?.(f.fullPath);
              createdAt = data?.createdAt;
            } catch {}
            return { name: f.fileName, path: f.fullPath, createdAt };
          })
        );
        setDailyTaskFiles(enriched);
      } catch (err) {
        console.error("Failed to load daily tasks:", err);
        setDailyTaskFiles([]);
      }
    };
    const loadTemplates = async () => {
      if (!window.api?.listTemplates) return;
      try {
        const files = await window.api.listTemplates();
        const enriched = await Promise.all(
          files.map(async (f) => {
            let createdAt: string | undefined;
            try {
              const data = await window.api?.readJsonFile?.(f.fullPath);
              createdAt = data?.createdAt;
            } catch {}
            return { name: f.fileName, path: f.fullPath, createdAt };
          })
        );
        setTemplateFiles(enriched);
      } catch (err) {
        console.error("Failed to load templates:", err);
        setTemplateFiles([]);
      }
    };
    if (selectedFolder) {
      loadDailyTasks();
      loadTemplates();
    } else {
      setDailyTaskFiles([]);
      setTemplateFiles([]);
      setSelectedPath(null);
      setSelectedDoc(null);
    }
  }, [selectedFolder]);

  // Aggregate per-day progress across all daily task files
  useEffect(() => {
    recomputeDailyProgress();
  }, [dailyTaskFiles]);

  useEffect(() => {
    const readDoc = async () => {
      if (!selectedPath || !window.api?.readJsonFile) return;
      try {
        const data = (await window.api.readJsonFile(
          selectedPath
        )) as TaskDocument | null;
        setSelectedDoc(data);
        if (data) {
          const groupState: Record<string, boolean> = {};
          const taskState: Record<string, boolean> = {};
          for (const g of data.taskGroups ?? []) {
            groupState[g.id] = true;
            for (const t of g.tasks ?? []) {
              if (t.subTasks && t.subTasks.length > 0) taskState[t.id] = true;
            }
          }
          setOpenGroupIds(groupState);
          setOpenTaskIds(taskState);
        } else {
          setOpenGroupIds({});
          setOpenTaskIds({});
        }
      } catch (err) {
        console.error("Failed to read selected file:", err);
        setSelectedDoc(null);
      }
    };
    readDoc();
  }, [selectedPath]);

  const handleSelectFile = (
    kind: "task" | "template",
    file: { name: string; path: string }
  ) => {
    setSelectedKind(kind);
    setSelectedPath(file.path);
  };

  const refreshDailyTasks = async () => {
    try {
      const files = await window.api?.listDailyTasks?.();
      if (files) {
        const enriched = await Promise.all(
          files.map(async (f: { fileName: string; fullPath: string }) => {
            let createdAt: string | undefined;
            try {
              const data = await window.api?.readJsonFile?.(f.fullPath);
              createdAt = data?.createdAt;
            } catch {}
            return { name: f.fileName, path: f.fullPath, createdAt };
          })
        );
        setDailyTaskFiles(enriched);
      }
    } catch {}
  };

  const refreshTemplates = async () => {
    try {
      const files = await window.api?.listTemplates?.();
      if (files) {
        const enriched = await Promise.all(
          files.map(async (f: { fileName: string; fullPath: string }) => {
            let createdAt: string | undefined;
            try {
              const data = await window.api?.readJsonFile?.(f.fullPath);
              createdAt = data?.createdAt;
            } catch {}
            return { name: f.fileName, path: f.fullPath, createdAt };
          })
        );
        setTemplateFiles(enriched);
      }
    } catch {}
  };

  const handleDeleteFile = async (
    kind: "task" | "template",
    file: { name: string; path: string }
  ) => {
    try {
      const ok = await (window as any).api?.deleteJsonFile?.(file.path);
      if (!ok) return;
      if (selectedPath === file.path) {
        setSelectedKind(null);
        setSelectedPath(null);
        setSelectedDoc(null);
      }
      if (kind === "task") await refreshDailyTasks();
      else await refreshTemplates();
    } catch {}
  };

  const confirmDeleteNow = async () => {
    if (!deleteConfirm) return;
    await handleDeleteFile(deleteConfirm.kind, deleteConfirm.file);
    setDeleteConfirm(null);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroupIds((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleTaskSubtasks = (taskId: string) => {
    setOpenTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleTaskNotes = (taskId: string) => {
    setOpenTaskNotesIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleSubtaskNotes = (taskId: string, subTaskId: string) => {
    const key = `${taskId}:${subTaskId}`;
    setOpenSubtaskNotesIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startCreateTaskListFlow = () => {
    setCreateStep(1);
    setSelectedTemplateForCreate(null);
    setSelectedPreviousForCreate(null);
    setCreateSource(null);
    setNewTaskListName("");
    setIsCreateTaskListOpen(true);
  };

  const generateId = (prefix: string) =>
    `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

  const sanitizeFileName = (name: string) =>
    name
      .trim()
      .replace(/[\\/:*?\"<>|]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 120);

  const makeUniqueName = (baseName: string) => {
    const existing = new Set(
      (dailyTaskFiles || []).map((f) => f.name.toLowerCase())
    );
    let candidate = baseName;
    let i = 1;
    while (existing.has(candidate.toLowerCase())) {
      candidate = `${baseName} (${i++})`;
    }
    return candidate;
  };

  const makeUniqueTemplateName = (baseName: string) => {
    const existing = new Set(
      (templateFiles || []).map((f) => f.name.toLowerCase())
    );
    let candidate = baseName;
    let i = 1;
    while (existing.has(candidate.toLowerCase())) {
      candidate = `${baseName} (${i++})`;
    }
    return candidate;
  };

  const formatTemplateDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const day = d.getDate();
    const suffix =
      day % 10 === 1 && day % 100 !== 11
        ? "st"
        : day % 10 === 2 && day % 100 !== 12
          ? "nd"
          : day % 10 === 3 && day % 100 !== 13
            ? "rd"
            : "th";
    const month = d.toLocaleString(undefined, { month: "long" });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}${suffix} ${month}, ${year}`;
  };

  const handleSelectTemplateForCreate = (file: {
    name: string;
    path: string;
    createdAt?: string;
  }) => {
    setSelectedTemplateForCreate(file);
    setNewTaskListName(file.name);
    setCreateStep(3);
  };

  const handleSelectPreviousForCreate = (file: {
    name: string;
    path: string;
    createdAt?: string;
  }) => {
    setSelectedPreviousForCreate(file);
    setNewTaskListName(file.name);
    setCreateStep(3);
  };

  const createTaskListFromTemplate = async () => {
    if (
      !selectedFolder ||
      !selectedTemplateForCreate ||
      !window.api?.readJsonFile ||
      !window.api?.writeJsonFile
    ) {
      return;
    }
    if (!newTaskListName.trim()) return;
    setIsCreating(true);
    try {
      const tmpl = (await window.api.readJsonFile(
        selectedTemplateForCreate.path
      )) as TaskDocument | null;
      if (!tmpl) return;
      const nowIso = new Date().toISOString();

      const nextDoc: TaskDocument = {
        type: "task",
        id: generateId("task"),
        name: newTaskListName.trim(),
        description: "",
        templateId: tmpl.id,
        createdAt: nowIso,
        updatedAt: nowIso,
        taskGroups: (tmpl.taskGroups || []).map((g) => ({
          id: generateId("tg"),
          name: g.name,
          templateTaskGroupId: (g as any).templateTaskGroupId ?? (g as any).id,
          description: g.description ?? "",
          notes: g.notes ?? "",
          createdAt: nowIso,
          updatedAt: nowIso,
          tasks: (g.tasks || []).map((t) => ({
            id: generateId("tsk"),
            name: t.name,
            templateTaskId: (t as any).templateTaskId ?? (t as any).id,
            description: t.description ?? "",
            notes: t.notes ?? null,
            createdAt: nowIso,
            updatedAt: nowIso,
            isComplete: false,
            recycle: false,
            subTasks: (t.subTasks || []).map((s) => ({
              id: generateId("sub"),
              name: s.name,
              description: s.description ?? "",
              notes: s.notes ?? null,
              isComplete: false,
              createdAt: nowIso,
              updatedAt: nowIso,
              templateSubTaskId: (s as any).templateSubTaskId ?? (s as any).id,
            })),
          })),
        })),
      };

      const base = sanitizeFileName(
        newTaskListName.trim() || selectedTemplateForCreate.name
      );
      const unique = makeUniqueName(base || "Task");
      const root = selectedFolder.replace(/[\\/]+$/, "");
      const targetPath = `${root}/daily tasks/${unique}.json`;

      const ok = await window.api.writeJsonFile(targetPath, nextDoc);
      if (!ok) return;

      // Refresh list and select the new file
      try {
        const files = await window.api.listDailyTasks?.();
        if (files) {
          const enriched = await Promise.all(
            files.map(async (f: any) => {
              let createdAt: string | undefined;
              try {
                const data = await window.api?.readJsonFile?.(f.fullPath);
                createdAt = data?.createdAt;
              } catch {}
              return { name: f.fileName, path: f.fullPath, createdAt };
            })
          );
          setDailyTaskFiles(enriched);
        }
      } catch {}
      setSelectedKind("task");
      setSelectedPath(targetPath);
      setIsCreateTaskListOpen(false);
    } catch (err) {
      console.error("Failed to create from template:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const createTaskListFromPrevious = async () => {
    if (
      !selectedFolder ||
      !selectedPreviousForCreate ||
      !window.api?.readJsonFile ||
      !window.api?.writeJsonFile
    ) {
      return;
    }
    if (!newTaskListName.trim()) return;
    setIsCreating(true);
    try {
      const prev = (await window.api.readJsonFile(
        selectedPreviousForCreate.path
      )) as TaskDocument | null;
      if (!prev) return;
      const nowIso = new Date().toISOString();

      const filteredGroups = (prev.taskGroups || [])
        .map((g) => {
          const tasks = (g.tasks || [])
            .filter((t) => t.recycle === true || !t.isComplete)
            .map((t) => {
              const includeAllSubtasks = t.recycle === true;
              const subtasks = (t.subTasks || [])
                .filter((s) => includeAllSubtasks || !s.isComplete)
                .map((s) => ({
                  id: generateId("sub"),
                  name: s.name,
                  description: s.description ?? "",
                  notes: s.notes ?? null,
                  isComplete: false,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                  templateSubTaskId:
                    (s as any).templateSubTaskId ?? (s as any).id,
                }));
              return {
                id: generateId("tsk"),
                name: t.name,
                templateTaskId: (t as any).templateTaskId ?? (t as any).id,
                description: t.description ?? "",
                notes: t.notes ?? null,
                createdAt: nowIso,
                updatedAt: nowIso,
                isComplete: false,
                recycle: !!t.recycle,
                subTasks: subtasks,
              } as TaskItem;
            });
          if (tasks.length === 0) return null;
          return {
            id: generateId("tg"),
            name: g.name,
            templateTaskGroupId:
              (g as any).templateTaskGroupId ?? (g as any).id,
            description: g.description ?? "",
            notes: g.notes ?? "",
            createdAt: nowIso,
            updatedAt: nowIso,
            tasks,
          } as TaskGroup;
        })
        .filter(Boolean) as TaskGroup[];

      const nextDoc: TaskDocument = {
        type: "task",
        id: generateId("task"),
        name: newTaskListName.trim(),
        description: "",
        templateId: prev.templateId ?? "",
        createdAt: nowIso,
        updatedAt: nowIso,
        taskGroups: filteredGroups,
      };

      const base = sanitizeFileName(
        newTaskListName.trim() || selectedPreviousForCreate.name
      );
      const unique = makeUniqueName(base || "Task");
      const root = selectedFolder.replace(/[\\/]+$/, "");
      const targetPath = `${root}/daily tasks/${unique}.json`;

      const ok = await window.api.writeJsonFile(targetPath, nextDoc);
      if (!ok) return;

      try {
        const files = await window.api.listDailyTasks?.();
        if (files) {
          const enriched = await Promise.all(
            files.map(async (f: any) => {
              let createdAt: string | undefined;
              try {
                const data = await window.api?.readJsonFile?.(f.fullPath);
                createdAt = data?.createdAt;
              } catch {}
              return { name: f.fileName, path: f.fullPath, createdAt };
            })
          );
          setDailyTaskFiles(enriched);
        }
      } catch {}
      setSelectedKind("task");
      setSelectedPath(targetPath);
      setIsCreateTaskListOpen(false);
    } catch (err) {
      console.error("Failed to create from previous:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const createTaskListFromScratch = async () => {
    if (!selectedFolder || !window.api?.writeJsonFile) return;
    if (!newTaskListName.trim()) return;
    setIsCreating(true);
    try {
      const nowIso = new Date().toISOString();
      const nextDoc: TaskDocument = {
        type: "task",
        id: generateId("task"),
        name: newTaskListName.trim(),
        description: "",
        templateId: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        taskGroups: [],
      };
      const base = sanitizeFileName(newTaskListName.trim());
      const unique = makeUniqueName(base || "Task");
      const root = selectedFolder.replace(/[\\/]+$/, "");
      const targetPath = `${root}/daily tasks/${unique}.json`;

      const ok = await window.api.writeJsonFile(targetPath, nextDoc);
      if (!ok) return;

      try {
        const files = await window.api.listDailyTasks?.();
        if (files) {
          const enriched = await Promise.all(
            files.map(async (f: any) => {
              let createdAt: string | undefined;
              try {
                const data = await window.api?.readJsonFile?.(f.fullPath);
                createdAt = data?.createdAt;
              } catch {}
              return { name: f.fileName, path: f.fullPath, createdAt };
            })
          );
          setDailyTaskFiles(enriched);
        }
      } catch {}
      setSelectedKind("task");
      setSelectedPath(targetPath);
      setIsCreateTaskListOpen(false);
    } catch (err) {
      console.error("Failed to create from scratch:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const addGroup = () => {
    if (!selectedDoc || !selectedPath) return;
    const nowIso = new Date().toISOString();
    const newGroup: TaskGroup = {
      id: generateId("tg"),
      name: "New group",
      templateTaskGroupId: generateId("ttg"),
      description: "",
      notes: "",
      createdAt: nowIso,
      updatedAt: nowIso,
      tasks: [],
    };
    const next: TaskDocument = {
      ...selectedDoc,
      updatedAt: nowIso,
      taskGroups: [newGroup, ...(selectedDoc.taskGroups || [])],
    };
    setSelectedDoc(next);
    setOpenGroupIds((prev) => ({ ...prev, [newGroup.id]: true }));
    (async () => {
      try {
        await window.api?.writeJsonFile?.(selectedPath, next);
      } catch (err) {
        console.error("Failed to write JSON:", err);
      }
    })();
  };

  const openSaveTemplateDialog = () => {
    if (!selectedDoc) return;
    setSaveTemplateInput(selectedDoc.name || "");
    setIsSaveTemplateOpen(true);
  };

  const performSaveTemplate = async () => {
    if (!selectedFolder || !selectedDoc || !window.api?.writeJsonFile) return;
    const baseName = sanitizeFileName(
      saveTemplateInput.trim() || selectedDoc.name || "Template"
    );
    if (!baseName) return;
    setIsSavingTemplate(true);
    try {
      const nowIso = new Date().toISOString();
      const templateDoc: TaskDocument = {
        type: "template",
        id: generateId("tmpl"),
        name: baseName,
        description: "",
        templateId: "",
        createdAt: nowIso,
        updatedAt: nowIso,
        taskGroups: (selectedDoc.taskGroups || []).map((g) => {
          const newGroupId = generateId("tg");
          return {
            id: newGroupId,
            name: g.name,
            templateTaskGroupId: newGroupId,
            description: g.description ?? "",
            notes: g.notes ?? "",
            createdAt: nowIso,
            updatedAt: nowIso,
            tasks: (g.tasks || []).map((t) => {
              const newTaskId = generateId("tsk");
              return {
                id: newTaskId,
                name: t.name,
                templateTaskId: newTaskId,
                description: t.description ?? "",
                notes: t.notes ?? null,
                createdAt: nowIso,
                updatedAt: nowIso,
                isComplete: false,
                recycle: false,
                subTasks: (t.subTasks || []).map((s) => {
                  const newSubId = generateId("sub");
                  return {
                    id: newSubId,
                    name: s.name,
                    description: s.description ?? "",
                    notes: s.notes ?? null,
                    isComplete: false,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                    templateSubTaskId: newSubId,
                  } as SubTask;
                }),
              } as TaskItem;
            }),
          } as TaskGroup;
        }),
      };

      const root = selectedFolder.replace(/[\\/]+$/, "");
      const unique = makeUniqueTemplateName(baseName);
      const targetPath = `${root}/templates/${unique}.json`;
      const ok = await window.api.writeJsonFile(targetPath, templateDoc);
      if (!ok) return;
      await refreshTemplates();
      setIsSaveTemplateOpen(false);
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const addTask = (groupId: string) => {
    if (!selectedDoc || !selectedPath) return;
    const nowIso = new Date().toISOString();
    const newTask: TaskItem = {
      id: generateId("tsk"),
      name: "New task",
      templateTaskId: generateId("ttsk"),
      description: "",
      notes: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      isComplete: false,
      recycle: false,
      subTasks: [],
    };
    const next: TaskDocument = {
      ...selectedDoc,
      updatedAt: nowIso,
      taskGroups: (selectedDoc.taskGroups || []).map((g) =>
        g.id !== groupId
          ? g
          : { ...g, updatedAt: nowIso, tasks: [newTask, ...(g.tasks || [])] }
      ),
    };
    setSelectedDoc(next);
    setOpenGroupIds((prev) => ({ ...prev, [groupId]: true }));
    (async () => {
      try {
        await window.api?.writeJsonFile?.(selectedPath, next);
      } catch (err) {
        console.error("Failed to write JSON:", err);
      }
    })();
    startEdit(
      { kind: "task", groupId, taskId: newTask.id, field: "name" },
      newTask.name
    );
  };

  const addSubtask = (groupId: string, taskId: string) => {
    if (!selectedDoc || !selectedPath) return;
    const nowIso = new Date().toISOString();
    const newSub: SubTask = {
      id: generateId("sub"),
      name: "New subtask",
      description: "",
      notes: null,
      isComplete: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      templateSubTaskId: generateId("tst"),
    };
    const next: TaskDocument = {
      ...selectedDoc,
      updatedAt: nowIso,
      taskGroups: (selectedDoc.taskGroups || []).map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              tasks: (g.tasks || []).map((t) =>
                t.id !== taskId
                  ? t
                  : {
                      ...t,
                      updatedAt: nowIso,
                      subTasks: [newSub, ...(t.subTasks || [])],
                    }
              ),
            }
      ),
    };
    setSelectedDoc(next);
    setOpenTaskIds((prev) => ({ ...prev, [taskId]: true }));
    (async () => {
      try {
        await window.api?.writeJsonFile?.(selectedPath, next);
      } catch (err) {
        console.error("Failed to write JSON:", err);
      }
    })();
    startEdit(
      {
        kind: "subtask",
        groupId,
        taskId,
        subTaskId: newSub.id,
        field: "name",
      } as any,
      newSub.name
    );
  };

  const startEdit = (target: EditingTarget, initialValue: string) => {
    setEditing(target);
    setEditValue(initialValue ?? "");
    // Ensure notes panels are visible when starting a notes edit
    if (target.kind === "task" && target.field === "notes") {
      setOpenTaskNotesIds((prev) => ({ ...prev, [target.taskId]: true }));
    }
    if (target.kind === "subtask" && target.field === "notes") {
      const key = `${target.taskId}:${target.subTaskId}`;
      setOpenSubtaskNotesIds((prev) => ({ ...prev, [key]: true }));
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
    try {
      const sel = window.getSelection();
      sel?.removeAllRanges();
    } catch {}
    const activeEl = document.activeElement as HTMLElement | null;
    if (activeEl && activeEl.isContentEditable) {
      // Clean up zero-width space if present and content is otherwise empty
      if ((activeEl.textContent || "").trim() === "\u200B") {
        activeEl.textContent = "";
      }
      activeEl.blur();
    }
  };

  const saveEdit = async (overrideValue?: string) => {
    if (!editing || !selectedDoc || !selectedPath) return;
    const nowIso = new Date().toISOString();
    let next: TaskDocument = selectedDoc;
    const rawValue = overrideValue !== undefined ? overrideValue : editValue;
    let newValue = rawValue;
    if (
      (editing as any).field === "description" ||
      (editing as any).field === "notes"
    ) {
      newValue = rawValue.replace(/\u200B/g, "").trim();
    }
    if (editing.kind === "task") {
      next = {
        ...selectedDoc,
        updatedAt: nowIso,
        taskGroups: selectedDoc.taskGroups.map((g) => {
          if (g.id !== editing.groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== editing.taskId) return t;
              return {
                ...t,
                [editing.field]: newValue,
                updatedAt: nowIso,
              } as TaskItem;
            }),
          };
        }),
      };
    } else if (editing.kind === "subtask") {
      next = {
        ...selectedDoc,
        updatedAt: nowIso,
        taskGroups: selectedDoc.taskGroups.map((g) => {
          if (g.id !== editing.groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== editing.taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks || []).map((s) =>
                  s.id === (editing as any).subTaskId
                    ? ({
                        ...s,
                        [(editing as any).field]: newValue,
                        updatedAt: nowIso,
                      } as SubTask)
                    : s
                ),
                updatedAt: nowIso,
              } as TaskItem;
            }),
          };
        }),
      };
    } else if (editing.kind === "group") {
      next = {
        ...selectedDoc,
        updatedAt: nowIso,
        taskGroups: selectedDoc.taskGroups.map((g) =>
          g.id !== editing.groupId
            ? g
            : ({
                ...g,
                [editing.field]: newValue,
                updatedAt: nowIso,
              } as TaskGroup)
        ),
      };
    }
    setSelectedDoc(next);
    try {
      await window.api?.writeJsonFile?.(selectedPath, next);
    } catch (err) {
      console.error("Failed to write JSON:", err);
    }
    // trigger one-time shimmer for the saved field
    const key =
      editing.kind === "task"
        ? `${editing.groupId}:${editing.taskId}:${editing.field}`
        : editing.kind === "subtask"
          ? `${editing.groupId}:${editing.taskId}:${(editing as any).subTaskId}:${(editing as any).field}`
          : `${editing.groupId}:${editing.field}`;
    setShimmerOnceKeys((prev) => ({ ...prev, [key]: true }));
    cancelEdit();
  };

  const updateTaskCompletion = (
    groupId: string,
    taskId: string,
    isComplete: boolean
  ) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const next: TaskDocument = {
        ...prev,
        updatedAt: nowIso,
        taskGroups: prev.taskGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const updatedTask: TaskItem = {
                ...t,
                isComplete,
                updatedAt: nowIso,
              };
              // When completing a task, also complete all of its subtasks
              if (isComplete) {
                updatedTask.subTasks = (t.subTasks || []).map((s) => ({
                  ...s,
                  isComplete: true,
                }));
              } else {
                // When un-completing a task, also mark all of its subtasks incomplete
                updatedTask.subTasks = (t.subTasks || []).map((s) => ({
                  ...s,
                  isComplete: false,
                }));
              }
              return updatedTask;
            }),
          };
        }),
      };
      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, next);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        } finally {
          // Recompute heatmap from scratch after the write settles to avoid races
          await recomputeDailyProgress();
        }
      })();
      return next;
    });
  };

  const toggleTaskRecycle = (groupId: string, taskId: string) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const next: TaskDocument = {
        ...prev,
        updatedAt: nowIso,
        taskGroups: prev.taskGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                recycle: !t.recycle,
                updatedAt: nowIso,
              } as TaskItem;
            }),
          };
        }),
      };
      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, next);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        }
      })();
      return next;
    });
  };

  const updateSubtaskCompletion = (
    groupId: string,
    taskId: string,
    subTaskId: string,
    isComplete: boolean
  ) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const next: TaskDocument = {
        ...prev,
        updatedAt: nowIso,
        taskGroups: prev.taskGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              const updatedSubTasks = (t.subTasks || []).map((s) =>
                s.id === subTaskId ? { ...s, isComplete, updatedAt: nowIso } : s
              );
              const allComplete =
                updatedSubTasks.length > 0 &&
                updatedSubTasks.every((s) => !!s.isComplete);
              return {
                ...t,
                subTasks: updatedSubTasks,
                // Keep task complete in sync with subtasks: all complete => task complete, otherwise incomplete
                isComplete: allComplete,
                updatedAt: nowIso,
              };
            }),
          };
        }),
      };
      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, next);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        } finally {
          // Recompute heatmap from scratch after the write settles to avoid races
          await recomputeDailyProgress();
        }
      })();
      return next;
    });
  };

  const computeGroupProgress = (group: TaskGroup) => {
    let total = 0;
    let completed = 0;
    for (const task of group.tasks || []) {
      total += 1;
      if (task.isComplete) completed += 1;
      const subs = task.subTasks || [];
      total += subs.length;
      completed += subs.filter((s) => !!s.isComplete).length;
    }
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, percent };
  };

  const computeDocumentTotals = (doc: TaskDocument) => {
    let total = 0;
    let completed = 0;
    for (const group of doc.taskGroups || []) {
      for (const task of group.tasks || []) {
        total += 1;
        if (task.isComplete) completed += 1;
        const subs = task.subTasks || [];
        total += subs.length;
        completed += subs.filter((s) => !!s.isComplete).length;
      }
    }
    return { total, completed };
  };

  function SmallCircularProgress({ percent }: { percent: number }) {
    const size = 36; // px (larger to avoid text overlap)
    const strokeWidth = 4; // px
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const offset = circumference * (1 - clamped / 100);
    const center = size / 2;
    if (clamped === 100) {
      return (
        <div className="relative" style={{ width: size, height: size }}>
          <div
            className="absolute rounded-full bg-emerald-500 border border-emerald-300/40 transition-all"
            style={{
              top: strokeWidth / 2,
              right: strokeWidth / 2,
              bottom: strokeWidth / 2,
              left: strokeWidth / 2,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width={Math.round(size * 0.55)}
              height={Math.round(size * 0.55)}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 13.5 10 18.5 19 7.5"
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      );
    }
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <defs>
            <linearGradient
              id="progressGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            style={{
              transition:
                "stroke-dashoffset 500ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[9px] font-medium tabular-nums">
          {clamped}%
        </div>
      </div>
    );
  }

  const getHeatCellClass = (percent: number, hasData: boolean) => {
    if (!hasData || percent === 0) {
      return "bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-600";
    }
    if (percent <= 15) {
      return "bg-gradient-to-br from-slate-800 via-indigo-900 to-indigo-800";
    }
    if (percent <= 30) {
      return "bg-gradient-to-br from-indigo-800 via-violet-800 to-fuchsia-800";
    }
    if (percent <= 45) {
      return "bg-gradient-to-br from-fuchsia-700 via-pink-700 to-rose-700";
    }
    if (percent <= 60) {
      return "bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-500";
    }
    if (percent <= 75) {
      return "bg-gradient-to-br from-lime-700 via-emerald-700 to-teal-700";
    }
    if (percent <= 90) {
      return "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600";
    }
    return "bg-gradient-to-br from-cyan-500 via-emerald-500 to-lime-400";
  };

  const recomputeDailyProgress = async () => {
    if (!window.api?.readJsonFile) {
      // Do not clear existing data if API is not ready; avoid flicker
      return;
    }
    try {
      const summaries = await Promise.all(
        (dailyTaskFiles || []).map(async (f) => {
          try {
            const data = await window.api!.readJsonFile(f.path);
            if (!data) return null;
            const doc = data as TaskDocument;
            const createdIso = doc.createdAt || doc.updatedAt;
            let dayKey: string;
            if (!createdIso) {
              // Fallback to today if missing
              dayKey = new Date().toISOString().slice(0, 10);
            } else {
              const d = new Date(createdIso);
              dayKey = isNaN(d.getTime())
                ? new Date().toISOString().slice(0, 10)
                : d.toISOString().slice(0, 10);
            }
            const { total, completed } = computeDocumentTotals(doc);
            return { dayKey, total, completed };
          } catch (e) {
            console.warn("Skip file during recompute due to error:", f.path, e);
            return null;
          }
        })
      );

      const dayToTotals = new Map<
        string,
        { total: number; completed: number }
      >();
      for (const entry of summaries) {
        if (!entry) continue;
        const prev = dayToTotals.get(entry.dayKey) || {
          total: 0,
          completed: 0,
        };
        dayToTotals.set(entry.dayKey, {
          total: prev.total + entry.total,
          completed: prev.completed + entry.completed,
        });
      }

      const days = Array.from(dayToTotals.entries()).map(([date, v]) => {
        const percent =
          v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100);
        return { date, total: v.total, completed: v.completed, percent };
      });
      days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      // Only update if we actually computed something; otherwise keep prior
      if (days.length > 0) {
        setDailyProgress(days);
      }
    } catch (err) {
      console.error("Failed to aggregate daily progress:", err);
      // Keep previous data on failure to avoid blank state flicker
    }
  };

  // Removed baseline-based incremental recompute; using full recompute instead

  // Removed live-adjust logic; using full recompute for every change

  // Reset shimmer and previous percent tracking on document change
  useEffect(() => {
    setGroupShimmerKeys({});
    prevGroupPercentRef.current = {};
  }, [selectedDoc?.id]);

  // Detect when a group crosses to 100% to trigger one-time shimmer
  useEffect(() => {
    if (!selectedDoc) return;
    for (const g of selectedDoc.taskGroups || []) {
      const { percent } = computeGroupProgress(g);
      const prev = prevGroupPercentRef.current[g.id] ?? 0;
      if (prev < 100 && percent === 100) {
        setGroupShimmerKeys((prevMap) => ({ ...prevMap, [g.id]: true }));
      }
      prevGroupPercentRef.current[g.id] = percent;
    }
  }, [selectedDoc]);

  const deleteSubtask = (
    groupId: string,
    taskId: string,
    subTaskId: string
  ) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const next: TaskDocument = {
        ...prev,
        updatedAt: nowIso,
        taskGroups: prev.taskGroups.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                tasks: g.tasks.map((t) =>
                  t.id !== taskId
                    ? t
                    : {
                        ...t,
                        updatedAt: nowIso,
                        subTasks: (t.subTasks || []).filter(
                          (s) => s.id !== subTaskId
                        ),
                      }
                ),
              }
        ),
      };
      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, next);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        }
      })();
      setOpenSubtaskNotesIds((prevMap) => {
        const key = `${taskId}:${subTaskId}`;
        const { [key]: _omit, ...rest } = prevMap;
        return rest;
      });
      return next;
    });
  };

  const deleteTask = (groupId: string, taskId: string) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const nowIso = new Date().toISOString();
      const next: TaskDocument = {
        ...prev,
        updatedAt: nowIso,
        taskGroups: prev.taskGroups.map((g) =>
          g.id !== groupId
            ? g
            : {
                ...g,
                tasks: g.tasks.filter((t) => t.id !== taskId),
              }
        ),
      };
      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, next);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        }
      })();
      // close any open panels for this task
      setOpenTaskIds((prevMap) => {
        const { [taskId]: _omit, ...rest } = prevMap;
        return rest;
      });
      setOpenTaskNotesIds((prevMap) => {
        const { [taskId]: _omit, ...rest } = prevMap;
        return rest;
      });
      setTaskNotesHeights((prevMap) => {
        const { [taskId]: _omit, ...rest } = prevMap;
        return rest;
      });
      return next;
    });
  };

  const deleteGroup = (groupId: string) => {
    setSelectedDoc((previousDoc) => {
      if (!previousDoc) return previousDoc;
      const nowIso = new Date().toISOString();

      // Find tasks and subtasks under this group to clear related UI state
      const groupToRemove = previousDoc.taskGroups.find(
        (g) => g.id === groupId
      );
      const taskIdsInGroup = (groupToRemove?.tasks || []).map((t) => t.id);
      const subtaskKeysInGroup: string[] = [];
      for (const t of groupToRemove?.tasks || []) {
        for (const s of t.subTasks || []) {
          subtaskKeysInGroup.push(`${t.id}:${s.id}`);
        }
      }

      const nextDoc: TaskDocument = {
        ...previousDoc,
        updatedAt: nowIso,
        taskGroups: previousDoc.taskGroups.filter((g) => g.id !== groupId),
      };

      (async () => {
        try {
          if (selectedPath) {
            await window.api?.writeJsonFile?.(selectedPath, nextDoc);
          }
        } catch (err) {
          console.error("Failed to write JSON:", err);
        }
      })();

      // Close any open UI state related to this group
      setOpenGroupIds((prevMap) => {
        const { [groupId]: _omit, ...rest } = prevMap;
        return rest;
      });
      setOpenTaskIds((prevMap) => {
        const rest: Record<string, boolean> = {};
        for (const key of Object.keys(prevMap)) {
          if (!taskIdsInGroup.includes(key)) rest[key] = prevMap[key];
        }
        return rest;
      });
      setOpenTaskNotesIds((prevMap) => {
        const rest: Record<string, boolean> = {};
        for (const key of Object.keys(prevMap)) {
          if (!taskIdsInGroup.includes(key)) rest[key] = prevMap[key];
        }
        return rest;
      });
      setTaskNotesHeights((prevMap) => {
        const rest: Record<string, number> = {};
        for (const key of Object.keys(prevMap)) {
          if (!taskIdsInGroup.includes(key)) rest[key] = prevMap[key];
        }
        return rest;
      });
      setOpenSubtaskNotesIds((prevMap) => {
        const rest: Record<string, boolean> = {};
        for (const key of Object.keys(prevMap)) {
          if (!subtaskKeysInGroup.includes(key)) rest[key] = prevMap[key];
        }
        return rest;
      });
      setShimmerOnceKeys((prevMap) => {
        const rest: Record<string, boolean> = {};
        for (const key of Object.keys(prevMap)) {
          if (!key.startsWith(`${groupId}:`)) rest[key] = prevMap[key];
        }
        return rest;
      });
      setGroupShimmerKeys((prevMap) => {
        const { [groupId]: _omit, ...rest } = prevMap;
        return rest;
      });

      return nextDoc;
    });
  };

  const handleChooseFolder = async () => {
    try {
      if (!window.api?.selectFolder) {
        alert(
          "Folder picker requires the desktop app. Please run: npm run start"
        );
        return;
      }
      const res = await window.api.selectFolder();
      if (res?.folderPath) setSelectedFolder(res.folderPath);
    } catch (err) {
      console.error(err);
      alert("Unable to open folder picker. Check the console for details.");
    }
  };

  const openBackgrounds = async () => {
    if (!selectedFolder) return;
    if (!window.api?.listBackgrounds) return;
    setIsLoadingBackgrounds(true);
    try {
      const imgs = await window.api.listBackgrounds();
      setBackgroundImages(imgs || []);
    } catch (e) {
      console.error("Failed to load backgrounds", e);
      setBackgroundImages([]);
    } finally {
      setIsLoadingBackgrounds(false);
      setIsBackgroundsOpen(true);
    }
  };

  const chooseBackground = async (
    fullPath: string,
    fileName: string,
    fallbackUrl: string
  ) => {
    try {
      const dataUrl = await window.api?.getBackgroundDataUrl?.(fullPath);
      setSelectedBackgroundUrl(dataUrl || fallbackUrl || null);
      try {
        await (window.api as any)?.writeRootSettings?.({
          backgroundFileName: fileName,
        });
      } catch {}
      setIsBackgroundsOpen(false);
    } catch (e) {
      console.error("Failed to get background data url", e);
      setSelectedBackgroundUrl(fallbackUrl || null);
      try {
        await (window.api as any)?.writeRootSettings?.({
          backgroundFileName: fileName,
        });
      } catch {}
      setIsBackgroundsOpen(false);
    }
  };

  // Load persisted background when folder changes or on startup
  useEffect(() => {
    const loadPersistedBackground = async () => {
      try {
        if (!selectedFolder) {
          setSelectedBackgroundUrl(null);
          return;
        }
        const settings = (await (window.api as any)?.readRootSettings?.()) as
          | Record<string, unknown>
          | undefined;
        const fileName = (settings?.backgroundFileName as string) || null;
        if (!fileName) {
          setSelectedBackgroundUrl(null);
          return;
        }
        const root = selectedFolder.replace(/[\\/]+$/, "");
        const fullPath = `${root}/backgrounds/${fileName}`;
        const dataUrl = await window.api?.getBackgroundDataUrl?.(fullPath);
        setSelectedBackgroundUrl(dataUrl || null);
      } catch {
        setSelectedBackgroundUrl(null);
      }
    };
    loadPersistedBackground();
  }, [selectedFolder]);

  useEffect(() => {
    // Hook app menu About
    const off = (window as any)?.api?.onOpenAbout?.(() => setIsAboutOpen(true));
    return () => {
      if (typeof off === "function") off();
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-background text-foreground">
      {selectedBackgroundUrl && (
        <div className="pointer-events-none fixed inset-0 z-0 select-none">
          <img
            src={selectedBackgroundUrl}
            alt="Background"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
      {/* Top draggable area to house traffic lights overlay without visible header */}
      <div className="titlebar-drag h-8 w-full relative z-10"></div>
      <div className="flex h-[calc(100%-40px)] w-full overflow-hidden relative z-10">
        <div className="no-drag relative w-full h-full overflow-hidden">
          <div className="flex h-full w-full">
            {/* Collapsible sidebar */}
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 260 : 56 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="h-full shrink-0  text-sidebar-foreground overflow-hidden"
            >
              <div className="relative flex h-12 items-center gap-2 px-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent/30 ${
                    isSidebarOpen ? "" : "hidden"
                  }`}
                >
                  <PanelsTopLeft className="h-4 w-4" />
                </div>
                {isSidebarOpen && (
                  <span className="text-sm font-semibold truncate">
                    Open Task Tracker
                  </span>
                )}
                <button
                  aria-expanded={isSidebarOpen}
                  aria-label={
                    isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"
                  }
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border hover:bg-sidebar-accent/20"
                >
                  {isSidebarOpen ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Sidebar content (hidden when collapsed) */}
              <div className="px-2 pt-2 pb-3 space-y-1 h-[calc(100%-48px)] flex flex-col">
                {isSidebarOpen && (
                  <>
                    <div className="flex-1 min-h-0 flex flex-col">
                      <button
                        onClick={() => startCreateTaskListFlow()}
                        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-sidebar-border text-sm px-3 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-500/15 hover:from-emerald-500/25 hover:via-cyan-500/25 hover:to-blue-500/25 transition-colors relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)] mb-2"
                        title="Create a new task list"
                      >
                        <Plus className="h-3.5 w-3.5 relative z-10" />
                        <span className="relative z-10">Create task list</span>
                      </button>
                      <div className="flex-1 min-h-0 flex flex-col">
                        <button
                          className="w-full inline-flex items-center gap-2 px-3 h-9 text-sm"
                          aria-expanded={isTasksOpen}
                          onClick={() => setIsTasksOpen((v) => !v)}
                        >
                          <Hash className="h-4 w-4" />
                          <span className="font-medium">Tasks</span>
                          <ChevronDown
                            className={`ml-auto h-4 w-4 transition-transform ${
                              isTasksOpen ? "-rotate-180" : "rotate-0"
                            }`}
                          />
                        </button>
                        {isTasksOpen && (
                          <div className="flex-1 min-h-0 overflow-auto px-3 pt-1 pb-3 text-xs text-muted-foreground space-y-1">
                            {dailyTaskFiles.length === 0 ? (
                              <div>No tasks yet</div>
                            ) : (
                              dailyTaskFiles.map((f) => (
                                <div
                                  key={f.path}
                                  className="relative group rounded-sm"
                                >
                                  <button
                                    className={`w-full text-left rounded-sm px-2 py-1 pr-8 text-foreground ${selectedPath === f.path && selectedKind === "task" ? "bg-blue-500/20 ring-1 ring-blue-400/40" : "hover:bg-sidebar-accent/30"}`}
                                    title={f.name}
                                    onClick={() => handleSelectFile("task", f)}
                                  >
                                    <div className="truncate">{f.name}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {formatTemplateDate(f.createdAt)}
                                    </div>
                                  </button>
                                  <div className="absolute right-1 top-1 flex gap-1 opacity-80 group-hover:opacity-100">
                                    <button
                                      className="p-1 rounded hover:bg-white/10"
                                      title="Rename"
                                      aria-label="Rename"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameDialog({
                                          kind: "task",
                                          file: f,
                                        });
                                        setRenameInput(f.name);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1 rounded hover:bg-white/10"
                                      title="Delete"
                                      aria-label="Delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          kind: "task",
                                          file: f,
                                        });
                                      }}
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <hr className="border-t border-sidebar-border/60 my-1" />
                      <div className="flex-1 min-h-0 flex flex-col">
                        <button
                          className="w-full inline-flex items-center gap-2 px-3 h-9 text-sm"
                          aria-expanded={isTemplatesOpen}
                          onClick={() => setIsTemplatesOpen((v) => !v)}
                        >
                          <Hash className="h-4 w-4" />
                          <span className="font-medium">Templates</span>
                          <ChevronDown
                            className={`ml-auto h-4 w-4 transition-transform ${
                              isTemplatesOpen ? "-rotate-180" : "rotate-0"
                            }`}
                          />
                        </button>
                        {isTemplatesOpen && (
                          <div className="flex-1 min-h-0 overflow-auto px-3 pb-3 pt-1 text-xs text-muted-foreground space-y-1">
                            {templateFiles.length === 0 ? (
                              <div className="text-muted-foreground text-xs px-1">
                                No templates yet
                              </div>
                            ) : (
                              templateFiles.map((f) => (
                                <div
                                  key={f.path}
                                  className="relative group rounded-sm"
                                >
                                  <button
                                    className={`w-full text-left rounded-sm px-2 py-1 pr-8 text-foreground ${selectedPath === f.path && selectedKind === "template" ? "bg-blue-500/20 ring-1 ring-blue-400/40" : "hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20"}`}
                                    onClick={() =>
                                      handleSelectFile("template", f)
                                    }
                                    title={f.name}
                                  >
                                    <div className="truncate">{f.name}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {formatTemplateDate(f.createdAt)}
                                    </div>
                                  </button>
                                  <div className="absolute right-1 top-1 flex gap-1 opacity-80 group-hover:opacity-100">
                                    <button
                                      className="p-1 rounded hover:bg-white/10"
                                      title="Rename template"
                                      aria-label="Rename template"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameDialog({
                                          kind: "template",
                                          file: f,
                                        });
                                        setRenameInput(f.name);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1 rounded hover:bg-white/10"
                                      title="Delete template"
                                      aria-label="Delete template"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({
                                          kind: "template",
                                          file: f,
                                        });
                                      }}
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-2">
                      {selectedFolder && (
                        <div className="mt-2 text-[11px] mb-4 text-muted-foreground line-clamp-2 break-all">
                          {(() => {
                            if (!selectedFolder) return null;
                            const parts = selectedFolder
                              .split(/[\\/]/)
                              .filter(Boolean);
                            if (parts.length === 0) return null;
                            const folder = parts[parts.length - 1];
                            const parent =
                              parts.length > 1 ? parts[parts.length - 2] : "";
                            return parent ? `${parent}/${folder}` : folder;
                          })()}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleChooseFolder}
                          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-sidebar-border text-sm px-3 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-zinc-950/40 to-zinc-900/10 hover:from-zinc-950/50 hover:to-zinc-900 transition-colors relative overflow-hidden after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]"
                          title={
                            hasBridge
                              ? selectedFolder || "Choose a folder"
                              : "Run the desktop app (npm run dev/start) to pick a folder"
                          }
                          disabled={!hasBridge}
                        >
                          <Folder className="h-4 w-4 relative z-10" />
                          <span className="relative z-10">Folder</span>
                        </button>
                        <button
                          onClick={openBackgrounds}
                          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-sidebar-border text-sm px-3 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-b from-zinc-950/40 to-zinc-900/10 hover:from-zinc-950/50 hover:to-zinc-900 transition-colors relative overflow-hidden after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]"
                          title={
                            selectedFolder
                              ? "Pick background"
                              : "Choose a folder first"
                          }
                          disabled={!selectedFolder}
                        >
                          <ImageIcon className="h-4 w-4 relative z-10 shrink-0 -translate-y-0.5" />
                          <span className="relative z-10">Background</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => setIsAboutOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md border border-sidebar-border text-sm px-3 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-500/15 hover:from-emerald-500/25 hover:via-cyan-500/25 hover:to-blue-500/25 transition-colors relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]"
                        title="About Open Task Tracker"
                      >
                        <Info className="h-3.5 w-3.5 relative z-10" />
                        <span className="relative z-10">About</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              {/* Caret overlay only when editing */}
              <GlobalRainbowCaret active={!!editing} />
            </motion.aside>
            {createPortal(
              <AnimatePresence>
                {isCreateTaskListOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setIsCreateTaskListOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[680px] max-w-[92vw] h-[460px] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(56,189,248,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(168,85,247,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">
                          Create task list
                        </h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setIsCreateTaskListOpen(false)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                        <aside className="w-40 shrink-0 pr-3 border-r border-white/10">
                          <ol className="space-y-2 text-sm">
                            <li>
                              <button
                                className={`w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                                  createStep === 1
                                    ? "bg-white/10 text-white"
                                    : "hover:bg-white/5 text-foreground"
                                }`}
                                onClick={() => setCreateStep(1)}
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px]">
                                  1
                                </span>
                                <span>Step 1</span>
                              </button>
                            </li>
                            <li>
                              <button
                                className={`w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                                  createSource === "scratch"
                                    ? "opacity-50 cursor-not-allowed"
                                    : createStep === 2
                                      ? "bg-white/10 text-white"
                                      : "hover:bg-white/5 text-foreground"
                                }`}
                                onClick={() => {
                                  if (createSource === "scratch") return;
                                  setCreateStep(2);
                                }}
                                aria-disabled={createSource === "scratch"}
                                title={
                                  createSource === "scratch"
                                    ? "Locked for scratch"
                                    : undefined
                                }
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px]">
                                  2
                                </span>
                                <span>Step 2</span>
                                {createSource === "scratch" && (
                                  <LockClosedIcon className="ml-auto h-4 w-4 opacity-80" />
                                )}
                              </button>
                            </li>
                            <li>
                              <button
                                className={`w-full inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left ${
                                  createStep === 3
                                    ? "bg-white/10 text-white"
                                    : "hover:bg-white/5 text-foreground"
                                }`}
                                onClick={() => setCreateStep(3)}
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px]">
                                  3
                                </span>
                                <span>Step 3</span>
                              </button>
                            </li>
                          </ol>
                        </aside>
                        <div className="relative flex-1 min-w-0 text-sm overflow-hidden">
                          <AnimatePresence mode="wait">
                            {createStep === 1 && (
                              <motion.div
                                key="step-1"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="absolute inset-0 flex flex-col"
                              >
                                <div className="flex-1 min-h-0 overflow-auto pr-1">
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        className="group rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors text-left"
                                        onClick={() => {
                                          setCreateSource("template");
                                          setCreateStep(2);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <LayoutGrid className="h-4 w-4 opacity-80" />
                                          <span className="font-medium">
                                            From template
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Pick a template and create today's
                                          list
                                        </div>
                                      </button>
                                      <button
                                        className="group rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors text-left"
                                        onClick={() => {
                                          setCreateSource("previous");
                                          setCreateStep(2);
                                        }}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <History className="h-4 w-4 opacity-80" />
                                          <span className="font-medium">
                                            From previous list
                                          </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Copy a recent daily list
                                        </div>
                                      </button>
                                    </div>
                                    <button
                                      className="group rounded-lg border border-white/10 bg-white/[0.02] p-3 w-full hover:bg-white/[0.04] transition-colors text-left"
                                      onClick={() => {
                                        setCreateSource("scratch");
                                        setCreateStep(3);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <FilePlus className="h-4 w-4 opacity-80" />
                                        <span className="font-medium">
                                          From scratch
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Start with an empty list
                                      </div>
                                    </button>
                                  </div>
                                </div>
                                <hr className="border-t border-white/10 mt-3" />
                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5"
                                    onClick={() =>
                                      setIsCreateTaskListOpen(false)
                                    }
                                  >
                                    Back
                                  </button>
                                  <div className="text-[11px] text-muted-foreground">
                                    Step 1 of 3
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            {createStep === 2 && (
                              <motion.div
                                key="step-2"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="absolute inset-0 flex flex-col"
                              >
                                <div className="flex-1 min-h-0 overflow-auto pr-1">
                                  <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground px-1">
                                      {createSource === "template"
                                        ? "Choose a template"
                                        : "Choose a previous list"}
                                    </div>
                                    <div className="h-64 overflow-auto rounded-md border border-white/10 bg-white/[0.02] p-1.5 space-y-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                                      {createSource === "template" ? (
                                        (templateFiles || []).length === 0 ? (
                                          <div className="text-muted-foreground text-xs px-1">
                                            No templates yet
                                          </div>
                                        ) : (
                                          templateFiles.map((f) => (
                                            <button
                                              key={f.path}
                                              className="w-full text-left rounded-sm px-2 py-1 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20"
                                              onClick={() =>
                                                handleSelectTemplateForCreate(f)
                                              }
                                              title={f.name}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="truncate">
                                                  {f.name}
                                                </span>
                                                <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
                                                  {formatTemplateDate(
                                                    f.createdAt
                                                  )}
                                                </span>
                                              </div>
                                            </button>
                                          ))
                                        )
                                      ) : (dailyTaskFiles || []).length ===
                                        0 ? (
                                        <div className="text-muted-foreground text-xs px-1">
                                          No daily lists yet
                                        </div>
                                      ) : (
                                        dailyTaskFiles.map((f) => (
                                          <button
                                            key={f.path}
                                            className="w-full text-left rounded-sm px-2 py-1 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-white/20"
                                            onClick={() =>
                                              handleSelectPreviousForCreate(f)
                                            }
                                            title={f.name}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="truncate">
                                                {f.name}
                                              </span>
                                              <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
                                                {formatTemplateDate(
                                                  f.createdAt
                                                )}
                                              </span>
                                            </div>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <hr className="border-t border-white/10 mt-3" />
                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5"
                                    onClick={() => setCreateStep(1)}
                                  >
                                    Back
                                  </button>
                                  <div className="text-[11px] text-muted-foreground">
                                    Step 2 of 3
                                  </div>
                                </div>
                              </motion.div>
                            )}
                            {createStep === 3 && (
                              <motion.div
                                key="step-3"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="absolute inset-0 flex flex-col"
                              >
                                <div className="flex-1 min-h-0 overflow-auto pr-1">
                                  <div className="space-y-2">
                                    {createSource === "template" ? (
                                      <>
                                        <div className="text-xs text-muted-foreground px-1">
                                          Template:{" "}
                                          <span className="text-foreground">
                                            {selectedTemplateForCreate?.name}
                                          </span>
                                        </div>
                                        <label className="block text-xs px-1">
                                          Name your task list
                                        </label>
                                        <input
                                          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20"
                                          value={newTaskListName}
                                          onChange={(e) =>
                                            setNewTaskListName(e.target.value)
                                          }
                                          ref={nameInputRef}
                                          placeholder="e.g. Aug31"
                                        />
                                      </>
                                    ) : createSource === "previous" ? (
                                      <>
                                        <div className="text-xs text-muted-foreground px-1">
                                          Previous:{" "}
                                          <span className="text-foreground">
                                            {selectedPreviousForCreate?.name}
                                          </span>
                                        </div>
                                        <label className="block text-xs px-1">
                                          Name your task list
                                        </label>
                                        <input
                                          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20"
                                          value={newTaskListName}
                                          onChange={(e) =>
                                            setNewTaskListName(e.target.value)
                                          }
                                          ref={nameInputRef}
                                          placeholder="e.g. Aug31"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        <div className="text-xs text-muted-foreground px-1">
                                          Starting from scratch
                                        </div>
                                        <label className="block text-xs px-1">
                                          Name your task list
                                        </label>
                                        <input
                                          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20"
                                          value={newTaskListName}
                                          onChange={(e) =>
                                            setNewTaskListName(e.target.value)
                                          }
                                          ref={nameInputRef}
                                          placeholder="e.g. Aug31"
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>
                                <hr className="border-t border-white/10 mt-3" />
                                <div className="flex items-center justify-between pt-2">
                                  <button
                                    className="text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5"
                                    onClick={() =>
                                      setCreateStep(
                                        createSource === "scratch" ? 1 : 2
                                      )
                                    }
                                  >
                                    Back
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <div className="text-[11px] text-muted-foreground mr-2">
                                      Step 3 of 3
                                    </div>
                                    <button
                                      className="text-xs px-3 py-1 rounded border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
                                      onClick={
                                        createSource === "template"
                                          ? createTaskListFromTemplate
                                          : createSource === "previous"
                                            ? createTaskListFromPrevious
                                            : createTaskListFromScratch
                                      }
                                      disabled={
                                        isCreating ||
                                        !newTaskListName.trim() ||
                                        (createSource === "template"
                                          ? !selectedTemplateForCreate
                                          : createSource === "previous"
                                            ? !selectedPreviousForCreate
                                            : false)
                                      }
                                    >
                                      {isCreating ? "Creating..." : "Create"}
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {createPortal(
              <AnimatePresence>
                {deleteConfirm && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setDeleteConfirm(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[460px] max-w-[92vw] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(248,113,113,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(168,85,247,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">
                          Confirm delete
                        </h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setDeleteConfirm(null)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {deleteConfirm?.kind === "task"
                          ? "Delete this task list? This action cannot be undone."
                          : "Delete this template? This action cannot be undone."}
                      </div>
                      <div className="text-xs mb-4">
                        <span className="text-muted-foreground">Name:</span>{" "}
                        <span className="text-foreground">
                          {deleteConfirm?.file.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/5"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded border border-red-500/40 bg-red-500/20 hover:bg-red-500/30"
                          onClick={confirmDeleteNow}
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {createPortal(
              <AnimatePresence>
                {renameDialog && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setRenameDialog(null)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[460px] max-w-[92vw] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(99,102,241,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(20,184,166,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">
                          Rename{" "}
                          {renameDialog.kind === "task"
                            ? "task list"
                            : "template"}
                        </h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setRenameDialog(null)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Current name:{" "}
                        <span className="text-foreground">
                          {renameDialog.file.name}
                        </span>
                      </div>
                      <label className="block text-xs px-0 mb-1">
                        New name
                      </label>
                      <input
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        placeholder="Enter a new name"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <button
                          className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/5"
                          onClick={() => setRenameDialog(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
                          disabled={isRenaming || !renameInput.trim()}
                          onClick={async () => {
                            if (!renameDialog) return;
                            const base = sanitizeFileName(renameInput);
                            if (!base) return;
                            try {
                              setIsRenaming(true);
                              const res = await (
                                window as any
                              ).api?.renameJsonFile?.(
                                renameDialog.file.path,
                                base
                              );
                              if (!res || !res.ok || !res.newFullPath) {
                                setIsRenaming(false);
                                return;
                              }
                              // Update the internal document name too
                              try {
                                const data = await (
                                  window as any
                                ).api?.readJsonFile?.(res.newFullPath);
                                if (data && typeof data === "object") {
                                  data.name = base;
                                  await (window as any).api?.writeJsonFile?.(
                                    res.newFullPath,
                                    data
                                  );
                                }
                              } catch {}

                              // Refresh lists and update selection if needed
                              if (renameDialog.kind === "task") {
                                await refreshDailyTasks();
                              } else {
                                await refreshTemplates();
                              }
                              if (selectedPath === renameDialog.file.path) {
                                setSelectedPath(res.newFullPath);
                              }
                              setRenameDialog(null);
                              setIsRenaming(false);
                            } catch {
                              setIsRenaming(false);
                            }
                          }}
                        >
                          {isRenaming ? "Renaming..." : "Rename"}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {createPortal(
              <AnimatePresence>
                {isBackgroundsOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setIsBackgroundsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[960px] max-w-[94vw] h-[600px] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(56,189,248,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(168,85,247,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Backgrounds</h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setIsBackgroundsOpen(false)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-auto">
                        {isLoadingBackgrounds ? (
                          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                            Loading...
                          </div>
                        ) : backgroundImages.length === 0 ? (
                          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                            No images found in backgrounds folder
                          </div>
                        ) : (
                          <div className="grid grid-cols-6 gap-3 p-1">
                            {backgroundImages.map((img) => (
                              <button
                                key={img.fullPath}
                                className="group relative rounded-xl overflow-hidden aspect-square border border-white/10 bg-white/[0.03] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)] hover:ring-1 hover:ring-white/30"
                                title={img.fileName}
                                onClick={() =>
                                  chooseBackground(
                                    img.fullPath,
                                    img.fileName,
                                    img.url
                                  )
                                }
                              >
                                <img
                                  src={img.url}
                                  alt={img.fileName}
                                  className="w-full h-full object-cover"
                                  draggable={false}
                                />
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {createPortal(
              <AnimatePresence>
                {isAboutOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setIsAboutOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[520px] max-w-[92vw] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(59,130,246,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(16,185,129,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">About</h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setIsAboutOpen(false)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <AboutContent />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {createPortal(
              <AnimatePresence>
                {isSaveTemplateOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      onClick={() => setIsSaveTemplateOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98, y: 4 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="relative z-[101] w-[460px] max-w-[92vw] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-950/60 via-zinc-900/50 to-black/40 p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 overflow-hidden before:content-[''] before:pointer-events-none before:absolute before:inset-[-1px] before:rounded-2xl before:bg-[radial-gradient(65%_80%_at_85%_5%,_rgba(59,130,246,0.18)_0%,_transparent_60%),radial-gradient(60%_70%_at_10%_0%,_rgba(16,185,129,0.16)_0%,_transparent_55%)] before:opacity-[0.18] before:blur-xl after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[image:radial-gradient(#ffffff_0.5px,_transparent_0)] after:bg-[size:4px_4px] after:bg-repeat after:bg-right after:opacity-[0.03] after:[mask-image:radial-gradient(80%_60%_at_50%_0%,_black,_transparent)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">
                          Save as template
                        </h3>
                        <button
                          className="p-1 rounded hover:bg-white/5"
                          onClick={() => setIsSaveTemplateOpen(false)}
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <label className="block text-xs px-0 mb-1">
                        Template name
                      </label>
                      <input
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-white/20"
                        value={saveTemplateInput}
                        onChange={(e) => setSaveTemplateInput(e.target.value)}
                        placeholder="Enter a template name"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <button
                          className="text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/5"
                          onClick={() => setIsSaveTemplateOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
                          disabled={
                            isSavingTemplate || !saveTemplateInput.trim()
                          }
                          onClick={performSaveTemplate}
                        >
                          {isSavingTemplate ? "Creating..." : "Create"}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>,
              document.body
            )}

            {/* Two equal panels taking remaining width */}
            <div className="flex-1 h-full  overflow-hidden p-3">
              <div className="relative w-full h-full rounded-xl border border-border bg-secondary/10 backdrop-blur-md overflow-hidden">
                <div className="flex h-full w-full">
                  <section className="flex-1 min-w-0 h-full border-r border-border bg-black/50 backdrop-blur-md">
                    <div className="h-12 border-b border-border px-4 flex items-center justify-between">
                      <h2 className="text-sm font-medium">
                        {selectedDoc ? selectedDoc.name : "Tasks"}
                      </h2>
                      {selectedDoc && (
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-purple-500/15 to-blue-500/15 hover:from-fuchsia-500/25 hover:via-purple-500/25 hover:to-blue-500/25 transition-colors relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]"
                            title="Save as template"
                            onClick={(e) => {
                              e.preventDefault();
                              openSaveTemplateDialog();
                            }}
                          >
                            <FilePlus className="h-3.5 w-3.5 relative z-10" />
                            <span className="relative z-10">
                              Save as template
                            </span>
                          </button>
                          <button
                            className="inline-flex items-center gap-2 h-8 rounded-md px-3 text-xs font-medium border border-white/10 bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-blue-500/15 hover:from-emerald-500/25 hover:via-cyan-500/25 hover:to-blue-500/25 transition-colors relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]"
                            title="Add group"
                            onClick={(e) => {
                              e.preventDefault();
                              addGroup();
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 relative z-10" />
                            <span className="relative z-10">
                              {(selectedDoc.type?.[0]?.toUpperCase() || "") +
                                (selectedDoc.type?.slice(1) || "")}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-sm space-y-3 overflow-auto h-[calc(100%-48px)]">
                      <AnimatePresence mode="wait">
                        {!selectedDoc ? (
                          <motion.div
                            key="no-doc"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                            className="text-muted-foreground"
                          >
                            Select a task or template from the sidebar
                          </motion.div>
                        ) : (
                          (selectedDoc.taskGroups || []).map((group) => (
                            <motion.div
                              key={group.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.2 }}
                              className="rounded-md border border-white/10 bg-white/[0.03] backdrop-blur-md"
                            >
                              <div className="flex items-center gap-2 px-3 h-9">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    className="p-1 rounded hover:bg-white/5"
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={!!openGroupIds[group.id]}
                                    aria-label={
                                      openGroupIds[group.id]
                                        ? "Collapse group"
                                        : "Expand group"
                                    }
                                    title={
                                      openGroupIds[group.id]
                                        ? "Collapse group"
                                        : "Expand group"
                                    }
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${openGroupIds[group.id] ? "-rotate-180" : "rotate-0"}`}
                                    />
                                  </button>
                                  <span className="font-medium whitespace-pre-wrap break-words">
                                    {editing &&
                                    editing.kind === "group" &&
                                    editing.groupId === group.id &&
                                    editing.field === "name" ? (
                                      <div
                                        role="textbox"
                                        contentEditable
                                        suppressContentEditableWarning
                                        className="w-full bg-transparent text-sm text-muted-foreground rainbow-caret-hidden-caret shimmer-edit"
                                        data-editor-key={`${group.id}:name`}
                                        data-text={
                                          editValue || group.name || ""
                                        }
                                        onInput={(e) =>
                                          setEditValue(
                                            (e.currentTarget as HTMLDivElement)
                                              .innerText
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" &&
                                            !e.shiftKey
                                          ) {
                                            e.preventDefault();
                                            saveEdit(
                                              (
                                                e.currentTarget as HTMLDivElement
                                              ).innerText
                                            );
                                          }
                                          if (e.key === "Escape") {
                                            e.preventDefault();
                                            cancelEdit();
                                          }
                                        }}
                                      >
                                        {group.name}
                                      </div>
                                    ) : (
                                      <span
                                        className={
                                          shimmerOnceKeys[`${group.id}:name`]
                                            ? "shimmer-once"
                                            : undefined
                                        }
                                        data-text={group.name}
                                        onDoubleClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          startEdit(
                                            {
                                              kind: "group",
                                              groupId: group.id,
                                              field: "name",
                                            },
                                            group.name || ""
                                          );
                                        }}
                                        onAnimationEnd={() =>
                                          setShimmerOnceKeys((prev) => {
                                            const next = { ...prev };
                                            delete next[`${group.id}:name`];
                                            return next;
                                          })
                                        }
                                      >
                                        {group.name}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="ml-auto inline-flex items-center gap-1">
                                  <button
                                    className="p-1 rounded hover:bg-white/5"
                                    title="Add task"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      addTask(group.id);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                  <button
                                    className="p-1 rounded hover:bg-white/5"
                                    title="Delete group"
                                    aria-label="Delete group"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      deleteGroup(group.id);
                                    }}
                                  >
                                    <TrashIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </div>
                              </div>
                              {openGroupIds[group.id] && (
                                <div className="px-3 pb-3 space-y-2">
                                  {group.tasks?.length ? (
                                    group.tasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className="relative overflow-hidden rounded border border-sidebar-border/40"
                                      >
                                        <div className="flex items-start gap-2 px-3 py-2">
                                          <div className="self-start">
                                            <Checkbox
                                              id={`task-${task.id}`}
                                              checked={!!task.isComplete}
                                              onCheckedChange={(v) =>
                                                updateTaskCompletion(
                                                  group.id,
                                                  task.id,
                                                  v
                                                )
                                              }
                                            >
                                              <Checkbox.Indicator />
                                            </Checkbox>
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div
                                              className="whitespace-pre-wrap break-words text-foreground"
                                              onDoubleClick={() =>
                                                startEdit(
                                                  {
                                                    kind: "task",
                                                    groupId: group.id,
                                                    taskId: task.id,
                                                    field: "name",
                                                  },
                                                  task.name
                                                )
                                              }
                                            >
                                              {editing &&
                                              editing.kind === "task" &&
                                              editing.groupId === group.id &&
                                              editing.taskId === task.id &&
                                              editing.field === "name" ? (
                                                <div
                                                  role="textbox"
                                                  contentEditable
                                                  suppressContentEditableWarning
                                                  className="w-full bg-transparent text-sm text-muted-foreground rainbow-caret-hidden-caret shimmer-edit"
                                                  data-editor-key={`${group.id}:${task.id}:name`}
                                                  data-text={
                                                    editValue || task.name
                                                  }
                                                  onInput={(e) =>
                                                    setEditValue(
                                                      (
                                                        e.currentTarget as HTMLDivElement
                                                      ).innerText
                                                    )
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" &&
                                                      !e.shiftKey
                                                    ) {
                                                      e.preventDefault();
                                                      saveEdit(
                                                        (
                                                          e.currentTarget as HTMLDivElement
                                                        ).innerText
                                                      );
                                                    }
                                                    if (e.key === "Escape") {
                                                      e.preventDefault();
                                                      cancelEdit();
                                                    }
                                                  }}
                                                >
                                                  {task.name}
                                                </div>
                                              ) : (
                                                <span
                                                  className={
                                                    shimmerOnceKeys[
                                                      `${group.id}:${task.id}:name`
                                                    ]
                                                      ? "shimmer-once"
                                                      : undefined
                                                  }
                                                  data-text={task.name}
                                                  onAnimationEnd={() =>
                                                    setShimmerOnceKeys(
                                                      (prev) => {
                                                        const next = {
                                                          ...prev,
                                                        };
                                                        delete next[
                                                          `${group.id}:${task.id}:name`
                                                        ];
                                                        return next;
                                                      }
                                                    )
                                                  }
                                                >
                                                  {task.name}
                                                </span>
                                              )}
                                            </div>
                                            <div
                                              className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words"
                                              onDoubleClick={() =>
                                                startEdit(
                                                  {
                                                    kind: "task",
                                                    groupId: group.id,
                                                    taskId: task.id,
                                                    field: "description",
                                                  },
                                                  task.description || ""
                                                )
                                              }
                                            >
                                              {editing &&
                                              editing.kind === "task" &&
                                              editing.groupId === group.id &&
                                              editing.taskId === task.id &&
                                              editing.field ===
                                                "description" ? (
                                                <div
                                                  role="textbox"
                                                  contentEditable
                                                  suppressContentEditableWarning
                                                  className="w-full bg-transparent text-[11px] text-muted-foreground whitespace-pre-wrap break-words rainbow-caret-hidden-caret shimmer-edit"
                                                  data-editor-key={`${group.id}:${task.id}:description`}
                                                  data-text={
                                                    editValue ||
                                                    task.description ||
                                                    ""
                                                  }
                                                  onInput={(e) =>
                                                    setEditValue(
                                                      (
                                                        e.currentTarget as HTMLDivElement
                                                      ).innerText
                                                    )
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" &&
                                                      !e.shiftKey
                                                    ) {
                                                      e.preventDefault();
                                                      saveEdit(
                                                        (
                                                          e.currentTarget as HTMLDivElement
                                                        ).innerText
                                                      );
                                                    }
                                                    if (e.key === "Escape") {
                                                      e.preventDefault();
                                                      cancelEdit();
                                                    }
                                                  }}
                                                >
                                                  {task.description || ""}
                                                </div>
                                              ) : task.description ? (
                                                <span
                                                  className={
                                                    shimmerOnceKeys[
                                                      `${group.id}:${task.id}:description`
                                                    ]
                                                      ? "shimmer-once"
                                                      : undefined
                                                  }
                                                  data-text={task.description}
                                                  onAnimationEnd={() =>
                                                    setShimmerOnceKeys(
                                                      (prev) => {
                                                        const next = {
                                                          ...prev,
                                                        };
                                                        delete next[
                                                          `${group.id}:${task.id}:description`
                                                        ];
                                                        return next;
                                                      }
                                                    )
                                                  }
                                                >
                                                  {task.description}
                                                </span>
                                              ) : (
                                                <div className="mt-0.5">
                                                  <button
                                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                    onClick={() =>
                                                      startEdit(
                                                        {
                                                          kind: "task",
                                                          groupId: group.id,
                                                          taskId: task.id,
                                                          field: "description",
                                                        },
                                                        task.description || ""
                                                      )
                                                    }
                                                    title="Add description"
                                                  >
                                                    Add description
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                            {task.notes ? (
                                              <div className="mt-1">
                                                <button
                                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                  onClick={() =>
                                                    toggleTaskNotes(task.id)
                                                  }
                                                  aria-expanded={
                                                    !!openTaskNotesIds[task.id]
                                                  }
                                                  title="Toggle notes"
                                                >
                                                  Notes
                                                  <ChevronDown
                                                    className={`h-3 w-3 transition-transform ${openTaskNotesIds[task.id] ? "-rotate-180" : "rotate-0"}`}
                                                  />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="mt-1">
                                                <button
                                                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                  onClick={() =>
                                                    startEdit(
                                                      {
                                                        kind: "task",
                                                        groupId: group.id,
                                                        taskId: task.id,
                                                        field: "notes",
                                                      },
                                                      task.notes || ""
                                                    )
                                                  }
                                                  title="Add notes"
                                                >
                                                  Add notes
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                          <div className="ml-auto inline-flex items-center gap-2">
                                            <button
                                              className="p-0.5 rounded hover:bg-white/5"
                                              title={
                                                task.recycle
                                                  ? "Recycling on"
                                                  : "Recycling off"
                                              }
                                              onClick={(e) => {
                                                e.preventDefault();
                                                toggleTaskRecycle(
                                                  group.id,
                                                  task.id
                                                );
                                              }}
                                            >
                                              <RecycleIcon
                                                className={`h-3.5 w-3.5 ${task.recycle ? "text-green-400" : "text-muted-foreground"} hover:text-foreground`}
                                              />
                                            </button>
                                            <button
                                              className="p-0.5 rounded hover:bg-white/5"
                                              title="Add subtask"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                addSubtask(group.id, task.id);
                                              }}
                                            >
                                              <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                            </button>
                                            <button
                                              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                                              onClick={() =>
                                                toggleTaskSubtasks(task.id)
                                              }
                                              aria-expanded={
                                                !!openTaskIds[task.id]
                                              }
                                              title="Toggle subtasks"
                                            >
                                              <ChevronDown
                                                className={`h-4 w-4 transition-transform ${openTaskIds[task.id] ? "-rotate-180" : "rotate-0"}`}
                                              />
                                            </button>
                                            <button
                                              className="p-0.5 rounded hover:bg-white/5"
                                              title="Delete task"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                deleteTask(group.id, task.id);
                                              }}
                                            >
                                              <TrashIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                            </button>
                                          </div>
                                        </div>
                                        {openTaskNotesIds[task.id] &&
                                          ((task.notes &&
                                            task.notes.trim() !== "") ||
                                            (editing &&
                                              editing.kind === "task" &&
                                              editing.groupId === group.id &&
                                              editing.taskId === task.id &&
                                              editing.field === "notes")) && (
                                            <div
                                              className="px-3 pb-2 pl-10"
                                              ref={(el) => {
                                                taskNotesRefs.current[task.id] =
                                                  el;
                                              }}
                                            >
                                              <div className="relative overflow-hidden rounded-md border border-sidebar-border/50 p-3 text-xs bg-gradient-to-br from-green-950/40 via-green-900/10 to-cyan-900/10 after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#ffffff_1px,_transparent_0)] after:bg-[size:6px_6px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]">
                                                <div className="flex items-center justify-between mb-1">
                                                  <div className="font-medium text-[11px] uppercase tracking-wide text-muted-foreground">
                                                    Notes
                                                  </div>
                                                  <button
                                                    className="p-0.5  rounded hover:bg-white/5 -translate-y-1 translate-x-1"
                                                    title="Delete notes"
                                                    onClick={async (e) => {
                                                      e.preventDefault();
                                                      // clear notes and persist
                                                      const nowIso =
                                                        new Date().toISOString();
                                                      setSelectedDoc((prev) => {
                                                        if (!prev) return prev;
                                                        const next: TaskDocument =
                                                          {
                                                            ...prev,
                                                            updatedAt: nowIso,
                                                            taskGroups:
                                                              prev.taskGroups.map(
                                                                (g) =>
                                                                  g.id !==
                                                                  group.id
                                                                    ? g
                                                                    : {
                                                                        ...g,
                                                                        tasks:
                                                                          g.tasks.map(
                                                                            (
                                                                              t
                                                                            ) =>
                                                                              t.id !==
                                                                              task.id
                                                                                ? t
                                                                                : {
                                                                                    ...t,
                                                                                    notes:
                                                                                      null,
                                                                                    updatedAt:
                                                                                      nowIso,
                                                                                  }
                                                                          ),
                                                                      }
                                                              ),
                                                          };
                                                        // optimistic UI; persist async
                                                        (async () => {
                                                          try {
                                                            if (selectedPath) {
                                                              await window.api?.writeJsonFile?.(
                                                                selectedPath,
                                                                next
                                                              );
                                                            }
                                                          } catch (err) {
                                                            console.error(
                                                              "Failed to write JSON:",
                                                              err
                                                            );
                                                          }
                                                        })();
                                                        setOpenTaskNotesIds(
                                                          (prev) => ({
                                                            ...prev,
                                                            [task.id]: false,
                                                          })
                                                        );
                                                        return next;
                                                      });
                                                    }}
                                                  >
                                                    <TrashIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                  </button>
                                                </div>
                                                <div
                                                  className="whitespace-pre-wrap break-words text-foreground/90"
                                                  onDoubleClick={() =>
                                                    startEdit(
                                                      {
                                                        kind: "task",
                                                        groupId: group.id,
                                                        taskId: task.id,
                                                        field: "notes",
                                                      },
                                                      task.notes || ""
                                                    )
                                                  }
                                                >
                                                  {editing &&
                                                  editing.kind === "task" &&
                                                  editing.groupId ===
                                                    group.id &&
                                                  editing.taskId === task.id &&
                                                  editing.field === "notes" ? (
                                                    <div
                                                      role="textbox"
                                                      contentEditable
                                                      suppressContentEditableWarning
                                                      className="w-full bg-transparent text-xs text-muted-foreground whitespace-pre-wrap break-words rainbow-caret-hidden-caret shimmer-edit"
                                                      data-editor-key={`${group.id}:${task.id}:notes`}
                                                      data-text={
                                                        editValue ||
                                                        task.notes ||
                                                        ""
                                                      }
                                                      onInput={(e) =>
                                                        setEditValue(
                                                          (
                                                            e.currentTarget as HTMLDivElement
                                                          ).innerText
                                                        )
                                                      }
                                                      onKeyDown={(e) => {
                                                        if (
                                                          e.key === "Enter" &&
                                                          !e.shiftKey
                                                        ) {
                                                          e.preventDefault();
                                                          saveEdit(
                                                            (
                                                              e.currentTarget as HTMLDivElement
                                                            ).innerText
                                                          );
                                                        }
                                                        if (
                                                          e.key === "Escape"
                                                        ) {
                                                          e.preventDefault();
                                                          cancelEdit();
                                                        }
                                                      }}
                                                    >
                                                      {task.notes || ""}
                                                    </div>
                                                  ) : (
                                                    <span
                                                      className={
                                                        shimmerOnceKeys[
                                                          `${group.id}:${task.id}:notes`
                                                        ]
                                                          ? "shimmer-once"
                                                          : undefined
                                                      }
                                                      data-text={task.notes}
                                                      onAnimationEnd={() =>
                                                        setShimmerOnceKeys(
                                                          (prev) => {
                                                            const next = {
                                                              ...prev,
                                                            };
                                                            delete next[
                                                              `${group.id}:${task.id}:notes`
                                                            ];
                                                            return next;
                                                          }
                                                        )
                                                      }
                                                    >
                                                      {task.notes}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        {task.subTasks?.length > 0 &&
                                          openTaskIds[task.id] && (
                                            <div className="relative px-3 pb-2 space-y-1 pl-8">
                                              <div
                                                className="pointer-events-none absolute left-[1.375rem] bottom-2 border-l  border-white/50"
                                                style={{
                                                  top: -(
                                                    BASE_CONNECTOR_OVERLAP_PX +
                                                    (openTaskNotesIds[task.id]
                                                      ? taskNotesHeights[
                                                          task.id
                                                        ] || 0
                                                      : 0)
                                                  ),
                                                }}
                                              ></div>
                                              {task.subTasks.map((s) => (
                                                <div
                                                  key={s.id}
                                                  className="relative flex items-start gap-2 px-2 py-1 text-xs rounded hover:bg-sidebar-accent/20"
                                                >
                                                  <button
                                                    className="absolute top-1 right-1 p-0.5 rounded hover:bg-white/5"
                                                    title="Delete subtask"
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      deleteSubtask(
                                                        group.id,
                                                        task.id,
                                                        s.id
                                                      );
                                                    }}
                                                  >
                                                    <TrashIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                  </button>
                                                  <span className="relative block w-6 h-5">
                                                    <span className="absolute inset-y-1/2 -translate-y-1/2 -left-4.5 right-0 border-t  border-white/50"></span>
                                                  </span>
                                                  <Checkbox
                                                    id={`subtask-${s.id}`}
                                                    checked={!!s.isComplete}
                                                    onCheckedChange={(v) =>
                                                      updateSubtaskCompletion(
                                                        group.id,
                                                        task.id,
                                                        s.id,
                                                        v
                                                      )
                                                    }
                                                  >
                                                    <Checkbox.Indicator />
                                                  </Checkbox>
                                                  <div className="min-w-0 flex-1">
                                                    <div
                                                      className="whitespace-pre-wrap break-words"
                                                      title={s.name}
                                                      onDoubleClick={() =>
                                                        startEdit(
                                                          {
                                                            kind: "subtask",
                                                            groupId: group.id,
                                                            taskId: task.id,
                                                            subTaskId: s.id,
                                                            field: "name",
                                                          },
                                                          s.name
                                                        )
                                                      }
                                                    >
                                                      {editing &&
                                                      editing.kind ===
                                                        "subtask" &&
                                                      editing.groupId ===
                                                        group.id &&
                                                      editing.taskId ===
                                                        task.id &&
                                                      (editing as any)
                                                        .subTaskId === s.id &&
                                                      editing.field ===
                                                        "name" ? (
                                                        <div
                                                          role="textbox"
                                                          contentEditable
                                                          suppressContentEditableWarning
                                                          className="w-full bg-transparent text-xs text-muted-foreground rainbow-caret-hidden-caret shimmer-edit"
                                                          data-editor-key={`${group.id}:${task.id}:${s.id}:name`}
                                                          data-text={
                                                            editValue || s.name
                                                          }
                                                          onInput={(e) =>
                                                            setEditValue(
                                                              (
                                                                e.currentTarget as HTMLDivElement
                                                              ).innerText
                                                            )
                                                          }
                                                          onKeyDown={(e) => {
                                                            if (
                                                              e.key ===
                                                                "Enter" &&
                                                              !e.shiftKey
                                                            ) {
                                                              e.preventDefault();
                                                              saveEdit(
                                                                (
                                                                  e.currentTarget as HTMLDivElement
                                                                ).innerText
                                                              );
                                                            }
                                                            if (
                                                              e.key === "Escape"
                                                            ) {
                                                              e.preventDefault();
                                                              cancelEdit();
                                                            }
                                                          }}
                                                        >
                                                          {s.name}
                                                        </div>
                                                      ) : (
                                                        <span
                                                          className={
                                                            shimmerOnceKeys[
                                                              `${group.id}:${task.id}:${s.id}:name`
                                                            ]
                                                              ? "shimmer-once"
                                                              : undefined
                                                          }
                                                          data-text={s.name}
                                                          onAnimationEnd={() =>
                                                            setShimmerOnceKeys(
                                                              (prev) => {
                                                                const next = {
                                                                  ...prev,
                                                                };
                                                                delete next[
                                                                  `${group.id}:${task.id}:${s.id}:name`
                                                                ];
                                                                return next;
                                                              }
                                                            )
                                                          }
                                                        >
                                                          {s.name}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div
                                                      className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words"
                                                      onDoubleClick={() =>
                                                        startEdit(
                                                          {
                                                            kind: "subtask",
                                                            groupId: group.id,
                                                            taskId: task.id,
                                                            subTaskId: s.id,
                                                            field:
                                                              "description",
                                                          },
                                                          s.description || ""
                                                        )
                                                      }
                                                    >
                                                      {editing &&
                                                      editing.kind ===
                                                        "subtask" &&
                                                      editing.groupId ===
                                                        group.id &&
                                                      editing.taskId ===
                                                        task.id &&
                                                      (editing as any)
                                                        .subTaskId === s.id &&
                                                      editing.field ===
                                                        "description" ? (
                                                        <div
                                                          role="textbox"
                                                          contentEditable
                                                          suppressContentEditableWarning
                                                          className="w-full bg-transparent text-[11px] text-muted-foreground whitespace-pre-wrap break-words rainbow-caret-hidden-caret shimmer-edit"
                                                          data-editor-key={`${group.id}:${task.id}:${s.id}:description`}
                                                          data-text={
                                                            editValue ||
                                                            s.description ||
                                                            ""
                                                          }
                                                          onInput={(e) =>
                                                            setEditValue(
                                                              (
                                                                e.currentTarget as HTMLDivElement
                                                              ).innerText
                                                            )
                                                          }
                                                          onKeyDown={(e) => {
                                                            if (
                                                              e.key ===
                                                                "Enter" &&
                                                              !e.shiftKey
                                                            ) {
                                                              e.preventDefault();
                                                              saveEdit(
                                                                (
                                                                  e.currentTarget as HTMLDivElement
                                                                ).innerText
                                                              );
                                                            }
                                                            if (
                                                              e.key === "Escape"
                                                            ) {
                                                              e.preventDefault();
                                                              cancelEdit();
                                                            }
                                                          }}
                                                        >
                                                          {s.description || ""}
                                                        </div>
                                                      ) : s.description ? (
                                                        <span
                                                          className={
                                                            shimmerOnceKeys[
                                                              `${group.id}:${task.id}:${s.id}:description`
                                                            ]
                                                              ? "shimmer-once"
                                                              : undefined
                                                          }
                                                          data-text={
                                                            s.description
                                                          }
                                                          onAnimationEnd={() =>
                                                            setShimmerOnceKeys(
                                                              (prev) => {
                                                                const next = {
                                                                  ...prev,
                                                                };
                                                                delete next[
                                                                  `${group.id}:${task.id}:${s.id}:description`
                                                                ];
                                                                return next;
                                                              }
                                                            )
                                                          }
                                                        >
                                                          {s.description}
                                                        </span>
                                                      ) : (
                                                        <div className="mt-0.5">
                                                          <button
                                                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                            onClick={() =>
                                                              startEdit(
                                                                {
                                                                  kind: "subtask",
                                                                  groupId:
                                                                    group.id,
                                                                  taskId:
                                                                    task.id,
                                                                  subTaskId:
                                                                    s.id,
                                                                  field:
                                                                    "description",
                                                                },
                                                                s.description ||
                                                                  ""
                                                              )
                                                            }
                                                            title="Add description"
                                                          >
                                                            Add description
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                    {s.notes ? (
                                                      <div className="mt-1">
                                                        <button
                                                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                          onClick={(e) => {
                                                            e.preventDefault();
                                                            toggleSubtaskNotes(
                                                              task.id,
                                                              s.id
                                                            );
                                                          }}
                                                          aria-expanded={
                                                            !!openSubtaskNotesIds[
                                                              `${task.id}:${s.id}`
                                                            ]
                                                          }
                                                          title="Toggle notes"
                                                        >
                                                          Notes
                                                          <ChevronDown
                                                            className={`h-3 w-3 transition-transform ${openSubtaskNotesIds[`${task.id}:${s.id}`] ? "-rotate-180" : "rotate-0"}`}
                                                          />
                                                        </button>
                                                      </div>
                                                    ) : (
                                                      <div className="mt-1">
                                                        <button
                                                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                                                          onClick={() =>
                                                            startEdit(
                                                              {
                                                                kind: "subtask",
                                                                groupId:
                                                                  group.id,
                                                                taskId: task.id,
                                                                subTaskId: s.id,
                                                                field: "notes",
                                                              },
                                                              s.notes || ""
                                                            )
                                                          }
                                                          title="Add notes"
                                                        >
                                                          Add notes
                                                        </button>
                                                      </div>
                                                    )}
                                                    {openSubtaskNotesIds[
                                                      `${task.id}:${s.id}`
                                                    ] &&
                                                      ((s.notes &&
                                                        s.notes.trim() !==
                                                          "") ||
                                                        (editing &&
                                                          editing.kind ===
                                                            "subtask" &&
                                                          editing.groupId ===
                                                            group.id &&
                                                          editing.taskId ===
                                                            task.id &&
                                                          (editing as any)
                                                            .subTaskId ===
                                                            s.id &&
                                                          editing.field ===
                                                            "notes")) && (
                                                        <div className="mt-1 relative overflow-hidden rounded-md border border-sidebar-border/50 p-2 bg-gradient-to-br from-violet-950/40 via-violet-900/10 to-indigo-900/10 after:content-[''] after:pointer-events-none after:absolute after:inset-0 after:rounded-md after:bg-[image:radial-gradient(#8aa2ed_1px,_transparent_0)] after:bg-[size:5px_5px] after:bg-repeat after:bg-right after:opacity-10 after:[mask-image:linear-gradient(to_left,black,transparent)]">
                                                          <div className="flex items-center justify-between mb-1">
                                                            <div className="font-medium text-[10px] uppercase tracking-wide text-muted-foreground">
                                                              Notes
                                                            </div>
                                                            <button
                                                              className="p-0.5 rounded hover:bg-white/5 -translate-y-1 translate-x-1"
                                                              title="Delete notes"
                                                              onClick={async (
                                                                e
                                                              ) => {
                                                                e.preventDefault();
                                                                const nowIso =
                                                                  new Date().toISOString();
                                                                setSelectedDoc(
                                                                  (prev) => {
                                                                    if (!prev)
                                                                      return prev;
                                                                    const next: TaskDocument =
                                                                      {
                                                                        ...prev,
                                                                        updatedAt:
                                                                          nowIso,
                                                                        taskGroups:
                                                                          prev.taskGroups.map(
                                                                            (
                                                                              g
                                                                            ) =>
                                                                              g.id !==
                                                                              group.id
                                                                                ? g
                                                                                : {
                                                                                    ...g,
                                                                                    tasks:
                                                                                      g.tasks.map(
                                                                                        (
                                                                                          t
                                                                                        ) =>
                                                                                          t.id !==
                                                                                          task.id
                                                                                            ? t
                                                                                            : {
                                                                                                ...t,
                                                                                                updatedAt:
                                                                                                  nowIso,
                                                                                                subTasks:
                                                                                                  (
                                                                                                    t.subTasks ||
                                                                                                    []
                                                                                                  ).map(
                                                                                                    (
                                                                                                      ss
                                                                                                    ) =>
                                                                                                      ss.id ===
                                                                                                      s.id
                                                                                                        ? {
                                                                                                            ...ss,
                                                                                                            notes:
                                                                                                              null,
                                                                                                            updatedAt:
                                                                                                              nowIso,
                                                                                                          }
                                                                                                        : ss
                                                                                                  ),
                                                                                              }
                                                                                      ),
                                                                                  }
                                                                          ),
                                                                      };
                                                                    (async () => {
                                                                      try {
                                                                        if (
                                                                          selectedPath
                                                                        ) {
                                                                          await window.api?.writeJsonFile?.(
                                                                            selectedPath,
                                                                            next
                                                                          );
                                                                        }
                                                                      } catch (err) {
                                                                        console.error(
                                                                          "Failed to write JSON:",
                                                                          err
                                                                        );
                                                                      }
                                                                    })();
                                                                    setOpenSubtaskNotesIds(
                                                                      (
                                                                        prevMap
                                                                      ) => ({
                                                                        ...prevMap,
                                                                        [`${task.id}:${s.id}`]: false,
                                                                      })
                                                                    );
                                                                    return next;
                                                                  }
                                                                );
                                                              }}
                                                            >
                                                              <TrashIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                            </button>
                                                          </div>
                                                          <div
                                                            className="text-[11px] whitespace-pre-wrap break-words text-foreground/90"
                                                            onDoubleClick={() =>
                                                              startEdit(
                                                                {
                                                                  kind: "subtask",
                                                                  groupId:
                                                                    group.id,
                                                                  taskId:
                                                                    task.id,
                                                                  subTaskId:
                                                                    s.id,
                                                                  field:
                                                                    "notes",
                                                                },
                                                                s.notes || ""
                                                              )
                                                            }
                                                          >
                                                            {editing &&
                                                            editing.kind ===
                                                              "subtask" &&
                                                            editing.groupId ===
                                                              group.id &&
                                                            editing.taskId ===
                                                              task.id &&
                                                            (editing as any)
                                                              .subTaskId ===
                                                              s.id &&
                                                            editing.field ===
                                                              "notes" ? (
                                                              <div
                                                                role="textbox"
                                                                contentEditable
                                                                suppressContentEditableWarning
                                                                className="w-full bg-transparent text-[11px] text-muted-foreground whitespace-pre-wrap break-words rainbow-caret-hidden-caret shimmer-edit"
                                                                data-editor-key={`${group.id}:${task.id}:${s.id}:notes`}
                                                                data-text={
                                                                  editValue ||
                                                                  s.notes ||
                                                                  ""
                                                                }
                                                                onInput={(e) =>
                                                                  setEditValue(
                                                                    (
                                                                      e.currentTarget as HTMLDivElement
                                                                    ).innerText
                                                                  )
                                                                }
                                                                onKeyDown={(
                                                                  e
                                                                ) => {
                                                                  if (
                                                                    e.key ===
                                                                      "Enter" &&
                                                                    !e.shiftKey
                                                                  ) {
                                                                    e.preventDefault();
                                                                    saveEdit(
                                                                      (
                                                                        e.currentTarget as HTMLDivElement
                                                                      )
                                                                        .innerText
                                                                    );
                                                                  }
                                                                  if (
                                                                    e.key ===
                                                                    "Escape"
                                                                  ) {
                                                                    e.preventDefault();
                                                                    cancelEdit();
                                                                  }
                                                                }}
                                                              >
                                                                {s.notes || ""}
                                                              </div>
                                                            ) : (
                                                              <span
                                                                className={
                                                                  shimmerOnceKeys[
                                                                    `${group.id}:${task.id}:${s.id}:notes`
                                                                  ]
                                                                    ? "shimmer-once"
                                                                    : undefined
                                                                }
                                                                data-text={
                                                                  s.notes
                                                                }
                                                                onAnimationEnd={() =>
                                                                  setShimmerOnceKeys(
                                                                    (prev) => {
                                                                      const next =
                                                                        {
                                                                          ...prev,
                                                                        };
                                                                      delete next[
                                                                        `${group.id}:${task.id}:${s.id}:notes`
                                                                      ];
                                                                      return next;
                                                                    }
                                                                  )
                                                                }
                                                              >
                                                                {s.notes}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-muted-foreground">
                                      No tasks
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                  <section className="flex-1 min-w-0 h-full bg-black/50 backdrop-blur-md">
                    <div className="flex flex-col h-full min-h-0">
                      <div className="h-1/3 border-b border-border">
                        <div className="h-12 border-b border-border px-4 flex items-center justify-between">
                          <h2 className="text-sm font-medium">Timer</h2>
                          <div className="flex items-center gap-2">
                            <button
                              className={`text-xs px-3 py-1 rounded-md border ${timerRunning ? "border-red-400/50 bg-red-500/20 hover:bg-red-500/30" : "border-emerald-400/50 bg-emerald-500/20 hover:bg-emerald-500/30"}`}
                              onClick={() => setTimerRunning((r) => !r)}
                            >
                              {timerRunning ? "Stop" : "Start"}
                            </button>
                          </div>
                        </div>
                        <div className="p-4 h-[calc(100%-48px)]">
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={
                                selectedDoc ? selectedDoc.id : "no-doc-timer"
                              }
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.18 }}
                              className="h-full"
                            >
                              <div className="h-full grid grid-cols-2 gap-6">
                                <div className="flex flex-col content-start justify-center overflow-hidden">
                                  <div className="grid grid-cols-3 gap-3 overflow-auto pr-1">
                                    {timerOptions.map((m) => {
                                      const isSelected = m === timerMinutes;
                                      return (
                                        <button
                                          key={m}
                                          type="button"
                                          className={`py-3 rounded-lg border text-base transition-colors ${
                                            isSelected
                                              ? "border-emerald-400/70 bg-emerald-500/20"
                                              : "border-border bg-secondary/10 hover:bg-secondary/20"
                                          } ${timerRunning ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                                          onClick={() =>
                                            !timerRunning && setTimerMinutes(m)
                                          }
                                          disabled={timerRunning}
                                          aria-pressed={isSelected}
                                          aria-label={`${m} minutes`}
                                        >
                                          {m}m
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-40 h-40 relative flex items-center justify-center">
                                    <svg
                                      width={ringSizePx}
                                      height={ringSizePx}
                                      viewBox={`0 0 ${ringSizePx} ${ringSizePx}`}
                                      className="absolute inset-0"
                                      role="img"
                                      aria-label="Timer progress ring"
                                    >
                                      <circle
                                        cx={ringCenter}
                                        cy={ringCenter}
                                        r={ringRadius}
                                        fill="none"
                                        stroke="rgba(255,255,255,0.08)"
                                        strokeWidth={ringStrokeWidth}
                                      />
                                      <g
                                        transform={`rotate(-90 ${ringCenter} ${ringCenter})`}
                                      >
                                        <circle
                                          cx={ringCenter}
                                          cy={ringCenter}
                                          r={ringRadius}
                                          fill="none"
                                          stroke={ringStrokeColor}
                                          strokeWidth={ringStrokeWidth}
                                          strokeLinecap="round"
                                          strokeDasharray={ringDashArray}
                                          strokeDashoffset={0}
                                          style={{
                                            transition:
                                              "stroke-dasharray 0.25s linear, stroke 0.5s linear",
                                          }}
                                        />
                                      </g>
                                    </svg>
                                    <div className="text-3xl tabular-nums tracking-wider select-none">
                                      {formatTimer(timerRemainingSec)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="h-1/4 border-b border-border shrink-0">
                        <div className="h-12 border-b border-border px-4 flex items-center justify-between">
                          <h2 className="text-sm font-medium">Heatmap</h2>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {hoveredHeatmapDate ?? ""}
                          </div>
                        </div>
                        <div className="p-4 text-sm h-[calc(100%-48px)] overflow-auto">
                          {dailyProgress.length === 0 ? (
                            <div className="text-muted-foreground">
                              No daily data
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {dailyProgress.map((d) => (
                                <div key={d.date} className="group">
                                  <div
                                    className={`h-6 w-6 rounded-md ${getHeatCellClass(d.percent, d.total > 0)}`}
                                    title={`${d.date}: ${d.completed}/${d.total} (${d.percent}%)`}
                                    onMouseEnter={() =>
                                      setHoveredHeatmapDate(d.date)
                                    }
                                    onMouseLeave={() =>
                                      setHoveredHeatmapDate(null)
                                    }
                                  />
                                  <div className="sr-only">{d.date}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <div className="h-12 border-b border-border px-4 flex items-center justify-between">
                          <h2 className="text-sm font-medium">
                            Today's Progress
                          </h2>
                          {selectedDoc
                            ? (() => {
                                const totals =
                                  computeDocumentTotals(selectedDoc);
                                const percent =
                                  totals.total === 0
                                    ? 0
                                    : Math.round(
                                        (totals.completed / totals.total) * 100
                                      );
                                return (
                                  <SmallCircularProgress percent={percent} />
                                );
                              })()
                            : null}
                        </div>
                        <div className="p-4 text-sm h-[calc(100%-48px)] overflow-auto grid grid-cols-2 auto-rows-max gap-3 content-start">
                          <AnimatePresence mode="wait">
                            {!selectedDoc ? (
                              <motion.div
                                key="no-doc-summary"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="text-muted-foreground"
                              >
                                Select a task or template from the sidebar
                              </motion.div>
                            ) : (
                              (selectedDoc.taskGroups || []).map((g) => {
                                const p = computeGroupProgress(g);
                                return (
                                  <motion.div
                                    key={g.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="rounded-lg border border-border bg-secondary/10 p-3 relative overflow-hidden shrink-0"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div
                                        className={`font-medium truncate pr-2 ${groupShimmerKeys[g.id] ? "shimmer-once" : ""}`}
                                        data-text={g.name}
                                        onAnimationEnd={() => {
                                          if (groupShimmerKeys[g.id]) {
                                            setGroupShimmerKeys((prev) => {
                                              const next = { ...prev };
                                              delete next[g.id];
                                              return next;
                                            });
                                          }
                                        }}
                                      >
                                        {g.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground tabular-nums">
                                        {p.percent}%
                                      </div>
                                    </div>
                                    <div className="h-3 rounded-full bg-muted/30 border border-border/60 relative overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: p.percent + "%" }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 200,
                                          damping: 30,
                                        }}
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400"
                                      />
                                      <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.5),transparent_50%)] opacity-20" />
                                    </div>
                                    <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                                      {p.completed} / {p.total} items
                                    </div>
                                  </motion.div>
                                );
                              })
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");
const root = createRoot(container);
root.render(<App />);
