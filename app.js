const STATUS_OPTIONS = ["Não iniciado", "Em andamento", "Aguardando", "Concluído", "Cancelado"];
const PRIORITY_OPTIONS = ["Alta", "Média", "Baixa"];
const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];
const STORAGE_KEY = "sesivolei_mkt_planner_v1";

let tasks = mergeStoredTasks(window.PLANNER_TASKS || []);

const elements = {
  overallProgress: document.getElementById("overallProgress"),
  overallProgressBar: document.getElementById("overallProgressBar"),
  lastSync: document.getElementById("lastSync"),
  kpiTotal: document.getElementById("kpiTotal"),
  kpiDone: document.getElementById("kpiDone"),
  kpiProgress: document.getElementById("kpiProgress"),
  kpiLate: document.getElementById("kpiLate"),
  statusSummary: document.getElementById("statusSummary"),
  nextDeliveries: document.getElementById("nextDeliveries"),
  taskCards: document.getElementById("taskCards"),
  taskTable: document.getElementById("taskTable"),
  filterStatus: document.getElementById("filterStatus"),
  searchInput: document.getElementById("searchInput"),
  exportCsv: document.getElementById("exportCsv"),
};

elements.filterStatus.addEventListener("change", render);
elements.searchInput.addEventListener("input", render);
elements.exportCsv.addEventListener("click", exportCsv);

render();

function mergeStoredTasks(baseTasks) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return baseTasks.map((task) => ({ ...task, ...(stored[task.id] || {}) }));
}

function persistTask(task) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  stored[task.id] = {
    responsavel: task.responsavel,
    prioridade: task.prioridade,
    status: task.status,
    andamento: Number(task.andamento),
    proximaAcao: task.proximaAcao,
    ultimaAtualizacao: new Date().toISOString().slice(0, 10),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function render() {
  const filtered = getFilteredTasks();
  renderKpis(tasks);
  renderStatusSummary(tasks);
  renderNextDeliveries(tasks);
  renderCards(filtered);
  renderTable(filtered);
}

function getFilteredTasks() {
  const status = elements.filterStatus.value;
  const query = elements.searchInput.value.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchStatus = !status || task.status === status;
    const text = `${task.atividade} ${task.descricao} ${task.responsavel} ${task.proximaAcao}`.toLowerCase();
    return matchStatus && (!query || text.includes(query));
  });
}

function renderKpis(allTasks) {
  const total = allTasks.length;
  const done = allTasks.filter((task) => task.status === "Concluído").length;
  const inProgress = allTasks.filter((task) => task.status === "Em andamento").length;
  const late = allTasks.filter((task) => getDeadlineStatus(task).label === "Atrasado").length;
  const avgProgress = total ? Math.round(allTasks.reduce((sum, task) => sum + Number(task.andamento || 0), 0) / total) : 0;

  elements.kpiTotal.textContent = total;
  elements.kpiDone.textContent = done;
  elements.kpiProgress.textContent = inProgress;
  elements.kpiLate.textContent = late;
  elements.overallProgress.textContent = `${avgProgress}%`;
  elements.overallProgressBar.style.width = `${avgProgress}%`;
  elements.lastSync.textContent = `Último carregamento: ${formatDate(new Date().toISOString().slice(0, 10))}`;
}

function renderStatusSummary(allTasks) {
  const total = allTasks.length || 1;
  const counts = STATUS_OPTIONS.map((status) => ({
    status,
    count: allTasks.filter((task) => task.status === status).length,
  }));

  elements.statusSummary.innerHTML = counts.map(({ status, count }) => {
    const pct = Math.round((count / total) * 100);
    return `
      <div class="summary-item">
        <div class="summary-item__line">
          <strong>${status}</strong>
          <span>${count} ação${count === 1 ? "" : "ões"} • ${pct}%</span>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>
    `;
  }).join("");
}

function renderNextDeliveries(allTasks) {
  const upcoming = allTasks
    .filter((task) => task.status !== "Concluído" && task.status !== "Cancelado")
    .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    .slice(0, 5);

  elements.nextDeliveries.innerHTML = upcoming.map((task) => {
    const deadline = getDeadlineStatus(task);
    return `
      <div class="delivery-item">
        <div class="delivery-item__line">
          <strong>${task.atividade}</strong>
          <span class="badge ${deadline.className}">${deadline.label}</span>
        </div>
        <div class="delivery-item__line">
          <span>Prazo: ${formatDate(task.prazo)}</span>
          <span>${deadline.daysText}</span>
        </div>
      </div>
    `;
  }).join("") || "<p>Nenhuma entrega pendente.</p>";
}

function renderCards(filteredTasks) {
  elements.taskCards.innerHTML = filteredTasks.map((task) => {
    const deadline = getDeadlineStatus(task);
    return `
      <article class="task-card">
        <div class="task-card__top">
          <span class="badge">#${String(task.id).padStart(2, "0")}</span>
          <span class="badge ${statusClass(task.status)}">${task.status}</span>
        </div>

        <h3>${task.atividade}</h3>
        <p>${task.descricao}</p>

        <div class="meta">
          <div>
            <span>Prazo</span>
            <strong>${formatDate(task.prazo)}</strong>
          </div>
          <div>
            <span>Situação</span>
            <strong>${deadline.label}</strong>
          </div>
          <div>
            <span>Prioridade</span>
            <strong>${task.prioridade}</strong>
          </div>
          <div>
            <span>Responsável</span>
            <strong>${task.responsavel || "A definir"}</strong>
          </div>
        </div>

        <div class="progress"><span style="width:${Number(task.andamento || 0)}%"></span></div>
        <p style="margin-top:8px"><strong>${Number(task.andamento || 0)}%</strong> de andamento</p>

        <div class="task-card__controls">
          <label>
            Status
            <select data-field="status" data-id="${task.id}">
              ${STATUS_OPTIONS.map((option) => `<option ${option === task.status ? "selected" : ""}>${option}</option>`).join("")}
            </select>
          </label>

          <label>
            Andamento
            <select data-field="andamento" data-id="${task.id}">
              ${PROGRESS_OPTIONS.map((option) => `<option value="${option}" ${Number(option) === Number(task.andamento) ? "selected" : ""}>${option}%</option>`).join("")}
            </select>
          </label>

          <label>
            Responsável
            <input data-field="responsavel" data-id="${task.id}" value="${escapeHtml(task.responsavel || "")}" placeholder="Nome do responsável">
          </label>
        </div>
      </article>
    `;
  }).join("");

  elements.taskCards.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("change", handleEdit);
  });
}

function renderTable(filteredTasks) {
  elements.taskTable.innerHTML = filteredTasks.map((task) => {
    const deadline = getDeadlineStatus(task);
    return `
      <tr>
        <td>${task.id}</td>
        <td><strong>${task.atividade}</strong><br><small>${task.descricao}</small></td>
        <td>${task.responsavel || "A definir"}</td>
        <td>${task.prioridade}</td>
        <td><span class="badge ${statusClass(task.status)}">${task.status}</span></td>
        <td>${Number(task.andamento || 0)}%</td>
        <td>${formatDate(task.prazo)}</td>
        <td><span class="badge ${deadline.className}">${deadline.label}</span></td>
        <td>${task.proximaAcao || "-"}</td>
      </tr>
    `;
  }).join("");
}

function handleEdit(event) {
  const id = Number(event.target.dataset.id);
  const field = event.target.dataset.field;
  const task = tasks.find((item) => item.id === id);
  if (!task) return;

  task[field] = field === "andamento" ? Number(event.target.value) : event.target.value;

  if (field === "status" && task.status === "Concluído") {
    task.andamento = 100;
  }

  persistTask(task);
  render();
}

function getDeadlineStatus(task) {
  if (task.status === "Concluído") {
    return { label: "Concluído", className: "badge--concluido", daysText: "Finalizado" };
  }

  if (task.status === "Cancelado") {
    return { label: "Cancelado", className: "badge--cancelado", daysText: "Cancelado" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(`${task.prazo}T00:00:00`);
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Atrasado", className: "badge--atrasado", daysText: `${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? "" : "s"} em atraso` };
  }

  if (diffDays <= 3) {
    return { label: "Atenção", className: "badge--atencao", daysText: diffDays === 0 ? "Vence hoje" : `Faltam ${diffDays} dia${diffDays === 1 ? "" : "s"}` };
  }

  return { label: "No prazo", className: "badge--no-prazo", daysText: `Faltam ${diffDays} dias` };
}

function statusClass(status) {
  return `badge--${status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll(" ", "-")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return date.toLocaleDateString("pt-BR");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function exportCsv() {
  const header = ["ID", "Atividade", "Descrição", "Responsável", "Prioridade", "Status", "Andamento", "Prazo", "Situação", "Próxima ação", "Observações"];
  const rows = tasks.map((task) => [
    task.id,
    task.atividade,
    task.descricao,
    task.responsavel || "",
    task.prioridade,
    task.status,
    `${Number(task.andamento || 0)}%`,
    formatDate(task.prazo),
    getDeadlineStatus(task).label,
    task.proximaAcao || "",
    task.observacoes || "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "planner-acoes-volei.csv";
  link.click();
  URL.revokeObjectURL(url);
}
