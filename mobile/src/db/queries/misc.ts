import { getDb } from '../schema'
import type { Playbook, PlaybookDialog, ShortcutFolder, ShortcutItem, ColorPalette, StudyGoal, StudySessionLog, Settings } from '../../types'

// ── Playbooks ──────────────────────────────────────────────────────────────────

export function getAllPlaybooks(): Playbook[] {
  return getDb().getAllSync<{
    id: string; title: string; sector: string; category: string
    summary: string; content: string; dialogs: string
    ord: number; created_at: string; updated_at: string
  }>('SELECT * FROM playbooks ORDER BY ord ASC').map(r => ({
    id: r.id, title: r.title, sector: r.sector, category: r.category,
    summary: r.summary, content: r.content,
    dialogs: JSON.parse(r.dialogs || '[]') as PlaybookDialog[],
    order: r.ord, createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function upsertPlaybook(p: Playbook): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO playbooks (id, title, sector, category, summary, content, dialogs, ord, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.id, p.title, p.sector, p.category, p.summary, p.content, JSON.stringify(p.dialogs), p.order, p.createdAt, p.updatedAt]
  )
}

export function deletePlaybook(id: string): void {
  getDb().runSync('DELETE FROM playbooks WHERE id = ?', [id])
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

export function getAllShortcutFolders(): ShortcutFolder[] {
  return getDb().getAllSync<{ id: string; name: string; parent_id: string | null; ord: number }>(
    'SELECT * FROM shortcut_folders ORDER BY ord ASC'
  ).map(r => ({ id: r.id, name: r.name, parentId: r.parent_id, order: r.ord }))
}

export function upsertShortcutFolder(folder: ShortcutFolder): void {
  getDb().runSync('INSERT OR REPLACE INTO shortcut_folders (id, name, parent_id, ord) VALUES (?, ?, ?, ?)',
    [folder.id, folder.name, folder.parentId, folder.order])
}

export function deleteShortcutFolder(id: string): void {
  getDb().runSync('DELETE FROM shortcut_folders WHERE id = ?', [id])
  getDb().runSync('UPDATE shortcuts SET folder_id = NULL WHERE folder_id = ?', [id])
}

export function getAllShortcuts(): ShortcutItem[] {
  return getDb().getAllSync<{
    id: string; folder_id: string | null; title: string; kind: string; value: string; icon: string | null; ord: number
  }>('SELECT * FROM shortcuts ORDER BY ord ASC').map(r => ({
    id: r.id, folderId: r.folder_id, title: r.title,
    kind: r.kind as 'url', value: r.value,
    icon: r.icon ? JSON.parse(r.icon) : null, order: r.ord,
  }))
}

export function upsertShortcut(s: ShortcutItem): void {
  getDb().runSync('INSERT OR REPLACE INTO shortcuts (id, folder_id, title, kind, value, icon, ord) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [s.id, s.folderId, s.title, s.kind, s.value, s.icon ? JSON.stringify(s.icon) : null, s.order])
}

export function deleteShortcut(id: string): void {
  getDb().runSync('DELETE FROM shortcuts WHERE id = ?', [id])
}

// ── Color Palettes ────────────────────────────────────────────────────────────

export function getAllColorPalettes(): ColorPalette[] {
  return getDb().getAllSync<{
    id: string; name: string; colors: string; ord: number; created_at: string; updated_at: string
  }>('SELECT * FROM color_palettes ORDER BY ord ASC').map(r => ({
    id: r.id, name: r.name, colors: JSON.parse(r.colors || '[]') as string[],
    order: r.ord, createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function upsertColorPalette(p: ColorPalette): void {
  getDb().runSync('INSERT OR REPLACE INTO color_palettes (id, name, colors, ord, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [p.id, p.name, JSON.stringify(p.colors), p.order, p.createdAt, p.updatedAt])
}

export function deleteColorPalette(id: string): void {
  getDb().runSync('DELETE FROM color_palettes WHERE id = ?', [id])
}

// ── Study ─────────────────────────────────────────────────────────────────────

export function getAllStudyGoals(): StudyGoal[] {
  return getDb().getAllSync<{ id: string; title: string; status: string; created_at: string }>(
    'SELECT * FROM study_goals ORDER BY created_at DESC'
  ).map(r => ({ id: r.id, title: r.title, status: r.status as StudyGoal['status'], createdAt: r.created_at }))
}

export function upsertStudyGoal(goal: StudyGoal): void {
  getDb().runSync('INSERT OR REPLACE INTO study_goals (id, title, status, created_at) VALUES (?, ?, ?, ?)',
    [goal.id, goal.title, goal.status, goal.createdAt])
}

export function deleteStudyGoal(id: string): void {
  getDb().runSync('DELETE FROM study_goals WHERE id = ?', [id])
}

export function getAllStudySessions(): StudySessionLog[] {
  return getDb().getAllSync<{ id: string; completed_at: string; focus_seconds: number }>(
    'SELECT * FROM study_sessions ORDER BY completed_at DESC LIMIT 100'
  ).map(r => ({ id: r.id, completedAt: r.completed_at, focusSeconds: r.focus_seconds }))
}

export function insertStudySession(session: StudySessionLog): void {
  getDb().runSync('INSERT INTO study_sessions (id, completed_at, focus_seconds) VALUES (?, ?, ?)',
    [session.id, session.completedAt, session.focusSeconds])
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSetting(key: string, fallback: string): string {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
  return row?.value ?? fallback
}

export function setSetting(key: string, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
}

export function loadSettings(): Settings {
  const themeName = getSetting('themeName', 'dark-default')
  const weekStart = getSetting('weekStart', 'sun')
  return {
    themeName: themeName as Settings['themeName'],
    weekStart: weekStart as Settings['weekStart'],
  }
}

export function saveSettings(settings: Settings): void {
  setSetting('themeName', settings.themeName)
  setSetting('weekStart', settings.weekStart)
}
