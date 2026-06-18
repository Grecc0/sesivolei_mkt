const STATUS = ["Não iniciado", "Em andamento", "Aguardando", "Concluído", "Cancelado"];
const PRIORITY = ["Alta", "Média", "Baixa"];
const STORAGE_KEY = "sesivolei_mkt_totalmente_editavel_v4";
const COLLAPSE_KEY = "sesivolei_mkt_cards_minimizados_v1";

let baseTasks = Array.isArray(window.PLANNER_TASKS) ? window.PLANNER_TASKS : [];
let tasks = loadTasks();
let collapsedCards = loadCollapsedCards();

const el = {
  progress: document.getElementById("overallProgress"),
  progressBar: document.getElementById("overallProgressBar"),
  saveState: document.getElementById("saveState"),
  total: document.getElementById("kpiTotal"),
  done: document.getElementById("kpiDone"),
  doing: document.getElementById("kpiDoing"),
  late: document.getElementById("kpiLate"),
  statusFilter: document.getElementById("statusFilter"),
  searchInput: document.getElementById("searchInput"),
  cards: document.getElementById("cards"),
  tableBody: document.getElementById("tableBody"),
};

document.getElementById("addTaskBtn").addEventListener("click", addTask);
document.getElementById("saveBtn").addEventListener("click", saveLocal);
document.getElementById("collapseAllBtn").addEventListener("click", collapseAllCards);
document.getElementById("expandAllBtn").addEventListener("click", expandAllCards);
document.getElementById("downloadDataBtn").addEventListener("click", downloadDataJs);
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
document.getElementById("resetBtn").addEventListener("click", resetBase);
document.getElementById("importFile").addEventListener("change", importFile);
el.statusFilter.addEventListener("change", render);
el.searchInput.addEventListener("input", render);

render();

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return normalizeTasks(baseTasks);
  try {
    return normalizeTasks(JSON.parse(saved));
  } catch {
    return normalizeTasks(baseTasks);
  }
}


function loadCollapsedCards() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]").map(Number));
  } catch {
    return new Set();
  }
}

function saveCollapsedCards() {
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsedCards]));
}

function normalizeTasks(list) {
  return list.map((task, index) => ({
    id: Number(task.id || index + 1),
    atividade: task.atividade || "",
    descricao: task.descricao || "",
    responsavel: task.responsavel || "",
    prioridade: task.prioridade || "Média",
    status: task.status || "Não iniciado",
    andamento: Number(task.andamento || 0),
    inicioPlanejado: task.inicioPlanejado || "",
    prazo: task.prazo || "",
    proximaAcao: task.proximaAcao || "",
    observacoes: task.observacoes || "",
    ultimaAtualizacao: task.ultimaAtualizacao || ""
  }));
}

function addTask() {
  const newTask = {
    id: nextId(),
    atividade: "Nova tarefa",
    descricao: "",
    responsavel: "",
    prioridade: "Média",
    status: "Não iniciado",
    andamento: 0,
    inicioPlanejado: "",
    prazo: "",
    proximaAcao: "",
    observacoes: "",
    ultimaAtualizacao: todayIso()
  };

  tasks.unshift(newTask);
  markPending();
  saveLocal();
  render();

  setTimeout(() => {
    const input = document.querySelector(`[data-id="${newTask.id}"][data-field="atividade"]`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  el.saveState.textContent = "Alterações salvas neste navegador.";
  el.saveState.classList.remove("pending");
}

function markPending() {
  el.saveState.textContent = "Há alterações não salvas.";
  el.saveState.classList.add("pending");
}

function filteredTasks() {
  const status = el.statusFilter.value;
  const q = el.searchInput.value.trim().toLowerCase();

  return tasks.filter(task => {
    const searchable = [
      task.atividade,
      task.descricao,
      task.responsavel,
      task.prioridade,
      task.status,
      task.proximaAcao,
      task.observacoes
    ].join(" ").toLowerCase();

    return (!status || task.status === status) && (!q || searchable.includes(q));
  });
}

function render() {
  renderKpis();
  renderCards();
  renderTable();
}

function renderKpis() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "Concluído").length;
  const doing = tasks.filter(t => t.status === "Em andamento").length;
  const late = tasks.filter(t => deadlineStatus(t).label === "Atrasado").length;
  const avg = total ? Math.round(tasks.reduce((sum, t) => sum + Number(t.andamento || 0), 0) / total) : 0;

  el.total.textContent = total;
  el.done.textContent = done;
  el.doing.textContent = doing;
  el.late.textContent = late;
  el.progress.textContent = `${avg}%`;
  el.progressBar.style.width = `${avg}%`;
}

function renderCards() {
  const list = filteredTasks();

  el.cards.innerHTML = list.map(task => {
    const d = deadlineStatus(task);
    const isCollapsed = collapsedCards.has(Number(task.id));

    return `
      <article class="card ${isCollapsed ? "is-collapsed" : ""}" data-card="${task.id}">
        <div class="card-top">
          <span class="badge">#${String(task.id).padStart(2, "0")}</span>
          <span class="badge ${statusClass(task.status)}">${escapeHtml(task.status)}</span>
        </div>

        <div class="card-actions-top">
          <button class="btn btn-minimize" data-toggle="${task.id}" aria-expanded="${!isCollapsed}">
            ${isCollapsed ? "Expandir" : "Minimizar"}
          </button>
          <button class="btn btn-save-card" data-save="${task.id}">Salvar card</button>
        </div>

        <div class="card-summary">
          <strong>${escapeHtml(task.atividade || "Sem título")}</strong>
          <small>${escapeHtml(task.responsavel || "A definir")} • ${formatDate(task.prazo)} • ${Number(task.andamento || 0)}%</small>
          <span class="badge ${d.className}">${d.label}</span>
        </div>

        <div class="card-body">
          <label>Título da tarefa
            <input class="title-input" value="${escapeAttr(task.atividade)}" data-id="${task.id}" data-field="atividade" placeholder="Título da tarefa">
          </label>

          <label>Descrição
            <textarea data-id="${task.id}" data-field="descricao" placeholder="Descreva a tarefa">${escapeHtml(task.descricao)}</textarea>
          </label>

          <div class="edit-grid">
            <label>Responsável
              <input value="${escapeAttr(task.responsavel)}" data-id="${task.id}" data-field="responsavel" placeholder="Nome">
            </label>

            <label>Prioridade
              <select data-id="${task.id}" data-field="prioridade">
                ${PRIORITY.map(p => `<option ${p === task.prioridade ? "selected" : ""}>${p}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="edit-grid-3">
            <label>Status
              <select data-id="${task.id}" data-field="status">
                ${STATUS.map(s => `<option ${s === task.status ? "selected" : ""}>${s}</option>`).join("")}
              </select>
            </label>

            <label>Andamento %
              <input type="number" min="0" max="100" step="5" value="${Number(task.andamento || 0)}" data-id="${task.id}" data-field="andamento">
            </label>

            <label>Prazo
              <input type="date" value="${escapeAttr(task.prazo)}" data-id="${task.id}" data-field="prazo">
            </label>
          </div>

          <label>Início planejado
            <input type="date" value="${escapeAttr(task.inicioPlanejado)}" data-id="${task.id}" data-field="inicioPlanejado">
          </label>

          <label>Próxima ação
            <textarea data-id="${task.id}" data-field="proximaAcao" placeholder="Qual é o próximo passo?">${escapeHtml(task.proximaAcao)}</textarea>
          </label>

          <label>Observações
            <textarea data-id="${task.id}" data-field="observacoes" placeholder="Registre pontos de atenção">${escapeHtml(task.observacoes)}</textarea>
          </label>

          <div class="progress"><i style="width:${Number(task.andamento || 0)}%"></i></div>

          <div class="card-top">
            <span class="badge ${d.className}">${d.label}</span>
            <span class="muted">${d.daysText}</span>
          </div>

          <div class="card-actions">
            <button class="btn btn-save-card" data-save="${task.id}">Salvar card</button>
            <button class="btn" data-duplicate="${task.id}">Duplicar</button>
            <button class="btn btn-danger" data-delete="${task.id}">Excluir tarefa</button>
            <span class="save-note" data-save-note="${task.id}">Card salvo!</span>
          </div>
        </div>
      </article>
    `;
  }).join("");

  el.cards.querySelectorAll("[data-field]").forEach(input => {
    const eventName = input.tagName.toLowerCase() === "select" ? "change" : "blur";
    input.addEventListener(eventName, updateField);
    if (input.classList.contains("title-input")) {
      input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          input.blur();
        }
      });
    }
  });

  el.cards.querySelectorAll("[data-save]").forEach(btn => {
    btn.addEventListener("click", () => saveCard(Number(btn.dataset.save)));
  });

  el.cards.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleCard(Number(btn.dataset.toggle)));
  });

  el.cards.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteTask(Number(btn.dataset.delete)));
  });

  el.cards.querySelectorAll("[data-duplicate]").forEach(btn => {
    btn.addEventListener("click", () => duplicateTask(Number(btn.dataset.duplicate)));
  });
}

function renderTable() {
  el.tableBody.innerHTML = filteredTasks().map(task => {
    const d = deadlineStatus(task);

    return `
      <tr>
        <td>${task.id}</td>
        <td><strong>${escapeHtml(task.atividade || "Sem título")}</strong><br><small>${escapeHtml(task.descricao)}</small></td>
        <td>${escapeHtml(task.responsavel || "A definir")}</td>
        <td>${escapeHtml(task.prioridade)}</td>
        <td><span class="badge ${statusClass(task.status)}">${escapeHtml(task.status)}</span></td>
        <td>${Number(task.andamento || 0)}%</td>
        <td>${formatDate(task.prazo)}</td>
        <td><span class="badge ${d.className}">${d.label}</span></td>
        <td>${escapeHtml(task.proximaAcao || "-")}</td>
      </tr>
    `;
  }).join("");
}

function updateField(event) {
  const id = Number(event.target.dataset.id);
  const field = event.target.dataset.field;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  let value = event.target.value;

  if (field === "andamento") {
    value = Math.max(0, Math.min(100, Number(value || 0)));
  }

  task[field] = value;

  if (field === "status" && value === "Concluído") {
    task.andamento = 100;
  }

  if (field === "andamento" && Number(value) === 100) {
    task.status = "Concluído";
  }

  task.ultimaAtualizacao = todayIso();

  markPending();
  saveLocal();
  render();
}


function saveCard(id) {
  const card = document.querySelector(`[data-card="${id}"]`);
  const task = tasks.find(t => t.id === id);
  if (!card || !task) return;

  card.querySelectorAll("[data-field]").forEach(field => {
    const key = field.dataset.field;
    let value = field.value;

    if (key === "andamento") {
      value = Math.max(0, Math.min(100, Number(value || 0)));
    }

    task[key] = value;
  });

  if (task.status === "Concluído") task.andamento = 100;
  if (Number(task.andamento) === 100) task.status = "Concluído";
  task.ultimaAtualizacao = todayIso();

  saveLocal();

  render();

  setTimeout(() => {
    const note = document.querySelector(`[data-save-note="${id}"]`);
    if (note) {
      note.classList.add("is-visible");
      setTimeout(() => note.classList.remove("is-visible"), 1700);
    }
  }, 0);
}

function toggleCard(id) {
  if (collapsedCards.has(id)) {
    collapsedCards.delete(id);
  } else {
    collapsedCards.add(id);
  }

  saveCollapsedCards();
  renderCards();
}

function collapseAllCards() {
  filteredTasks().forEach(task => collapsedCards.add(Number(task.id)));
  saveCollapsedCards();
  renderCards();
}

function expandAllCards() {
  filteredTasks().forEach(task => collapsedCards.delete(Number(task.id)));
  saveCollapsedCards();
  renderCards();
}

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const ok = confirm(`Excluir a tarefa "${task.atividade || "sem título"}"?`);
  if (!ok) return;

  tasks = tasks.filter(t => t.id !== id);
  collapsedCards.delete(id);
  saveCollapsedCards();
  markPending();
  saveLocal();
  render();
}

function duplicateTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const copy = {
    ...task,
    id: nextId(),
    atividade: `${task.atividade} — cópia`,
    status: "Não iniciado",
    andamento: 0,
    ultimaAtualizacao: todayIso()
  };

  tasks.unshift(copy);
  collapsedCards.delete(copy.id);
  saveCollapsedCards();
  markPending();
  saveLocal();
  render();
}

function nextId() {
  return tasks.length ? Math.max(...tasks.map(t => Number(t.id))) + 1 : 1;
}

function deadlineStatus(task) {
  if (task.status === "Concluído") return { label: "Concluído", className: "badge-concluido", daysText: "Finalizado" };
  if (task.status === "Cancelado") return { label: "Cancelado", className: "badge-cancelado", daysText: "Cancelado" };
  if (!task.prazo) return { label: "Sem prazo", className: "badge-nao-iniciado", daysText: "Sem prazo definido" };

  const today = new Date();
  today.setHours(0,0,0,0);

  const deadline = new Date(`${task.prazo}T00:00:00`);
  const diff = Math.ceil((deadline - today) / 86400000);

  if (diff < 0) return { label: "Atrasado", className: "badge-atrasado", daysText: `${Math.abs(diff)} dia${Math.abs(diff) === 1 ? "" : "s"} em atraso` };
  if (diff === 0) return { label: "Atenção", className: "badge-atencao", daysText: "Vence hoje" };
  if (diff <= 3) return { label: "Atenção", className: "badge-atencao", daysText: `Faltam ${diff} dia${diff === 1 ? "" : "s"}` };
  return { label: "No prazo", className: "badge-no-prazo", daysText: `Faltam ${diff} dias` };
}

function downloadDataJs() {
  const content = "window.PLANNER_TASKS = " + JSON.stringify(tasks, null, 2) + ";\n";
  downloadFile("data.js", content, "text/javascript;charset=utf-8");
}

function exportJson() {
  downloadFile("planner-acoes-volei.json", JSON.stringify(tasks, null, 2), "application/json;charset=utf-8");
}

function exportCsv() {
  const headers = ["ID","Tarefa","Descrição","Responsável","Prioridade","Status","Andamento","Início planejado","Prazo","Situação","Próxima ação","Observações","Última atualização"];
  const rows = tasks.map(t => [
    t.id,
    t.atividade,
    t.descricao,
    t.responsavel,
    t.prioridade,
    t.status,
    `${t.andamento}%`,
    formatDate(t.inicioPlanejado),
    formatDate(t.prazo),
    deadlineStatus(t).label,
    t.proximaAcao,
    t.observacoes,
    t.ultimaAtualizacao
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? "").replaceAll('"','""')}"`).join(";"))
    .join("\n");

  downloadFile("planner-acoes-volei.csv", "\ufeff" + csv, "text/csv;charset=utf-8");
}

function importFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const text = String(reader.result || "");
      const jsonText = text.includes("window.PLANNER_TASKS")
        ? text.replace(/^.*?window\.PLANNER_TASKS\s*=\s*/s, "").replace(/;\s*$/s, "")
        : text;

      const imported = JSON.parse(jsonText);
      if (!Array.isArray(imported)) throw new Error("Formato inválido");

      tasks = normalizeTasks(imported);
      saveLocal();
      render();
      alert("Dados importados com sucesso.");
    } catch {
      alert("Não foi possível importar. Use um JSON válido ou o data.js gerado pelo planner.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file, "utf-8");
}

function resetBase() {
  const ok = confirm("Restaurar a base inicial? As alterações salvas neste navegador serão apagadas.");
  if (!ok) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(COLLAPSE_KEY);
  collapsedCards = new Set();
  tasks = normalizeTasks(baseTasks);
  render();
  el.saveState.textContent = "Base inicial restaurada.";
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function statusClass(status) {
  return `badge-${String(status).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll(" ", "-")}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("pt-BR");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
