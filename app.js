const SUPABASE_URL = "https://turirctfxxjuovkkkeam.supabase.co";
const SUPABASE_KEY = "sb_publishable_E5OTl9ous77W2iZsRTZaeg__WhJRTox";
const TABLE_NAME = "tarefas";

const STATUS = ["Não iniciado", "Em andamento", "Aguardando", "Concluído", "Cancelado"];
const PRIORITY = ["Alta", "Média", "Baixa"];
const COLLAPSE_KEY = "sesivolei_mkt_cards_minimizados_supabase_v1";

let tasks = [];
let collapsedCards = loadCollapsedCards();
let isLoading = false;

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
document.getElementById("saveBtn").addEventListener("click", saveAll);
document.getElementById("reloadBtn").addEventListener("click", loadFromSupabase);
document.getElementById("collapseAllBtn").addEventListener("click", collapseAllCards);
document.getElementById("expandAllBtn").addEventListener("click", expandAllCards);
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
el.statusFilter.addEventListener("change", render);
el.searchInput.addEventListener("input", render);

loadFromSupabase();

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...extra
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers || {})
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.hint || data?.details || text || `Erro ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function setLoading(state, message) {
  isLoading = state;
  document.querySelectorAll("button").forEach(btn => btn.disabled = state);
  el.saveState.textContent = message || (state ? "Processando..." : "Pronto.");
  el.saveState.classList.toggle("pending", state);
}

async function loadFromSupabase() {
  setLoading(true, "Carregando dados do Supabase...");

  try {
    const data = await supabaseRequest(`${TABLE_NAME}?select=*&order=id.asc`);
    tasks = normalizeTasks(data || []);
    if (!tasks.length && Array.isArray(window.PLANNER_TASKS)) {
      tasks = normalizeTasks(window.PLANNER_TASKS);
      await seedFallbackTasks();
    }
    el.saveState.textContent = "Dados carregados do Supabase.";
    el.saveState.classList.remove("pending");
    render();
  } catch (error) {
    console.error(error);
    if (Array.isArray(window.PLANNER_TASKS)) {
      tasks = normalizeTasks(window.PLANNER_TASKS);
      render();
    }
    el.saveState.textContent = `Erro ao carregar Supabase: ${error.message}`;
    el.saveState.classList.add("pending");
    alert("Não foi possível carregar do Supabase. Confira se a tabela e as permissões foram criadas. Erro: " + error.message);
  } finally {
    setLoading(false, el.saveState.textContent);
  }
}

async function seedFallbackTasks() {
  try {
    for (const task of tasks) {
      const payload = taskToPayload(task, false);
      delete payload.id;
      await supabaseRequest(`${TABLE_NAME}`, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload)
      });
    }
    const data = await supabaseRequest(`${TABLE_NAME}?select=*&order=id.asc`);
    tasks = normalizeTasks(data || []);
  } catch (error) {
    console.warn("Não foi possível semear tarefas iniciais:", error);
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
    inicioPlanejado: normalizeDateValue(task.inicioPlanejado),
    prazo: normalizeDateValue(task.prazo),
    proximaAcao: task.proximaAcao || "",
    observacoes: task.observacoes || "",
    ultimaAtualizacao: normalizeDateValue(task.ultimaAtualizacao)
  }));
}

async function addTask() {
  const newTask = {
    atividade: "Nova tarefa",
    descricao: "",
    responsavel: "",
    prioridade: "Média",
    status: "Não iniciado",
    andamento: 0,
    inicioPlanejado: null,
    prazo: null,
    proximaAcao: "",
    observacoes: "",
    ultimaAtualizacao: todayIso()
  };

  setLoading(true, "Criando tarefa no Supabase...");

  try {
    const created = await supabaseRequest(`${TABLE_NAME}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(newTask)
    });

    const task = normalizeTasks(created)[0];
    tasks.unshift(task);
    collapsedCards.delete(task.id);
    saveCollapsedCards();
    render();

    setTimeout(() => {
      const input = document.querySelector(`[data-id="${task.id}"][data-field="atividade"]`);
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);

    el.saveState.textContent = "Nova tarefa criada no Supabase.";
  } catch (error) {
    console.error(error);
    alert("Não foi possível criar a tarefa no Supabase: " + error.message);
    el.saveState.textContent = "Erro ao criar tarefa.";
    el.saveState.classList.add("pending");
  } finally {
    setLoading(false, el.saveState.textContent);
  }
}

async function saveAll() {
  setLoading(true, "Salvando todas as tarefas no Supabase...");

  try {
    for (const task of tasks) {
      await updateTask(task);
    }
    el.saveState.textContent = "Todas as tarefas foram salvas no Supabase.";
    el.saveState.classList.remove("pending");
    await loadFromSupabase();
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar todas as tarefas: " + error.message);
    el.saveState.textContent = "Erro ao salvar todas.";
    el.saveState.classList.add("pending");
  } finally {
    setLoading(false, el.saveState.textContent);
  }
}

async function saveCard(id) {
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

  setLoading(true, `Salvando card #${String(id).padStart(2, "0")}...`);

  try {
    const updated = await updateTask(task);
    const index = tasks.findIndex(t => t.id === id);
    if (index >= 0 && updated) {
      tasks[index] = normalizeTasks([updated])[0];
    }

    render();

    setTimeout(() => {
      const note = document.querySelector(`[data-save-note="${id}"]`);
      if (note) {
        note.classList.add("is-visible");
        setTimeout(() => note.classList.remove("is-visible"), 1700);
      }
    }, 0);

    el.saveState.textContent = `Card #${String(id).padStart(2, "0")} salvo no Supabase.`;
    el.saveState.classList.remove("pending");
  } catch (error) {
    console.error(error);
    alert("Não foi possível salvar o card: " + error.message);
    el.saveState.textContent = "Erro ao salvar card.";
    el.saveState.classList.add("pending");
  } finally {
    setLoading(false, el.saveState.textContent);
  }
}

async function updateTask(task) {
  const payload = taskToPayload(task, false);

  const data = await supabaseRequest(`${TABLE_NAME}?id=eq.${encodeURIComponent(task.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload)
  });

  return Array.isArray(data) ? data[0] : null;
}

function taskToPayload(task, includeId = true) {
  const payload = {
    atividade: task.atividade || "",
    descricao: task.descricao || "",
    responsavel: task.responsavel || "",
    prioridade: task.prioridade || "Média",
    status: task.status || "Não iniciado",
    andamento: Number(task.andamento || 0),
    inicioPlanejado: emptyToNull(task.inicioPlanejado),
    prazo: emptyToNull(task.prazo),
    proximaAcao: task.proximaAcao || "",
    observacoes: task.observacoes || "",
    ultimaAtualizacao: todayIso()
  };

  if (includeId) payload.id = task.id;

  return payload;
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
    input.addEventListener("input", updateFieldSoft);
    input.addEventListener("change", updateFieldSoft);

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

function updateFieldSoft(event) {
  const id = Number(event.target.dataset.id);
  const field = event.target.dataset.field;
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  let value = event.target.value;

  if (field === "andamento") {
    value = Math.max(0, Math.min(100, Number(value || 0)));
  }

  task[field] = value;

  if (field === "status" && value === "Concluído") task.andamento = 100;
  if (field === "andamento" && Number(value) === 100) task.status = "Concluído";
  task.ultimaAtualizacao = todayIso();

  el.saveState.textContent = "Há alterações não salvas no Supabase.";
  el.saveState.classList.add("pending");

  renderKpis();
  renderTable();
}

function toggleCard(id) {
  if (collapsedCards.has(id)) collapsedCards.delete(id);
  else collapsedCards.add(id);
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

async function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const ok = confirm(`Excluir a tarefa "${task.atividade || "sem título"}"?`);
  if (!ok) return;

  setLoading(true, "Excluindo tarefa no Supabase...");

  try {
    await supabaseRequest(`${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    tasks = tasks.filter(t => t.id !== id);
    collapsedCards.delete(id);
    saveCollapsedCards();
    render();
    el.saveState.textContent = "Tarefa excluída do Supabase.";
    el.saveState.classList.remove("pending");
  } catch (error) {
    console.error(error);
    alert("Não foi possível excluir a tarefa: " + error.message);
    el.saveState.textContent = "Erro ao excluir tarefa.";
    el.saveState.classList.add("pending");
  } finally {
    setLoading(false, el.saveState.textContent);
  }
}

async function duplicateTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  const copy = {
    ...task,
    atividade: `${task.atividade} — cópia`,
    status: "Não iniciado",
    andamento: 0,
    ultimaAtualizacao: todayIso()
  };

  delete copy.id;

  setLoading(true, "Duplicando tarefa no Supabase...");

  try {
    const created = await supabaseRequest(`${TABLE_NAME}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(taskToPayload(copy, false))
    });

    const newTask = normalizeTasks(created)[0];
    tasks.unshift(newTask);
    collapsedCards.delete(newTask.id);
    saveCollapsedCards();
    render();
    el.saveState.textContent = "Tarefa duplicada no Supabase.";
    el.saveState.classList.remove("pending");
  } catch (error) {
    console.error(error);
    alert("Não foi possível duplicar a tarefa: " + error.message);
    el.saveState.textContent = "Erro ao duplicar tarefa.";
    el.saveState.classList.add("pending");
  } finally {
    setLoading(false, el.saveState.textContent);
  }
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

function normalizeDateValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return "";
}

function emptyToNull(value) {
  return value ? value : null;
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
