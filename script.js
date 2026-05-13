/* Использует window.db (Firebase compat), инициализированный в firebase.config.js */

let data = {
  user: {
    id: "u_001",
    name: "Ученик",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
  },
  subjects: [],
  tasks: [],
  trialsBySubjectId: {},
};

const DASHBOARD_ACCESS_TOKEN = getDashboardAccessTokenFromUrl();

const STORAGE_KEY = DASHBOARD_ACCESS_TOKEN
  ? `student_dashboard_v1__${DASHBOARD_ACCESS_TOKEN}`
  : "student_dashboard_v1";

const state = loadState() || {
  selectedSubjectId: data.subjects[0]?.id || null,
  taskStatusById: {},
  filter: "all",
  section: "tasks",
};
if (!state.section) state.section = "tasks";

const els = {
  nowDate: document.getElementById("nowDate"),
  nowTime: document.getElementById("nowTime"),
  subjectTabs: document.getElementById("subjectTabs"),

  greetingEyebrow: document.getElementById("greetingEyebrow"),
  greetingTitle: document.getElementById("greetingTitle"),
  subjectPill: document.getElementById("subjectPill"),
  subjectPillIcon: document.getElementById("subjectPillIcon"),
  subjectPillText: document.getElementById("subjectPillText"),
  progressValue: document.getElementById("progressValue"),
  heroCompleted: document.getElementById("heroCompleted"),
  heroInProgress: document.getElementById("heroInProgress"),
  heroHomework: document.getElementById("heroHomework"),
  heroNotStarted: document.getElementById("heroNotStarted"),
  progressFill: document.getElementById("progressFill"),
  progressMetaLeft: document.getElementById("progressMetaLeft"),
  progressMetaRight: document.getElementById("progressMetaRight"),

  examDate: document.getElementById("examDate"),
  examCountdown: document.getElementById("examCountdown"),
  examCountdownSub: document.getElementById("examCountdownSub"),
  examDuration: document.getElementById("examDuration"),
  examTaskCount: document.getElementById("examTaskCount"),

  tasksGrid: document.getElementById("tasksGrid"),
  taskFilters: document.getElementById("taskFilters"),
  trialsPanel: document.getElementById("trialsPanel"),
  cardTasks: document.getElementById("cardTasks"),

  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modalClose"),
  modalBadge: document.getElementById("modalBadge"),
  modalTitle: document.getElementById("modalTitle"),
  modalSubtitle: document.getElementById("modalSubtitle"),
  modalContent: document.getElementById("modalContent"),

  appGate: document.getElementById("appGate"),
  appGateTitle: document.getElementById("appGateTitle"),
  appGateMessage: document.getElementById("appGateMessage"),
  appShell: document.getElementById("appShell"),
  appLoader: document.getElementById("appLoader"),
};

let clockTimer = null;
let countdownTimer = null;
let lastFocusedBeforeModal = null;
let subjectTabsBound = false;

void init();

async function init() {
  setAppLoading(true);
  try {
    await loadDataFromFirebase();
    if (!isDashboardShellVisible()) {
      startClock();
      return;
    }
    if (!state.selectedSubjectId) {
      state.selectedSubjectId = data.subjects[0]?.id || null;
    }
    renderSubjectTabs();
    bindEvents();
    renderAll();
    startClock();
    startCountdownTicker();
  } finally {
    setAppLoading(false);
  }
}

function getDashboardAccessTokenFromUrl() {
  const extractFromParams = (params) =>
    (params.get("k") || params.get("key") || "").trim();

  try {
    const fromSearch = extractFromParams(
      new URLSearchParams(window.location.search),
    );
    if (fromSearch) return fromSearch;

    const rawHash = String(window.location.hash || "");
    const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
    if (!hash) return "";

    if (hash.includes("?")) {
      const hashQuery = hash.slice(hash.indexOf("?") + 1);
      const fromHashQuery = extractFromParams(new URLSearchParams(hashQuery));
      if (fromHashQuery) return fromHashQuery;
    }

    if (hash.includes("=")) {
      const fromHash = extractFromParams(new URLSearchParams(hash));
      if (fromHash) return fromHash;
    }

    return "";
  } catch {
    return "";
  }
}

async function loadDataFromFirebase() {
  const token = DASHBOARD_ACCESS_TOKEN;
  const requirePersonalLink =
    window.FIREBASE_CONFIG?.requirePersonalLink !== false;

  if (requirePersonalLink && !token) {
    setDashboardGate("missing_token");
    return;
  }

  if (!token) {
    setDashboardGate(null);
    return;
  }

  try {
    const userSnap = await window.db
      .collection("users")
      .where("access_token", "==", token)
      .limit(1)
      .get();

    if (userSnap.empty) {
      setDashboardGate("invalid_token");
      return;
    }

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;
    const userRow = { id: userId, ...userDoc.data() };

    if (userRow.is_active === false) {
      setDashboardGate("invalid_token");
      return;
    }

    const subjectsSnap = await window.db
      .collection("users")
      .doc(userId)
      .collection("subjects")
      .get();

    const subjectRows = subjectsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const taskSnaps = await Promise.all(
      subjectRows.map((s) =>
        window.db
          .collection("users")
          .doc(userId)
          .collection("subjects")
          .doc(s.id)
          .collection("tasks")
          .get(),
      ),
    );

    const taskRows = taskSnaps.flatMap((snap) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    );

    // Загружаем пробники по каждому предмету параллельно
    const trialsSnaps = await Promise.all(
      subjectRows.map((s) =>
        window.db
          .collection("users").doc(userId)
          .collection("subjects").doc(s.id)
          .collection("trials")
          .orderBy("order_index").get()
          .catch(() => ({ docs: [] })),
      ),
    );
    const trialsBySubjectId = {};
    subjectRows.forEach((s, i) => {
      trialsBySubjectId[s.id] = trialsSnaps[i].docs.map((d) => ({ id: d.id, ...d.data() }));
    });

    data = buildDataFromPayload(userRow, subjectRows, taskRows);
    data.trialsBySubjectId = trialsBySubjectId;
    setDashboardGate(null);
  } catch (err) {
    console.error("Firebase load error:", err);
    if (requirePersonalLink && token) setDashboardGate("invalid_token");
  }
}

function isDashboardShellVisible() {
  return !els.appShell?.hidden;
}

function setAppLoading(isLoading) {
  const loader = els.appLoader;
  document.body.classList.toggle("is-app-loading", isLoading);
  if (!loader) return;
  loader.classList.toggle("is-hidden", !isLoading);
  loader.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function setDashboardGate(reason) {
  if (!els.appShell) return;
  if (!els.appGate || !els.appGateTitle || !els.appGateMessage) {
    els.appShell.hidden = false;
    return;
  }
  if (!reason) {
    els.appGate.hidden = true;
    els.appShell.hidden = false;
    return;
  }
  const copy = {
    missing_token: {
      title: "Нужна персональная ссылка",
      text: "Откройте кабинет по ссылке от преподавателя. В адресе должен быть параметр ?k=...",
    },
    invalid_token: {
      title: "Ссылка недействительна",
      text: "Проверьте ссылку целиком или запросите новую у преподавателя.",
    },
  };
  const block = copy[reason] || copy.invalid_token;
  els.appGateTitle.textContent = block.title;
  els.appGateMessage.textContent = block.text;
  els.appGate.hidden = false;
  els.appShell.hidden = true;
}

function sortDbTaskRows(rows) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  list.sort(
    (a, b) =>
      Number(a.order_index ?? Number.MAX_SAFE_INTEGER) -
        Number(b.order_index ?? Number.MAX_SAFE_INTEGER) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return list;
}

function buildDataFromPayload(userRow, subjectRows, taskRows) {
  return {
    user: mapUser(userRow || {}),
    subjects: (subjectRows || []).map(mapSubject),
    tasks: sortDbTaskRows(taskRows || []).map(mapTask),
  };
}

function mapUser(row) {
  return {
    id: row.id || "u_001",
    name: row.name || "Ученик",
    timezone:
      row.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "local",
  };
}

function mapSubject(row) {
  const title =
    typeof row.title === "string" && row.title.trim()
      ? row.title.trim()
      : "Предмет";
  const emoji =
    typeof row.emoji === "string" && row.emoji.trim() ? row.emoji.trim() : "📘";
  const tips = Array.isArray(row.tips) ? row.tips : [];

  return {
    id: row.id,
    catalogSlug: row.catalog_slug || null,
    title,
    emoji,
    exam: {
      dateISO: row.exam_date || "2026-06-15",
      durationMinutes: Number(row.duration_minutes || 235),
      tasksTotal: Number(row.tasks_total || 0),
    },
    tips,
  };
}

function mapTask(row) {
  const orderIndex = Number(row.order_index ?? row.orderIndex);
  return {
    id: row.id,
    subjectId: row.subject_id || row.subjectId,
    title: row.title || "Задание",
    description: row.description || "",
    status: row.status || "not_started",
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : 0,
    updatedAtISO:
      row.updated_at || row.updatedAtISO || new Date().toISOString(),
    details:
      row.details && typeof row.details === "object"
        ? row.details
        : { lessonNotes: "", homework: [], hints: [], attachments: [] },
  };
}

function bindEvents() {
  if (!subjectTabsBound) {
    subjectTabsBound = true;
    els.subjectTabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-subject]");
      if (!btn) return;
      const subjectId = btn.dataset.subject;
      if (!subjectId || subjectId === state.selectedSubjectId) return;
      state.selectedSubjectId = subjectId;
      saveState(state);
      renderSubjectTabs();
      renderAll();
    });
  }

  els.cardTasks.querySelector(".filters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-filter]");
    if (!btn) return;
    const filter = btn.dataset.filter;
    if (!filter) return;
    state.filter = filter;
    setActiveFilterChip(filter);
    saveState(state);
    renderTasks();
  });

  els.cardTasks
    .querySelector(".section-switcher")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-section]");
      if (!btn) return;
      const section = btn.dataset.section;
      if (!section || section === state.section) return;
      state.section = section;
      saveState(state);
      renderTasks();
      // Если пользователь проскролил ниже верха карточки — возвращаем к её началу
      const cardTop = els.cardTasks.getBoundingClientRect().top + window.scrollY - 72;
      if (window.scrollY > cardTop) {
        window.scrollTo({ top: Math.max(0, cardTop), behavior: "instant" });
      }
    });

  els.trialsPanel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-trial-open]");
    if (!btn) return;
    const subject = getSelectedSubject();
    openTrialModal(btn.dataset.trialOpen, subject?.catalogSlug);
  });

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isModalOpen()) closeModal();
  });
}

function renderAll() {
  renderGreeting();
  renderExam();
  renderTasks();
}

function renderSubjectTabs() {
  const subjects = data.subjects;
  if (!subjects || subjects.length <= 1) {
    els.subjectTabs.style.display = "none";
    return;
  }
  els.subjectTabs.style.display = "flex";
  els.subjectTabs.innerHTML = subjects
    .map((s) => {
      const active = s.id === state.selectedSubjectId ? "is-active" : "";
      return `<button class="tab ${active}" type="button" data-subject="${escapeAttr(s.id)}" aria-pressed="${s.id === state.selectedSubjectId}">
        <img src="${escapeAttr(subjectIconSrc(s.catalogSlug))}" alt="" aria-hidden="true" class="tab-icon" width="18" height="18" />
        <span>${escapeHtml(s.title)}</span>
      </button>`;
    })
    .join("");
}

function renderGreeting() {
  const subject = getSelectedSubject();
  const name = data.user?.name || "Ученик";
  const greeting = getGreeting();

  els.greetingEyebrow.textContent = greeting.subtitle;
  els.greetingTitle.innerHTML = `${escapeHtml(greeting.title)}, ${escapeHtml(name)} <img src="./icons/wave.png" alt="" aria-hidden="true" class="greeting-icon" width="36" height="36" />`;
  if (els.subjectPillText)
    els.subjectPillText.textContent = subject ? subject.title : "—";
  if (els.subjectPillIcon) {
    els.subjectPillIcon.src = subjectIconSrc(subject?.catalogSlug);
    els.subjectPillIcon.hidden = !subject;
  }

  const subjectTasks = getTasksForSelectedSubject();
  const counts = countStatuses(subjectTasks);
  const total = subjectTasks.length || 0;
  const done = counts.completed || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  els.progressValue.textContent = `${pct}%`;
  els.heroCompleted.textContent = String(counts.completed || 0);
  els.heroInProgress.textContent = String(counts.in_progress || 0);
  els.heroHomework.textContent = String(counts.homework || 0);
  els.heroNotStarted.textContent = String(counts.not_started || 0);
  els.progressMetaLeft.textContent = `${done} из ${total} заданий пройдено`;
  els.progressFill.style.width = `${pct}%`;
}

function renderExam() {
  const subject = getSelectedSubject();
  const exam = subject?.exam;
  if (!exam) return;

  const date = parseISODate(exam.dateISO);
  els.examDate.textContent = date
    ? date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

  const days = date ? daysUntil(date) : null;
  if (days === null) {
    els.examCountdown.textContent = "—";
    els.examCountdownSub.textContent = "дней";
  } else if (days < 0) {
    els.examCountdown.textContent = "Экзамен прошел";
    els.examCountdownSub.textContent = "—";
  } else if (days === 0) {
    els.examCountdown.textContent = "Сегодня";
    els.examCountdownSub.textContent = "удачи";
  } else {
    els.examCountdown.textContent = String(days);
    els.examCountdownSub.textContent = pluralizeDays(days);
  }

  els.examDuration.textContent = `${exam.durationMinutes} мин`;
  els.examTaskCount.textContent = `${exam.tasksTotal} заданий`;
}

// ─── Группировка заданий по частям ───────────────────────────────────────────
// split: tasks с orderIndex <= split → тестовая, > split → развернутая
const PART_CONFIG = {
  oge_math: {
    parts: [
      { label: "Практические задания", from: 1, to: 7 },
      { label: "Алгебра", from: 8, to: 16 },
      { label: "Геометрия", from: 17, to: 21 },
      { label: "Вторая часть", from: 22, to: Infinity },
    ],
  },
  oge_info: {
    parts: [
      { label: "Тестовая часть", from: 1, to: 10 },
      { label: "Компьютерная часть", from: 11, to: Infinity },
    ],
  },
  ege_math: {
    parts: [
      { label: "Тестовая часть", from: 1, to: 12 },
      { label: "Развернутая часть", from: 13, to: Infinity },
    ],
  },
  ege_info: {
    parts: [
      { label: "Тестовая часть", from: 1, to: 17 },
      { label: "Развернутая часть", from: 18, to: Infinity },
    ],
  },
};

function groupTasksByPart(tasks, catalogSlug) {
  const cfg = PART_CONFIG[catalogSlug];
  if (!cfg) return [{ label: null, tasks }];

  const groups = cfg.parts
    .map((part) => ({
      label: part.label,
      tasks: tasks.filter((t) => {
        const idx = getTaskOrderIndex(t);
        return idx >= part.from && idx <= part.to;
      }),
    }))
    .filter((g) => g.tasks.length);

  return groups.length ? groups : [{ label: null, tasks }];
}

function renderTasks() {
  setActiveFilterChip(state.filter);

  // переключение видимости секций
  const isTrials = state.section === "trials";
  if (els.taskFilters) els.taskFilters.hidden = isTrials;
  if (els.trialsPanel) els.trialsPanel.hidden = !isTrials;
  els.tasksGrid.hidden = isTrials;

  // обновить активную кнопку переключателя
  els.cardTasks.querySelectorAll("[data-section]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.section === state.section);
  });

  // Точка-уведомление на табе «Пробные варианты» — обновляем при любом рендере
  {
    const _subj = getSelectedSubject();
    const _trials = (data.trialsBySubjectId || {})[_subj?.id] || [];
    els.cardTasks.querySelector("[data-section='trials']")
      ?.classList.toggle("has-homework", _trials.some((t) => t.is_homework));
  }

  if (isTrials) {
    const subject = getSelectedSubject();
    const trials = (data.trialsBySubjectId || {})[subject?.id] || [];

    const barHtml = renderScoreBar(subject?.catalogSlug);
    const scaleSection = barHtml
      ? `<div class="task-part-label" role="heading" aria-level="3">Шкала перевода</div>${barHtml}`
      : "";
    if (!trials.length) {
      els.trialsPanel.innerHTML =
        scaleSection +
        `<div class="trials-empty">
          <div class="trials-empty__icon">📋</div>
          <div class="trials-empty__title">Пробные варианты</div>
          <div class="trials-empty__text">Здесь будут появляться результаты пробных экзаменов и полных вариантов.</div>
        </div>`;
    } else {
      // Группируем пробники по section_label (новый label = новый раздел)
      let gridHtml = "";
      let lastLabel = null;
      for (const t of trials) {
        const label = t.section_label?.trim() || "";
        if (label && label !== lastLabel) {
          gridHtml += `<div class="task-part-label" role="heading" aria-level="3">${escapeHtml(label)}</div>`;
          lastLabel = label;
        }
        gridHtml += renderTrialCard(t, subject?.catalogSlug);
      }
      els.trialsPanel.innerHTML =
        scaleSection +
        `<div class="trials-grid">${gridHtml}</div>`;
    }
    return;
  }


  const subject = getSelectedSubject();
  const tasks = getTasksForSelectedSubject()
    .map((t) => ({ ...t, status: state.taskStatusById[t.id] || t.status }))
    .sort((a, b) => {
      const pinDiff = Number(isTaskPinned(b)) - Number(isTaskPinned(a));
      if (pinDiff !== 0) return pinDiff;
      const orderDiff = getTaskOrderIndex(a) - getTaskOrderIndex(b);
      if (orderDiff !== 0) return orderDiff;
      return String(a.id).localeCompare(String(b.id));
    });

  const filtered = filterTasks(tasks, state.filter);

  if (!filtered.length) {
    els.tasksGrid.innerHTML = `
      <div class="section" style="grid-column: 1 / -1;">
        <div class="section__title">Нет заданий</div>
        <div class="section__body">По фильтру ничего не найдено.</div>
      </div>`;
    return;
  }

  const groups = groupTasksByPart(filtered, subject?.catalogSlug);
  const showLabels = groups.length > 1 || groups[0]?.label;

  let html = "";
  for (const group of groups) {
    if (showLabels && group.label) {
      html += `<div class="task-part-label" role="heading" aria-level="3">${escapeHtml(group.label)}</div>`;
    }
    html += group.tasks.map((t) => renderTaskCard(t)).join("");
  }
  els.tasksGrid.innerHTML = html;

  els.tasksGrid.querySelectorAll("[data-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const task = tasks.find((x) => x.id === btn.getAttribute("data-task"));
      if (task) openModal(task);
    });
  });
}

function openModal(task) {
  lastFocusedBeforeModal = document.activeElement;
  els.modalTitle.textContent = task.title;
  els.modalSubtitle.textContent = task.description || "";
  els.modalBadge.hidden = false;
  els.modalBadge.textContent = formatStatus(task.status);
  els.modalBadge.className = `modal__badge badge--${task.status}`;

  const details = task.details || {};
  const lessonFiles = Array.isArray(details.lessonFiles)
    ? details.lessonFiles
    : [];
  const homeworkFiles = Array.isArray(details.homeworkFiles)
    ? details.homeworkFiles
    : [];
  const hintFiles = Array.isArray(details.hintFiles) ? details.hintFiles : [];
  const attachments = Array.isArray(details.attachments)
    ? details.attachments
    : [];
  els.modalContent.innerHTML = [
    renderSectionWithFiles("Конспект", details.lessonNotes || "", lessonFiles),
    renderSectionWithFiles(
      "Домашнее задание",
      details.homework || [],
      homeworkFiles,
    ),
    renderSectionWithFiles("Подсказки", details.hints || [], hintFiles),
    attachments.length ? renderAttachmentsSection(attachments) : "",
  ].join("");

  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => els.modalClose.focus(), 0);
}

function closeModal() {
  if (!isModalOpen()) return;
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocusedBeforeModal?.focus) lastFocusedBeforeModal.focus();
}

function isModalOpen() {
  return els.modal.classList.contains("is-open");
}

function renderTaskCard(task) {
  const badgeClass = `badge badge--${task.status}`;
  const pin = isTaskPinned(task) ? "📌 " : "";
  const hideUpdated = task.status === "not_started";
  const updated = task.updatedAtISO ? new Date(task.updatedAtISO) : null;
  const updatedText = updated
    ? `Обновлено ${updated.toLocaleDateString("ru-RU", { year: "numeric", month: "short", day: "2-digit" })}`
    : "Обновлено —";
  const metaLeft = hideUpdated
    ? ""
    : `<span class="meta">${escapeHtml(updatedText)}</span>`;

  return `
    <button class="task" type="button" data-task="${escapeAttr(task.id)}">
      <div class="task__top">
        <div><div class="task__title">${escapeHtml(`${pin}${task.title}`)}</div></div>
        <span class="${badgeClass}">${escapeHtml(formatStatus(task.status))}</span>
      </div>
      <div class="task__desc">${escapeHtml(task.description || "")}</div>
      <div class="task__meta">
        ${metaLeft}
        <span class="meta">Открыть детали →</span>
      </div>
    </button>`;
}

function renderTrialCard(trial, catalogSlug) {
  const title = trial.title || "Пробный вариант";
  const dateStr = trial.date ? formatTrialDate(trial.date) : null;
  const score = trial.score ? String(trial.score).trim() : null;
  const converted = score ? convertScore(score, catalogSlug) : null;
  const gradeLabel = catalogSlug?.startsWith("oge") ? "Оценка" : "Тест. балл";
  const cardLevel = converted?.level ? `trial-card--${converted.level}` : "";

  const statsHtml = score
    ? `<div class="trial-card__stats">
        <div class="trial-card__stat trial-card__stat--score">
          <div class="trial-card__stat-value">${escapeHtml(score)}</div>
          <div class="trial-card__stat-label">Баллы</div>
        </div>
        ${converted
          ? `<div class="trial-card__stat trial-card__stat--${converted.level}">
              <div class="trial-card__stat-value">${escapeHtml(converted.display)}</div>
              <div class="trial-card__stat-label">${gradeLabel}</div>
            </div>`
          : ""}
      </div>`
    : "";

  const hwBadge = trial.is_homework
    ? `<span class="trial-card__hw-badge">ДЗ</span>`
    : "";

  return `<button class="trial-card ${cardLevel}" type="button" data-trial-open="${escapeAttr(trial.id)}">
    <div class="trial-card__top">
      <div class="trial-card__title-row">
        <div class="trial-card__title">${escapeHtml(title)}</div>
        ${hwBadge}
      </div>
      ${dateStr ? `<div class="trial-card__date">${escapeHtml(dateStr)}</div>` : ""}
    </div>
    ${statsHtml}
  </button>`;
}

function openTrialModal(trialId, catalogSlug) {
  const subject = getSelectedSubject();
  const trials = (data.trialsBySubjectId || {})[subject?.id] || [];
  const trial = trials.find((t) => t.id === trialId);
  if (!trial) return;

  lastFocusedBeforeModal = document.activeElement;

  const score = trial.score ? String(trial.score).trim() : null;
  const converted = score ? convertScore(score, catalogSlug) : null;
  const gradeLabel = catalogSlug?.startsWith("oge") ? "Оценка" : "Тест. балл";
  const dateStr = trial.date ? formatTrialDate(trial.date) : null;
  const variantUrl = trial.variant_url ? String(trial.variant_url).trim() : null;
  const solutionUrl = trial.solution_url ? String(trial.solution_url).trim() : null;

  els.modalTitle.textContent = trial.title || "Пробный вариант";
  els.modalSubtitle.textContent = dateStr || "";

  els.modalBadge.textContent = "";
  els.modalBadge.className = "modal__badge";
  els.modalBadge.hidden = true;

  let html = "";

  if (score) {
    html += `<div class="section">
      <div class="section__title">Результат</div>
      <div class="trial-card__stats" style="max-width:280px;margin-top:14px">
        <div class="trial-card__stat trial-card__stat--score">
          <div class="trial-card__stat-value">${escapeHtml(score)}</div>
          <div class="trial-card__stat-label">Первичные баллы</div>
        </div>
        ${converted
          ? `<div class="trial-card__stat trial-card__stat--${converted.level}">
              <div class="trial-card__stat-value">${escapeHtml(converted.display)}</div>
              <div class="trial-card__stat-label">${escapeHtml(gradeLabel)}</div>
            </div>`
          : ""}
      </div>
    </div>`;
  }

  if (variantUrl || solutionUrl) {
    html += `<div class="section">
      <div class="section__title">Файлы</div>
      <div class="attachments-list">
        ${variantUrl
          ? `<a class="attachment-link" href="${escapeAttr(variantUrl)}" target="_blank" rel="noreferrer">
              <span class="attachment-link__icon" aria-hidden="true"><img src="./icons/variant.png" width="16" height="16" alt="" /></span>
              <span>Вариант</span>
            </a>`
          : ""}
        ${solutionUrl
          ? `<a class="attachment-link" href="${escapeAttr(solutionUrl)}" target="_blank" rel="noreferrer">
              <span class="attachment-link__icon" aria-hidden="true"><img src="./icons/solution.png" width="16" height="16" alt="" /></span>
              <span>Решение</span>
            </a>`
          : ""}
      </div>
    </div>`;
  }

  if (!html) html = `<div class="section"><div class="section__body">Нет дополнительной информации.</div></div>`;

  els.modalContent.innerHTML = html;
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => els.modalClose.focus(), 0);
}

function formatTrialDate(dateStr) {
  if (!dateStr) return null;
  const d = parseISODate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderRichSection(title, rawValue) {
  const lines = normalizeRichLines(rawValue);
  const parsed = lines.reduce(
    (acc, line) => {
      const link = parseRichLink(line);
      link ? acc.links.push(link) : acc.texts.push(line);
      return acc;
    },
    { texts: [], links: [] },
  );

  const bodyHtml = parsed.texts.length
    ? `<div class="section__body">${parsed.texts.map((x) => escapeHtml(x)).join("<br />")}</div>`
    : "";

  return `
    <div class="section">
      <div class="section__title">${escapeHtml(title)}</div>
      ${bodyHtml}
      ${parsed.links.length ? renderLinks(parsed.links) : ""}
      ${!parsed.texts.length && !parsed.links.length ? `<div class="section__body">—</div>` : ""}
    </div>`;
}

function renderSectionWithFiles(title, rawValue, files) {
  const lines = normalizeRichLines(rawValue);
  const parsed = lines.reduce(
    (acc, line) => {
      const link = parseRichLink(line);
      link ? acc.links.push(link) : acc.texts.push(line);
      return acc;
    },
    { texts: [], links: [] },
  );

  const fileLinks = (files || [])
    .map((item) => {
      const s = String(item || "").trim();
      if (!s) return null;
      if (s.includes("|")) {
        const idx = s.indexOf("|");
        return {
          label: s.slice(0, idx).trim() || "Файл",
          href: s.slice(idx + 1).trim(),
        };
      }
      try {
        new URL(s);
        return { label: "Открыть файл", href: s };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const bodyHtml = parsed.texts.length
    ? `<div class="section__body">${parsed.texts.map((x) => escapeHtml(x)).join("<br />")}</div>`
    : "";

  const hasContent =
    parsed.texts.length || parsed.links.length || fileLinks.length;

  return `
    <div class="section">
      <div class="section__title">${escapeHtml(title)}</div>
      ${bodyHtml}
      ${parsed.links.length ? renderLinks(parsed.links) : ""}
      ${
        fileLinks.length
          ? `<div class="attachments-list" style="margin-top:10px">${fileLinks
              .map(
                (a) => `
        <a class="attachment-link" href="${escapeAttr(a.href)}" target="_blank" rel="noreferrer">
          <span class="attachment-link__icon" aria-hidden="true">${getFileIcon(a.href, a.label)}</span>
          <span>${escapeHtml(a.label)}</span>
        </a>`,
              )
              .join("")}</div>`
          : ""
      }
      ${!hasContent ? `<div class="section__body">—</div>` : ""}
    </div>`;
}

function normalizeRichLines(rawValue) {
  if (Array.isArray(rawValue))
    return rawValue.map((x) => String(x || "").trim()).filter(Boolean);
  return String(rawValue || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function getFileIcon(href, label) {
  const s = ((href || "") + " " + (label || "")).toLowerCase();
  if (/\.(jpe?g|png|gif|webp|svg|bmp|heic)(\?|#|$)/.test(s)) return "🖼️";
  if (/\.pdf(\?|#|$)/.test(s)) return "📄";
  if (/\.(mp4|mov|avi|mkv|webm|m4v)(\?|#|$)/.test(s)) return "🎬";
  if (/\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/.test(s)) return "🎵";
  if (/\.(docx?|pages)(\?|#|$)/.test(s)) return "📝";
  if (/\.(xlsx?|numbers|csv)(\?|#|$)/.test(s)) return "📊";
  return "📎";
}

function parseRichLink(line) {
  const value = String(line || "").trim();
  if (!value) return null;
  if (value.includes("|")) {
    const [labelRaw, hrefRaw] = value.split("|");
    const href = String(hrefRaw || "").trim();
    if (isValidHttpUrl(href))
      return { label: String(labelRaw || "Ссылка").trim() || "Ссылка", href };
  }
  if (isValidHttpUrl(value)) return { label: "Ссылка", href: value };
  return null;
}

function renderAttachmentsSection(attachments) {
  const links = attachments
    .map((item) => {
      const s = String(item || "").trim();
      if (s.includes("|")) {
        const idx = s.indexOf("|");
        return {
          label: s.slice(0, idx).trim() || "Файл",
          href: s.slice(idx + 1).trim(),
        };
      }
      try {
        new URL(s);
        return { label: "Открыть файл", href: s };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (!links.length) return "";
  return `
    <div class="section section--attachments">
      <div class="section__title">📎 Записи и файлы</div>
      <div class="attachments-list">
        ${links
          .map(
            (a) => `
          <a class="attachment-link" href="${escapeAttr(a.href)}" target="_blank" rel="noreferrer">
            <span class="attachment-link__icon" aria-hidden="true">${getFileIcon(a.href, a.label)}</span>
            <span>${escapeHtml(a.label)}</span>
          </a>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderLinks(links) {
  return `<div class="links">${links
    .map(
      (a) =>
        `<a class="link" href="${escapeAttr(a.href || "#")}" target="_blank" rel="noreferrer">
          <span aria-hidden="true">↗</span><span>${escapeHtml(a.label || "Ссылка")}</span>
        </a>`,
    )
    .join("")}</div>`;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isTaskPinned(task) {
  return task?.details?.isPinned === true;
}

function getTaskOrderIndex(task) {
  const raw = Number(task?.orderIndex ?? task?.order_index ?? 0);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const fromTitle = taskOrderFromTitle(task?.title);
  return fromTitle > 0 ? fromTitle : 9999;
}

function taskOrderFromTitle(title) {
  const s = String(title || "");
  const m1 = s.match(/задание\s*(\d+)/i);
  if (m1) return Number(m1[1]) || 0;
  const m2 = s.match(/(\d+)\s*$/);
  return m2 ? Number(m2[1]) || 0 : 0;
}

function getSelectedSubject() {
  return (
    data.subjects.find((s) => s.id === state.selectedSubjectId) ||
    data.subjects[0] ||
    null
  );
}

function getTasksForSelectedSubject() {
  const subjectId = getSelectedSubject()?.id;
  return data.tasks.filter((t) => t.subjectId === subjectId);
}

function formatStatus(status) {
  switch (status) {
    case "not_started":
      return "Не начато";
    case "in_progress":
      return "В процессе";
    case "homework":
      return "Сделать ДЗ";
    case "completed":
      return "Пройдено";
    default:
      return "—";
  }
}

function countStatuses(tasks) {
  return tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
}

function filterTasks(tasks, filter) {
  if (!filter || filter === "all") return tasks;
  return tasks.filter((t) => t.status === filter);
}

function setActiveFilterChip(filter) {
  els.cardTasks
    .querySelectorAll("button[data-filter]")
    .forEach((c) =>
      c.classList.toggle("is-active", c.dataset.filter === filter),
    );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return { title: "Доброй ночи", subtitle: "Дашборд" };
  if (h < 12) return { title: "Доброе утро", subtitle: "Дашборд" };
  if (h < 18) return { title: "Добрый день", subtitle: "Дашборд" };
  return { title: "Добрый вечер", subtitle: "Дашборд" };
}

function startClock() {
  const tick = () => {
    const now = new Date();
    els.nowDate.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
    });
    els.nowTime.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  tick();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 10_000);
}

function startCountdownTicker() {
  const tick = () => renderExam();
  tick();
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(tick, 60_000);
}

function daysUntil(date) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
}

function parseISODate(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pluralizeDays(n) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}

// ─── Конвертация баллов пробников ────────────────────────────────────────────
// Редактируй пороги под актуальные шкалы каждого года.
// type "grade"  → первичные баллы → оценка 2–5 (ОГЭ)
// type "test"   → первичные баллы → тестовые баллы 0–100 (ЕГЭ)
const SCORE_CONVERSION = {
  oge_math: {
    type: "grade",
    thresholds: [
      { min: 0,  max: 7,        grade: 2 },
      { min: 8,  max: 14,       grade: 3 },
      { min: 15, max: 21,       grade: 4 },
      { min: 22, max: Infinity, grade: 5 },
    ],
  },
  oge_info: {
    type: "grade",
    thresholds: [
      { min: 0,  max: 4,        grade: 2 },
      { min: 5,  max: 12,       grade: 3 },
      { min: 13, max: 18,       grade: 4 },
      { min: 19, max: Infinity, grade: 5 },
    ],
  },
  ege_math: {
    type: "test",
    // индекс = первичный балл → тестовый балл (шкала 2025, профиль)
    table: [
      0, 6, 12, 17, 22, 27, 34, 40, 43, 46,
      48, 52, 54, 56, 60, 64, 66, 68, 70, 73,
      75, 77, 79, 82, 84, 86, 88, 90, 92, 94,
      96, 98, 100,
    ],
    thresholds: [
      { min: 0,  max: 26,  level: "fail" },
      { min: 27, max: 49,  level: "low"  },
      { min: 50, max: 74,  level: "mid"  },
      { min: 75, max: 100, level: "high" },
    ],
  },
  ege_info: {
    type: "test",
    // индекс = первичный балл → тестовый балл (шкала 2025)
    table: [
      0, 7, 14, 20, 27, 34, 40, 43, 46, 48,
      51, 54, 56, 58, 60, 63, 65, 68, 70, 72,
      74, 76, 79, 81, 83, 85, 88, 90, 92, 95,
      98, 100,
    ],
    thresholds: [
      { min: 0,  max: 39,  level: "fail" },
      { min: 40, max: 59,  level: "low"  },
      { min: 60, max: 79,  level: "mid"  },
      { min: 80, max: 100, level: "high" },
    ],
  },
};

// Принимает строку "18 / 32" или "18", возвращает { display, level } или null
function convertScore(rawScoreStr, catalogSlug) {
  if (!rawScoreStr || !catalogSlug) return null;
  const cfg = SCORE_CONVERSION[catalogSlug];
  if (!cfg) return null;

  const match = String(rawScoreStr).match(/\d+/);
  if (!match) return null;
  const primary = parseInt(match[0], 10);

  if (cfg.type === "grade") {
    const found = cfg.thresholds.find((t) => primary >= t.min && primary <= t.max);
    if (!found) return null;
    return { display: String(found.grade), level: `grade-${found.grade}` };
  }

  if (cfg.type === "test") {
    const testScore = cfg.table[primary] ?? null;
    if (testScore === null) return null;
    const found = cfg.thresholds.find((t) => testScore >= t.min && testScore <= t.max);
    return { display: String(testScore), level: found?.level || "mid" };
  }

  return null;
}

// ─── Шкала перевода баллов ───────────────────────────────────────────────────
// ОГЭ → цветная полоса с зонами   ЕГЭ → сетка «первичный → тестовый»
function renderScoreBar(catalogSlug) {
  const cfg = SCORE_CONVERSION[catalogSlug];
  if (!cfg) return "";

  if (cfg.type === "grade") {
    const segsHtml = cfg.thresholds
      .map((t, i) => {
        const prevSpan =
          i > 0 ? cfg.thresholds[i - 1].max - cfg.thresholds[i - 1].min + 1 : null;
        const span = t.max === Infinity ? (prevSpan || 8) : t.max - t.min + 1;
        const range = t.max === Infinity ? `${t.min}+` : `${t.min}–${t.max}`;
        return (
          `<div class="score-bar__zone score-bar__zone--grade-${t.grade}" style="flex:${span}">` +
          `<span class="score-bar__zone-range">${range}</span>` +
          `<span class="score-bar__zone-val">${t.grade}</span>` +
          `</div>`
        );
      })
      .join("");
    return `<div class="score-bar"><div class="score-bar__track">${segsHtml}</div></div>`;
  }

  if (cfg.type === "test") {
    const itemsHtml = cfg.table
      .map((testScore, primary) => {
        const zone = cfg.thresholds.find((t) => testScore >= t.min && testScore <= t.max);
        const level = zone?.level || "mid";
        return (
          `<div class="score-lookup__item score-lookup__item--${level}">` +
          `<span class="score-lookup__primary">${primary}</span>` +
          `<span class="score-lookup__sep">→</span>` +
          `<span class="score-lookup__test">${testScore}</span>` +
          `</div>`
        );
      })
      .join("");
    return `<div class="score-bar"><div class="score-lookup">${itemsHtml}</div></div>`;
  }

  return "";
}

// ─── Иконки предметов по catalogSlug ─────────────────────────────────────────
// Добавь новые slug → файл по аналогии. Файлы должны лежать в папке ./icons/
const SUBJECT_ICONS = {
  oge_math: "./icons/oge_math.png",
  oge_info: "./icons/oge_info.png",
  ege_math: "./icons/ege_math.png",
  ege_info: "./icons/ege_info.png",
};
const SUBJECT_ICON_FALLBACK = "./icons/subject.png";

function subjectIconSrc(catalogSlug) {
  return SUBJECT_ICONS[catalogSlug] || SUBJECT_ICON_FALLBACK;
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

function saveState(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
