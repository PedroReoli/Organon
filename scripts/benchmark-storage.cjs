const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');

const { PROFILE_NAMES, materializeProfile } = require('./lib/storage-fixture.cjs');
const generationStore = require('../dist/main/storage/generationStore.js');

const percentile = (values, fraction) => {
  const ordered = [...values].sort((left, right) => left - right);
  return Number(ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * fraction) - 1)].toFixed(2));
};

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-storage-benchmark-'));

try {
  const output = [];
  for (const name of PROFILE_NAMES) {
    const { profile, store } = materializeProfile(name);
    const dataRoot = path.join(sandbox, name);
    const commitMs = [];
    const loadMs = [];
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const revision = generationStore.getStorageRevision(dataRoot);
      const startedCommit = performance.now();
      const result = generationStore.commitStoreGeneration(
        { ...store, storeUpdatedAt: `2026-09-29T12:00:0${iteration}.000Z` },
        dataRoot,
        { expectedRevision: revision, source: `benchmark:${name}` }
      );
      commitMs.push(performance.now() - startedCommit);
      if (!result.success) throw new Error(result.error || `Falha no benchmark ${name}`);
      const startedLoad = performance.now();
      const loaded = generationStore.loadCommittedGeneration(dataRoot);
      loadMs.push(performance.now() - startedLoad);
      if (!loaded || loaded.revision !== iteration + 1) throw new Error(`Releitura inválida em ${name}`);
    }
    const summarize = values => ({ p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95), p99Ms: percentile(values, 0.99) });
    output.push({
      profile: name,
      counts: profile.counts,
      logicalBytes: Buffer.byteLength(JSON.stringify(store), 'utf8'),
      commit: summarize(commitMs),
      load: summarize(loadMs),
    });
  }
  process.stdout.write(`${JSON.stringify({ generatedAt: new Date().toISOString(), iterations: 3, results: output }, null, 2)}\n`);
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}

