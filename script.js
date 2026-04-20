/* Mock DB (backend-like shape) */
let data = {
  user: {
    id: "u_001",
    name: "Елизавета",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "local",
  },
  subjects: [
    {
      id: "sub_math",
      title: "Математика",
      emoji: "📐",
      exam: {
        dateISO: "2026-06-02",
        durationMinutes: 235,
        tasksTotal: 25,
      },
      tips: [
        "Сделай 1 задание на время, затем разберите ошибки по конспекту.",
        "Если застрял на 6 минут — запиши, что знаешь, и переходи дальше.",
        "Веди мини-журнал ошибок: тема → ошибка → правильный ход.",
      ],
    },
    {
      id: "sub_info",
      title: "Информатика",
      emoji: "💻",
      exam: {
        dateISO: "2026-06-15",
        durationMinutes: 235,
        tasksTotal: 27,
      },
      tips: [
        "Чередуй: теория (20 мин) → практика (30 мин) → разбор (10 мин).",
        "Сделай шаблоны для типовых задач (ввод/вывод, парсинг).",
        "Тренируйся в условиях: лимит времени и без отвлечений.",
      ],
    },
  ],
  tasks: [
    {
      id: "t_math_01",
      subjectId: "sub_math",
      title: "Квадратные уравнения и факторизация",
      description: "Ключевые шаблоны: дискриминант, Виет и быстрые приемы.",
      status: "completed",
      updatedAtISO: "2026-04-18T10:30:00.000Z",
      details: {
        lessonNotes:
          "Focus on recognizing factorable forms quickly. Write 3 patterns you can spot instantly (difference of squares, perfect square, grouping).",
        homework: [
          "Solve 12 quadratic equations (mix: factoring/discriminant).",
          "Make a 1-page summary: Vieta + typical pitfalls.",
        ],
        hints: [
          "If coefficients are big: try Vieta first before expanding.",
          "Check for common factor and sign errors.",
        ],
        attachments: [
          { label: "Formula sheet (PDF)", href: "#" },
          { label: "Practice set A", href: "#" },
        ],
      },
    },
    {
      id: "t_math_02",
      subjectId: "sub_math",
      title: "Неравенства (метод интервалов)",
      description: "Рациональные неравенства и таблицы знаков.",
      status: "in_progress",
      updatedAtISO: "2026-04-17T16:05:00.000Z",
      details: {
        lessonNotes:
          "Always mark excluded points from denominator. Build a sign chart and verify with one test point per interval.",
        homework: [
          "Solve 10 rational inequalities (include repeated roots).",
          "Rewrite solutions in correct interval notation.",
        ],
        hints: [
          "Repeated roots do NOT flip sign.",
          "Use a quick number line sketch: it reduces mistakes.",
        ],
        attachments: [{ label: "Worked examples", href: "#" }],
      },
    },
    {
      id: "t_math_03",
      subjectId: "sub_math",
      title: "Геометрия: окружности",
      description: "Углы, хорды, касательные — теоремы для быстрых решений.",
      status: "in_progress",
      updatedAtISO: "2026-04-15T11:00:00.000Z",
      details: {
        lessonNotes:
          "Collect 5 most-used circle facts. Practice identifying which one applies from a diagram.",
        homework: [
          "Solve 8 problems (2 tangent, 3 chord, 3 angle).",
          "Write a cheat sheet of theorems with mini diagrams.",
        ],
        hints: ["Look for equal angles subtending equal chords."],
        attachments: [
          { label: "Diagram pack", href: "#" },
          { label: "Theorems list", href: "#" },
        ],
      },
    },
    {
      id: "t_math_04",
      subjectId: "sub_math",
      title: "Мини-пробник",
      description: "Пробник на 45 минут для тренировки темпа.",
      status: "completed",
      updatedAtISO: "2026-04-19T18:40:00.000Z",
      details: {
        lessonNotes:
          "After finishing, review the 3 slowest tasks and find the bottleneck: recall vs algebra vs reading.",
        homework: [
          "Re-solve wrong tasks without looking at solutions.",
          "Write 3 rules for pacing (when to skip, when to double-check).",
        ],
        hints: ["Target accuracy first, speed second."],
        attachments: [{ label: "Mock exam PDF", href: "#" }],
      },
    },
    {
      id: "t_info_01",
      subjectId: "sub_info",
      title: "Системы счисления и переводы",
      description: "Основы двоичной/шестнадцатеричной и быстрые приемы.",
      status: "completed",
      updatedAtISO: "2026-04-12T09:15:00.000Z",
      details: {
        lessonNotes:
          "Practice conversions until they are automatic. Use nibble grouping (4-bit) for hex.",
        homework: [
          "Convert 20 numbers between bases (2, 8, 10, 16).",
          "Do 5 mixed tasks with constraints.",
        ],
        hints: ["Hex is just grouped binary: 0000–1111."],
        attachments: [{ label: "Conversion table", href: "#" }],
      },
    },
    {
      id: "t_info_02",
      subjectId: "sub_info",
      title: "Алгоритмы: оценка сложности",
      description: "Основы Big-O и распознавание медленных циклов.",
      status: "in_progress",
      updatedAtISO: "2026-04-18T20:10:00.000Z",
      details: {
        lessonNotes:
          "Learn to estimate operations: nested loops, logarithms, linear scans. Focus on constraints and time limit.",
        homework: [
          "Classify 15 snippets by complexity.",
          "Rewrite 2 slow snippets to faster ones (data structures).",
        ],
        hints: ["When \(n\) is 10^5, \(n^2\) is usually too slow."],
        attachments: [
          { label: "Snippet pack", href: "#" },
          { label: "Cheatsheet", href: "#" },
        ],
      },
    },
    {
      id: "t_info_03",
      subjectId: "sub_info",
      title: "Строки: парсинг и шаблоны",
      description: "Индексация, split и проверка шаблонов.",
      status: "homework",
      updatedAtISO: "2026-04-16T13:25:00.000Z",
      details: {
        lessonNotes:
          "Build a small checklist: input format → tokens → parse → compute → output. Most bugs are parsing bugs.",
        homework: [
          "Solve 6 parsing tasks (different input styles).",
          "Write two helper functions you can reuse.",
        ],
        hints: ["Always test with minimal input and edge cases."],
        attachments: [{ label: "Input formats (examples)", href: "#" }],
      },
    },
    {
      id: "t_info_04",
      subjectId: "sub_info",
      title: "Python: ввод/вывод из файла",
      description: "Чтение из файлов, циклы и надежные вычисления.",
      status: "not_started",
      updatedAtISO: "2026-04-14T11:50:00.000Z",
      details: {
        lessonNotes:
          "Practice a robust pattern: open → read → parse → compute → print. Focus on speed + correctness.",
        homework: [
          "Implement 3 templates: ints per line, CSV-ish, mixed tokens.",
          "Solve 3 file-based tasks end-to-end.",
        ],
        hints: ["Use `split()` carefully; strip trailing newlines."],
        attachments: [
          { label: "File I/O template", href: "#" },
          { label: "Sample datasets", href: "#" },
        ],
      },
    },
  ],
};

/*
  Supabase settings:
  1) Create window.SUPABASE_CONFIG before script.js, or
  2) Fill SUPABASE_URL and SUPABASE_ANON_KEY below.
*/
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";
const SUPABASE_TABLES = {
  users: "users",
  subjects: "subjects",
  tasks: "tasks",
};

function getDashboardAccessTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("k") || params.get("key") || "").trim();
  } catch {
    return "";
  }
}

/** Секрет из персональной ссылки (?k=...). Это не «шифрование», а длинный случайный идентификатор. */
const DASHBOARD_ACCESS_TOKEN = getDashboardAccessTokenFromUrl();

const STORAGE_KEY = DASHBOARD_ACCESS_TOKEN
  ? `student_dashboard_v1__${DASHBOARD_ACCESS_TOKEN}`
  : "student_dashboard_v1";

/* Lightweight state */
const state = loadState() || {
  selectedSubjectId: data.subjects[0]?.id || null,
  taskStatusById: {}, // allows demo edits later
  filter: "all",
};

/* Elements */
const els = {
  nowDate: document.getElementById("nowDate"),
  nowTime: document.getElementById("nowTime"),
  subjectTabs: document.getElementById("subjectTabs"),

  greetingEyebrow: document.getElementById("greetingEyebrow"),
  greetingTitle: document.getElementById("greetingTitle"),
  subjectPill: document.getElementById("subjectPill"),
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
};

let clockTimer = null;
let countdownTimer = null;
let lastFocusedBeforeModal = null;
let subjectTabsBound = false;

void init();

async function init() {
  await loadDataFromSupabase();
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
}

function isSupabaseConfigured(configFromWindow) {
  const url = configFromWindow.url || SUPABASE_URL;
  const anonKey = configFromWindow.anonKey || SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && window.supabase?.createClient);
}

function isDashboardShellVisible() {
  return !els.appShell?.hidden;
}

function setDashboardGate(reason) {
  if (!els.appGate || !els.appShell) return;
  if (!reason) {
    els.appGate.hidden = true;
    els.appShell.hidden = false;
    return;
  }
  const copy = {
    missing_token: {
      title: "Нужна персональная ссылка",
      text: "Откройте кабинет по ссылке от преподавателя. В адресе страницы должен быть параметр вида ?k=… (длинный набор букв и цифр).",
    },
    invalid_token: {
      title: "Ссылка недействительна",
      text: "Проверьте, что вы скопировали адрес полностью. Если сообщение повторяется, попросите преподавателя прислать ссылку ещё раз.",
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

async function loadDataFromSupabase() {
  const configFromWindow = window.SUPABASE_CONFIG || {};
  const url = configFromWindow.url || SUPABASE_URL;
  const anonKey = configFromWindow.anonKey || SUPABASE_ANON_KEY;
  const tables = {
    users: configFromWindow.tables?.users || SUPABASE_TABLES.users,
    subjects: configFromWindow.tables?.subjects || SUPABASE_TABLES.subjects,
    tasks: configFromWindow.tables?.tasks || SUPABASE_TABLES.tasks,
  };

  if (!isSupabaseConfigured(configFromWindow)) {
    setDashboardGate(null);
    return;
  }

  const requirePersonalLink = configFromWindow.requirePersonalLink !== false;
  const rpcName = configFromWindow.rpcDashboardByToken;
  const token = DASHBOARD_ACCESS_TOKEN;

  if (requirePersonalLink && !token) {
    setDashboardGate("missing_token");
    return;
  }

  try {
    const client = window.supabase.createClient(url, anonKey);

    if (token && rpcName) {
      const rpcRes = await client.rpc(rpcName, { p_token: token });
      const payload = rpcRes.data;
      const payloadOk =
        !rpcRes.error &&
        payload !== null &&
        typeof payload === "object" &&
        !Array.isArray(payload);
      if (payloadOk) {
        const userRow = payload.user;
        if (userRow && typeof userRow === "object") {
          data = buildDataFromPayload(
            userRow,
            payload.subjects,
            payload.tasks,
          );
          setDashboardGate(null);
          return;
        }
      }
    }

    if (token) {
      const userRes = await client
        .from(tables.users)
        .select("id,name,full_name,timezone,access_token")
        .eq("access_token", token)
        .maybeSingle();

      if (userRes.error || !userRes.data?.id) {
        setDashboardGate("invalid_token");
        return;
      }

      const userId = userRes.data.id;
      const subjectsRes = await client
        .from(tables.subjects)
        .select("*")
        .eq("user_id", userId);

      if (subjectsRes.error) {
        setDashboardGate("invalid_token");
        return;
      }

      const subjectIds = (subjectsRes.data || []).map((s) => s.id);
      let tasksRes;
      if (!subjectIds.length) {
        tasksRes = { data: [], error: null };
      } else {
        tasksRes = await client
          .from(tables.tasks)
          .select("*")
          .in("subject_id", subjectIds);
      }

      if (tasksRes.error) {
        setDashboardGate("invalid_token");
        return;
      }

      const { access_token: _omit, ...userForMap } = userRes.data;
      data = buildDataFromPayload(
        userForMap,
        subjectsRes.data,
        tasksRes.data,
      );
      setDashboardGate(null);
      return;
    }

    const [usersRes, subjectsRes, tasksRes] = await Promise.all([
      client.from(tables.users).select("*").limit(1),
      client.from(tables.subjects).select("*"),
      client.from(tables.tasks).select("*"),
    ]);

    if (usersRes.error || subjectsRes.error || tasksRes.error) return;
    if (!subjectsRes.data?.length || !tasksRes.data?.length) return;

    data = buildDataFromPayload(
      usersRes.data?.[0] || {},
      subjectsRes.data,
      tasksRes.data,
    );
    setDashboardGate(null);
  } catch {
    if (requirePersonalLink && token) setDashboardGate("invalid_token");
  }
}

function mapUser(row) {
  return {
    id: row.id || "u_001",
    name: row.name || row.full_name || "Ученик",
    timezone:
      row.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "local",
  };
}

function mapSubject(row) {
  return {
    id: row.id,
    title: row.title || row.name || "Предмет",
    emoji: row.emoji || "📘",
    exam: {
      dateISO: row.exam_date || row.date_iso || "2026-06-15",
      durationMinutes: Number(row.duration_minutes || row.duration || 235),
      tasksTotal: Number(row.tasks_total || row.task_count || 0),
    },
    tips: Array.isArray(row.tips) ? row.tips : [],
  };
}

function mapTask(row) {
  return {
    id: row.id,
    subjectId: row.subject_id || row.subjectId,
    title: row.title || "Задание",
    description: row.description || "",
    status: row.status || "not_started",
    updatedAtISO: row.updated_at || row.updatedAtISO || new Date().toISOString(),
    details: row.details && typeof row.details === "object" ? row.details : {
      lessonNotes: "",
      homework: [],
      hints: [],
      attachments: [],
    },
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

  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => {
    const close = e.target?.dataset?.close === "true";
    if (close) closeModal();
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
      return `<button class="tab ${active}" type="button" data-subject="${escapeAttr(
        s.id,
      )}" aria-pressed="${s.id === state.selectedSubjectId ? "true" : "false"}">
        <span aria-hidden="true">${escapeHtml(s.emoji || "📘")}</span>
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
  els.greetingTitle.textContent = `${greeting.title}, ${name} 👋`;
  els.subjectPill.textContent = subject
    ? `${subject.emoji} ${subject.title}`
    : "—";

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
  // els.progressMetaRight.textContent = `${counts.in_progress || 0} в процессе • ${
  //   counts.homework || 0
  // } сделать ДЗ`;
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

function renderTasks() {
  setActiveFilterChip(state.filter);

  const tasks = getTasksForSelectedSubject().map((t) => ({
    ...t,
    status: state.taskStatusById[t.id] || t.status,
  }));

  const filtered = filterTasks(tasks, state.filter);
  const subject = getSelectedSubject();

  if (!filtered.length) {
    els.tasksGrid.innerHTML = `
      <div class="section" style="grid-column: 1 / -1;">
        <div class="section__title">Нет заданий</div>
        <div class="section__body">По фильтру ничего не найдено для ${
          subject ? escapeHtml(subject.title) : "этого предмета"
        }.</div>
      </div>
    `;
    return;
  }

  els.tasksGrid.innerHTML = filtered.map((t) => renderTaskCard(t)).join("");

  els.tasksGrid.querySelectorAll("[data-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-task");
      const task = tasks.find((x) => x.id === id);
      if (!task) return;
      openModal(task);
    });
  });
}

function openModal(task) {
  lastFocusedBeforeModal = document.activeElement;

  els.modalTitle.textContent = task.title;
  els.modalSubtitle.textContent = task.description || "";
  els.modalBadge.textContent = formatStatus(task.status);
  els.modalBadge.className = `modal__badge badge--${task.status}`;

  const details = task.details || {};
  els.modalContent.innerHTML = [
    renderSection("Конспект", details.lessonNotes || "—"),
    renderListSection("Домашнее задание", details.homework || []),
    renderListSection("Подсказки", details.hints || []),
    renderAttachments(details.attachments || []),
  ].join("");

  els.modal.classList.add("is-open");
  els.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  setTimeout(() => {
    els.modalClose.focus();
  }, 0);
}

function closeModal() {
  if (!isModalOpen()) return;
  els.modal.classList.remove("is-open");
  els.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  if (
    lastFocusedBeforeModal &&
    typeof lastFocusedBeforeModal.focus === "function"
  ) {
    lastFocusedBeforeModal.focus();
  }
}

function isModalOpen() {
  return els.modal.classList.contains("is-open");
}

function renderTaskCard(task) {
  const badgeClass = `badge badge--${task.status}`;
  const updated = task.updatedAtISO ? new Date(task.updatedAtISO) : null;
  const updatedText = updated
    ? `Обновлено ${updated.toLocaleDateString("ru-RU", { year: "numeric", month: "short", day: "2-digit" })}`
    : "Обновлено —";

  return `
    <button class="task" type="button" data-task="${escapeAttr(task.id)}">
      <div class="task__top">
        <div>
          <div class="task__title">${escapeHtml(task.title)}</div>
        </div>
        <span class="${badgeClass}">${escapeHtml(formatStatus(task.status))}</span>
      </div>
      <div class="task__desc">${escapeHtml(task.description || "")}</div>
      <div class="task__meta">
        <span class="meta">${escapeHtml(updatedText)}</span>
        <span class="meta">Открыть детали →</span>
      </div>
    </button>
  `;
}

function renderSection(title, body) {
  return `
    <div class="section">
      <div class="section__title">${escapeHtml(title)}</div>
      <div class="section__body">${escapeHtml(body)}</div>
    </div>
  `;
}

function renderListSection(title, items) {
  const safeItems = Array.isArray(items) ? items : [];
  return `
    <div class="section">
      <div class="section__title">${escapeHtml(title)}</div>
      ${
        safeItems.length
          ? `<ul class="list">${safeItems.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : `<div class="section__body">—</div>`
      }
    </div>
  `;
}

function renderAttachments(attachments) {
  const safe = Array.isArray(attachments) ? attachments : [];
  return `
    <div class="section">
      <div class="section__title">Материалы</div>
      ${
        safe.length
          ? `<div class="links">
            ${safe
              .map(
                (a) =>
                  `<a class="link" href="${escapeAttr(a.href || "#")}" target="_blank" rel="noreferrer">
                    <span aria-hidden="true">↗</span>
                    <span>${escapeHtml(a.label || "Ссылка")}</span>
                  </a>`,
              )
              .join("")}
          </div>`
          : `<div class="section__body">—</div>`
      }
    </div>
  `;
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
  const chips = els.cardTasks.querySelectorAll("button[data-filter]");
  chips.forEach((c) =>
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
  const diffMs = startOfTarget - startOfToday;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function parseISODate(iso) {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pluralizeDays(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
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
  } catch {
    // ignore
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
