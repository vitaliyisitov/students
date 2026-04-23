window.SUPABASE_CONFIG = {
  url: "https://otfvlclvhnogidxcxbgd.supabase.co",
  anonKey: "sb_publishable_hRnY2vLBkxtf68qxl2YVUQ_xkzUBxYL",
  tables: {
    users: "users",
    subjects: "subjects",
    tasks: "tasks",
  },
  /** Если true (по умолчанию), без параметра ?k=... в URL данные не загружаются. Для локальной отладки: false. */
  requirePersonalLink: true,
  /** Имя функции в Supabase (см. supabase-personal-links.sql). Пустая строка — только прямые select к таблицам. */
  rpcDashboardByToken: "dashboard_by_token",

  adminGatePassword: "",
};
