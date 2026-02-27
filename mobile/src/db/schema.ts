import * as SQLite from 'expo-sqlite'

let db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('organon.db')
    initSchema(db)
  }
  return db
}

function initSchema(database: SQLite.SQLiteDatabase): void {
  database.execSync(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      description_html TEXT DEFAULT '',
      location_day TEXT,
      location_period TEXT,
      ord INTEGER DEFAULT 0,
      date TEXT,
      time TEXT,
      has_date INTEGER DEFAULT 0,
      priority TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      checklist TEXT DEFAULT '[]',
      project_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      time TEXT,
      recurrence TEXT,
      reminder TEXT,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      parent_id TEXT,
      ord INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      folder_id TEXT,
      project_id TEXT,
      ord INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS color_palettes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      colors TEXT DEFAULT '[]',
      ord INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'boolean',
      target REAL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'daily',
      weekly_target INTEGER DEFAULT 7,
      week_days TEXT DEFAULT '[]',
      trigger TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      minimum_target REAL DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      ord INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_entries (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      skip_reason TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      amount REAL DEFAULT 0,
      due_day INTEGER DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'outro',
      recurrence TEXT DEFAULT 'monthly',
      is_paid INTEGER DEFAULT 0,
      paid_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'outro',
      date TEXT NOT NULL,
      installments INTEGER DEFAULT 1,
      current_installment INTEGER DEFAULT 1,
      parent_id TEXT,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      category TEXT PRIMARY KEY,
      limit_amount REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'fixed',
      recurrence_months INTEGER DEFAULT 1,
      recurrence_index INTEGER DEFAULT 1,
      recurrence_group_id TEXT,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      target_amount REAL DEFAULT 0,
      current_amount REAL DEFAULT 0,
      deadline TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      sector TEXT DEFAULT '',
      category TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      dialogs TEXT DEFAULT '[]',
      ord INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      company TEXT,
      role TEXT,
      phone TEXT,
      email TEXT,
      social_media TEXT,
      context TEXT,
      interests TEXT,
      priority TEXT DEFAULT 'media',
      tags TEXT DEFAULT '[]',
      stage_id TEXT DEFAULT 'prospeccao',
      description TEXT DEFAULT '',
      follow_up_date TEXT,
      links TEXT DEFAULT '{}',
      ord INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_interactions (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'nota',
      content TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '00:00',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shortcut_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      parent_id TEXT,
      ord INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shortcuts (
      id TEXT PRIMARY KEY,
      folder_id TEXT,
      title TEXT NOT NULL DEFAULT '',
      kind TEXT DEFAULT 'url',
      value TEXT NOT NULL DEFAULT '',
      icon TEXT,
      ord INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS study_goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'todo',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL,
      focus_seconds INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      monthly_income REAL DEFAULT 0,
      monthly_spending_limit REAL DEFAULT 0
    );

    INSERT OR IGNORE INTO financial_config (id, monthly_income, monthly_spending_limit)
    VALUES (1, 0, 0);
  `)
}
