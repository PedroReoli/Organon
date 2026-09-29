const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { PROFILE_NAMES, materializeProfile } = require('./lib/storage-fixture.cjs');
const generationStore = require('../dist/main/storage/generationStore.js');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-storage-baseline-'));

try {
  const results = [];
  for (const name of PROFILE_NAMES) {
    const { profile, store } = materializeProfile(name);
    const bytes = Buffer.byteLength(JSON.stringify(store), 'utf8');
    const dataRoot = path.join(sandbox, name);
    const committed = generationStore.commitStoreGeneration(store, dataRoot, { expectedRevision: 0, source: `baseline:${name}` });
    assert.strictEqual(committed.success, true, committed.error);
    const loaded = generationStore.loadCommittedGeneration(dataRoot);
    assert.ok(loaded);
    assert.strictEqual(loaded.revision, 1);
    assert.strictEqual(loaded.store.cards.length, profile.counts.cards);
    assert.strictEqual(loaded.store.notes.length, profile.counts.notes);
    assert.strictEqual(loaded.store.meetings.length, profile.counts.meetings);
    results.push({ name, bytes, ...profile.counts });
  }
  assert.ok(results[0].bytes < results[1].bytes && results[1].bytes < results[2].bytes, 'Perfis não crescem em bytes.');
  process.stdout.write(`${JSON.stringify({ storageBaselines: 'ok', profiles: results })}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

