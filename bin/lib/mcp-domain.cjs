const fs = require('fs');
const path = require('path');
const { createHash, randomUUID } = require('crypto');

const store = require('./store.cjs');

const MAX_OPERATIONS = 50;
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const MAX_NOTE_BYTES = 512 * 1024;
const CHECKPOINT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

class McpDomainError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'McpDomainError';
    this.code = code;
    this.details = details;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const backupPath = `${filePath}.${process.pid}.${randomUUID()}.bak`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf8');
  try {
    if (fs.existsSync(filePath)) fs.renameSync(filePath, backupPath);
    fs.renameSync(tmpPath, filePath);
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* preserva erro original */ }
    try { if (!fs.existsSync(filePath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, filePath); } catch { /* preserva erro original */ }
    throw error;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getControlDir() {
  return path.join(store.dataDir, '_sistema', 'mcp');
}

function getRequestPath(requestId) {
  return path.join(getControlDir(), 'idempotency', `${sha256(requestId)}.json`);
}

function getCheckpointPath(checkpointId) {
  return path.join(getControlDir(), 'checkpoints', `${checkpointId}.json`);
}

function appendAudit(event) {
  const auditPath = path.join(getControlDir(), 'audit.jsonl');
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.appendFileSync(auditPath, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`, 'utf8');
}

function validateRequestId(requestId) {
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9._:-]{8,128}$/.test(requestId)) {
    throw new McpDomainError('INVALID_REQUEST_ID', 'requestId deve ter de 8 a 128 caracteres seguros.');
  }
}

function findCommittedRevisionBySource(source) {
  const transactionsDir = path.join(store.dataDir, '_sistema', 'transactions');
  try {
    const entries = fs.readdirSync(transactionsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const record = readJson(path.join(transactionsDir, entry.name, 'transaction.json'));
      if (record?.status === 'committed' && record.source === source && Number.isSafeInteger(record.revision)) {
        return record.revision;
      }
    }
  } catch {
    // A ausência do journal significa apenas que não há commit recuperável.
  }
  return null;
}

function getIdempotentResult(requestId, source) {
  const requestPath = getRequestPath(requestId);
  const record = readJson(requestPath);
  if (!record) return null;
  if (record.status === 'committed' && record.result) return { ...record.result, replayed: true };

  if (record.status === 'pending' && record.result) {
    const committedRevision = findCommittedRevisionBySource(source);
    if (committedRevision !== null) {
      const result = { ...record.result, revision: committedRevision };
      writeJsonAtomic(requestPath, { ...record, status: 'committed', committedAt: new Date().toISOString(), result });
      return { ...result, replayed: true, recovered: true };
    }
  }
  return null;
}

function normalizePriority(value) {
  const raw = String(value || 'P3').toLowerCase();
  if (raw === 'urgent' || raw === 'p1' || raw === '1') return 'P1';
  if (raw === 'high' || raw === 'p2' || raw === '2') return 'P2';
  if (raw === 'medium' || raw === 'normal' || raw === 'p3' || raw === '3') return 'P3';
  if (raw === 'low' || raw === 'p4' || raw === '4') return 'P4';
  throw new McpDomainError('INVALID_PRIORITY', `Prioridade inválida: ${value}`);
}

function safeTitle(value, fallback = 'nota') {
  const normalized = String(value || fallback)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function resolveReferences(value, results) {
  if (typeof value === 'string') {
    const match = /^\$([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_.-]+)$/.exec(value);
    if (!match) return value;
    const source = results[match[1]];
    if (!source) throw new McpDomainError('UNKNOWN_REFERENCE', `Referência desconhecida: ${value}`);
    const resolved = match[2].split('.').reduce((current, key) => current?.[key], source);
    if (resolved === undefined) throw new McpDomainError('UNKNOWN_REFERENCE', `Campo de referência inexistente: ${value}`);
    return resolved;
  }
  if (Array.isArray(value)) return value.map(item => resolveReferences(item, results));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveReferences(item, results)]));
  }
  return value;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpDomainError('INVALID_OPERATION', `${label} deve ser um objeto.`);
  }
  return value;
}

function findById(items, id, kind) {
  const entity = items.find(item => item.id === id);
  if (!entity) throw new McpDomainError('NOT_FOUND', `${kind} não encontrado: ${id}`);
  return entity;
}

function setTouched(touched, collection, id) {
  if (!touched[collection].includes(id)) touched[collection].push(id);
}

function planOperation(nextStore, operation, results, stagedNotes, touched) {
  const input = resolveReferences(requireObject(operation.input || {}, `input de ${operation.opId}`), results);
  const now = new Date().toISOString();
  nextStore.cards = Array.isArray(nextStore.cards) ? nextStore.cards : [];
  nextStore.notes = Array.isArray(nextStore.notes) ? nextStore.notes : [];
  nextStore.noteFolders = Array.isArray(nextStore.noteFolders) ? nextStore.noteFolders : [];

  switch (operation.kind) {
    case 'task.create': {
      if (typeof input.title !== 'string' || !input.title.trim()) {
        throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: title é obrigatório.`);
      }
      const id = randomUUID();
      const task = {
        id,
        title: input.title.trim(),
        description: input.description || '',
        descriptionHtml: input.descriptionHtml || input.description || '',
        date: input.date || null,
        time: input.time || null,
        durationMinutes: Number.isFinite(Number(input.durationMinutes)) ? Number(input.durationMinutes) : 30,
        priority: normalizePriority(input.priority),
        projectId: input.projectId || null,
        sprintId: input.sprintId || null,
        tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
        hasDate: Boolean(input.date),
        createdAt: now,
        updatedAt: now,
        status: input.status || 'todo',
        location: input.location || { day: null, period: null },
        reminder: input.reminder || null,
        order: Number.isFinite(Number(input.order)) ? Number(input.order) : Date.now(),
        isLocked: false,
      };
      nextStore.cards.push(task);
      setTouched(touched, 'cards', id);
      return { id, entity: 'task', title: task.title };
    }

    case 'task.update': {
      if (typeof input.id !== 'string') throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: id é obrigatório.`);
      const task = findById(nextStore.cards, input.id, 'Tarefa');
      const allowed = ['title', 'description', 'descriptionHtml', 'date', 'time', 'durationMinutes', 'projectId', 'sprintId', 'tags', 'status', 'location', 'reminder', 'order'];
      for (const key of allowed) if (input[key] !== undefined) task[key] = input[key];
      if (input.priority !== undefined) task.priority = normalizePriority(input.priority);
      if (input.date !== undefined) task.hasDate = Boolean(input.date);
      task.updatedAt = now;
      setTouched(touched, 'cards', task.id);
      return { id: task.id, entity: 'task', title: task.title };
    }

    case 'task.delete': {
      if (typeof input.id !== 'string') throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: id é obrigatório.`);
      const task = findById(nextStore.cards, input.id, 'Tarefa');
      nextStore.cards = nextStore.cards.filter(item => item.id !== task.id);
      setTouched(touched, 'cards', task.id);
      return { id: task.id, entity: 'task', deleted: true, title: task.title };
    }

    case 'note.create': {
      if (typeof input.title !== 'string' || !input.title.trim()) {
        throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: title é obrigatório.`);
      }
      const content = String(input.content || `# ${input.title.trim()}\n\n`);
      if (Buffer.byteLength(content, 'utf8') > MAX_NOTE_BYTES) {
        throw new McpDomainError('PAYLOAD_TOO_LARGE', `${operation.opId}: conteúdo da nota excede ${MAX_NOTE_BYTES} bytes.`);
      }
      const id = randomUUID();
      const mdPath = `mcp/${safeTitle(input.title)}--${id}.md`;
      const note = {
        id,
        title: input.title.trim(),
        mdPath,
        folderId: input.folderId || null,
        tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
        isLocked: false,
        isPinned: Boolean(input.isPinned),
        isFavorite: Boolean(input.isFavorite),
        order: nextStore.notes.length,
        createdAt: now,
        updatedAt: now,
      };
      nextStore.notes.push(note);
      stagedNotes.push({ mdPath, content });
      setTouched(touched, 'notes', id);
      return { id, entity: 'note', title: note.title, mdPath };
    }

    case 'note.update':
    case 'note.append': {
      if (typeof input.id !== 'string') throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: id é obrigatório.`);
      const note = findById(nextStore.notes, input.id, 'Nota');
      if (input.title !== undefined) {
        if (typeof input.title !== 'string' || !input.title.trim()) throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: title inválido.`);
        note.title = input.title.trim();
      }
      if (input.content !== undefined || input.append !== undefined || operation.kind === 'note.append') {
        const pendingContent = [...stagedNotes].reverse().find(item => item.mdPath === note.mdPath)?.content;
        const currentContent = pendingContent === undefined ? store.readNoteContent(note) : pendingContent;
        const addition = input.append ?? input.content ?? '';
        const content = operation.kind === 'note.append' || input.append !== undefined
          ? `${currentContent.trimEnd()}\n\n${String(addition)}\n`
          : String(input.content);
        if (Buffer.byteLength(content, 'utf8') > MAX_NOTE_BYTES) {
          throw new McpDomainError('PAYLOAD_TOO_LARGE', `${operation.opId}: conteúdo da nota excede ${MAX_NOTE_BYTES} bytes.`);
        }
        const mdPath = `mcp/${safeTitle(note.title)}--${note.id}-${randomUUID().slice(0, 8)}.md`;
        stagedNotes.push({ mdPath, content });
        note.mdPath = mdPath;
      }
      note.updatedAt = now;
      setTouched(touched, 'notes', note.id);
      return { id: note.id, entity: 'note', title: note.title, mdPath: note.mdPath };
    }

    case 'note.metadata': {
      if (typeof input.id !== 'string') throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: id é obrigatório.`);
      const note = findById(nextStore.notes, input.id, 'Nota');
      const allowed = ['folderId', 'tags', 'isPinned', 'isFavorite', 'isLocked', 'icon', 'cover'];
      for (const key of allowed) if (input[key] !== undefined) note[key] = input[key];
      note.updatedAt = now;
      setTouched(touched, 'notes', note.id);
      return { id: note.id, entity: 'note', title: note.title };
    }

    case 'folder.create': {
      if (typeof input.name !== 'string' || !input.name.trim()) {
        throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: name é obrigatório.`);
      }
      const id = randomUUID();
      const folder = {
        id,
        name: input.name.trim(),
        parentId: input.parentId || null,
        order: nextStore.noteFolders.length,
        isHome: false,
      };
      nextStore.noteFolders.push(folder);
      setTouched(touched, 'folders', id);
      return { id, entity: 'folder', name: folder.name };
    }

    default:
      throw new McpDomainError('UNSUPPORTED_OPERATION', `Operação não suportada: ${operation.kind}`);
  }
}

function validateOperations(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new McpDomainError('INVALID_BATCH', 'operations deve conter ao menos uma operação.');
  }
  if (operations.length > MAX_OPERATIONS) {
    throw new McpDomainError('BATCH_LIMIT', `O lote aceita no máximo ${MAX_OPERATIONS} operações.`);
  }
  const seen = new Set();
  for (const operation of operations) {
    if (!operation || typeof operation !== 'object') throw new McpDomainError('INVALID_OPERATION', 'Operação inválida.');
    if (typeof operation.opId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(operation.opId)) {
      throw new McpDomainError('INVALID_OPERATION', 'Cada operação precisa de opId seguro e único.');
    }
    if (seen.has(operation.opId)) throw new McpDomainError('INVALID_OPERATION', `opId duplicado: ${operation.opId}`);
    seen.add(operation.opId);
    if (typeof operation.kind !== 'string') throw new McpDomainError('INVALID_OPERATION', `${operation.opId}: kind é obrigatório.`);
  }
}

function pruneCheckpoints() {
  const checkpointsDir = path.join(getControlDir(), 'checkpoints');
  try {
    const now = Date.now();
    for (const entry of fs.readdirSync(checkpointsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const filePath = path.join(checkpointsDir, entry.name);
      const checkpoint = readJson(filePath);
      const expiresAt = Date.parse(checkpoint?.expiresAt || '');
      if (Number.isFinite(expiresAt) && expiresAt < now) fs.unlinkSync(filePath);
    }
  } catch {
    // Retenção não interfere no commit atual.
  }
}

function createCheckpoint(snapshot, metadata = {}) {
  const checkpointId = `checkpoint_${randomUUID()}`;
  const createdAt = new Date();
  const checkpoint = {
    version: 1,
    checkpointId,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + CHECKPOINT_RETENTION_MS).toISOString(),
    revisionBefore: snapshot.revision,
    revisionAfter: null,
    status: 'prepared',
    touched: metadata.touched || { cards: [], notes: [], folders: [] },
    requestId: metadata.requestId || null,
    source: metadata.source || 'mcp',
    store: snapshot.store,
  };
  writeJsonAtomic(getCheckpointPath(checkpointId), checkpoint);
  return checkpoint;
}

function handleBatchMutate(args = {}) {
  validateRequestId(args.requestId);
  if (Buffer.byteLength(JSON.stringify(args), 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new McpDomainError('PAYLOAD_TOO_LARGE', `Payload excede ${MAX_PAYLOAD_BYTES} bytes.`);
  }
  validateOperations(args.operations);
  const source = `mcp-batch:${args.requestId}`;
  const replay = getIdempotentResult(args.requestId, source);
  if (replay) return replay;

  const snapshot = store.getStoreSnapshot();
  if (!Number.isSafeInteger(args.expectedRevision)) {
    throw new McpDomainError('EXPECTED_REVISION_REQUIRED', 'expectedRevision inteiro é obrigatório.');
  }
  if (args.expectedRevision !== snapshot.revision) {
    throw new McpDomainError('REVISION_CONFLICT', `Conflito de revisão: esperado ${args.expectedRevision}, atual ${snapshot.revision}.`, {
      expectedRevision: args.expectedRevision,
      currentRevision: snapshot.revision,
    });
  }

  const nextStore = clone(snapshot.store);
  const results = {};
  const stagedNotes = [];
  const touched = { cards: [], notes: [], folders: [] };
  for (const operation of args.operations) {
    results[operation.opId] = planOperation(nextStore, operation, results, stagedNotes, touched);
  }
  nextStore.storeUpdatedAt = new Date().toISOString();

  const preview = {
    requestId: args.requestId,
    dryRun: Boolean(args.dryRun),
    revisionBefore: snapshot.revision,
    revision: snapshot.revision,
    operationCount: args.operations.length,
    results,
    touched,
    sidecars: stagedNotes.map(note => note.mdPath),
  };
  if (args.dryRun) return preview;

  const checkpoint = createCheckpoint(snapshot, { touched, requestId: args.requestId, source });
  const requestPath = getRequestPath(args.requestId);
  const provisionalResult = { ...preview, dryRun: false, checkpointId: checkpoint.checkpointId };
  writeJsonAtomic(requestPath, {
    version: 1,
    requestId: args.requestId,
    source,
    status: 'pending',
    createdAt: new Date().toISOString(),
    result: provisionalResult,
  });

  const writtenNotes = [];
  try {
    for (const note of stagedNotes) {
      store.writeNoteContent(note.mdPath, note.content);
      writtenNotes.push(note.mdPath);
    }
    const committed = store.commitStoreSnapshot(nextStore, {
      expectedRevision: snapshot.revision,
      source,
    });
    const result = { ...provisionalResult, revision: committed.revision };
    writeJsonAtomic(getCheckpointPath(checkpoint.checkpointId), {
      ...checkpoint,
      status: 'committed',
      revisionAfter: committed.revision,
    });
    writeJsonAtomic(requestPath, {
      version: 1,
      requestId: args.requestId,
      source,
      status: 'committed',
      createdAt: new Date().toISOString(),
      committedAt: new Date().toISOString(),
      result,
    });
    appendAudit({ type: 'batch', requestId: args.requestId, checkpointId: checkpoint.checkpointId, revisionBefore: snapshot.revision, revisionAfter: committed.revision, touched });
    pruneCheckpoints();
    return result;
  } catch (error) {
    const committedRevision = findCommittedRevisionBySource(source);
    if (committedRevision !== null) {
      const result = { ...provisionalResult, revision: committedRevision, recovered: true };
      writeJsonAtomic(requestPath, {
        version: 1,
        requestId: args.requestId,
        source,
        status: 'committed',
        committedAt: new Date().toISOString(),
        result,
      });
      return result;
    }
    for (const mdPath of writtenNotes) {
      try { store.deleteNoteFile(mdPath); } catch { /* arquivo órfão é seguro e não referenciado */ }
    }
    try { fs.unlinkSync(getCheckpointPath(checkpoint.checkpointId)); } catch { /* nenhum checkpoint foi anunciado */ }
    try { fs.unlinkSync(requestPath); } catch { /* permite retry limpo */ }
    throw error;
  }
}

function restoreTouchedCollections(currentStore, checkpoint) {
  const nextStore = clone(currentStore);
  const before = checkpoint.store;
  const mappings = [
    ['cards', checkpoint.touched?.cards || []],
    ['notes', checkpoint.touched?.notes || []],
    ['noteFolders', checkpoint.touched?.folders || []],
  ];
  for (const [collection, ids] of mappings) {
    const idSet = new Set(ids);
    const current = Array.isArray(nextStore[collection]) ? nextStore[collection] : [];
    const original = Array.isArray(before[collection]) ? before[collection] : [];
    const untouched = current.filter(item => !idSet.has(item.id));
    const restored = original.filter(item => idSet.has(item.id));
    nextStore[collection] = [...untouched, ...restored];
  }
  nextStore.storeUpdatedAt = new Date().toISOString();
  return nextStore;
}

function handleUndo(args = {}) {
  validateRequestId(args.requestId);
  if (typeof args.checkpointId !== 'string' || !/^checkpoint_[0-9a-f-]{36}$/i.test(args.checkpointId)) {
    throw new McpDomainError('INVALID_CHECKPOINT', 'checkpointId inválido.');
  }
  const mode = args.mode || 'reject-if-diverged';
  if (!['reject-if-diverged', 'compensating'].includes(mode)) {
    throw new McpDomainError('INVALID_MODE', `Modo de undo inválido: ${mode}`);
  }
  const source = `mcp-undo:${args.requestId}`;
  const replay = getIdempotentResult(args.requestId, source);
  if (replay) return replay;

  const checkpoint = readJson(getCheckpointPath(args.checkpointId));
  if (!checkpoint || checkpoint.status !== 'committed') {
    throw new McpDomainError('CHECKPOINT_NOT_FOUND', `Checkpoint indisponível: ${args.checkpointId}`);
  }
  if (Date.parse(checkpoint.expiresAt) < Date.now()) {
    throw new McpDomainError('CHECKPOINT_EXPIRED', `Checkpoint expirado: ${args.checkpointId}`);
  }

  const snapshot = store.getStoreSnapshot();
  if (!Number.isSafeInteger(args.expectedCurrentRevision)) {
    throw new McpDomainError('EXPECTED_REVISION_REQUIRED', 'expectedCurrentRevision inteiro é obrigatório.');
  }
  if (args.expectedCurrentRevision !== snapshot.revision) {
    throw new McpDomainError('REVISION_CONFLICT', `Conflito de revisão: esperado ${args.expectedCurrentRevision}, atual ${snapshot.revision}.`);
  }
  const diverged = snapshot.revision !== checkpoint.revisionAfter;
  if (diverged && mode === 'reject-if-diverged') {
    throw new McpDomainError('CHECKPOINT_DIVERGED', 'O estado mudou após o checkpoint; use mode=compensating para preservar entidades não relacionadas.', {
      checkpointRevision: checkpoint.revisionAfter,
      currentRevision: snapshot.revision,
    });
  }

  const nextStore = diverged
    ? restoreTouchedCollections(snapshot.store, checkpoint)
    : clone(checkpoint.store);
  const preview = {
    requestId: args.requestId,
    checkpointId: args.checkpointId,
    mode,
    dryRun: Boolean(args.dryRun),
    diverged,
    revisionBefore: snapshot.revision,
    revision: snapshot.revision,
    touched: checkpoint.touched,
  };
  if (args.dryRun) return preview;

  const undoCheckpoint = createCheckpoint(snapshot, {
    touched: checkpoint.touched,
    requestId: args.requestId,
    source,
  });
  const requestPath = getRequestPath(args.requestId);
  const provisionalResult = { ...preview, dryRun: false, checkpointId: undoCheckpoint.checkpointId, revertedCheckpointId: args.checkpointId };
  writeJsonAtomic(requestPath, { version: 1, requestId: args.requestId, source, status: 'pending', result: provisionalResult });
  const committed = store.commitStoreSnapshot(nextStore, { expectedRevision: snapshot.revision, source });
  const result = { ...provisionalResult, revision: committed.revision };
  writeJsonAtomic(getCheckpointPath(undoCheckpoint.checkpointId), { ...undoCheckpoint, status: 'committed', revisionAfter: committed.revision });
  writeJsonAtomic(requestPath, { version: 1, requestId: args.requestId, source, status: 'committed', committedAt: new Date().toISOString(), result });
  appendAudit({ type: 'undo', requestId: args.requestId, checkpointId: args.checkpointId, undoCheckpointId: undoCheckpoint.checkpointId, revisionBefore: snapshot.revision, revisionAfter: committed.revision, mode });
  return result;
}

function fold(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function tokens(value) {
  return fold(value).match(/[a-z0-9_]{2,}/g) || [];
}

function trigrams(value) {
  const compact = `  ${fold(value).replace(/\s+/g, ' ')}  `;
  const result = new Set();
  for (let index = 0; index <= compact.length - 3; index += 1) result.add(compact.slice(index, index + 3));
  return result;
}

function jaccard(left, right) {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function buildSnippet(content, query) {
  const normalized = fold(content);
  const queryNormalized = fold(query);
  const index = normalized.indexOf(queryNormalized);
  const start = Math.max(0, (index >= 0 ? index : 0) - 100);
  return content.slice(start, start + 320).replace(/\s+/g, ' ').trim();
}

function handleNotesSearch(args = {}) {
  const query = String(args.query || '').trim();
  if (query.length < 2) throw new McpDomainError('INVALID_QUERY', 'query precisa de ao menos 2 caracteres.');
  const snapshot = store.getStoreSnapshot();
  let notes = (snapshot.store.notes || []).filter(note => !note.deletedAt && !note.isDeleted);
  if (args.folderId) notes = notes.filter(note => note.folderId === args.folderId);
  if (Array.isArray(args.tags) && args.tags.length > 0) {
    const wanted = new Set(args.tags.map(fold));
    notes = notes.filter(note => (note.tags || []).some(tag => wanted.has(fold(tag))));
  }

  const docs = notes.map(note => {
    const content = store.readNoteContent(note);
    const text = `${note.title}\n${content}`;
    const docTokens = tokens(text);
    const frequencies = new Map();
    for (const token of docTokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
    return { note, content, text, docTokens, frequencies };
  });
  const queryTokens = [...new Set(tokens(query))];
  const averageLength = docs.reduce((sum, doc) => sum + doc.docTokens.length, 0) / Math.max(1, docs.length);
  const queryTrigrams = trigrams(query);
  const scored = docs.map(doc => {
    let lexicalScore = 0;
    for (const token of queryTokens) {
      const frequency = doc.frequencies.get(token) || 0;
      if (!frequency) continue;
      const documentFrequency = docs.filter(candidate => candidate.frequencies.has(token)).length;
      const idf = Math.log(1 + (docs.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
      const denominator = frequency + 1.2 * (0.25 + 0.75 * (doc.docTokens.length / Math.max(1, averageLength)));
      lexicalScore += idf * ((frequency * 2.2) / denominator);
    }
    const semanticScore = jaccard(queryTrigrams, trigrams(doc.text));
    const titleBoost = fold(doc.note.title).includes(fold(query)) ? 1 : 0;
    return {
      noteId: doc.note.id,
      title: doc.note.title,
      folderId: doc.note.folderId || null,
      updatedAt: doc.note.updatedAt,
      lexicalScore: Number(lexicalScore.toFixed(4)),
      semanticScore: Number(semanticScore.toFixed(4)),
      score: Number((lexicalScore * 0.75 + semanticScore * 2 + titleBoost).toFixed(4)),
      snippet: buildSnippet(doc.content, query),
    };
  }).filter(item => item.score > 0).sort((left, right) => right.score - left.score);
  const limit = Math.min(100, Math.max(1, Number(args.limit) || 20));
  return { query, revision: snapshot.revision, total: scored.length, results: scored.slice(0, limit) };
}

function dateRange(args) {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(args.from || '') ? args.from : new Date().toISOString().slice(0, 10);
  const defaultTo = new Date(`${from}T12:00:00`);
  defaultTo.setDate(defaultTo.getDate() + 6);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(args.to || '') ? args.to : defaultTo.toISOString().slice(0, 10);
  if (to < from) throw new McpDomainError('INVALID_RANGE', 'to deve ser maior ou igual a from.');
  return { from, to };
}

function handleSchedulePressure(args = {}) {
  const { from, to } = dateRange(args);
  const capacityMinutes = Math.max(30, Number(args.capacityMinutesPerDay) || 480);
  const snapshot = store.getStoreSnapshot();
  const tasks = (snapshot.store.cards || []).filter(task => task.status !== 'done' && task.status !== 'archived');
  const byDate = new Map();
  for (const task of tasks) {
    if (!task.date) continue;
    if (task.date < from || task.date > to) continue;
    if (!byDate.has(task.date)) byDate.set(task.date, []);
    byDate.get(task.date).push(task);
  }
  const days = [];
  for (const [date, items] of [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    let knownMinutes = 0;
    let uncertainCount = 0;
    const timed = [];
    for (const task of items) {
      const duration = Number(task.durationMinutes);
      if (Number.isFinite(duration) && duration > 0) knownMinutes += duration;
      else uncertainCount += 1;
      if (task.time && /^\d{2}:\d{2}$/.test(task.time)) {
        const [hours, minutes] = task.time.split(':').map(Number);
        timed.push({ id: task.id, title: task.title, start: hours * 60 + minutes, end: hours * 60 + minutes + (duration > 0 ? duration : 30) });
      }
    }
    timed.sort((left, right) => left.start - right.start);
    const overlaps = [];
    for (let index = 1; index < timed.length; index += 1) {
      if (timed[index].start < timed[index - 1].end) overlaps.push([timed[index - 1].id, timed[index].id]);
    }
    const minMinutes = knownMinutes + uncertainCount * 15;
    const maxMinutes = knownMinutes + uncertainCount * 60;
    days.push({
      date,
      taskCount: items.length,
      knownMinutes,
      uncertainCount,
      loadRangeMinutes: { min: minMinutes, max: maxMinutes },
      capacityMinutes,
      utilizationRange: { min: Number((minMinutes / capacityMinutes).toFixed(2)), max: Number((maxMinutes / capacityMinutes).toFixed(2)) },
      overlaps,
      atRisk: maxMinutes > capacityMinutes || overlaps.length > 0,
    });
  }
  const undated = args.includeUndated
    ? tasks.filter(task => !task.date).map(task => ({ id: task.id, title: task.title, priority: task.priority }))
    : [];
  return { from, to, timezone: args.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, revision: snapshot.revision, days, undated };
}

function handlePendingDigest(args = {}) {
  const snapshot = store.getStoreSnapshot();
  const { from, to } = dateRange(args);
  let tasks = (snapshot.store.cards || []).filter(task => task.status !== 'done' && task.status !== 'archived');
  if (args.projectId) tasks = tasks.filter(task => task.projectId === args.projectId);
  if (args.priority) tasks = tasks.filter(task => task.priority === normalizePriority(args.priority));
  tasks = tasks.filter(task => !task.date || (task.date >= from && task.date <= to) || task.date < from);
  tasks.sort((left, right) => String(left.date || '9999').localeCompare(String(right.date || '9999')) || String(left.priority || 'P4').localeCompare(String(right.priority || 'P4')));
  const limit = Math.min(200, Math.max(1, Number(args.limit) || 50));
  const nowIso = new Date().toISOString();
  const taskItems = tasks.slice(0, limit).map(task => ({
    kind: 'task',
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId || null,
    date: task.date || null,
    overdue: Boolean(task.date && task.date < nowIso.slice(0, 10)),
    reminderAt: task.reminder?.triggerAt || null,
  }));
  const followUps = [];
  for (const meeting of snapshot.store.meetings || []) {
    const actions = meeting.actionItems || meeting.intelligenceData?.actionItems || [];
    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const text = typeof action === 'string' ? action : action.task || action.text;
      if (!text) continue;
      followUps.push({ kind: 'meeting-follow-up', id: `${meeting.id}:${index}`, meetingId: meeting.id, title: text, confirmed: Boolean(action.confirmed) });
    }
  }
  return {
    from,
    to,
    revision: snapshot.revision,
    counts: { tasks: taskItems.length, meetingFollowUps: followUps.length, overdue: taskItems.filter(item => item.overdue).length },
    items: [...taskItems, ...followUps].slice(0, limit),
  };
}

module.exports = {
  McpDomainError,
  handleBatchMutate,
  handleUndo,
  handleNotesSearch,
  handleSchedulePressure,
  handlePendingDigest,
};
