const config = window.SUPABASE_CONFIG || {};
const ADMIN_SESSION_KEY = "student_dashboard_admin_gate_v1";

const tables = {
  users: config.tables?.users || "users",
  subjects: config.tables?.subjects || "subjects",
  tasks: config.tables?.tasks || "tasks",
  catalog: config.tables?.subjectCatalog || "subject_catalog",
};

const state = {
  client: null,
  catalog: [],
  users: [],
  selectedUserId: null,
  selectedUserSubjects: [],
  tasksBySubjectId: {},
};

const els = {
  createStudentForm: document.getElementById("createStudentForm"),
  createName: document.getElementById("createName"),
  createSubjects: document.getElementById("createSubjects"),

  studentsList: document.getElementById("studentsList"),

  editStudentForm: document.getElementById("editStudentForm"),
  editName: document.getElementById("editName"),
  editActive: document.getElementById("editActive"),
  editToken: document.getElementById("editToken"),
  editSubjects: document.getElementById("editSubjects"),
  subjectSettings: document.getElementById("subjectSettings"),
  emptyEditHint: document.getElementById("emptyEditHint"),
  copyLinkBtn: document.getElementById("copyLinkBtn"),
  archiveBtn: document.getElementById("archiveBtn"),
  deleteStudentBtn: document.getElementById("deleteStudentBtn"),
  tasksEditor: document.getElementById("tasksEditor"),

  statusBox: document.getElementById("statusBox"),
};

function getAdminGatePassword() {
  const fromLocal =
    typeof window.ADMIN_GATE?.password === "string"
      ? window.ADMIN_GATE.password.trim()
      : "";
  const fromConfig =
    typeof config.adminGatePassword === "string"
      ? config.adminGatePassword.trim()
      : "";
  return fromLocal || fromConfig;
}

function getStudentDashboardBaseUrl() {
  const path = window.location.pathname || "";
  const i = path.lastIndexOf("/");
  const dir = i >= 0 ? path.slice(0, i + 1) : "/";
  return `${window.location.origin}${dir}index.html`;
}

function isAdminGateUnlocked() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function applyAdminGateUi() {
  const overlay = document.getElementById("adminLoginOverlay");
  const root = document.getElementById("adminAppRoot");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const pwd = getAdminGatePassword();
  if (!overlay || !root) return;

  if (!pwd) {
    overlay.hidden = true;
    root.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
    return;
  }

  if (logoutBtn) logoutBtn.hidden = false;

  if (isAdminGateUnlocked()) {
    overlay.hidden = true;
    root.hidden = false;
    return;
  }

  overlay.hidden = false;
  root.hidden = true;
}

function setupAdminGate() {
  const pwd = getAdminGatePassword();
  document.getElementById("adminLogoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.reload();
  });

  applyAdminGateUi();

  if (!pwd) {
    void init();
    return;
  }

  if (isAdminGateUnlocked()) {
    void init();
    return;
  }

  const form = document.getElementById("adminLoginForm");
  const err = document.getElementById("adminGateError");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("adminGateInput");
    const value = input?.value ?? "";
    if (value === pwd) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      err.hidden = true;
      err.textContent = "";
      applyAdminGateUi();
      void init();
    } else {
      err.hidden = false;
      err.textContent = "Неверный пароль.";
      if (input) input.value = "";
    }
  });
}

setupAdminGate();

async function init() {
  if (!config.url || !config.anonKey || !window.supabase?.createClient) {
    setStatus(
      "Supabase не настроен. Проверь `supabase.config.js` (url и anonKey).",
      "error",
    );
    disableForms();
    return;
  }

  state.client = window.supabase.createClient(config.url, config.anonKey);
  bindEvents();
  await loadCatalog();
  await loadUsers();
  setStatus("Данные загружены", "success");
}

function bindEvents() {
  els.createStudentForm.addEventListener("submit", handleCreateStudent);
  els.editStudentForm.addEventListener("submit", handleSaveStudent);
  els.copyLinkBtn.addEventListener("click", handleCopyLink);
  els.archiveBtn.addEventListener("click", handleToggleArchive);
  els.deleteStudentBtn.addEventListener("click", handleDeleteStudent);
}

function disableForms() {
  els.createStudentForm.querySelectorAll("input,button,select,textarea").forEach((x) => {
    x.disabled = true;
  });
  els.editStudentForm.querySelectorAll("input,button,select,textarea").forEach((x) => {
    x.disabled = true;
  });
}

async function loadCatalog() {
  const { data, error } = await state.client
    .from(tables.catalog)
    .select(
      "id,slug,title,emoji,sort_order,default_exam_date,default_exam_time,default_duration_minutes,default_tasks_total,default_tips",
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throwWithStatus("Не удалось загрузить каталог предметов", error);
    return;
  }

  state.catalog = data || [];
  renderCatalogChecks(els.createSubjects, "createSubject", []);
}

async function loadUsers(preserveSelected = true, autoSelect = true) {
  const prevSelected = preserveSelected ? state.selectedUserId : null;
  const { data, error } = await state.client
    .from(tables.users)
    .select("id,name,timezone,access_token,is_active")
    .order("name", { ascending: true });

  if (error) {
    throwWithStatus("Не удалось загрузить учеников", error);
    return;
  }

  state.users = data || [];
  renderStudentsList();
  if (!autoSelect) return;

  if (!state.users.length) {
    state.selectedUserId = null;
    renderEditPanel();
    return;
  }

  const selectedExists = state.users.some((u) => u.id === prevSelected);
  const nextUserId = selectedExists ? prevSelected : state.users[0].id;
  await selectUser(nextUserId);
}

async function selectUser(userId) {
  state.selectedUserId = userId;
  renderStudentsList();
  await loadUserSubjects(userId);
  renderEditPanel();
}

async function loadUserSubjects(userId) {
  const { data, error } = await state.client
    .from(tables.subjects)
    .select(
      "id,user_id,catalog_id,title,emoji,exam_date,exam_time,duration_minutes,tasks_total,order_index",
    )
    .eq("user_id", userId)
    .order("order_index", { ascending: true });

  if (error) {
    throwWithStatus("Не удалось загрузить предметы ученика", error);
    return;
  }

  state.selectedUserSubjects = data || [];
}

function renderStudentsList() {
  if (!state.users.length) {
    els.studentsList.innerHTML = `<p class="muted">Пока нет учеников.</p>`;
    return;
  }

  els.studentsList.innerHTML = state.users
    .map((u) => {
      const active = u.id === state.selectedUserId ? "is-active" : "";
      const safeName = escapeHtml(u.name || "Без имени");
      const tokenSuffix = String(u.access_token || "").slice(-8);
      const stateLabel = u.is_active === false ? "архив" : "активен";
      return `
        <button class="student-row ${active}" type="button" data-user-id="${escapeAttr(u.id)}">
          <div class="student-name">${safeName}</div>
          <div class="student-meta">${stateLabel} • токен …${escapeHtml(tokenSuffix || "—")}</div>
        </button>
      `;
    })
    .join("");

  els.studentsList.querySelectorAll("[data-user-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void selectUser(btn.getAttribute("data-user-id"));
    });
  });
}

function renderEditPanel() {
  const user = getSelectedUser();
  if (!user) {
    els.editStudentForm.hidden = true;
    els.emptyEditHint.hidden = false;
    return;
  }

  els.editStudentForm.hidden = false;
  els.emptyEditHint.hidden = true;
  els.editName.value = user.name || "";
  els.editActive.value = String(user.is_active !== false);
  els.editToken.textContent = user.access_token || "—";

  const selectedCatalogIds = state.selectedUserSubjects
    .map((s) => s.catalog_id)
    .filter(Boolean);
  renderCatalogChecks(els.editSubjects, "editSubject", selectedCatalogIds);
  renderSubjectSettings();
  void renderTasksEditor();
}

function renderCatalogChecks(root, prefix, selectedIds) {
  const selected = new Set(selectedIds || []);
  root.innerHTML = state.catalog
    .map((c) => {
      const isOn = selected.has(c.id);
      return `
        <button
          class="subject-check ${isOn ? "is-on" : ""}"
          type="button"
          data-check-name="${escapeAttr(prefix)}"
          data-check-value="${escapeAttr(c.id)}"
          data-checked="${isOn ? "true" : "false"}"
          aria-pressed="${isOn ? "true" : "false"}"
        >
          <span>${escapeHtml(c.emoji || "📘")} ${escapeHtml(c.title)}</span>
        </button>
      `;
    })
    .join("");

  root.querySelectorAll("[data-check-name]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.getAttribute("data-checked") !== "true";
      btn.setAttribute("data-checked", next ? "true" : "false");
      btn.setAttribute("aria-pressed", next ? "true" : "false");
      btn.classList.toggle("is-on", next);
    });
  });
}

function renderSubjectSettings() {
  const byCatalog = new Map(state.catalog.map((c) => [c.id, c]));
  const rows = state.selectedUserSubjects.map((s) => {
    const cat = byCatalog.get(s.catalog_id);
    const title = s.title || cat?.title || "Предмет";
    const emoji = s.emoji || cat?.emoji || "📘";
    const examDate = s.exam_date || cat?.default_exam_date || "";
    const examTime = s.exam_time || cat?.default_exam_time || "10:00";
    const duration = Number(s.duration_minutes || cat?.default_duration_minutes || 235);
    const tasksTotal = Number(s.tasks_total || cat?.default_tasks_total || 0);

    return `
      <div class="subject-setting" data-subject-id="${escapeAttr(s.id)}">
        <div class="subject-setting__title">${escapeHtml(emoji)} ${escapeHtml(title)}</div>
        <div class="subject-setting__grid">
          <label>
            <span>Дата экзамена</span>
            <input data-field="exam_date" type="date" value="${escapeAttr(examDate || "")}" />
          </label>
          <label>
            <span>Время</span>
            <input data-field="exam_time" type="text" value="${escapeAttr(examTime || "")}" />
          </label>
          <label>
            <span>Длительность (мин)</span>
            <input data-field="duration_minutes" type="number" min="1" value="${escapeAttr(duration)}" />
          </label>
          <label>
            <span>Кол-во заданий</span>
            <input data-field="tasks_total" type="number" min="0" value="${escapeAttr(tasksTotal)}" />
          </label>
        </div>
      </div>
    `;
  });

  els.subjectSettings.innerHTML = rows.length
    ? rows.join("")
    : `<p class="muted">У ученика пока нет предметов.</p>`;
}

async function handleCreateStudent(e) {
  e.preventDefault();
  const name = els.createName.value.trim();
  const selectedCatalogIds = getCheckedValues(els.createSubjects, "createSubject");

  if (!name) {
    setStatus("Укажи имя ученика", "error");
    return;
  }

  const slugs = state.catalog
    .filter((c) => selectedCatalogIds.includes(c.id))
    .map((c) => c.slug);

  setStatus("Создаю ученика...", "muted");
  const { data, error } = await state.client.rpc("create_student_with_subjects", {
    p_name: name,
    p_catalog_slugs: slugs,
  });

  if (error) {
    throwWithStatus(
      "Не удалось создать ученика через функцию create_student_with_subjects. Проверь, что SQL применен в Supabase.",
      error,
    );
    return;
  }

  els.createStudentForm.reset();
  renderCatalogChecks(els.createSubjects, "createSubject", []);

  await loadUsers(false);
  if (data) {
    await selectUser(data);
  }
  setStatus("Ученик создан", "success");
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const user = getSelectedUser();
  if (!user) return;

  const name = els.editName.value.trim();
  const isActive = els.editActive.value === "true";
  const selectedCatalogIds = getCheckedValues(els.editSubjects, "editSubject");
  const selectedSet = new Set(selectedCatalogIds);
  const currentCatalogIds = new Set(
    state.selectedUserSubjects.map((s) => s.catalog_id).filter(Boolean),
  );

  const toAdd = selectedCatalogIds.filter((id) => !currentCatalogIds.has(id));
  const toRemoveSubjects = state.selectedUserSubjects.filter(
    (s) => s.catalog_id && !selectedSet.has(s.catalog_id),
  );

  setStatus("Сохраняю изменения...", "muted");

  const { error: userErr } = await state.client
    .from(tables.users)
    .update({
      name: name || null,
      is_active: isActive,
    })
    .eq("id", user.id);

  if (userErr) {
    throwWithStatus("Не удалось сохранить данные ученика", userErr);
    return;
  }

  if (toRemoveSubjects.length) {
    const removeSubjectIds = toRemoveSubjects.map((s) => s.id);
    const { error: tasksErr } = await state.client
      .from(tables.tasks)
      .delete()
      .in("subject_id", removeSubjectIds);
    if (tasksErr) {
      throwWithStatus("Не удалось удалить задачи по снятым предметам", tasksErr);
      return;
    }

    const { error: subErr } = await state.client
      .from(tables.subjects)
      .delete()
      .in("id", removeSubjectIds);
    if (subErr) {
      throwWithStatus("Не удалось удалить снятые предметы", subErr);
      return;
    }
  }

  if (toAdd.length) {
    const byId = new Map(state.catalog.map((c) => [c.id, c]));
    const payload = toAdd
      .map((catalogId) => {
        const cat = byId.get(catalogId);
        if (!cat) return null;
        return {
          user_id: user.id,
          catalog_id: cat.id,
          title: cat.title,
          emoji: cat.emoji,
          exam_date: cat.default_exam_date,
          exam_time: cat.default_exam_time,
          duration_minutes: cat.default_duration_minutes,
          tasks_total: cat.default_tasks_total,
          tips: cat.default_tips || [],
          order_index: cat.sort_order || 0,
        };
      })
      .filter(Boolean);

    if (payload.length) {
      const { error: addErr } = await state.client
        .from(tables.subjects)
        .insert(payload);
      if (addErr) {
        throwWithStatus("Не удалось добавить новые предметы", addErr);
        return;
      }
    }
  }

  const subjectUpdates = Array.from(
    els.subjectSettings.querySelectorAll("[data-subject-id]"),
  )
    .map((row) => {
      const subjectId = row.getAttribute("data-subject-id");
      const subject = state.selectedUserSubjects.find((s) => s.id === subjectId);
      if (!subject || !selectedSet.has(subject.catalog_id)) return null;
      const examDate =
        row.querySelector('[data-field="exam_date"]')?.value?.trim() || null;
      const examTime =
        row.querySelector('[data-field="exam_time"]')?.value?.trim() || null;
      const duration = Number(
        row.querySelector('[data-field="duration_minutes"]')?.value || 0,
      );
      const tasksTotal = Number(
        row.querySelector('[data-field="tasks_total"]')?.value || 0,
      );
      return {
        id: subjectId,
        exam_date: examDate,
        exam_time: examTime,
        duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : 235,
        tasks_total:
          Number.isFinite(tasksTotal) && tasksTotal >= 0 ? tasksTotal : 0,
      };
    })
    .filter(Boolean);

  for (const update of subjectUpdates) {
    const { id, ...payload } = update;
    const { error: updErr } = await state.client
      .from(tables.subjects)
      .update(payload)
      .eq("id", id);
    if (updErr) {
      throwWithStatus("Не удалось обновить параметры предмета", updErr);
      return;
    }
  }

  await loadUsers(true, false);
  await loadUserSubjects(user.id);
  state.selectedUserId = user.id;
  renderStudentsList();
  renderEditPanel();
  setStatus("Изменения сохранены", "success");
}

async function handleToggleArchive() {
  const user = getSelectedUser();
  if (!user) return;
  const next = user.is_active === false;
  const { error } = await state.client
    .from(tables.users)
    .update({ is_active: next })
    .eq("id", user.id);
  if (error) {
    throwWithStatus("Не удалось сменить статус ученика", error);
    return;
  }
  await loadUsers(true, false);
  await loadUserSubjects(user.id);
  state.selectedUserId = user.id;
  renderStudentsList();
  renderEditPanel();
  setStatus(next ? "Ученик активирован" : "Ученик отправлен в архив", "success");
}

async function handleDeleteStudent() {
  const user = getSelectedUser();
  if (!user) return;
  const ok = window.confirm(
    `Удалить ученика "${user.name || "Без имени"}" и все его предметы/задания?`,
  );
  if (!ok) return;
  const { error } = await state.client.from(tables.users).delete().eq("id", user.id);
  if (error) {
    throwWithStatus("Не удалось удалить ученика", error);
    return;
  }
  await loadUsers(false);
  setStatus("Ученик удален", "success");
}

async function handleCopyLink() {
  const user = getSelectedUser();
  if (!user?.access_token) {
    setStatus("У ученика нет токена доступа", "error");
    return;
  }
  const base = getStudentDashboardBaseUrl();
  const fullUrl = `${base}?k=${encodeURIComponent(user.access_token)}`;
  try {
    await navigator.clipboard.writeText(fullUrl);
    setStatus("Ссылка скопирована в буфер обмена", "success");
  } catch {
    setStatus(`Не удалось скопировать. Ссылка: ${fullUrl}`, "error");
  }
}

function getCheckedValues(root, name) {
  return Array.from(
    root.querySelectorAll(`[data-check-name="${name}"][data-checked="true"]`),
  ).map((x) => x.getAttribute("data-check-value"));
}

function getSelectedUser() {
  return state.users.find((u) => u.id === state.selectedUserId) || null;
}

async function renderTasksEditor() {
  const user = getSelectedUser();
  if (!user) {
    els.tasksEditor.innerHTML =
      '<p class="muted admin-empty">Выбери ученика, чтобы редактировать задания.</p>';
    return;
  }

  const subjectIds = state.selectedUserSubjects.map((s) => s.id);
  if (!subjectIds.length) {
    els.tasksEditor.innerHTML =
      '<p class="muted admin-empty">У ученика нет предметов. Добавь предметы выше.</p>';
    return;
  }

  const { data, error } = await state.client
    .from(tables.tasks)
    .select("id,subject_id,title,description,status,details,order_index,updated_at")
    .in("subject_id", subjectIds);

  if (error) {
    throwWithStatus("Не удалось загрузить задания ученика", error);
    return;
  }

  const firstSubject = state.selectedUserSubjects[0]?.id;
  const tasks = data || [];
  state.tasksBySubjectId = tasks.reduce((acc, t) => {
    const key = t.subject_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  Object.keys(state.tasksBySubjectId).forEach((k) => {
    state.tasksBySubjectId[k] = sortTasksForAdmin(state.tasksBySubjectId[k]);
  });
  const tabs = state.selectedUserSubjects
    .map(
      (s, idx) =>
        `<button class="chip ${idx === 0 ? "is-active" : ""}" type="button" data-task-subject="${escapeAttr(s.id)}">${escapeHtml(s.emoji || "📘")} ${escapeHtml(s.title || "Предмет")}</button>`,
    )
    .join("");

  const blocks = state.selectedUserSubjects
    .map((s) => {
      const subjectTasks = state.tasksBySubjectId[s.id] || [];
      const rows = subjectTasks.length
        ? subjectTasks.map(renderTaskRow).join("")
        : `<p class="muted">Заданий нет. <button class="icon-btn" type="button" data-add-task="${escapeAttr(s.id)}">Добавить первое задание</button></p>`;
      return `<div class="task-subject-block" data-task-block="${escapeAttr(s.id)}" style="display:${s.id === firstSubject ? "grid" : "none"};gap:10px;">${rows}<div class="task-actions"><button class="icon-btn" type="button" data-add-task="${escapeAttr(s.id)}">+ Добавить задание</button></div></div>`;
    })
    .join("");

  els.tasksEditor.innerHTML = `
    <div class="tasks-subject-tabs">${tabs}</div>
    ${blocks}
  `;

  els.tasksEditor.querySelectorAll("[data-task-subject]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sid = btn.getAttribute("data-task-subject");
      els.tasksEditor.querySelectorAll("[data-task-subject]").forEach((x) => {
        x.classList.toggle("is-active", x === btn);
      });
      els.tasksEditor.querySelectorAll("[data-task-block]").forEach((block) => {
        block.style.display =
          block.getAttribute("data-task-block") === sid ? "grid" : "none";
      });
    });
  });

  els.tasksEditor.querySelectorAll("[data-save-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void saveTaskFromRow(btn.closest("[data-task-id]"));
    });
  });
  els.tasksEditor.querySelectorAll("[data-delete-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void deleteTask(btn.getAttribute("data-delete-task"));
    });
  });
  els.tasksEditor.querySelectorAll("[data-add-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      void addTask(btn.getAttribute("data-add-task"));
    });
  });
  els.tasksEditor.querySelectorAll("[data-task-move-up]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void moveTaskInOrder(btn.getAttribute("data-task-move-up"), "up");
    });
  });
  els.tasksEditor.querySelectorAll("[data-task-move-down]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void moveTaskInOrder(btn.getAttribute("data-task-move-down"), "down");
    });
  });
}

function renderTaskRow(task) {
  const details = task.details && typeof task.details === "object" ? task.details : {};
  const isPinned = details.isPinned === true;
  const homework = Array.isArray(details.homework) ? details.homework.join("\n") : "";
  const hints = Array.isArray(details.hints) ? details.hints.join("\n") : "";
  const statusText = formatStatus(task.status);
  const attachmentsRaw = Array.isArray(details.attachments) ? details.attachments : [];
  const orderVal = getAdminTaskOrderValue(task);
  const updatedLocal = toDateTimeLocalValue(task.updated_at);
  return `
    <details class="task-row" data-task-id="${escapeAttr(task.id)}" data-subject-id-tr="${escapeAttr(task.subject_id)}" data-order-index="${escapeAttr(orderVal)}" data-attachments='${escapeAttr(JSON.stringify(attachmentsRaw))}'>
      <summary class="task-row__summary">
        <span>${escapeHtml(task.title || "Задание")}</span>
        <span class="muted">${escapeHtml(statusText)}</span>
      </summary>
      <div class="task-row__body">
        <div class="task-order-bar" role="group" aria-label="Порядок в списке">
          <button class="icon-btn" type="button" data-task-move-up="${escapeAttr(task.id)}" title="Выше">↑</button>
          <button class="icon-btn" type="button" data-task-move-down="${escapeAttr(task.id)}" title="Ниже">↓</button>
        </div>
        <div class="task-row__grid">
          <label><span>Порядок (1, 2, 3…)</span>
            <input data-f="order_index" type="number" min="1" step="1" value="${escapeAttr(orderVal)}" />
          </label>
          <label><span>Дата «Обновлено»${task.status === "not_started" ? " (пока не начато — можно оставить пусто)" : ""}</span>
            <input data-f="updated_at" type="datetime-local" value="${task.status === "not_started" ? "" : escapeAttr(updatedLocal)}" />
          </label>
          <label><span>Название</span><input data-f="title" value="${escapeAttr(task.title || "")}" /></label>
          <label><span>Статус</span>
            <select data-f="status">
              <option value="not_started" ${task.status === "not_started" ? "selected" : ""}>Не начато</option>
              <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>В процессе</option>
              <option value="homework" ${task.status === "homework" ? "selected" : ""}>Сделать ДЗ</option>
              <option value="completed" ${task.status === "completed" ? "selected" : ""}>Пройдено</option>
            </select>
          </label>
          <label><span>Описание</span><input data-f="description" value="${escapeAttr(task.description || "")}" /></label>
          <label><span>Закрепить</span>
            <select data-f="isPinned">
              <option value="false" ${!isPinned ? "selected" : ""}>Нет</option>
              <option value="true" ${isPinned ? "selected" : ""}>Да (📌)</option>
            </select>
          </label>
        </div>
        <label><span>Конспект</span><textarea data-f="lessonNotes" rows="3">${escapeHtml(details.lessonNotes || "")}</textarea></label>
        <label><span>Домашка (1 строка = 1 пункт)</span><textarea data-f="homework" rows="3">${escapeHtml(homework)}</textarea></label>
        <label><span>Подсказки (1 строка = 1 пункт)</span><textarea data-f="hints" rows="3">${escapeHtml(hints)}</textarea></label>
        <!-- Материалы временно скрыты, структура в БД сохранена -->
        <div class="task-actions">
          <button class="icon-btn" type="button" data-save-task="${escapeAttr(task.id)}">Сохранить задание</button>
          <button class="icon-btn danger" type="button" data-delete-task="${escapeAttr(task.id)}">Удалить задание</button>
        </div>
      </div>
    </details>
  `;
}

async function saveTaskFromRow(row) {
  if (!row) return;
  const taskId = row.getAttribute("data-task-id");
  const orderRaw = row.querySelector('[data-f="order_index"]')?.value;
  const orderInput = Number(orderRaw);
  const order_index =
    Number.isFinite(orderInput) && orderInput > 0
      ? orderInput
      : Number(row.getAttribute("data-order-index")) || 1;
  const isPinned = row.querySelector('[data-f="isPinned"]')?.value === "true";
  const updatedLocal = row.querySelector('[data-f="updated_at"]')?.value;
  const statusVal = row.querySelector('[data-f="status"]')?.value || "not_started";
  const updatedFromForm = fromDateTimeLocalValue(updatedLocal);
  const updatedAtIso =
    updatedFromForm ||
    (statusVal === "not_started" ? null : new Date().toISOString());
  const payload = {
    title: row.querySelector('[data-f="title"]')?.value?.trim() || "Задание",
    description: row.querySelector('[data-f="description"]')?.value?.trim() || "",
    status: statusVal,
    order_index,
    details: {
      lessonNotes: row.querySelector('[data-f="lessonNotes"]')?.value?.trim() || "",
      homework: splitLines(row.querySelector('[data-f="homework"]')?.value),
      hints: splitLines(row.querySelector('[data-f="hints"]')?.value),
      attachments: parseAttachmentsJson(row.getAttribute("data-attachments")),
      isPinned,
    },
  };
  if (updatedAtIso) {
    payload.updated_at = updatedAtIso;
  }
  const { error } = await state.client
    .from(tables.tasks)
    .update(payload)
    .eq("id", taskId);
  if (error) {
    throwWithStatus("Не удалось сохранить задание", error);
    return;
  }
  setStatus("Задание сохранено", "success");
  await renderTasksEditor();
}

async function deleteTask(taskId) {
  if (!taskId) return;
  const ok = window.confirm("Удалить это задание?");
  if (!ok) return;
  const { error } = await state.client.from(tables.tasks).delete().eq("id", taskId);
  if (error) {
    throwWithStatus("Не удалось удалить задание", error);
    return;
  }
  await renderTasksEditor();
  setStatus("Задание удалено", "success");
}

async function addTask(subjectId) {
  if (!subjectId) return;
  const { error } = await state.client.from(tables.tasks).insert({
    subject_id: subjectId,
    user_id: state.selectedUserId,
    title: "Новое задание",
    description: "",
    status: "not_started",
    order_index: getNextOrderIndex(subjectId),
    details: {
      lessonNotes: "",
      homework: [],
      hints: [],
      attachments: [],
      isPinned: false,
    },
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throwWithStatus("Не удалось добавить задание", error);
    return;
  }
  await renderTasksEditor();
  setStatus("Задание добавлено", "success");
}

function getNextOrderIndex(subjectId) {
  const list = sortTasksForAdmin(state.tasksBySubjectId[subjectId] || []);
  if (!list.length) return 1;
  const max = list.reduce((acc, t) => Math.max(acc, getAdminTaskOrderValue(t)), 0);
  return max + 1;
}

function sortTasksForAdmin(tasks) {
  const list = Array.isArray(tasks) ? tasks.slice() : [];
  return list.sort((a, b) => {
    const pinDiff = Number(b?.details?.isPinned === true) - Number(a?.details?.isPinned === true);
    if (pinDiff !== 0) return pinDiff;
    const oa = getAdminTaskOrderValue(a);
    const ob = getAdminTaskOrderValue(b);
    if (oa !== ob) return oa - ob;
    return String(a.id).localeCompare(String(b.id));
  });
}

function getAdminTaskOrderValue(task) {
  const o = Number(task?.order_index);
  if (Number.isFinite(o) && o > 0) return o;
  const m = String(task?.title || "").match(/задание\s*(\d+)/i);
  if (m) return Number(m[1]) || 9999;
  return 9999;
}

async function moveTaskInOrder(taskId, direction) {
  const el = Array.from(els.tasksEditor.querySelectorAll(".task-row")).find(
    (n) => n.getAttribute("data-task-id") === taskId,
  );
  if (!el) return;
  const subjectId = el.getAttribute("data-subject-id-tr");
  if (!subjectId) return;
  const list = sortTasksForAdmin([...(state.tasksBySubjectId[subjectId] || [])]);
  const idx = list.findIndex((t) => t.id === taskId);
  if (idx < 0) return;
  const newIdx = direction === "up" ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= list.length) return;
  [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
  setStatus("Меняю порядок…", "muted");
  for (let i = 0; i < list.length; i++) {
    const { error } = await state.client
      .from(tables.tasks)
      .update({ order_index: i + 1 })
      .eq("id", list[i].id);
    if (error) {
      throwWithStatus("Не удалось сохранить порядок", error);
      return;
    }
  }
  await renderTasksEditor();
  setStatus("Порядок обновлён", "success");
}

function toDateTimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTimeLocalValue(s) {
  if (!s || !String(s).trim()) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseAttachmentsJson(raw) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatStatus(status) {
  if (status === "not_started") return "Не начато";
  if (status === "in_progress") return "В процессе";
  if (status === "homework") return "Сделать ДЗ";
  if (status === "completed") return "Пройдено";
  return "—";
}

function throwWithStatus(prefix, error) {
  const message = error?.message ? `${prefix}: ${error.message}` : prefix;
  setStatus(message, "error");
}

function setStatus(message, kind = "muted") {
  els.statusBox.textContent = message;
  els.statusBox.classList.remove("is-error", "is-success");
  if (kind === "error") els.statusBox.classList.add("is-error");
  if (kind === "success") els.statusBox.classList.add("is-success");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
