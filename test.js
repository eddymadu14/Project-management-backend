import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  Clock3,
  CircleDot,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

import RiskBadge from "../components/RiskBadge";
import TimelineModal from "../components/modals/TimelineModal";
import WorkloadRadar from "../components/charts/WorkloadRadar";


/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    color: "text-slate-400",
    dot: "bg-slate-400",
  },

  "in-progress": {
    label: "In Progress",
    color: "text-blue-400",
    dot: "bg-blue-400",
  },

  completed: {
    label: "Completed",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
  },
};


const EMPTY_COLUMNS = {
  todo: [],
  "in-progress": [],
  completed: [],
};


/* =========================================================
   STATUS NORMALIZATION
========================================================= */

const normalizeStatus = (status, isCompleted = false) => {
  if (isCompleted) {
    return "completed";
  }

  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  switch (value) {
    case "todo":
    case "to-do":
    case "pending":
    case "backlog":
    case "not-started":
    case "notstarted":
      return "todo";

    case "in-progress":
    case "inprogress":
    case "progress":
    case "working":
      return "in-progress";

    case "done":
    case "complete":
    case "completed":
    case "finished":
      return "completed";

    default:
      return "todo";
  }
};


/* =========================================================
   TASK NORMALIZATION
========================================================= */

const normalizeTask = (task) => ({
  ...task,

  _id: task._id || task.id,

  status: normalizeStatus(
    task.status,
    task.isCompleted
  ),

  isCompleted:
    task.isCompleted ||
    ["done", "complete", "completed", "finished"].includes(
      String(task.status || "").toLowerCase()
    ),
});


/* =========================================================
   GROUP TASKS
========================================================= */

const groupTasks = (tasks = []) => {
  const grouped = {
    todo: [],
    "in-progress": [],
    completed: [],
  };

  tasks.forEach((rawTask) => {
    const task = normalizeTask(rawTask);

    if (!task._id) return;

    grouped[task.status].push(task);
  });

  return grouped;
};


/* =========================================================
   COMPONENT
========================================================= */

const ProjectOrganizer = () => {
  const { projectId: routeProjectId } = useParams();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(routeProjectId || "");

  const [columns, setColumns] = useState(EMPTY_COLUMNS);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const [toast, setToast] = useState(null);

  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    estimatedHours: 1,
    riskScore: 0,
    dependencies: [],
    project: "",
    status: "todo",
  });


  /* =======================================================
     TOAST
  ======================================================= */

  const showToast = useCallback((message, type = "success") => {
    setToast({
      message,
      type,
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);


  /* =======================================================
     FETCH PROJECTS
  ======================================================= */

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);

    try {
      const response = await api.get("/projects");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.projects || [];

      setProjects(data);

      /*
       * Preserve route-selected project.
       * Only fallback to first project if route has no project ID.
       */
      if (routeProjectId) {
        const exists = data.some(
          (project) => project._id === routeProjectId
        );

        if (exists) {
          setProjectId(routeProjectId);
        } else if (data.length > 0) {
          setProjectId(data[0]._id);
        }
      } else if (!projectId && data.length > 0) {
        setProjectId(data[0]._id);
      }
    } catch (error) {
      console.error(
        "ProjectOrganizer: failed to fetch projects",
        error
      );

      showToast("Unable to load projects", "error");
    } finally {
      setLoadingProjects(false);
    }
  }, [routeProjectId, projectId, showToast]);


  /* =======================================================
     FETCH TASKS
  ======================================================= */

  const fetchTasks = useCallback(
    async (selectedProjectId = projectId) => {
      if (!selectedProjectId) {
        setColumns(EMPTY_COLUMNS);
        return;
      }

      setLoadingTasks(true);

      try {
        const response = await api.get(
          `/tasks/project/${selectedProjectId}`
        );

        /*
         * Support both:
         *
         * [task, task, task]
         *
         * and:
         *
         * { tasks: [...] }
         */

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.tasks || [];

        console.log(
          "[ProjectOrganizer] Tasks returned:",
          data
        );

        const grouped = groupTasks(data);

        console.log(
          "[ProjectOrganizer] Grouped tasks:",
          grouped
        );

        setColumns(grouped);
      } catch (error) {
        console.error(
          "ProjectOrganizer: failed to fetch tasks",
          error
        );

        setColumns(EMPTY_COLUMNS);

        showToast(
          error.response?.status === 401
            ? "Your session has expired. Please log in again."
            : "Unable to load tasks",
          "error"
        );
      } finally {
        setLoadingTasks(false);
      }
    },
    [projectId, showToast]
  );


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);


  /* =======================================================
     LOAD TASKS WHEN PROJECT CHANGES
  ======================================================= */

  useEffect(() => {
    if (projectId) {
      fetchTasks(projectId);
    }
  }, [projectId, fetchTasks]);


  /* =======================================================
     RESET FORM
  ======================================================= */

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      estimatedHours: 1,
      riskScore: 0,
      dependencies: [],
      project: projectId || "",
      status: "todo",
    });

    setEditing(null);
  };


  /* =======================================================
     OPEN CREATE MODAL
  ======================================================= */

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };


  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (task) => {
    setEditing(task);

    setFormData({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assignedTo || "",
      estimatedHours: task.estimatedHours || 1,
      riskScore: task.riskScore || 0,
      dependencies: task.dependencies || [],
      project:
        typeof task.project === "object"
          ? task.project?._id
          : task.project || projectId,
      status: normalizeStatus(
        task.status,
        task.isCompleted
      ),
    });

    setShowModal(true);
  };


  /* =======================================================
     CREATE / UPDATE TASK
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const targetProject =
      formData.project || projectId;

    if (!targetProject) {
      showToast("Please select a project", "error");
      return;
    }

    const payload = {
      ...formData,
      project: targetProject,
      status: normalizeStatus(formData.status),
      isCompleted:
        normalizeStatus(formData.status) === "completed",
    };

    try {
      if (editing) {
        await api.put(
          `/tasks/${editing._id}`,
          payload
        );

        showToast("Task updated successfully");
      } else {
        await api.post("/tasks", payload);

        showToast("Task created successfully");
      }

      setShowModal(false);
      resetForm();

      await fetchTasks(targetProject);
    } catch (error) {
      console.error(
        "ProjectOrganizer: failed to save task",
        error
      );

      showToast(
        error.response?.data?.message ||
          "Failed to save task",
        "error"
      );
    }
  };


  /* =======================================================
     DELETE TASK
  ======================================================= */

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `Delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/tasks/${task._id}`);

      showToast("Task deleted");

      await fetchTasks(projectId);
    } catch (error) {
      console.error(
        "ProjectOrganizer: failed to delete task",
        error
      );

      showToast("Failed to delete task", "error");
    }
  };


  /* =======================================================
     TOGGLE COMPLETION
  ======================================================= */

  const toggleComplete = async (task) => {
    const nextStatus =
      task.status === "completed"
        ? "todo"
        : "completed";

    try {
      await api.put(`/tasks/${task._id}`, {
        status: nextStatus,
        isCompleted:
          nextStatus === "completed",
      });

      await fetchTasks(projectId);
    } catch (error) {
      console.error(
        "ProjectOrganizer: failed to toggle task",
        error
      );

      showToast("Failed to update task", "error");
    }
  };


  /* =======================================================
     DRAG + DROP
  ======================================================= */

  const onDragEnd = async (result) => {
    const {
      source,
      destination,
    } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumn = Array.from(
      columns[source.droppableId]
    );

    const destinationColumn =
      source.droppableId === destination.droppableId
        ? sourceColumn
        : Array.from(
            columns[destination.droppableId]
          );

    const [movedTask] = sourceColumn.splice(
      source.index,
      1
    );

    const nextStatus =
      destination.droppableId;

    const updatedTask = {
      ...movedTask,
      status: nextStatus,
      isCompleted:
        nextStatus === "completed",
    };

    destinationColumn.splice(
      destination.index,
      0,
      updatedTask
    );

    /*
     * Optimistic UI.
     */
    setColumns((previous) => ({
      ...previous,

      [source.droppableId]:
        source.droppableId === destination.droppableId
          ? destinationColumn
          : sourceColumn,

      [destination.droppableId]:
        destinationColumn,
    }));

    try {
      await api.put(
        `/tasks/${movedTask._id}`,
        {
          status: nextStatus,
          isCompleted:
            nextStatus === "completed",
        }
      );
    } catch (error) {
      console.error(
        "ProjectOrganizer: drag update failed",
        error
      );

      showToast(
        "Couldn't move task. Restoring previous state.",
        "error"
      );

      await fetchTasks(projectId);
    }
  };


  /* =======================================================
     PROJECT NAME
  ======================================================= */

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          project._id === projectId
      ),
    [projects, projectId]
  );


  /* =======================================================
     TOTAL TASKS
  ======================================================= */

  const totalTasks = useMemo(
    () =>
      Object.values(columns).reduce(
        (total, tasks) =>
          total + tasks.length,
        0
      ),
    [columns]
  );


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`min-h-screen p-4 md:p-6 transition-colors duration-300 ${
        isDark
          ? "bg-[#09090f] text-white"
          : "bg-slate-50 text-slate-900"
      }`}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>
            <div className="flex items-center gap-3">

              <h1 className="text-2xl md:text-3xl font-bold">
                Project Organizer
              </h1>

              {totalTasks > 0 && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isDark
                      ? "bg-white/10 text-white/70"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {totalTasks}{" "}
                  {totalTasks === 1
                    ? "task"
                    : "tasks"}
                </span>
              )}

            </div>

            <p
              className={`mt-1 text-sm ${
                isDark
                  ? "text-white/50"
                  : "text-slate-500"
              }`}
            >
              {selectedProject?.name ||
                "Organize your project work"}
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-3">

            {/* Project selector */}

            <select
              value={projectId}
              onChange={(event) =>
                setProjectId(event.target.value)
              }
              disabled={loadingProjects}
              className={`min-w-[190px] px-4 py-2.5 rounded-xl border outline-none ${
                isDark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
            >

              {projects.length === 0 && (
                <option value="">
                  No projects
                </option>
              )}

              {projects.map((project) => (
                <option
                  key={project._id}
                  value={project._id}
                >
                  {project.name}
                </option>
              ))}

            </select>


            {/* Refresh */}

            <button
              type="button"
              onClick={() =>
                fetchTasks(projectId)
              }
              disabled={
                loadingTasks || !projectId
              }
              className={`p-2.5 rounded-xl border ${
                isDark
                  ? "border-white/10 bg-white/5"
                  : "border-slate-200 bg-white"
              }`}
              title="Refresh tasks"
            >
              <RefreshCw
                size={18}
                className={
                  loadingTasks
                    ? "animate-spin"
                    : ""
                }
              />
            </button>


            {/* New task */}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openCreateModal}
              disabled={!projectId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 disabled:opacity-40"
            >
              <Plus size={18} />
              New Task
            </motion.button>

          </div>

        </div>

      </div>


      {/* =================================================
          LOADING
      ================================================= */}

      {loadingTasks ? (

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {["todo", "in-progress", "completed"].map(
            (column) => (
              <div
                key={column}
                className={`rounded-2xl p-4 min-h-[300px] ${
                  isDark
                    ? "bg-white/[0.035]"
                    : "bg-white border border-slate-200"
                }`}
              >

                <div className="h-5 w-28 rounded bg-current opacity-10 mb-5" />

                <div className="space-y-3">

                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 rounded-xl bg-current opacity-5 animate-pulse"
                    />
                  ))}

                </div>

              </div>
            )
          )}

        </div>

      ) : (

        /* =================================================
           THREE COLUMN KANBAN
        ================================================= */

        <DragDropContext
          onDragEnd={onDragEnd}
        >

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">

            {Object.entries(
              STATUS_CONFIG
            ).map(
              ([
                status,
                config,
              ]) => {

                const tasks =
                  columns[status] || [];

                return (
                  <Droppable
                    droppableId={status}
                    key={status}
                  >

                    {(provided, snapshot) => (

                      <section
                        ref={
                          provided.innerRef
                        }
                        {...provided.droppableProps}
                        className={`rounded-2xl p-4 min-h-[320px] transition-all ${
                          snapshot.isDraggingOver
                            ? isDark
                              ? "bg-indigo-500/10 ring-1 ring-indigo-400/30"
                              : "bg-indigo-50 ring-1 ring-indigo-200"
                            : isDark
                            ? "bg-white/[0.035] border border-white/[0.06]"
                            : "bg-white border border-slate-200"
                        }`}
                      >

                        {/* Column heading */}

                        <div className="flex items-center justify-between mb-4">

                          <div className="flex items-center gap-2">

                            <span
                              className={`w-2.5 h-2.5 rounded-full ${config.dot}`}
                            />

                            <h2 className="font-semibold">
                              {config.label}
                            </h2>

                          </div>

                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              isDark
                                ? "bg-white/5 text-white/50"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {tasks.length}
                          </span>

                        </div>


                        {/* Tasks */}

                        <div className="space-y-3">

                          {tasks.map(
                            (
                              task,
                              index
                            ) => (

                              <Draggable
                                key={String(
                                  task._id
                                )}
                                draggableId={String(
                                  task._id
                                )}
                                index={index}
                              >

                                {(
                                  draggableProvided,
                                  draggableSnapshot
                                ) => (

                                  <motion.div
                                    ref={
                                      draggableProvided.innerRef
                                    }
                                    {...draggableProvided.draggableProps}
                                    {...draggableProvided.dragHandleProps}
                                    initial={{
                                      opacity: 0,
                                      y: 8,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                    }}
                                    className={`rounded-xl p-4 border transition-shadow ${
                                      draggableSnapshot.isDragging
                                        ? "shadow-2xl ring-2 ring-indigo-400/40"
                                        : ""
                                    } ${
                                      isDark
                                        ? "bg-[#12121a] border-white/[0.07]"
                                        : "bg-white border-slate-200 shadow-sm"
                                    }`}
                                  >

                                    {/* Task top */}

                                    <div className="flex items-start justify-between gap-3">

                                      <div className="min-w-0">

                                        <h3
                                          className={`font-semibold break-words ${
                                            task.isCompleted
                                              ? "line-through opacity-60"
                                              : ""
                                          }`}
                                        >
                                          {task.title ||
                                            "Untitled task"}
                                        </h3>

                                        {task.description && (
                                          <p
                                            className={`mt-1 text-sm line-clamp-2 ${
                                              isDark
                                                ? "text-white/50"
                                                : "text-slate-500"
                                            }`}
                                          >
                                            {
                                              task.description
                                            }
                                          </p>
                                        )}

                                      </div>

                                      <RiskBadge
                                        riskScore={
                                          task.riskScore ||
                                          0
                                        }
                                      />

                                    </div>


                                    {/* Meta */}

                                    <div
                                      className={`flex flex-wrap items-center gap-3 mt-4 text-xs ${
                                        isDark
                                          ? "text-white/40"
                                          : "text-slate-500"
                                      }`}
                                    >

                                      <span className="flex items-center gap-1">

                                        <Clock3
                                          size={13}
                                        />

                                        {task.estimatedHours ||
                                          0}
                                        h

                                      </span>

                                      <span>
                                        {task.assignedTo ||
                                          "Unassigned"}
                                      </span>

                                    </div>


                                    {/* Actions */}

                                    <div
                                      className={`flex items-center justify-between mt-4 pt-3 border-t ${
                                        isDark
                                          ? "border-white/[0.06]"
                                          : "border-slate-100"
                                      }`}
                                    >

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTask(
                                            task._id
                                          );
                                          setShowTimeline(
                                            true
                                          );
                                        }}
                                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                                      >
                                        View timeline
                                      </button>


                                      <div className="flex items-center gap-2">

                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleComplete(
                                              task
                                            )
                                          }
                                          className={`p-1.5 rounded-lg ${
                                            task.isCompleted
                                              ? "text-emerald-400 bg-emerald-400/10"
                                              : "text-white/40 hover:text-emerald-400"
                                          }`}
                                          title={
                                            task.isCompleted
                                              ? "Move to To Do"
                                              : "Complete task"
                                          }
                                        >
                                          {task.isCompleted ? (
                                            <Check
                                              size={16}
                                            />
                                          ) : (
                                            <CheckCircle2
                                              size={17}
                                            />
                                          )}
                                        </button>


                                        <button
                                          type="button"
                                          onClick={() =>
                                            openEditModal(
                                              task
                                            )
                                          }
                                          className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10"
                                          title="Edit task"
                                        >
                                          <Edit2
                                            size={16}
                                          />
                                        </button>


                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteTask(
                                              task
                                            )
                                          }
                                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"
                                          title="Delete task"
                                        >
                                          <Trash2
                                            size={16}
                                          />
                                        </button>

                                      </div>

                                    </div>

                                  </motion.div>

                                )}

                              </Draggable>

                            )
                          )}

                          {provided.placeholder}

                        </div>


                        {/* Empty column */}

                        {tasks.length === 0 && (
                          <div
                            className={`flex flex-col items-center justify-center min-h-[200px] text-center ${
                              isDark
                                ? "text-white/30"
                                : "text-slate-400"
                            }`}
                          >

                            <CircleDot
                              size={28}
                              className="mb-2 opacity-40"
                            />

                            <p className="text-sm">
                              No tasks here
                            </p>

                            <p className="text-xs mt-1 opacity-70">
                              Drag a task here
                            </p>

                          </div>
                        )}

                      </section>

                    )}

                  </Droppable>
                );
              }
            )}

          </div>

        </DragDropContext>

      )}


      {/* =================================================
          WORKLOAD
      ================================================= */}

      <div className="mt-6">
        <WorkloadRadar />
      </div>


      {/* =================================================
          TIMELINE
      ================================================= */}

      <TimelineModal
        isOpen={showTimeline}
        onClose={() =>
          setShowTimeline(false)
        }
        taskId={selectedTask}
      />


      {/* =================================================
          TASK MODAL
      ================================================= */}

      <AnimatePresence>

        {showModal && (

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setShowModal(false);
              }
            }}
          >

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.96,
                y: 10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.96,
                y: 10,
              }}
              className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
                isDark
                  ? "bg-[#111119] border-white/10"
                  : "bg-white border-slate-200"
              }`}
            >

              <div className="flex items-center justify-between mb-5">

                <div>
                  <h2 className="text-xl font-bold">
                    {editing
                      ? "Edit Task"
                      : "Create Task"}
                  </h2>

                  <p
                    className={`text-sm mt-1 ${
                      isDark
                        ? "text-white/40"
                        : "text-slate-500"
                    }`}
                  >
                    Add the information needed
                    to track this task.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="p-2 rounded-lg opacity-60 hover:opacity-100"
                >
                  <X size={18} />
                </button>

              </div>


              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >

                {/* Project */}

                <div>

                  <label className="text-xs font-medium opacity-70">
                    Project
                  </label>

                  <select
                    value={
                      formData.project ||
                      projectId
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        project:
                          event.target.value,
                      })
                    }
                    className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >

                    {projects.map(
                      (project) => (
                        <option
                          key={
                            project._id
                          }
                          value={
                            project._id
                          }
                        >
                          {project.name}
                        </option>
                      )
                    )}

                  </select>

                </div>


                {/* Title */}

                <div>

                  <label className="text-xs font-medium opacity-70">
                    Task title
                  </label>

                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        title:
                          event.target.value,
                      })
                    }
                    placeholder="e.g. Build dashboard"
                    required
                    className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                      isDark
                        ? "bg-white/5 border-white/10"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />

                </div>


                {/* Description */}

                <div>

                  <label className="text-xs font-medium opacity-70">
                    Description
                  </label>

                  <textarea
                    value={
                      formData.description
                    }
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        description:
                          event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Describe the task..."
                    className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none resize-none ${
                      isDark
                        ? "bg-white/5 border-white/10"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  />

                </div>


                <div className="grid grid-cols-2 gap-3">

                  {/* Assigned */}

                  <div>

                    <label className="text-xs font-medium opacity-70">
                      Assigned to
                    </label>

                    <input
                      type="text"
                      value={
                        formData.assignedTo
                      }
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          assignedTo:
                            event.target
                              .value,
                        })
                      }
                      placeholder="Team member"
                      className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                        isDark
                          ? "bg-white/5 border-white/10"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    />

                  </div>


                  {/* Hours */}

                  <div>

                    <label className="text-xs font-medium opacity-70">
                      Estimated hours
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        formData.estimatedHours
                      }
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          estimatedHours:
                            Number(
                              event.target
                                .value
                            ),
                        })
                      }
                      className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                        isDark
                          ? "bg-white/5 border-white/10"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    />

                  </div>

                </div>


                <div className="grid grid-cols-2 gap-3">

                  {/* Status */}

                  <div>

                    <label className="text-xs font-medium opacity-70">
                      Status
                    </label>

                    <select
                      value={
                        formData.status
                      }
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          status:
                            event.target
                              .value,
                        })
                      }
                      className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                        isDark
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >

                      <option value="todo">
                        To Do
                      </option>

                      <option value="in-progress">
                        In Progress
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                    </select>

                  </div>


                  {/* Risk */}

                  <div>

                    <label className="text-xs font-medium opacity-70">
                      Risk score
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={
                        formData.riskScore
                      }
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          riskScore:
                            Number(
                              event.target
                                .value
                            ),
                        })
                      }
                      className={`mt-1 w-full px-3 py-2.5 rounded-xl border outline-none ${
                        isDark
                          ? "bg-white/5 border-white/10"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    />

                  </div>

                </div>


                {/* Buttons */}

                <div className="flex justify-end gap-3 pt-3">

                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(false)
                    }
                    className={`px-4 py-2.5 rounded-xl ${
                      isDark
                        ? "bg-white/5 hover:bg-white/10"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600"
                  >
                    {editing
                      ? "Update Task"
                      : "Create Task"}
                  </button>

                </div>

              </form>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>


      {/* =================================================
          TOAST
      ================================================= */}

      <AnimatePresence>

        {toast && (

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 20,
            }}
            className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-emerald-500 text-white"
            }`}
          >

            {toast.type === "error" ? (
              <X size={17} />
            ) : (
              <Check size={17} />
            )}

            <span className="text-sm font-medium">
              {toast.message}
            </span>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
};

export default ProjectOrganizer;