const fs = require('fs');
const path = require('path');
const os = require('os');
const { createHash, randomUUID } = require('crypto');

const EXPECTED_REVISION = Symbol('organonExpectedRevision');
const SECTION_FILES = [
  'meta.json',
  'planning.json',
  'calendar.json',
  'shortcuts.json',
  'projects.json',
  'notes.json',
  'colors.json',
  'clipboard.json',
  'apps.json',
  'financial.json',
  'today.json',
  'meetings.json',
  'study.json',
  'sync.json',
  'canvas.json',
  'settings.json'
];

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

let generationEngine;

function getGenerationEngine() {
  if (generationEngine !== undefined) return generationEngine;
  const modulePath = path.resolve(__dirname, '../../dist/main/storage/generationStore.js');
  try {
    generationEngine = fs.existsSync(modulePath) ? require(modulePath) : null;
  } catch {
    generationEngine = null;
  }
  return generationEngine;
}

function attachRevision(value, revision) {
  if (value && typeof value === 'object') {
    Object.defineProperty(value, EXPECTED_REVISION, {
      configurable: true,
      enumerable: false,
      value: revision,
      writable: true
    });
  }
  return value;
}

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
  return path.join(dir, 'store');
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

function readJson(filePath) {
  try {
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : null;
  } catch {
    return null;
  }
}

function readLegacyStoreData() {
  const storeFolder = getStoreDir(dataDir);
  const merged = {};
  const unifiedPaths = [path.join(dataDir, 'store.json'), path.join(storeFolder, 'store.json')];
  for (const unifiedPath of [...new Set(unifiedPaths)]) {
    const parsed = readJson(unifiedPath);
    if (parsed && typeof parsed === 'object') Object.assign(merged, parsed);
  }
  for (const sectionDir of [...new Set([dataDir, storeFolder])]) {
    for (const sectionFileName of SECTION_FILES) {
      const parsed = readJson(path.join(sectionDir, sectionFileName));
      if (parsed && typeof parsed === 'object') Object.assign(merged, parsed);
    }
  }
  return merged;
}

function getStoreSnapshot() {
  const engine = getGenerationEngine();
  const committed = engine?.loadCommittedGeneration(dataDir);
  if (committed) return { store: committed.store, revision: committed.revision };
  return { store: readLegacyStoreData(), revision: 0 };
}

function readSection(_sectionFileName, defaultVal) {
  const snapshot = getStoreSnapshot();
  const hasData = snapshot.store && Object.keys(snapshot.store).length > 0;
  return attachRevision(hasData ? snapshot.store : defaultVal, snapshot.revision);
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function mirrorCommittedStore(fullStore, sectionFileName, sectionData) {
  const storeFolder = getStoreDir(dataDir);
  fs.mkdirSync(storeFolder, { recursive: true });
  writeJsonAtomic(path.join(storeFolder, sectionFileName), sectionData);

  const canonicalPaths = isDedicatedStorage(dataDir)
    ? [path.join(storeFolder, 'store.json')]
    : [path.join(dataDir, 'store.json'), path.join(storeFolder, 'store.json')];
  for (const canonicalPath of [...new Set(canonicalPaths)]) writeJsonAtomic(canonicalPath, fullStore);
}

function commitStoreData(nextStore, expectedRevision, sectionFileName, sectionData, source = 'cli') {
  const engine = getGenerationEngine();
  if (!engine) {
    throw new Error('Build transacional ausente; execute npm run build antes de usar a CLI.');
  }

  const result = engine.commitStoreGeneration(nextStore, dataDir, {
    source,
    expectedRevision
  });
  if (!result.success) throw new Error(result.error || 'Commit transacional da CLI foi rejeitado.');
  const committed = engine.loadCommittedGeneration(dataDir);
  if (!committed || committed.revision !== result.revision) {
    throw new Error('A CLI nao conseguiu reler a geracao publicada.');
  }
  try {
    mirrorCommittedStore(committed.store, sectionFileName, sectionData);
    touchSyncFlag();
  } catch (error) {
    process.stderr.write(`[Organon CLI] Commit publicado; espelho legado pendente: ${error.message}\n`);
  }
  return true;
}

function commitStoreSnapshot(nextStore, options = {}) {
  const expectedRevision = Number.isSafeInteger(options.expectedRevision)
    ? options.expectedRevision
    : getStoreSnapshot().revision;
  commitStoreData(nextStore, expectedRevision, 'store.json', nextStore, options.source || 'cli');
  const committed = getStoreSnapshot();
  return {
    revision: committed.revision,
    rootId: getGenerationEngine()?.getStorageRootId(dataDir) || null,
    store: committed.store
  };
}

function writeSection(sectionFileName, data) {
  const snapshot = getStoreSnapshot();
  const expectedRevision = Number.isSafeInteger(data?.[EXPECTED_REVISION])
    ? data[EXPECTED_REVISION]
    : snapshot.revision;
  if (expectedRevision !== snapshot.revision) {
    throw new Error(`Conflito de revisao: esperado ${expectedRevision}, atual ${snapshot.revision}.`);
  }

  const nextStore = {
    ...snapshot.store,
    ...(data && typeof data === 'object' ? data : {}),
    storeUpdatedAt: new Date().toISOString()
  };
  return commitStoreData(nextStore, expectedRevision, sectionFileName, data);
}

function getStoreData() {
  const snapshot = getStoreSnapshot();
  return attachRevision(snapshot.store, snapshot.revision);
}

function saveStoreData(data) {
  const snapshot = getStoreSnapshot();
  const expectedRevision = Number.isSafeInteger(data?.[EXPECTED_REVISION])
    ? data[EXPECTED_REVISION]
    : snapshot.revision;
  if (expectedRevision !== snapshot.revision) {
    throw new Error(`Conflito de revisao: esperado ${expectedRevision}, atual ${snapshot.revision}.`);
  }
  return commitStoreData(data, expectedRevision, 'store.json', data);
}

// -------------------------------------------------------------
// SECTION HELPERS: PLANNING (Tasks & Sprints)
// -------------------------------------------------------------

function getPlanningData() {
  const raw = readSection('planning.json', { cards: [], projectSprints: [] });
  return attachRevision({
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    projectSprints: Array.isArray(raw.projectSprints) ? raw.projectSprints : []
  }, raw[EXPECTED_REVISION] ?? 0);
}

function savePlanningData(planning) {
  return writeSection('planning.json', planning);
}

// -------------------------------------------------------------
// SECTION HELPERS: NOTES
// -------------------------------------------------------------

function getNotesData() {
  let raw = readSection('notes.json', { noteFolders: [], notes: [] });
  let revision = raw[EXPECTED_REVISION] ?? 0;
  if ((!raw.notes || raw.notes.length === 0)) {
    const store = getStoreData();
    if (store.notes && store.notes.length > 0) {
      raw = { noteFolders: store.noteFolders || [], notes: store.notes };
      revision = store[EXPECTED_REVISION] ?? revision;
    }
  }
  return attachRevision({
    noteFolders: Array.isArray(raw.noteFolders) ? raw.noteFolders : [],
    notes: Array.isArray(raw.notes) ? raw.notes : []
  }, revision);
}

function saveNotesData(notesObj) {
  const normalized = {
    noteFolders: Array.isArray(notesObj?.noteFolders) ? notesObj.noteFolders : [],
    notes: Array.isArray(notesObj?.notes) ? notesObj.notes : []
  };
  attachRevision(normalized, notesObj?.[EXPECTED_REVISION] ?? 0);
  return writeSection('notes.json', normalized);
}

function readNoteContent(note) {
  if (!note || !note.mdPath) return '';
  const filePath = resolveNoteFile(note.mdPath);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return '';
    }
  }
  return '';
}

function resolveNoteFile(mdPath) {
  if (typeof mdPath !== 'string' || !mdPath.trim()) {
    throw new Error('Caminho de nota invalido.');
  }
  const notesDir = path.resolve(getNotesDir(dataDir));
  const filePath = path.resolve(notesDir, mdPath.replace(/^[\\/]+/, ''));
  const prefix = `${notesDir}${path.sep}`;
  if (!filePath.startsWith(prefix)) {
    throw new Error('Caminho de nota fora do cofre.');
  }
  return filePath;
}

function writeNoteContent(mdPath, content) {
  const filePath = resolveNoteFile(mdPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(tmpPath, content || '', 'utf8');
  const backupPath = `${filePath}.${process.pid}.${randomUUID()}.bak`;
  try {
    if (fs.existsSync(filePath)) fs.renameSync(filePath, backupPath);
    fs.renameSync(tmpPath, filePath);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* preserva erro original */ }
    try { if (!fs.existsSync(filePath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, filePath); } catch { /* preserva erro original */ }
    throw error;
  }
  return true;
}

function writeNoteVersion(mdPath, content) {
  const normalizedPath = String(mdPath || '').replace(/\\/g, '/');
  const parsed = path.posix.parse(normalizedPath);
  if (!parsed.base || parsed.dir.split('/').includes('..')) throw new Error('Caminho de nota invalido.');
  const stem = parsed.name.replace(/--v-[0-9a-f]{12}$/i, '');
  const hash = createHash('sha256').update(content || '').digest('hex').slice(0, 12);
  const versionedPath = path.posix.join(parsed.dir, `${stem}--v-${hash}.md`);
  writeNoteContent(versionedPath, content);
  return versionedPath;
}

function deleteNoteFile(mdPath) {
  if (!mdPath) return false;
  const filePath = resolveNoteFile(mdPath);
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
  return attachRevision({
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    registeredIDEs: Array.isArray(raw.registeredIDEs) ? raw.registeredIDEs : []
  }, raw[EXPECTED_REVISION] ?? 0);
}

function saveProjectsData(data) {
  return writeSection('projects.json', data);
}

// -------------------------------------------------------------
// SECTION HELPERS: HABITS
// -------------------------------------------------------------

function getHabitsData() {
  const raw = readSection('habits.json', { habits: [], habitEntries: [] });
  return attachRevision({
    habits: Array.isArray(raw.habits) ? raw.habits : [],
    habitEntries: Array.isArray(raw.habitEntries) ? raw.habitEntries : []
  }, raw[EXPECTED_REVISION] ?? 0);
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
  const engine = getGenerationEngine();
  const snapshot = getStoreSnapshot();
  const packageVersion = require('../../package.json').version;

  const todoTasks = planning.cards.filter(c => c.status !== 'done' && c.status !== 'archived').length;
  const doneTasks = planning.cards.filter(c => c.status === 'done').length;

  return {
    app: 'Organon',
    version: packageVersion,
    dataDir,
    rootId: engine?.getStorageRootId(dataDir) || null,
    revision: snapshot.revision,
    transactional: Boolean(engine),
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
  writeNoteVersion,
  deleteNoteFile,
  getProjectsData,
  saveProjectsData,
  getHabitsData,
  saveHabitsData,
  getStoreData,
  getStoreSnapshot,
  saveStoreData,
  commitStoreSnapshot,
  getSystemStatus,
  randomUUID
};
