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
  dashboardPanel: document.getElementById("dashboardPanel"),

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

  tickerBar: document.getElementById("tickerBar"),
  tickerTrack: document.getElementById("tickerTrack"),

  modal: document.getElementById("modal"),
  modalClose: document.getElementById("modalClose"),
  modalBadge: document.getElementById("modalBadge"),
  modalTitle: document.getElementById("modalTitle"),
  modalSubtitle: document.getElementById("modalSubtitle"),
  modalContent: document.getElementById("modalContent"),

  appState: document.getElementById("appState"),
  appStateIcon: document.getElementById("appStateIcon"),
  appStateEyebrow: document.getElementById("appStateEyebrow"),
  appStateTitle: document.getElementById("appStateTitle"),
  appStateText: document.getElementById("appStateText"),
  appStateHint: document.getElementById("appStateHint"),
  appShell: document.getElementById("appShell"),
  appLoader: document.getElementById("appLoader"),
};

let clockTimer = null;
let countdownTimer = null;
let lastFocusedBeforeModal = null;
let subjectTabsBound = false;

const STATE_SCREEN_COPY = {
  paused: {
    eyebrow: "",
    title: "Кабинет на паузе",
    text: "До встречи в новом учебном году",
    icon: "clock",
  },
  missing_token: {
    eyebrow: "",
    title: "Нужна ссылка",
    text: "Откройте кабинет по ссылке от преподавателя",
    hint: "",
    icon: "link",
  },
  invalid_token: {
    eyebrow: "",
    title: "Неверная ссылка",
    text: "Проверьте ссылку или запросите новую",
    icon: "warning",
  },
};

const STATE_SCREEN_ICONS = {
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a4 4 0 0 0 5.66 0l2.12-2.12a4 4 0 0 0-5.66-5.66L11 6"/><path d="M14 11a4 4 0 0 0-5.66 0L6.22 13.12a4 4 0 1 0 5.66 5.66L13 18"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`,
};

void init();

async function init() {
  setAppLoading(true);
  try {
    await loadDataFromFirebase();
    if (els.appState && !els.appState.hidden) {
      startClock();
      return;
    }
    if (!state.selectedSubjectId) {
      state.selectedSubjectId = data.subjects[0]?.id || null;
    }
    if (
      state.selectedSubjectId &&
      !data.subjects.some((s) => s.id === state.selectedSubjectId)
    ) {
      state.selectedSubjectId = data.subjects[0]?.id || null;
    }
    renderSubjectTabs();
    bindEvents();
    renderTaskFilters();
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
    showDashboardShell();
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
          .collection("users")
          .doc(userId)
          .collection("subjects")
          .doc(s.id)
          .collection("trials")
          .orderBy("order_index")
          .get()
          .catch(() => ({ docs: [] })),
      ),
    );
    const trialsBySubjectId = {};
    subjectRows.forEach((s, i) => {
      trialsBySubjectId[s.id] = trialsSnaps[i].docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
    });

    data = buildDataFromPayload(userRow, subjectRows, taskRows);
    data.trialsBySubjectId = trialsBySubjectId;
    setDashboardGate(null);
    void loadAndRenderTicker(userId);
  } catch (err) {
    console.error("Firebase load error:", err);
    if (requirePersonalLink && token) setDashboardGate("invalid_token");
  }
}

function setAppLoading(isLoading) {
  const loader = els.appLoader;
  document.body.classList.toggle("is-app-loading", isLoading);
  if (!loader) return;
  loader.classList.toggle("is-hidden", !isLoading);
  loader.setAttribute("aria-hidden", isLoading ? "false" : "true");
}

function showDashboardShell() {
  if (els.appState) {
    els.appState.hidden = true;
    els.appState.className = "state-screen";
  }
  if (els.appShell) els.appShell.hidden = false;
}

function showAppState(reason) {
  const block = STATE_SCREEN_COPY[reason] || STATE_SCREEN_COPY.invalid_token;
  if (!els.appState) return;

  els.appState.className = `state-screen state-screen--${reason}`;

  if (els.appStateIcon) {
    els.appStateIcon.className = "state-screen__icon";
    els.appStateIcon.innerHTML = STATE_SCREEN_ICONS[block.icon] || "";
  }
  if (els.appStateEyebrow) {
    els.appStateEyebrow.textContent = block.eyebrow || "";
    els.appStateEyebrow.hidden = !block.eyebrow;
  }
  if (els.appStateTitle) els.appStateTitle.textContent = block.title;
  if (els.appStateText) els.appStateText.textContent = block.text;
  if (els.appStateHint) {
    if (block.hint) {
      els.appStateHint.textContent = block.hint;
      els.appStateHint.hidden = false;
    } else {
      els.appStateHint.textContent = "";
      els.appStateHint.hidden = true;
    }
  }

  els.appState.hidden = false;
  if (els.appShell) els.appShell.hidden = true;
}

function setDashboardGate(reason) {
  if (!reason) {
    if (els.appState) els.appState.hidden = true;
    return;
  }
  showAppState(reason);
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
    miroUrl: row.miro_url || "",
    boardService: row.board_service || (row.miro_url ? "miro" : ""),
    boardUrl: row.board_url || row.miro_url || "",
    boardCustomName: row.board_custom_name || "",
    boardCustomIcon: row.board_custom_icon || "",
    callService: row.call_service || "",
    callUrl: row.call_url || "",
    callCustomName: row.call_custom_name || "",
    callCustomIcon: row.call_custom_icon || "",
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
  const details =
    row.details && typeof row.details === "object"
      ? row.details
      : { lessonNotes: "", homework: [], hints: [], attachments: [] };
  return {
    id: row.id,
    subjectId: row.subject_id || row.subjectId,
    title: row.title || "Задание",
    description: row.description || "",
    status: row.status || "not_started",
    orderIndex: Number.isFinite(orderIndex) ? orderIndex : 0,
    updatedAtISO: row.updated_at || row.updatedAtISO || null,
    createdAtISO: row.created_at || row.createdAtISO || null,
    details,
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
      const cardTop =
        els.cardTasks.getBoundingClientRect().top + window.scrollY - 72;
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
  if (isCabinetPaused()) {
    showAppState("paused");
    renderServiceBtns();
    return;
  }

  showDashboardShell();
  renderGreeting();
  renderExam();
  renderTasks();
  renderServiceBtns();
}

function hasSubjects() {
  return Array.isArray(data.subjects) && data.subjects.length > 0;
}

function isSubjectExamEnded(subject) {
  const date = parseISODate(subject?.exam?.dateISO);
  if (!date) return false;
  return daysUntil(date) < 0;
}

function isCabinetPaused() {
  if (!hasSubjects()) return true;
  return data.subjects.every(isSubjectExamEnded);
}

// Иконки сервисов.
// icon  — своя иконка из папки icons/ (приоритет)
// favicon — фолбэк через Google Favicon API
const SERVICE_META = {
  // Доски
  miro: { label: "Miro", icon: "./icons/miro.webp" },
  unidraw: { label: "Unidraw", icon: "./icons/unidraw.webp" },
  // Звонки
  teams: { label: "Teams", icon: "./icons/teams.webp" },
  telemost: { label: "Телемост", icon: "./icons/telemost.webp" },
  ktalk: {
    label: "Контур Толк",
    icon: "./icons/call.webp",
    favicon: "ktalk.ru",
  },
  // Свой сервис — иконка и название берутся из кастомных полей
  other: { label: "Сервис" },
};

function getServiceFaviconUrl(service) {
  const meta = SERVICE_META[service];
  if (!meta) return null;
  // Сначала пробуем свою иконку, затем Google Favicon API
  if (meta.icon) return meta.icon;
  if (meta.favicon)
    return `https://www.google.com/s2/favicons?domain=${meta.favicon}&sz=32`;
  return null;
}

function renderMiroBtn() {
  const miroUrl = data.user?.miroUrl;
  const btn = document.querySelector("a[title='Открыть доску Miro']");
  if (!btn) return;
  if (miroUrl) {
    btn.href = miroUrl;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

function renderServiceBtns() {
  const user = data.user;
  if (!user) return;
  renderServiceBtn(
    "boardBtn",
    user.boardService,
    user.boardUrl,
    user.boardCustomName,
    user.boardCustomIcon,
    "Доска",
  );
  renderServiceBtn(
    "callBtn",
    user.callService,
    user.callUrl,
    user.callCustomName,
    user.callCustomIcon,
    "Звонок",
  );
}

function renderServiceBtn(
  btnId,
  service,
  url,
  customName,
  customIcon,
  defaultLabel,
) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  if (!service || !url) {
    btn.hidden = true;
    return;
  }

  btn.href = url;
  btn.hidden = false;

  const label = defaultLabel; // всегда "Доска" или "Звонок"
  let iconUrl;
  if (service === "other") {
    iconUrl = customIcon || null;
  } else {
    iconUrl = getServiceFaviconUrl(service);
  }

  btn.innerHTML = iconUrl
    ? `<img src="${escapeAttr(iconUrl)}" width="18" height="18" style="border-radius:5px" alt="${escapeHtml(label)}" /><span>${escapeHtml(label)}</span>`
    : `<span>${escapeHtml(label)}</span>`;
}

function renderSubjectTabs() {
  const subjects = data.subjects;
  if (!subjects || subjects.length <= 1) {
    els.subjectTabs.style.display = "none";
    return;
  }
  els.subjectTabs.hidden = false;
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
    els.examCountdown.textContent = "Экзамен прошёл";
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
      { label: "Тестовая часть", from: 1, to: 25 },
      { label: "Развернутая часть", from: 26, to: Infinity },
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
    els.cardTasks.querySelector("[data-section='trials']")?.classList.toggle(
      "has-homework",
      _trials.some((t) => t.is_homework),
    );
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
          <img class="trials-empty__icon" src="./icons/trials_empty.png" alt="" />
          <div class="trials-empty__title">Пробные варианты</div>
          <div class="trials-empty__text">Здесь будут появляться результаты пробных экзаменов и полных вариантов.</div>
        </div>`;
    } else {
      // Группируем пробники по section_label — одинаковые метки всегда под одним хедером
      // Порядок групп = порядок первого появления метки среди отсортированных пробников
      const seenLabels = new Set();
      const labelOrder = [];
      for (const t of trials) {
        const lbl = t.section_label?.trim() || "";
        if (!seenLabels.has(lbl)) {
          seenLabels.add(lbl);
          labelOrder.push(lbl);
        }
      }

      let gridHtml = "";
      for (const lbl of labelOrder) {
        if (lbl) {
          gridHtml += `<div class="task-part-label" role="heading" aria-level="3">${escapeHtml(lbl)}</div>`;
        }
        for (const t of trials) {
          if ((t.section_label?.trim() || "") === lbl) {
            gridHtml += renderTrialCard(t, subject?.catalogSlug);
          }
        }
      }
      els.trialsPanel.innerHTML =
        scaleSection + `<div class="trials-grid">${gridHtml}</div>`;
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
    renderSectionWithFiles(
      "Записи с занятия",
      details.lessonNotes || "",
      lessonFiles,
      "./icons/notes.png",
    ),
    renderSectionWithFiles(
      "Домашнее задание",
      details.homework || [],
      homeworkFiles,
      "./icons/homework.png",
    ),
    renderSectionWithFiles(
      "Подсказки",
      details.hints || [],
      hintFiles,
      "./icons/hints.png",
    ),
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
  const flagKey = getTaskFlag(task);
  const flagImg = flagKey
    ? `<img src="${escapeAttr(TASK_FLAGS[flagKey].src)}" width="17" height="17" alt="${escapeAttr(TASK_FLAGS[flagKey].alt)}" class="task__flag-icon" />`
    : "";
  const footHtml = renderTaskFootHtml(task);

  return `
    <button class="task" type="button" data-task="${escapeAttr(task.id)}">
      <div class="task__top">
        <div class="task__head-text">
          <div class="task__title">${flagImg}${escapeHtml(task.title)}</div>
          <div class="task__desc">${escapeHtml(task.description || "")}</div>
        </div>
        ${renderTaskStatusHtml(task.status)}
      </div>
      ${footHtml}
    </button>`;
}

function renderTaskFootHtml(task) {
  const status = task.status || "not_started";

  if (status === "not_started") {
    return "";
  }

  if (status === "completed") {
    const completedText = formatCompletedDate(task.updatedAtISO);
    return completedText
      ? `<div class="task__foot task__foot--single"><span class="task__date">${escapeHtml(completedText)}</span></div>`
      : "";
  }

  if (status === "in_progress") {
    const progressText = formatInProgressDate(task.updatedAtISO);
    const daysText = formatDaysPassed(daysSince(task.updatedAtISO));
    if (!progressText && !daysText) return "";
    return `<div class="task__foot">
      ${progressText ? `<span class="task__date">${escapeHtml(progressText)}</span>` : "<span></span>"}
      ${daysText ? `<span class="task__days">${escapeHtml(daysText)}</span>` : ""}
    </div>`;
  }

  if (status === "homework") {
    const assignedText = formatAssignedDate(getTaskAssignedDateISO(task));
    const daysRef = task.updatedAtISO || task.createdAtISO;
    const daysText = formatDaysPassed(daysSince(daysRef));
    if (!assignedText && !daysText) return "";
    return `<div class="task__foot">
      ${assignedText ? `<span class="task__date">${escapeHtml(assignedText)}</span>` : "<span></span>"}
      ${daysText ? `<span class="task__days">${escapeHtml(daysText)}</span>` : ""}
    </div>`;
  }

  return "";
}

function daysSince(iso) {
  if (!iso) return null;
  let start = parseISODate(String(iso).slice(0, 10));
  if (!start) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - start) / 86400000));
}

function formatDaysPassed(days) {
  if (days === null || days === undefined || days < 0) return null;
  if (days === 0) return "Сегодня";
  const mod10 = days % 10;
  const mod100 = days % 100;
  let word = "дней";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "день";
    else if (mod10 >= 2 && mod10 <= 4) word = "дня";
  }
  return `${days} ${word}`;
}

function formatInProgressDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `В процессе с ${datePart}`;
}

function formatCompletedDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Пройдено ${datePart}`;
}

const TASK_STATUS_ICON_FILES = {
  all: "./icons/all.svg",
  not_started: "./icons/not_started.svg",
  in_progress: "./icons/in_progress.svg",
  homework: "./icons/homework.svg",
  completed: "./icons/completed.svg",
};

const TASK_FILTER_OPTIONS = [
  { key: "all", label: "Все" },
  { key: "not_started", label: "Не начато" },
  { key: "in_progress", label: "В процессе" },
  { key: "homework", label: "Сделать ДЗ" },
  { key: "completed", label: "Пройдено" },
];

function getTaskStatusIconSrc(status) {
  return TASK_STATUS_ICON_FILES[status] || TASK_STATUS_ICON_FILES.not_started;
}

function renderStatusIconCircle(status, className = "status-icon-circle") {
  const mod = status ? ` ${className}--${status}` : "";
  const src = getTaskStatusIconSrc(status);
  return `<span class="${className}${mod}"><img src="${escapeAttr(src)}" width="18" height="18" alt="" aria-hidden="true" decoding="async" /></span>`;
}

function renderTaskStatusHtml(status) {
  return `<span class="task__status task__status--${escapeAttr(status)}">
    ${renderStatusIconCircle(status, "task__status-icon")}
    ${escapeHtml(formatStatus(status))}
  </span>`;
}

function renderTaskFilters() {
  if (!els.taskFilters) return;
  els.taskFilters.innerHTML = TASK_FILTER_OPTIONS.map(
    ({ key, label }) =>
      `<button class="chip" type="button" data-filter="${escapeAttr(key)}">
        ${renderStatusIconCircle(key, "chip__icon")}
        ${escapeHtml(label)}
      </button>`,
  ).join("");
  setActiveFilterChip(state.filter || "all");
}

function getTaskAssignedDateISO(task) {
  if ((task?.status || "not_started") !== "homework") return null;
  return task?.createdAtISO || null;
}

function formatAssignedDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Задано ${datePart}`;
}

function getTrialGradeLabel(catalogSlug) {
  return catalogSlug?.startsWith("oge") ? "Оценка" : "Тестовый балл";
}

function trialScoreConvertArrow() {
  return `<span class="trial-card__stat-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 8 4 4-4 4"/></svg></span>`;
}

function renderTrialCard(trial, catalogSlug) {
  const title = trial.title || "Пробный вариант";
  const dateStr = trial.date ? formatTrialDate(trial.date) : null;
  const score = trial.score ? String(trial.score).trim() : null;
  const converted = score ? convertScore(score, catalogSlug) : null;
  const gradeLabel = getTrialGradeLabel(catalogSlug);
  const cardLevel = converted?.level ? `trial-card--${converted.level}` : "";
  const timeStr = trial.time ? String(trial.time).trim() : null;

  const statsHtml = `<div class="trial-card__stats">
    <div class="trial-card__stat trial-card__stat--score ${score ? "" : "trial-card__stat--empty"}">
      <div class="trial-card__stat-value">${score ? escapeHtml(score) : "—"}</div>
      <div class="trial-card__stat-label">Первичный балл</div>
    </div>
    ${trialScoreConvertArrow()}
    <div class="trial-card__stat ${converted ? `trial-card__stat--${converted.level}` : "trial-card__stat--empty"}">
      <div class="trial-card__stat-value">${converted ? escapeHtml(converted.display) : "—"}</div>
      <div class="trial-card__stat-label">${escapeHtml(gradeLabel)}</div>
    </div>
  </div>`;

  const hwBadge = trial.is_homework
    ? `<span class="trial-card__hw-badge">ДЗ</span>`
    : "";

  const footHtml = `<div class="trial-card__foot">
    <span class="trial-card__date">${dateStr ? `<img src="./icons/calendar.png" width="12" height="12" alt="" aria-hidden="true" class="trial-card__meta-icon"> ${escapeHtml(dateStr)}` : ""}</span>
    <span class="trial-card__time ${timeStr ? "" : "trial-card__time--empty"}"><img src="./icons/clock.png" width="12" height="12" alt="" aria-hidden="true" class="trial-card__meta-icon"> ${timeStr ? escapeHtml(timeStr) : "—"}</span>
  </div>`;

  return `<button class="trial-card ${cardLevel}" type="button" data-trial-open="${escapeAttr(trial.id)}">
    <div class="trial-card__top">
      <div class="trial-card__title-row">
        <div class="trial-card__title">${escapeHtml(title)}</div>
        ${hwBadge}
      </div>
    </div>
    ${statsHtml}
    ${footHtml}
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
  const gradeLabel = getTrialGradeLabel(catalogSlug);
  const dateStr = trial.date ? formatTrialDate(trial.date) : null;
  const timeStr = trial.time ? String(trial.time).trim() : null;
  const attachments = Array.isArray(trial.attachments)
    ? trial.attachments
        .map((a) => {
          if (a && typeof a === "object")
            return { label: String(a.label || ""), url: String(a.url || "") };
          const s = String(a || "").trim();
          if (s.includes("|")) {
            const i = s.indexOf("|");
            return { label: s.slice(0, i).trim(), url: s.slice(i + 1).trim() };
          }
          return { label: "", url: s };
        })
        .filter((a) => a.url)
    : [];

  els.modalTitle.textContent = trial.title || "Пробный вариант";
  els.modalSubtitle.textContent = dateStr || "";

  els.modalBadge.textContent = "";
  els.modalBadge.className = "modal__badge";
  els.modalBadge.hidden = true;

  const filesHtml = `<div class="section">
    <div class="section__title">Файлы</div>
    <div class="attachments-list">
      ${
        attachments.length
          ? attachments
              .map((a) =>
                renderAttachmentLinkHtml(
                  a.url,
                  a.label || a.url,
                  `<img src="./icons/variant.png" width="16" height="16" alt="" />`,
                ),
              )
              .join("")
          : `<span class="muted" style="font-size:13px">Файлы не прикреплены</span>`
      }
    </div>
  </div>`;

  const resultHtml = `<div class="section">
    <div class="section__title">Результат</div>
    <div class="trial-card__stats trial-card__stats--modal">
      <div class="trial-card__stat trial-card__stat--score ${score ? "" : "trial-card__stat--empty"}">
        <div class="trial-card__stat-value">${score ? escapeHtml(score) : "—"}</div>
        <div class="trial-card__stat-label">Первичный балл</div>
      </div>
      <div class="trial-card__stat ${converted ? `trial-card__stat--${converted.level}` : "trial-card__stat--empty"}">
        <div class="trial-card__stat-value">${converted ? escapeHtml(converted.display) : "—"}</div>
        <div class="trial-card__stat-label">${escapeHtml(gradeLabel)}</div>
      </div>
      <div class="trial-card__stat trial-card__stat--time ${timeStr ? "" : "trial-card__stat--empty"}">
        <div class="trial-card__stat-value">${timeStr ? escapeHtml(timeStr) : "—"}</div>
        <div class="trial-card__stat-label">Время выполнения</div>
      </div>
    </div>
  </div>`;

  const reportHtml = renderTrialTaskResultsReadonly(trial, catalogSlug);

  const html = `<div class="trial-modal__layout">
    <div class="trial-modal__left">${filesHtml}${resultHtml}</div>
    ${reportHtml}
  </div>`;

  els.modalContent.innerHTML = html;
  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => els.modalClose.focus(), 0);
}

const TRIAL_TASK_COUNTS = {
  ege_info: 27,
  ege_math: 19,
  oge_info: 16,
  oge_math: 25,
};

function getTrialTaskCount(catalogSlug) {
  return TRIAL_TASK_COUNTS[String(catalogSlug || "").toLowerCase()] || 0;
}

function normalizeTrialTaskResults(raw, count) {
  const src = Array.isArray(raw) ? raw : [];
  return Array.from({ length: count }, (_, i) => {
    const v = src[i];
    if (v === true || v === "correct" || v === 1) return "correct";
    if (v === false || v === "incorrect" || v === 0) return "incorrect";
    return null;
  });
}

function trialTaskOkIcon() {
  return `<svg class="trial-task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function trialTaskBadIcon() {
  return `<svg class="trial-task-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`;
}

function trialTaskResultsGridStyle(count, cols = 2) {
  const rows = Math.ceil(count / cols) || 1;
  return `grid-template-rows: repeat(${rows}, auto);`;
}

function renderTrialTaskResultsReadonly(trial, catalogSlug) {
  const taskCount = getTrialTaskCount(catalogSlug);
  if (!taskCount) return "";
  const results = normalizeTrialTaskResults(trial.task_results, taskCount);
  const correctCount = results.filter((r) => r === "correct").length;
  const incorrectCount = results.filter((r) => r === "incorrect").length;
  const cols = 2;
  const items = results
    .map((value, i) => {
      let markHtml = `<span class="trial-task-icon trial-task-icon--dash">—</span>`;
      let mod = "trial-task-row--unset";
      if (value === "correct") {
        markHtml = trialTaskOkIcon();
        mod = "trial-task-row--ok";
      } else if (value === "incorrect") {
        markHtml = trialTaskBadIcon();
        mod = "trial-task-row--bad";
      }
      return `<div class="trial-task-row trial-task-row--readonly ${mod}">
        <span class="trial-task-row__num">${i + 1}</span>
        <span class="trial-task-row__mark" aria-label="${value === "correct" ? "Верно" : value === "incorrect" ? "Неверно" : "Не отмечено"}">${markHtml}</span>
      </div>`;
    })
    .join("");
  return `<div class="section trial-modal__report">
    <div class="section__title">Отчёт по заданиям</div>
    <div class="trial-task-summary">
      <span class="trial-task-summary__ok">${correctCount} верно</span>
      <span class="trial-task-summary__bad">${incorrectCount} неверно</span>
      <span class="trial-task-summary__total">${taskCount} заданий</span>
    </div>
    <div class="trial-task-results trial-task-results--readonly" style="${trialTaskResultsGridStyle(taskCount, cols)}">${items}</div>
  </div>`;
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
  const { bodyHtml, links } = renderRichBodyHtml(rawValue);

  return `
    <div class="section">
      <div class="section__title">${escapeHtml(title)}</div>
      ${bodyHtml}
      ${links.length ? renderLinks(links) : ""}
      ${!bodyHtml && !links.length ? `<div class="section__body">—</div>` : ""}
    </div>`;
}

function renderSectionWithFiles(title, rawValue, files, iconSrc) {
  const { bodyHtml, links } = renderRichBodyHtml(rawValue);
  const fileLinks = parseFileAttachmentLinks(files);
  const hasContent = bodyHtml || links.length || fileLinks.length;
  const sectionMod = iconSrc ? " section--with-icon" : "";

  return `
    <div class="section${sectionMod}">
      <div class="section__title">${
        iconSrc
          ? `<span class="section__icon" aria-hidden="true"><img src="${escapeAttr(iconSrc)}" width="28" height="28" alt="" /></span>`
          : ""
      }<span>${escapeHtml(title)}</span></div>
      ${bodyHtml}
      ${links.length ? renderLinks(links) : ""}
      ${renderNestedAttachmentsHtml(fileLinks)}
      ${!hasContent ? `<div class="section__body">—</div>` : ""}
    </div>`;
}

const CODE_FENCE_RE = /```([a-zA-Z0-9_+-]*)\s*\r?\n([\s\S]*?)```/g;

function normalizeRichText(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((x) => String(x ?? "")).join("\n");
  }
  return String(rawValue ?? "");
}

function parseRichTextSegments(text) {
  const segments = [];
  let lastIndex = 0;
  let match;
  CODE_FENCE_RE.lastIndex = 0;
  while ((match = CODE_FENCE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      lang: (match[1] || "").trim(),
      content: match[2].replace(/\s+$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }
  if (!segments.length && text) {
    segments.push({ type: "text", content: text });
  }
  return segments;
}

function renderCodeBlock(lang, code) {
  const langAttr = lang ? ` data-lang="${escapeAttr(lang)}"` : "";
  const label = lang
    ? `<span class="code-block__lang">${escapeHtml(lang)}</span>`
    : "";
  return `<pre class="code-block"${langAttr}>${label}<code>${escapeHtml(code)}</code></pre>`;
}

function renderTextSegmentHtml(content, linksOut) {
  const lines = content.split("\n");
  const parts = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      parts.push("<br />");
      continue;
    }
    const link = parseRichLink(trimmed);
    if (link) {
      linksOut.push(link);
    } else {
      parts.push(escapeHtml(line));
      parts.push("<br />");
    }
  }
  if (parts.length && parts[parts.length - 1] === "<br />") {
    parts.pop();
  }
  return parts.join("");
}

function renderRichBodyHtml(rawValue) {
  const text = normalizeRichText(rawValue);
  const links = [];
  if (!text.trim()) {
    return { bodyHtml: "", links };
  }

  const segments = parseRichTextSegments(text);
  const htmlParts = segments.map((seg) => {
    if (seg.type === "code") {
      return renderCodeBlock(seg.lang, seg.content);
    }
    return renderTextSegmentHtml(seg.content, links);
  });

  const joined = htmlParts.filter(Boolean).join("");
  const bodyHtml = joined ? `<div class="section__body">${joined}</div>` : "";
  return { bodyHtml, links };
}

function getFileExtension(href, label) {
  for (const source of [href, label]) {
    if (!source) continue;
    const path = String(source).toLowerCase().split(/[?#]/)[0];
    const match = path.match(/\.([a-z0-9]+)$/);
    if (match) return match[1];
  }
  return "";
}

// ─── Иконки типов файлов (папка ./icons/) ───────────────────────────────────
// Добавляй или меняй строки: массив расширений (без точки) → путь к PNG/SVG.
// Порядок важен: проверка сверху вниз, первое совпадение побеждает.
const FILE_TYPE_ICON_RULES = [
  { exts: ["pdf"], icon: "./icons/file_pdf.svg" },
  {
    exts: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic"],
    icon: "./icons/file_image.png",
  },
  {
    exts: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
    icon: "./icons/file_video.png",
  },
  { exts: ["mp3", "wav", "ogg", "m4a", "aac"], icon: "./icons/file_audio.svg" },
  { exts: ["doc", "docx", "pages"], icon: "./icons/file_doc.png" },
  { exts: ["xls", "xlsx", "numbers", "csv"], icon: "./icons/file_sheet.png" },
  { exts: ["py", "ipynb", "js", "html", "css"], icon: "./icons/file_code.png" },
  { exts: ["zip", "rar", "7z"], icon: "./icons/file_archive.png" },
];

// Если расширение не найдено в списке выше
const FILE_TYPE_ICON_DEFAULT = "./icons/file_default.png";

function getFileIconSrc(href, label) {
  const ext = getFileExtension(href, label);
  if (!ext) return FILE_TYPE_ICON_DEFAULT;
  const rule = FILE_TYPE_ICON_RULES.find((r) => r.exts.includes(ext));
  return rule?.icon || FILE_TYPE_ICON_DEFAULT;
}

function renderFileIconHtml(href, label) {
  const src = getFileIconSrc(href, label);
  return `<img src="${escapeAttr(src)}" width="18" height="18" alt="" decoding="async" />`;
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

function parseFileAttachmentLinks(files) {
  return (files || [])
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
}

function renderAttachmentLinkHtml(href, label, iconHtml) {
  const iconPart = iconHtml
    ? `<span class="attachment-link__icon" aria-hidden="true">${iconHtml}</span>`
    : "";
  const compactClass = iconHtml ? "" : " attachment-link--compact";
  return `<a class="attachment-link${compactClass}" href="${escapeAttr(href)}" target="_blank" rel="noreferrer">
          ${iconPart}<span class="attachment-link__label">${escapeHtml(label)}</span>
          <span class="attachment-link__open" aria-hidden="true">↗</span>
        </a>`;
}

function renderNestedAttachmentsHtml(fileLinks) {
  if (!fileLinks.length) return "";
  return `<div class="section__attachments">
      <div class="attachments-list">${fileLinks
        .map((a) =>
          renderAttachmentLinkHtml(
            a.href,
            a.label,
            renderFileIconHtml(a.href, a.label),
          ),
        )
        .join("")}</div>
    </div>`;
}

function renderAttachmentsSection(attachments) {
  const links = parseFileAttachmentLinks(attachments);
  if (!links.length) return "";
  return `
    <div class="section section--attachments">
      <div class="section__title">📎 Записи и файлы</div>
      <div class="attachments-list">
        ${links.map((a) => renderAttachmentLinkHtml(a.href, a.label, renderFileIconHtml(a.href, a.label))).join("")}
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

const TASK_FLAGS = {
  pinned: { src: "./icons/flag_pinned.png", alt: "Закреплено" },
  redo: { src: "./icons/flag_redo.png", alt: "Перерешать" },
  new_topic: { src: "./icons/flag_new.png", alt: "Новая тема" },
};

function getTaskFlag(task) {
  const flag = task?.details?.flag;
  if (flag && TASK_FLAGS[flag]) return flag;
  // обратная совместимость
  if (task?.details?.isPinned === true) return "pinned";
  return null;
}

function isTaskPinned(task) {
  return !!getTaskFlag(task);
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
      { min: 0, max: 7, grade: 2 },
      { min: 8, max: 14, grade: 3 },
      { min: 15, max: 21, grade: 4 },
      { min: 22, max: 31, grade: 5 },
    ],
  },
  oge_info: {
    type: "grade",
    thresholds: [
      { min: 0, max: 4, grade: 2 },
      { min: 5, max: 10, grade: 3 },
      { min: 11, max: 16, grade: 4 },
      { min: 17, max: 21, grade: 5 },
    ],
  },
  ege_math: {
    type: "test",
    // индекс = первичный балл → тестовый балл
    table: [
      0, 6, 11, 17, 22, 27, 34, 40, 46, 52, 58, 64, 70, 72, 74, 76, 78, 80, 82,
      84, 86, 88, 90, 92, 94, 95, 96, 97, 98, 99, 100, 100, 100,
    ],
    thresholds: [
      { min: 0, max: 22, level: "fail" },
      { min: 27, max: 34, level: "low" },
      { min: 40, max: 92, level: "mid" },
      { min: 94, max: 100, level: "high" },
    ],
  },
  ege_info: {
    type: "test",
    // индекс = первичный балл → тестовый балл
    table: [
      0, 7, 14, 20, 27, 34, 40, 43, 46, 48, 51, 54, 56, 59, 62, 64, 67, 70, 72,
      75, 78, 80, 83, 85, 88, 90, 93, 95, 98, 100,
    ],
    thresholds: [
      { min: 0, max: 34, level: "fail" },
      { min: 40, max: 43, level: "low" },
      { min: 46, max: 78, level: "mid" },
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
    const found = cfg.thresholds.find(
      (t) => primary >= t.min && primary <= t.max,
    );
    if (!found) return null;
    return { display: String(found.grade), level: `grade-${found.grade}` };
  }

  if (cfg.type === "test") {
    const testScore = cfg.table[primary] ?? null;
    if (testScore === null) return null;
    const found = cfg.thresholds.find(
      (t) => testScore >= t.min && testScore <= t.max,
    );
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
          i > 0
            ? cfg.thresholds[i - 1].max - cfg.thresholds[i - 1].min + 1
            : null;
        const span = t.max === Infinity ? prevSpan || 8 : t.max - t.min + 1;
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
        const zone = cfg.thresholds.find(
          (t) => testScore >= t.min && testScore <= t.max,
        );
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

async function loadAndRenderTicker(userId) {
  try {
    const snap = await window.db
      .collection("tickers")
      .where("enabled", "==", true)
      .where("userIds", "array-contains", userId)
      .limit(1)
      .get();
    if (snap.empty) {
      els.tickerBar.hidden = true;
      return;
    }
    const ticker = snap.docs[0].data();
    const type = ticker.type || "ticker";

    if (type === "banner") {
      const imageUrl = ticker.imageUrl?.trim();
      if (!imageUrl) {
        els.tickerBar.hidden = true;
        return;
      }
      els.tickerBar.style.background = "";
      els.tickerBar.style.color = "";
      els.tickerBar.className = "ticker-bar ticker-bar--banner";
      els.tickerTrack.className = "ticker__track ticker__track--banner";
      els.tickerTrack.innerHTML = `<img src="${escapeAttr(imageUrl)}" alt="" class="ticker-banner__img" />`;
      els.tickerBar.hidden = false;
      return;
    }

    // ── Бегущая строка ──
    els.tickerBar.className = "ticker-bar";
    els.tickerTrack.className = "ticker__track";
    const text = ticker.text || "";
    if (!text.trim()) {
      els.tickerBar.hidden = true;
      return;
    }

    const rawBg = ticker.bg || "linear-gradient(90deg, #667eea, #764ba2)";
    const bg = /^https?:\/\//i.test(rawBg.trim())
      ? `url(${rawBg.trim()}) center/cover no-repeat`
      : rawBg;
    els.tickerBar.style.background = bg;
    els.tickerBar.style.color = ticker.textColor || "#ffffff";

    const items = text
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const oneItem = items
      .map(
        (item) =>
          `<span class="ticker__item"><span class="ticker__sep">✦</span> ${escapeHtml(item)} <span class="ticker__sep">✦</span></span>`,
      )
      .join("");

    const REPEAT = 12;
    const itemsHtml = Array(REPEAT).fill(oneItem).join("");
    const contentHtml = `<span class="ticker__content">${itemsHtml}</span><span class="ticker__content" aria-hidden="true">${itemsHtml}</span>`;
    els.tickerTrack.innerHTML = contentHtml;

    const totalChars = items.join("").length;
    const approxWidth = totalChars * 9 * REPEAT;
    const speed = Math.round(approxWidth / 80);
    els.tickerTrack.style.animationDuration = speed + "s";

    els.tickerBar.hidden = false;
  } catch (err) {
    console.warn("Ticker load error:", err);
    els.tickerBar.hidden = true;
  }
}
