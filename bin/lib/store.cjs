const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

/**
 * Organon CLI Data Store Manager
 * Locates the active data directory and provides atomic CRUD operations for all sections.
 */

function resolveDataDir(options = {}) {
  const runtimeEnv = options.env || process.env;
  const runtimePlatform = options.platform || os.platform();
  const runtimeHomeDir = options.homeDir || os.homedir();
  const runtimeCwd = options.cwd || process.cwd();

  // 1. Explicit environment variable
  if (runtimeEnv.ORGANON_DATA_DIR && fs.existsSync(runtimeEnv.ORGANON_DATA_DIR)) {
    return path.resolve(runtimeEnv.ORGANON_DATA_DIR);
  }

  // 2. Electron userData config.json
  const userDataDir = runtimePlatform === 'win32'
    ? path.join(runtimeEnv.APPDATA || path.join(runtimeHomeDir, 'AppData', 'Roaming'), 'Organon')
    : runtimePlatform === 'darwin'
      ? path.join(runtimeHomeDir, 'Library', 'Application Support', 'Organon')
      : path.join(runtimeHomeDir, '.config', 'Organon');

  const configPath = path.join(userDataDir, 'config.json');
  for (const candidate of [configPath, `${configPath}.bak`]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const config = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (typeof config.dataDir === 'string' && config.dataDir.trim()) {
        return path.resolve(config.dataDir);
      }
    } catch {
      // Ignore config parse error
    }
  }

  // 3. Dedicated v2 Storage in Documents/Organon
  const documentsDir = path.join(runtimeHomeDir, 'Documents', 'Organon');
  if (isDedicatedStorage(documentsDir)) {
    return documentsDir;
  }

  // 4. Local workspace relative dirs (dev environment)
  const localDataV2 = path.resolve(runtimeCwd, 'data-v2');
  if (isDedicatedStorage(localDataV2)) {
    return localDataV2;
  }

  const localData = path.resolve(runtimeCwd, 'data');
  if (fs.existsSync(localData)) {
    return localData;
  }

  // 5. Fallback to documentsDir or userDataDir
  return fs.existsSync(userDataDir) ? userDataDir : documentsDir;
}

const dataDir = resolveDataDir();

function isDedicatedStorage(dir) {
  const marker = path.join(dir, '_sistema', 'storage-layout.json');
  try {
    if (!fs.existsSync(marker)) return false;
    const parsed = JSON.parse(fs.readFileSync(marker, 'utf8'));
    return parsed && parsed.version === 2;
  } catch {
    return false;
  }
}

function getStoreDir(dir) {
  if (isDedicatedStorage(dir)) {
    return path.join(dir, '_sistema', 'indices');
  }
  const storeSubdir = path.join(dir, 'store');
  if (fs.existsSync(storeSubdir)) {
    return storeSubdir;
  }
  return dir;
}

function getNotesDir(dir) {
  if (isDedicatedStorage(dir)) {
    return path.join(dir, 'Dados', 'Notas');
  }
  const notesSubdir = path.join(dir, 'notes');
  if (fs.existsSync(notesSubdir)) {
    return notesSubdir;
  }
  return path.join(dir, 'notes');
}

function touchSyncFlag() {
  try {
    const candidateDirs = [
      path.join(dataDir, 'store'),
      path.join(dataDir, '_sistema', 'indices'),
      dataDir
    ];
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        const flagPath = path.join(d, '.cli-sync-flag');
        fs.writeFileSync(flagPath, Date.now().toString(), 'utf8');
      }
    }
  } catch (err) {
    // Non-blocking sync error
  }
}

function readSection(sectionFileName, defaultVal) {
  const storeFolder = getStoreDir(dataDir);
  const filePath = path.join(storeFolder, sectionFileName);

  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return defaultVal;
    }
  }

  // Fallback: check unified store.json
  const unifiedPath = path.join(dataDir, 'store.json');
  if (fs.existsSync(unifiedPath)) {
    try {
      const full = JSON.parse(fs.readFileSync(unifiedPath, 'utf8'));
      return full;
    } catch {
      return defaultVal;
    }
  }

  return defaultVal;
}

function writeSection(sectionFileName, data) {
  const storeFolder = getStoreDir(dataDir);
  if (!fs.existsSync(storeFolder)) {
    fs.mkdirSync(storeFolder, { recursive: true });
  }

  const filePath = path.join(storeFolder, sectionFileName);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);

  // Synchronize with unified store.json if present
  const unifiedPaths = [
    path.join(storeFolder, 'store.json'),
    path.join(dataDir, 'store.json')
  ];
  for (const up of unifiedPaths) {
    if (fs.existsSync(up)) {
      try {
        const fullStore = JSON.parse(fs.readFileSync(up, 'utf8'));
        if (typeof data === 'object' && data !== null) {
          Object.assign(fullStore, data);
        }
        fullStore.storeUpdatedAt = new Date().toISOString();
        const tmpUnified = `${up}.tmp`;
        fs.writeFileSync(tmpUnified, JSON.stringify(fullStore, null, 2), 'utf8');
        fs.renameSync(tmpUnified, up);
      } catch {
        // Ignore unified store update error
      }
    }
  }

  touchSyncFlag();
  return true;
}

function getStoreData() {
  const unifiedPaths = [
    path.join(getStoreDir(dataDir), 'store.json'),
    path.join(dataDir, 'store.json')
  ];
  for (const up of unifiedPaths) {
    if (fs.existsSync(up)) {
      try {
        return JSON.parse(fs.readFileSync(up, 'utf8'));
      } catch {
        // Ignore JSON parse error
      }
    }
  }
  return {};
}

function saveStoreData(data) {
  const storeFolder = getStoreDir(dataDir);
  if (!fs.existsSync(storeFolder)) {
    fs.mkdirSync(storeFolder, { recursive: true });
  }
  const unifiedPaths = [
    path.join(storeFolder, 'store.json'),
    path.join(dataDir, 'store.json')
  ];
  for (const up of unifiedPaths) {
    if (fs.existsSync(up)) {
      try {
        const tmp = `${up}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmp, up);
      } catch {
        // Ignore error
      }
    }
  }
  return true;
}

// -------------------------------------------------------------
// SECTION HELPERS: PLANNING (Tasks & Sprints)
// -------------------------------------------------------------

function getPlanningData() {
  const raw = readSection('planning.json', { cards: [], projectSprints: [] });
  return {
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    projectSprints: Array.isArray(raw.projectSprints) ? raw.projectSprints : []
  };
}

function savePlanningData(planning) {
  return writeSection('planning.json', planning);
}

// -------------------------------------------------------------
// SECTION HELPERS: NOTES
// -------------------------------------------------------------

function getNotesData() {
  let raw = readSection('notes.json', { noteFolders: [], notes: [] });
  if ((!raw.notes || raw.notes.length === 0)) {
    const store = getStoreData();
    if (store.notes && store.notes.length > 0) {
      raw = { noteFolders: store.noteFolders || [], notes: store.notes };
      writeSection('notes.json', raw);
    }
  }
  return {
    noteFolders: Array.isArray(raw.noteFolders) ? raw.noteFolders : [],
    notes: Array.isArray(raw.notes) ? raw.notes : []
  };
}

function saveNotesData(notesObj) {
  const normalized = {
    noteFolders: Array.isArray(notesObj?.noteFolders) ? notesObj.noteFolders : [],
    notes: Array.isArray(notesObj?.notes) ? notesObj.notes : []
  };
  const store = getStoreData();
  store.noteFolders = normalized.noteFolders;
  store.notes = normalized.notes;
  saveStoreData(store);
  return writeSection('notes.json', normalized);
}

function readNoteContent(note) {
  if (!note || !note.mdPath) return '';
  const notesDir = getNotesDir(dataDir);
  const filePath = path.join(notesDir, note.mdPath);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function writeNoteContent(mdPath, content) {
  const notesDir = getNotesDir(dataDir);
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  const filePath = path.join(notesDir, mdPath);
  fs.writeFileSync(filePath, content || '', 'utf8');
  return true;
}

function deleteNoteFile(mdPath) {
  if (!mdPath) return false;
  const notesDir = getNotesDir(dataDir);
  const filePath = path.join(notesDir, mdPath);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// -------------------------------------------------------------
// SECTION HELPERS: PROJECTS
// -------------------------------------------------------------

function getProjectsData() {
  const raw = readSection('projects.json', { projects: [], registeredIDEs: [] });
  return {
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    registeredIDEs: Array.isArray(raw.registeredIDEs) ? raw.registeredIDEs : []
  };
}

function saveProjectsData(data) {
  return writeSection('projects.json', data);
}

// -------------------------------------------------------------
// SECTION HELPERS: HABITS
// -------------------------------------------------------------

function getHabitsData() {
  const raw = readSection('habits.json', { habits: [], habitEntries: [] });
  return {
    habits: Array.isArray(raw.habits) ? raw.habits : [],
    habitEntries: Array.isArray(raw.habitEntries) ? raw.habitEntries : []
  };
}

function saveHabitsData(data) {
  return writeSection('habits.json', data);
}

// -------------------------------------------------------------
// SYSTEM STATUS
// -------------------------------------------------------------

function getSystemStatus() {
  const planning = getPlanningData();
  const notes = getNotesData();
  const projects = getProjectsData();
  const habits = getHabitsData();

  const todoTasks = planning.cards.filter(c => c.status !== 'done' && c.status !== 'archived').length;
  const doneTasks = planning.cards.filter(c => c.status === 'done').length;

  return {
    app: 'Organon',
    version: '6.23.2',
    dataDir,
    isDedicatedStorage: isDedicatedStorage(dataDir),
    storageLayout: isDedicatedStorage(dataDir) ? 'v2-dedicated' : 'v1-standard',
    counts: {
      totalTasks: planning.cards.length,
      pendingTasks: todoTasks,
      completedTasks: doneTasks,
      sprints: planning.projectSprints.length,
      notes: notes.notes.length,
      noteFolders: notes.noteFolders.length,
      projects: projects.projects.length,
      habits: habits.habits.length
    }
  };
}

module.exports = {
  dataDir,
  resolveDataDir,
  isDedicatedStorage,
  getStoreDir,
  getNotesDir,
  touchSyncFlag,
  getPlanningData,
  savePlanningData,
  getNotesData,
  saveNotesData,
  readNoteContent,
  writeNoteContent,
  deleteNoteFile,
  getProjectsData,
  saveProjectsData,
  getHabitsData,
  saveHabitsData,
  getStoreData,
  saveStoreData,
  getSystemStatus,
  randomUUID
};
