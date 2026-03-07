import { redirect } from "next/navigation";
import { CouncilTasksBoard } from "./CouncilTasksBoard";
import { getPrivateCouncilTasksData } from "../../lib";

export default async function CouncilTasksPage() {
  const { me, councilMembers, councilTasks, canAccessCouncilTasks } = await getPrivateCouncilTasksData();

  if (!me) {
    redirect("/");
  }

  if (!canAccessCouncilTasks) {
    redirect("/app");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Council</span>
            <h2>Tareas Council</h2>
          </div>
        </div>
        <p className="lede">
          Gestiona tareas de logística y coordinación con vista lista y tablero kanban.
        </p>
        <CouncilTasksBoard councilMembers={councilMembers} initialTasks={councilTasks} />
      </article>
    </section>
  );
}
