"use client";

import { useMemo, useState } from "react";
import type { CouncilMemberEntry, CouncilTaskEntry } from "../../lib";

type CouncilTaskTab = "LIST" | "KANBAN";
type CouncilTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type CouncilTaskCategory = "LOGISTICA" | "ECONOMIA" | "CONTENT" | "ANUNCIOS";

interface CouncilTasksBoardProps {
  initialTasks: CouncilTaskEntry[];
  councilMembers: CouncilMemberEntry[];
}

const statusLabels: Record<CouncilTaskStatus, string> = {
  TODO: "Pendiente",
  IN_PROGRESS: "En curso",
  DONE: "Hecha"
};

const categoryLabels: Record<CouncilTaskCategory, string> = {
  LOGISTICA: "Logistica",
  ECONOMIA: "Economia",
  CONTENT: "Content",
  ANUNCIOS: "Anuncios"
};

const categoryOptions = Object.keys(categoryLabels) as CouncilTaskCategory[];
const statusOptions = Object.keys(statusLabels) as CouncilTaskStatus[];

function formatDateInput(value?: string) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16);
}

function toIsoFromDateInput(value: string) {
  if (!value.trim()) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

export function CouncilTasksBoard({ initialTasks, councilMembers }: CouncilTasksBoardProps) {
  const [activeTab, setActiveTab] = useState<CouncilTaskTab>("LIST");
  const [tasks, setTasks] = useState<CouncilTaskEntry[]>(initialTasks);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    category: "LOGISTICA" as CouncilTaskCategory,
    assignedMemberId: "",
    executeAt: ""
  });

  const tasksByStatus = useMemo(() => {
    return {
      TODO: tasks.filter((task) => task.status === "TODO"),
      IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
      DONE: tasks.filter((task) => task.status === "DONE")
    } satisfies Record<CouncilTaskStatus, CouncilTaskEntry[]>;
  }, [tasks]);

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      setError("Titulo y descripcion son obligatorios.");
      return;
    }
    setCreateBusy(true);
    setError(null);

    try {
      const response = await fetch("/council/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          category: createForm.category,
          assignedMemberId: createForm.assignedMemberId || undefined,
          executeAt: toIsoFromDateInput(createForm.executeAt)
        })
      });
      const payload = (await response.json()) as CouncilTaskEntry & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `No se pudo crear la tarea (${response.status})`);
      }
      setTasks((current) => [payload, ...current]);
      setCreateForm({
        title: "",
        description: "",
        category: "LOGISTICA",
        assignedMemberId: "",
        executeAt: ""
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la tarea");
    } finally {
      setCreateBusy(false);
    }
  }

  async function updateTask(taskId: string, patch: Partial<CouncilTaskEntry>) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      const response = await fetch(`/council/tasks/${taskId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: patch.title,
          description: patch.description,
          category: patch.category,
          status: patch.status,
          assignedMemberId: patch.assignedMemberId,
          executeAt: patch.executeAt
        })
      });
      const payload = (await response.json()) as CouncilTaskEntry & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `No se pudo actualizar la tarea (${response.status})`);
      }
      setTasks((current) => current.map((task) => (task.id === taskId ? payload : task)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function updateTaskStatus(taskId: string, status: CouncilTaskStatus) {
    setBusyTaskId(taskId);
    setError(null);
    try {
      const response = await fetch(`/council/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as CouncilTaskEntry & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? `No se pudo mover la tarea (${response.status})`);
      }
      setTasks((current) => current.map((task) => (task.id === taskId ? payload : task)));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "No se pudo mover la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function deleteTask(taskId: string) {
    const confirmed = window.confirm("¿Eliminar esta tarea?");
    if (!confirmed) {
      return;
    }

    setBusyTaskId(taskId);
    setError(null);
    try {
      const response = await fetch(`/council/tasks/${taskId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) {
        throw new Error(payload.error ?? `No se pudo borrar la tarea (${response.status})`);
      }
      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo borrar la tarea");
    } finally {
      setBusyTaskId(null);
    }
  }

  function renderTaskEditor(task: CouncilTaskEntry) {
    return (
      <article className={`council-task-card category-${task.category.toLowerCase()}`} key={task.id}>
        <input
          defaultValue={task.title}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim();
            if (next && next !== task.title) {
              void updateTask(task.id, { title: next });
            }
          }}
          placeholder="Titulo"
        />
        <textarea
          defaultValue={task.description}
          onBlur={(event) => {
            const next = event.currentTarget.value.trim();
            if (next && next !== task.description) {
              void updateTask(task.id, { description: next });
            }
          }}
          placeholder="Descripcion"
          rows={3}
        />
        <div className="council-task-meta">
          <select
            defaultValue={task.category}
            onChange={(event) => {
              void updateTask(task.id, {
                category: event.currentTarget.value as CouncilTaskCategory
              });
            }}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
          <select
            defaultValue={task.status}
            onChange={(event) => {
              void updateTaskStatus(task.id, event.currentTarget.value as CouncilTaskStatus);
            }}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
          <select
            defaultValue={task.assignedMemberId ?? ""}
            onChange={(event) => {
              void updateTask(task.id, {
                assignedMemberId: event.currentTarget.value || undefined
              });
            }}
          >
            <option value="">Sin asignar</option>
            {councilMembers.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.displayName}
              </option>
            ))}
          </select>
          <input
            defaultValue={formatDateInput(task.executeAt)}
            onBlur={(event) => {
              void updateTask(task.id, { executeAt: toIsoFromDateInput(event.currentTarget.value) });
            }}
            type="datetime-local"
          />
        </div>
        <div className="council-task-foot">
          <span className="status-badge">{categoryLabels[task.category]}</span>
          <span className="status-badge">{task.assignedDisplayName ?? "Sin asignar"}</span>
          <button
            className="button danger-outline"
            disabled={busyTaskId === task.id}
            onClick={() => void deleteTask(task.id)}
            type="button"
          >
            Borrar
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="council-tasks-shell">
      <form className="council-task-create" onSubmit={(event) => void createTask(event)}>
        <input
          onChange={(event) => {
            const value = event.currentTarget.value;
            setCreateForm((current) => ({ ...current, title: value }));
          }}
          placeholder="Titulo"
          required
          value={createForm.title}
        />
        <input
          onChange={(event) => {
            const value = event.currentTarget.value;
            setCreateForm((current) => ({ ...current, description: value }));
          }}
          placeholder="Descripcion"
          required
          value={createForm.description}
        />
        <select
          onChange={(event) => {
            const value = event.currentTarget.value as CouncilTaskCategory;
            setCreateForm((current) => ({
              ...current,
              category: value
            }));
          }}
          value={createForm.category}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category]}
            </option>
          ))}
        </select>
        <select
          onChange={(event) => {
            const value = event.currentTarget.value;
            setCreateForm((current) => ({
              ...current,
              assignedMemberId: value
            }));
          }}
          value={createForm.assignedMemberId}
        >
          <option value="">Sin asignar</option>
          {councilMembers.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.displayName}
            </option>
          ))}
        </select>
        <input
          onChange={(event) => {
            const value = event.currentTarget.value;
            setCreateForm((current) => ({ ...current, executeAt: value }));
          }}
          type="datetime-local"
          value={createForm.executeAt}
        />
        <button className="button primary" disabled={createBusy} type="submit">
          {createBusy ? "Creando..." : "Nueva tarea"}
        </button>
      </form>

      <div className="council-tabs" role="tablist">
        <button
          className={`comp-tab ${activeTab === "LIST" ? "active" : ""}`}
          onClick={() => setActiveTab("LIST")}
          type="button"
        >
          Listado
        </button>
        <button
          className={`comp-tab ${activeTab === "KANBAN" ? "active" : ""}`}
          onClick={() => setActiveTab("KANBAN")}
          type="button"
        >
          Kanban
        </button>
      </div>

      {error ? <p className="empty">{error}</p> : null}

      {activeTab === "LIST" ? (
        <div className="council-task-list">{tasks.map((task) => renderTaskEditor(task))}</div>
      ) : (
        <div className="council-kanban">
          {statusOptions.map((status) => (
            <section
              className="council-kanban-column"
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingTaskId) {
                  void updateTaskStatus(draggingTaskId, status);
                }
                setDraggingTaskId(null);
              }}
            >
              <header className="section-row">
                <h3>{statusLabels[status]}</h3>
                <span className="status-badge">{tasksByStatus[status].length}</span>
              </header>
              <div className="council-kanban-items">
                {tasksByStatus[status].map((task) => (
                  <article
                    className={`council-task-card category-${task.category.toLowerCase()}`}
                    draggable={busyTaskId !== task.id}
                    key={task.id}
                    onDragEnd={() => setDraggingTaskId(null)}
                    onDragStart={() => setDraggingTaskId(task.id)}
                  >
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                    <div className="council-task-foot">
                      <span className="status-badge">{categoryLabels[task.category]}</span>
                      <span className="status-badge">{task.assignedDisplayName ?? "Sin asignar"}</span>
                      <button
                        className="button danger-outline"
                        disabled={busyTaskId === task.id}
                        onClick={() => void deleteTask(task.id)}
                        type="button"
                      >
                        Borrar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
