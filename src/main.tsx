import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { motion } from "framer-motion";
import "./lib/utils";
import Checkbox from "./components/Checkbox";
import {
  ChevronLeft,
  ChevronRight,
  PanelsTopLeft,
  Folder,
  Hash,
  ChevronDown,
} from "lucide-react";
import { TrashIcon } from "@heroicons/react/24/outline";

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

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [hasBridge, setHasBridge] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(true);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [dailyTaskFiles, setDailyTaskFiles] = useState<
    { name: string; path: string }[]
  >([]);
  const [templateFiles, setTemplateFiles] = useState<
    { name: string; path: string }[]
  >([]);
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
      };
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editValue, setEditValue] = useState("");

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
    const loadDailyTasks = async () => {
      if (!window.api?.listDailyTasks) return;
      try {
        const files = await window.api.listDailyTasks();
        setDailyTaskFiles(
          files.map((f) => ({ name: f.fileName, path: f.fullPath }))
        );
      } catch (err) {
        console.error("Failed to load daily tasks:", err);
        setDailyTaskFiles([]);
      }
    };
    const loadTemplates = async () => {
      if (!window.api?.listTemplates) return;
      try {
        const files = await window.api.listTemplates();
        setTemplateFiles(
          files.map((f) => ({ name: f.fileName, path: f.fullPath }))
        );
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
  };

  const saveEdit = async (overrideValue?: string) => {
    if (!editing || !selectedDoc || !selectedPath) return;
    const nowIso = new Date().toISOString();
    let next: TaskDocument = selectedDoc;
    const newValue = overrideValue !== undefined ? overrideValue : editValue;
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
    }
    setSelectedDoc(next);
    try {
      await window.api?.writeJsonFile?.(selectedPath, next);
    } catch (err) {
      console.error("Failed to write JSON:", err);
    }
    cancelEdit();
  };

  const updateTaskCompletion = (
    groupId: string,
    taskId: string,
    isComplete: boolean
  ) => {
    setSelectedDoc((prev) => {
      if (!prev) return prev;
      const next: TaskDocument = {
        ...prev,
        taskGroups: prev.taskGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) =>
              t.id === taskId ? { ...t, isComplete } : t
            ),
          };
        }),
      };
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
      const next: TaskDocument = {
        ...prev,
        taskGroups: prev.taskGroups.map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            tasks: g.tasks.map((t) => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                subTasks: (t.subTasks || []).map((s) =>
                  s.id === subTaskId ? { ...s, isComplete } : s
                ),
              };
            }),
          };
        }),
      };
      return next;
    });
  };

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

  return (
    <div className="h-screen w-screen bg-background text-foreground">
      {/* Top draggable area to house traffic lights overlay without visible header */}
      <div className="titlebar-drag h-8 w-full"></div>
      <div className="flex h-[calc(100%-40px)] w-full overflow-hidden">
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
                    <div className="rounded-md border border-sidebar-border bg-card/50">
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
                        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1">
                          {dailyTaskFiles.length === 0 ? (
                            <div>No tasks yet</div>
                          ) : (
                            dailyTaskFiles.map((f) => (
                              <button
                                key={f.path}
                                className="w-full text-left truncate rounded-sm px-2 py-1 hover:bg-sidebar-accent/30 text-foreground"
                                title={f.name}
                                onClick={() => handleSelectFile("task", f)}
                              >
                                {f.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded-md border border-sidebar-border bg-card/50">
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
                        <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1">
                          {templateFiles.length === 0 ? (
                            <div>No templates yet</div>
                          ) : (
                            templateFiles.map((f) => (
                              <button
                                key={f.path}
                                className="w-full text-left truncate rounded-sm px-2 py-1 hover:bg-sidebar-accent/30 text-foreground"
                                title={f.name}
                                onClick={() => handleSelectFile("template", f)}
                              >
                                {f.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
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
                    </div>
                  </>
                )}
              </div>
            </motion.aside>

            {/* Two equal panels taking remaining width */}
            <div className="flex-1 h-full overflow-hidden p-3">
              <div className="relative w-full h-full rounded-xl border border-border bg-secondary/10 overflow-hidden">
                <div className="flex h-full w-full">
                  <section className="flex-1 min-w-0 h-full border-r border-border bg-card">
                    <div className="h-12 border-b border-border px-4 flex items-center justify-between">
                      <h2 className="text-sm font-medium">
                        {selectedDoc ? selectedDoc.name : "Tasks"}
                      </h2>
                      {selectedDoc && (
                        <span className="text-xs text-muted-foreground">
                          {selectedDoc.type}
                        </span>
                      )}
                    </div>
                    <div className="p-4 text-sm space-y-3 overflow-auto h-[calc(100%-48px)]">
                      {!selectedDoc ? (
                        <div className="text-muted-foreground">
                          Select a task or template from the sidebar
                        </div>
                      ) : (
                        selectedDoc.taskGroups?.map((group) => (
                          <div
                            key={group.id}
                            className="rounded-md border border-border bg-card"
                          >
                            <button
                              className="w-full flex items-center gap-2 px-3 h-9"
                              onClick={() => toggleGroup(group.id)}
                              aria-expanded={!!openGroupIds[group.id]}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${openGroupIds[group.id] ? "-rotate-180" : "rotate-0"}`}
                              />
                              <span className="font-medium">{group.name}</span>
                            </button>
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
                                                className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-1 text-sm"
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
                                              task.name
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
                                            editing.field === "description" ? (
                                              <div
                                                role="textbox"
                                                contentEditable
                                                suppressContentEditableWarning
                                                className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-1 text-[11px] whitespace-pre-wrap break-words"
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
                                              task.description
                                            ) : null}
                                          </div>
                                        </div>
                                        <div className="ml-auto inline-flex items-center gap-2">
                                          {task.notes ? (
                                            <button
                                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                                          ) : (
                                            <button
                                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
                                          )}
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
                                            Subtasks
                                            <ChevronDown
                                              className={`h-3 w-3 transition-transform ${openTaskIds[task.id] ? "-rotate-180" : "rotate-0"}`}
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
                                                editing.groupId === group.id &&
                                                editing.taskId === task.id &&
                                                editing.field === "notes" ? (
                                                  <div
                                                    role="textbox"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-1 text-xs whitespace-pre-wrap break-words"
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
                                                    {task.notes || ""}
                                                  </div>
                                                ) : (
                                                  task.notes
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      {task.subTasks?.length > 0 &&
                                        openTaskIds[task.id] && (
                                          <div className="relative px-3 pb-2 space-y-1 pl-8">
                                            <div
                                              className="pointer-events-none absolute left-[1.375rem] bottom-12 border-l  border-white/50"
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
                                                    editing.field === "name" ? (
                                                      <div
                                                        role="textbox"
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-0.5 text-xs"
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
                                                        {s.name}
                                                      </div>
                                                    ) : (
                                                      s.name
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
                                                          field: "description",
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
                                                        className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-1 text-[11px] whitespace-pre-wrap break-words"
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
                                                        {s.description || ""}
                                                      </div>
                                                    ) : s.description ? (
                                                      s.description
                                                    ) : null}
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
                                                              groupId: group.id,
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
                                                      s.notes.trim() !== "") ||
                                                      (editing &&
                                                        editing.kind ===
                                                          "subtask" &&
                                                        editing.groupId ===
                                                          group.id &&
                                                        editing.taskId ===
                                                          task.id &&
                                                        (editing as any)
                                                          .subTaskId === s.id &&
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
                                                                taskId: task.id,
                                                                subTaskId: s.id,
                                                                field: "notes",
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
                                                              className="w-full bg-transparent border border-sidebar-border/60 rounded px-2 py-1 text-[11px] whitespace-pre-wrap break-words"
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
                                                                    ).innerText
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
                                                            s.notes
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
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                  <section className="flex-1 min-w-0 h-full bg-card">
                    <div className="h-12 border-b border-border px-4 flex items-center">
                      <h2 className="text-sm font-medium">Progress</h2>
                    </div>
                    <div className="p-4 text-sm">Content area B</div>
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
