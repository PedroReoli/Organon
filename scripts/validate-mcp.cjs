const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-mcp-'));
process.env.ORGANON_DATA_DIR = root;

const store = require('../bin/lib/store.cjs');
const domain = require('../bin/lib/mcp-domain.cjs');
const mcp = require('../bin/lib/mcp.cjs');

function requestId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

try {
  const initial = store.getStoreSnapshot();
  assert.strictEqual(initial.revision, 0);

  const operations = [
    { opId: 'create-task', kind: 'task.create', input: { title: 'Preparar proposta', priority: 'high', durationMinutes: 60, date: '2026-09-30', time: '09:00' } },
    { opId: 'create-note', kind: 'note.create', input: { title: 'Reunião comercial', content: '# Reunião\n\nContexto inicial.' } },
    { opId: 'append-note', kind: 'note.append', input: { id: '$create-note.id', append: 'Tarefa: $create-task.id' } },
  ];
  const batchRequestId = requestId('batch-create');
  const preview = domain.handleBatchMutate({ requestId: batchRequestId, expectedRevision: 0, dryRun: true, operations });
  assert.strictEqual(preview.revision, 0);
  assert.strictEqual(store.getStoreSnapshot().revision, 0);

  const committed = domain.handleBatchMutate({ requestId: batchRequestId, expectedRevision: 0, operations });
  assert.strictEqual(committed.revision, 1);
  assert.ok(committed.checkpointId);
  const afterCommit = store.getStoreSnapshot();
  assert.strictEqual(afterCommit.store.cards.length, 1);
  assert.strictEqual(afterCommit.store.notes.length, 1);
  assert.match(store.readNoteContent(afterCommit.store.notes[0]), /Contexto inicial[\s\S]*Tarefa:/);

  const replay = domain.handleBatchMutate({ requestId: batchRequestId, expectedRevision: 0, operations });
  assert.strictEqual(replay.replayed, true);
  assert.strictEqual(store.getStoreSnapshot().store.cards.length, 1);

  assert.throws(
    () => domain.handleBatchMutate({ requestId: requestId('stale-revision'), expectedRevision: 0, operations: [{ opId: 'late', kind: 'task.create', input: { title: 'Não criar' } }] }),
    error => error.code === 'REVISION_CONFLICT'
  );

  const revisionBeforeReads = store.getStoreSnapshot().revision;
  const search = domain.handleNotesSearch({ query: 'contexto reunião' });
  assert.strictEqual(search.results[0].noteId, afterCommit.store.notes[0].id);
  const pressure = domain.handleSchedulePressure({ from: '2026-09-30', to: '2026-09-30' });
  assert.strictEqual(pressure.days[0].taskCount, 1);
  const digest = domain.handlePendingDigest({ from: '2026-09-29', to: '2026-10-01' });
  assert.strictEqual(digest.counts.tasks, 1);
  assert.strictEqual(store.getStoreSnapshot().revision, revisionBeforeReads);

  const taskId = afterCommit.store.cards[0].id;
  const update = domain.handleBatchMutate({
    requestId: requestId('batch-update'),
    expectedRevision: 1,
    operations: [{ opId: 'update-task', kind: 'task.update', input: { id: taskId, title: 'Proposta revisada' } }],
  });
  assert.strictEqual(update.revision, 2);
  assert.strictEqual(store.getStoreSnapshot().store.cards[0].title, 'Proposta revisada');

  const undone = domain.handleUndo({
    requestId: requestId('undo-update'),
    checkpointId: update.checkpointId,
    expectedCurrentRevision: 2,
    mode: 'reject-if-diverged',
  });
  assert.strictEqual(undone.revision, 3);
  assert.strictEqual(store.getStoreSnapshot().store.cards[0].title, 'Preparar proposta');

  const beforeInvalid = store.getStoreSnapshot();
  assert.throws(
    () => domain.handleBatchMutate({
      requestId: requestId('invalid-batch'),
      expectedRevision: beforeInvalid.revision,
      operations: [
        { opId: 'valid-first', kind: 'task.create', input: { title: 'Não deve aparecer' } },
        { opId: 'invalid-second', kind: 'unknown.kind', input: {} },
      ],
    }),
    error => error.code === 'UNSUPPORTED_OPERATION'
  );
  assert.deepStrictEqual(store.getStoreSnapshot().store.cards, beforeInvalid.store.cards);
  assert.strictEqual(store.getStoreSnapshot().revision, beforeInvalid.revision);

  const names = mcp.MCP_TOOLS.map(tool => tool.name);
  assert.deepStrictEqual(names, [...names].sort((left, right) => left.localeCompare(right)));
  for (const required of ['organon_task_update', 'organon_task_delete', 'organon_batch_mutate', 'organon_undo', 'organon_notes_search', 'organon_schedule_pressure', 'organon_pending_digest']) {
    assert.ok(names.includes(required), `Ferramenta ausente: ${required}`);
  }
  for (const tool of mcp.MCP_TOOLS) {
    assert.ok(tool.inputSchema);
    assert.ok(tool.outputSchema);
    assert.strictEqual(typeof tool.annotations?.readOnlyHint, 'boolean');
  }
  assert.strictEqual(mcp.MODERN_PROTOCOL, '2026-07-28');

  const modernMeta = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientInfo': { name: 'organon-contract-test', version: '1.0.0' },
  };
  const frames = [
    { jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: modernMeta } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: { _meta: modernMeta } },
    { jsonrpc: '2.0', id: 3, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'legacy-test', version: '1.0.0' } } },
  ];
  const wire = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'organon.cjs'), 'mcp'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, ORGANON_DATA_DIR: root },
    input: `${frames.map(frame => JSON.stringify(frame)).join('\n')}\n`,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.strictEqual(wire.status, 0, wire.stderr);
  const responses = wire.stdout.trim().split(/\r?\n/).map(line => JSON.parse(line));
  assert.deepStrictEqual(responses[0].result.protocolVersions[0], '2026-07-28');
  assert.strictEqual(responses[0].result._meta['io.modelcontextprotocol/serverInfo'].version, require('../package.json').version);
  assert.strictEqual(responses[1].result.ttlMs, 3_600_000);
  assert.strictEqual(responses[1].result.tools.length, names.length);
  assert.strictEqual(responses[2].result.protocolVersion, '2025-11-25');

  process.stdout.write(JSON.stringify({
    batchAtomicity: 'ok',
    idempotency: 'ok',
    revisionCas: 'ok',
    durableUndo: 'ok',
    readOnlyTools: 'ok',
    toolContracts: 'ok',
    modernProtocol: 'ok',
    revision: store.getStoreSnapshot().revision,
    tools: names.length,
  }) + '\n');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
