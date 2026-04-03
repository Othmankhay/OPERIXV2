import { useEffect, useMemo, useState } from "react";

const WORKFLOW_PROJECTS = [
  { key: "all", label: "Tous les projets" },
  { key: "ga", label: "GA" },
  { key: "biw", label: "BIW" },
  { key: "vie_serie", label: "VIE SERIE" },
];

const TASK_STATUS_META = {
  "A faire": { color: "#64748b", bg: "#f1f5f9", dot: "#94a3b8" },
  "En cours": { color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" },
  Termine: { color: "#15803d", bg: "#f0fdf4", dot: "#22c55e" },
  Bloque: { color: "#b91c1c", bg: "#fef2f2", dot: "#ef4444" },
};

const EMPTY_TASK = {
  id: "",
  title: "",
  description: "",
  assignee: "",
  deadline: "",
  status: "A faire",
  project: "ga",
  sourceLabel: "",
  sourceSummary: "",
};

const formatProjectLabel = (projectKey) => {
  if (projectKey === "ga") return "GA";
  if (projectKey === "biw") return "BIW";
  if (projectKey === "vie_serie") return "VIE SERIE";
  return "Non defini";
};

const getRelativeDeadline = (deadline) => {
  if (!deadline) return { label: "Sans echeance", tone: "neutral" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = String(deadline).split("-");
  const dueDate = new Date(Number(year), Number(month) - 1, Number(day));
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `En retard de ${Math.abs(diffDays)}j`, tone: "late" };
  if (diffDays === 0) return { label: "Echeance aujourd'hui", tone: "warning" };
  return { label: `J-${diffDays} avant echeance`, tone: diffDays <= 2 ? "warning" : "neutral" };
};

const toTaskCardAccent = (task) => {
  const deadlineState = getRelativeDeadline(task.deadline);
  if (task.status === "Bloque") return "#ef4444";
  if (deadlineState.tone === "late") return "#dc2626";
  if (deadlineState.tone === "warning") return "#f59e0b";
  return TASK_STATUS_META[task.status]?.dot || "#3b82f6";
};

const formatDateLabel = (dateValue) => {
  if (!dateValue) return "";
  const [year, month, day] = String(dateValue).split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
};

const normalizeTask = (task) => {
  const rawStatus = task?.status;
  const normalizedStatus = rawStatus === "Pas commencé" || rawStatus === "Pas commencÃ©"
    ? "A faire"
    : rawStatus;
  const safeStatus = TASK_STATUS_META[normalizedStatus] ? normalizedStatus : "A faire";
  const safeProject = ["ga", "biw", "vie_serie"].includes(task?.project) ? task.project : "ga";
  return {
    ...EMPTY_TASK,
    ...task,
    status: safeStatus,
    project: safeProject,
  };
};

export default function WorkflowPage({
  tasks,
  setTasks,
  currentUser,
  composerRequest,
  onComposerRequestHandled,
  initialProjectFilter = "all",
}) {
  const normalizedTasks = useMemo(() => (Array.isArray(tasks) ? tasks.map(normalizeTask) : []), [tasks]);
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_TASK);
  const [dragTaskId, setDragTaskId] = useState("");

  useEffect(() => {
    if (!composerRequest) return;
    const requestedProject = WORKFLOW_PROJECTS.some((project) => project.key === composerRequest.project && project.key !== "all")
      ? composerRequest.project
      : (initialProjectFilter !== "all" ? initialProjectFilter : "ga");
    setForm({
      ...EMPTY_TASK,
      assignee: currentUser || "Utilisateur",
      ...composerRequest,
      project: requestedProject,
      id: composerRequest.id || "",
    });
    setProjectFilter(requestedProject);
    setEditorOpen(true);
    onComposerRequestHandled?.();
  }, [composerRequest, currentUser, initialProjectFilter, onComposerRequestHandled]);

  useEffect(() => {
    if (composerRequest) return;
    setProjectFilter(initialProjectFilter || "all");
  }, [composerRequest, initialProjectFilter]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return normalizedTasks
      .filter((task) => projectFilter === "all" || task.project === projectFilter)
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter((task) => {
        if (!query) return true;
        return [
          task.title,
          task.description,
          task.assignee,
          formatProjectLabel(task.project),
          task.sourceLabel,
          task.sourceSummary,
        ].some((value) => String(value || "").toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
  }, [normalizedTasks, projectFilter, search, statusFilter]);

  const stats = useMemo(() => ({
    total: filteredTasks.length,
    pending: filteredTasks.filter((task) => task.status === "A faire").length,
    inProgress: filteredTasks.filter((task) => task.status === "En cours").length,
    done: filteredTasks.filter((task) => task.status === "Termine").length,
    blocked: filteredTasks.filter((task) => task.status === "Bloque").length,
  }), [filteredTasks]);

  const kanbanColumns = useMemo(
    () => Object.keys(TASK_STATUS_META).map((status) => ({
      status,
      tasks: filteredTasks.filter((task) => task.status === status),
    })),
    [filteredTasks]
  );

  const openCreateModal = () => {
    setForm({
      ...EMPTY_TASK,
      assignee: currentUser || "Utilisateur",
      project: projectFilter !== "all" ? projectFilter : "ga",
    });
    setEditorOpen(true);
  };

  const openEditModal = (task) => {
    setForm({ ...EMPTY_TASK, ...task });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setForm(EMPTY_TASK);
  };

  const saveTask = () => {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      assignee: (form.assignee || currentUser || "Utilisateur").trim(),
      createdAt: form.createdAt || now,
      updatedAt: now,
    };

    if (form.id) {
      setTasks((prev) => prev.map((task) => (task.id === form.id ? payload : task)));
    } else {
      setTasks((prev) => [{ ...payload, id: `task-${Date.now()}` }, ...prev]);
    }
    closeEditor();
  };

  const deleteTask = (taskId) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const updateTaskStatus = (taskId, status) => {
    setTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, status, updatedAt: new Date().toISOString() } : task
    )));
  };

  const renderTaskCard = (task, compact = false) => {
    const statusMeta = TASK_STATUS_META[task.status] || TASK_STATUS_META["A faire"];
    const deadlineMeta = getRelativeDeadline(task.deadline);
    const deadlineToneStyles = {
      neutral: { color: "#475569", bg: "#f8fafc" },
      warning: { color: "#b45309", bg: "#fffbeb" },
      late: { color: "#b91c1c", bg: "#fef2f2" },
    };

    return (
      <div
        key={task.id}
        draggable
        onDragStart={() => setDragTaskId(task.id)}
        onDragEnd={() => setDragTaskId("")}
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          boxShadow: compact ? "0 8px 22px rgba(15,23,42,0.06)" : "0 10px 28px rgba(15,23,42,0.05)",
          padding: compact ? 14 : 18,
          borderTop: `4px solid ${toTaskCardAccent(task)}`,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#eff6ff", padding: "4px 10px", borderRadius: 999 }}>
                {formatProjectLabel(task.project)}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, padding: "4px 10px", borderRadius: 999 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusMeta.dot }} />
                {task.status}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{task.title}</div>
          </div>
          <select
            value={task.status}
            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
            style={{ borderRadius: 10, border: "1px solid #dbe2ea", padding: "7px 10px", background: "#f8fafc", fontSize: 12, fontWeight: 600, color: "#334155", cursor: "pointer" }}
          >
            {Object.keys(TASK_STATUS_META).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {task.description && <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.55 }}>{task.description}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", background: "#f8fafc", padding: "6px 10px", borderRadius: 10 }}>
            Responsable: {task.assignee || "Non assigne"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: deadlineToneStyles[deadlineMeta.tone].color, background: deadlineToneStyles[deadlineMeta.tone].bg, padding: "6px 10px", borderRadius: 10 }}>
            {deadlineMeta.label}
          </span>
          {task.deadline && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", background: "#f8fafc", padding: "6px 10px", borderRadius: 10 }}>
              {formatDateLabel(task.deadline)}
            </span>
          )}
        </div>

        {(task.sourceLabel || task.sourceSummary) && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Contexte</div>
            {task.sourceLabel && <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{task.sourceLabel}</div>}
            {task.sourceSummary && <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{task.sourceSummary}</div>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => openEditModal(task)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #dbe2ea", background: "#fff", color: "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
          >
            Modifier
          </button>
          <button
            onClick={() => deleteTask(task.id)}
            style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff5f5", color: "#b91c1c", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
          >
            Supprimer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100%", overflowY: "auto" }}>
      <div style={{ background: "linear-gradient(135deg, #10233f 0%, #183b63 60%, #245c7c 100%)", color: "#fff", borderRadius: 24, padding: 24, marginBottom: 20, boxShadow: "0 18px 40px rgba(15,23,42,0.14)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: "#93c5fd", marginBottom: 10 }}>Workflow</div>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>Pilotage collaboratif des actions terrain</div>
            <div style={{ maxWidth: 760, fontSize: 14, lineHeight: 1.6, color: "#dbeafe" }}>
              Suivez les actions GA, BIW et VIE SERIE dans une vue claire, mobile-friendly et persistee. Chaque tache garde son contexte operationnel, son responsable et son urgence.
            </div>
          </div>
          <button
            onClick={openCreateModal}
            style={{ padding: "12px 18px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", background: "#f8fafc", color: "#0f172a", fontWeight: 800, fontSize: 13, cursor: "pointer", minWidth: 180 }}
          >
            + Nouvelle tache
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 20 }}>
          {[
            { label: "Taches visibles", value: stats.total, color: "#ffffff" },
            { label: "A lancer", value: stats.pending, color: "#cbd5e1" },
            { label: "En cours", value: stats.inProgress, color: "#93c5fd" },
            { label: "Terminees", value: stats.done, color: "#86efac" },
            { label: "Bloquees", value: stats.blocked, color: "#fca5a5" },
          ].map((item) => (
            <div key={item.label} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 18, marginBottom: 20, boxShadow: "0 12px 30px rgba(15,23,42,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WORKFLOW_PROJECTS.map((project) => {
              const active = projectFilter === project.key;
              return (
                <button
                  key={project.key}
                  onClick={() => setProjectFilter(project.key)}
                  style={{ padding: "10px 14px", borderRadius: 999, border: active ? "1px solid #3b82f6" : "1px solid #dbe2ea", background: active ? "#eff6ff" : "#fff", color: active ? "#1d4ed8" : "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  {project.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ borderRadius: 12, border: "1px solid #dbe2ea", background: "#f8fafc", padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "#334155", cursor: "pointer" }}
            >
              <option value="all">Tous les statuts</option>
              {Object.keys(TASK_STATUS_META).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une tache, un responsable..."
              style={{ minWidth: 220, borderRadius: 12, border: "1px solid #dbe2ea", background: "#f8fafc", padding: "10px 12px", fontSize: 12, color: "#334155", outline: "none" }}
            />
            <div style={{ display: "inline-flex", background: "#f8fafc", borderRadius: 14, padding: 4, border: "1px solid #e2e8f0" }}>
              {[
                { key: "list", label: "Liste" },
                { key: "kanban", label: "Kanban" },
              ].map((mode) => {
                const active = viewMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key)}
                    style={{ padding: "8px 12px", borderRadius: 10, border: "none", background: active ? "#1a2744" : "transparent", color: active ? "#fff" : "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{ border: "1px dashed #cbd5e1", borderRadius: 18, padding: 28, textAlign: "center", color: "#64748b", background: "#f8fafc" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2744", marginBottom: 6 }}>Aucune tache sur ce filtre</div>
            <div style={{ fontSize: 13, marginBottom: 14 }}>Creez une premiere action depuis cette page, le dashboard ou une ligne operationnelle.</div>
            <button
              onClick={openCreateModal}
              style={{ padding: "10px 14px", borderRadius: 12, border: "none", background: "#1a2744", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              Creer une tache
            </button>
          </div>
        ) : viewMode === "list" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {filteredTasks.map((task) => renderTaskCard(task))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
            {kanbanColumns.map((column) => (
              <div
                key={column.status}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragTaskId) updateTaskStatus(dragTaskId, column.status);
                }}
                style={{ background: "#f8fafc", borderRadius: 18, border: "1px solid #e2e8f0", padding: 12, minHeight: 240 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: TASK_STATUS_META[column.status].color }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: TASK_STATUS_META[column.status].dot }} />
                    {column.status}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", background: "#fff", borderRadius: 999, padding: "4px 8px" }}>
                    {column.tasks.length}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {column.tasks.length === 0 ? (
                    <div style={{ padding: 18, borderRadius: 14, border: "1px dashed #cbd5e1", textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
                      Deposez une tache ici
                    </div>
                  ) : (
                    column.tasks.map((task) => renderTaskCard(task, true))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 1600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={closeEditor}>
          <div style={{ width: 720, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 24, boxShadow: "0 24px 60px rgba(15,23,42,0.22)", border: "1px solid #e2e8f0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 22, borderBottom: "1px solid #eef2f7", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{form.id ? "Modifier la tache" : "Nouvelle tache"}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Formulaire simple, rapide et utilisable aussi bien au bureau que sur mobile.</div>
              </div>
              <button onClick={closeEditor} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 18, color: "#64748b" }}>×</button>
            </div>

            <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Titre</label>
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ex: Relancer fournisseur suite au retard..." style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none" }} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Ajoutez le contexte et les attentes..." style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none", resize: "vertical" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Projet</label>
                <select value={form.project} onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none", cursor: "pointer" }}>
                  {WORKFLOW_PROJECTS.filter((project) => project.key !== "all").map((project) => (
                    <option key={project.key} value={project.key}>{project.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Responsable</label>
                <input value={form.assignee} onChange={(e) => setForm((prev) => ({ ...prev, assignee: e.target.value }))} placeholder="Nom ou email du responsable" style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Deadline</label>
                <input type="date" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Statut</label>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} style={{ width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid #dbe2ea", background: "#f8fafc", fontSize: 14, outline: "none", cursor: "pointer" }}>
                  {Object.keys(TASK_STATUS_META).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              {(form.sourceLabel || form.sourceSummary) && (
                <div style={{ gridColumn: "1 / -1", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>Liaison contextuelle</div>
                  {form.sourceLabel && <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{form.sourceLabel}</div>}
                  {form.sourceSummary && <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.55 }}>{form.sourceSummary}</div>}
                </div>
              )}
            </div>

            <div style={{ padding: 22, borderTop: "1px solid #eef2f7", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Les taches sont sauvegardees localement et restent disponibles apres rafraichissement.</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={closeEditor} style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #dbe2ea", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Annuler</button>
                <button onClick={saveTask} style={{ padding: "11px 16px", borderRadius: 12, border: "none", background: "#1a2744", color: "#fff", fontWeight: 800, fontSize: 13, cursor: form.title.trim() ? "pointer" : "default", opacity: form.title.trim() ? 1 : 0.5 }}>Enregistrer la tache</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
