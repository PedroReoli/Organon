const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');

/**
 * Organon CLI Data Store Manager
 * Locates the active data directory and provides atomic CRUD operations for all sections.
 */

function resolveDataDir() {
  // 1. Explicit environment variable
  if (process.env.ORGANON_DATA_DIR && fs.existsSync(process.env.ORGANON_DATA_DIR)) {
    return path.resolve(process.env.ORGANON_DATA_DIR);
  }

  // 2. Electron userData config.json
  const userDataDir = os.platform() === 'win32'
    ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Organon')
    : os.platform() === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support', 'Organon')
      : path.join(os.homedir(), '.config', 'Organon');

  const configPath = path.join(userDataDir, 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.dataDir && fs.existsSync(config.dataDir)) {
        return path.resolve(config.dataDir);
      }
    } catch {
      // Ignore config parse error
    }
  }

  // 3. Dedicated v2 Storage in Documents/Organon
  const documentsDir = path.join(os.homedir(), 'Documents', 'Organon');
  if (fs.existsSync(documentsDir)) {
    return documentsDir;
  }

  // 4. Local workspace relative dirs (dev environment)
  const localDataV2 = path.resolve(process.cwd(), 'data-v2');
  if (fs.existsSync(localDataV2)) {
    return localDataV2;
  }

  const localData = path.resolve(process.cwd(), 'data');
  if (fs.existsSync(localData)) {
    return localData;
  }

  // 5. Fallback to documentsDir or userDataDir
  return fs.existsSync(userDataDir) ? userDataDir : documentsDir;
}

const dataDir = resolveDataDir();

function isDedicatedStorage(dir) {
  const marker = path.join(dir, '_sistema', 'storage-layout.json');
  return fs.existsSync(marker);
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

  touchSyncFlag();
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
  const raw = readSection('notes.json', { noteFolders: [], notes: [] });
  return {
    noteFolders: Array.isArray(raw.noteFolders) ? raw.noteFolders : [],
    notes: Array.isArray(raw.notes) ? raw.notes : []
  };
}

function saveNotesData(notesObj) {
  return writeSection('notes.json', notesObj);
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
  getStoreDir,
  getNotesDir,
  touchSyncFlag,
  getPlanningData,
  savePlanningData,
  getNotesData,
  saveNotesData,
  readNoteContent,
  writeNoteContent,
  getProjectsData,
  saveProjectsData,
  getHabitsData,
  saveHabitsData,
  getSystemStatus,
  randomUUID
};
