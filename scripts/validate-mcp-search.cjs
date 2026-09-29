const assert = require('assert');
const { createHash } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const corpus = require('./fixtures/mcp-search-corpus.json');
const dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-mcp-search-'));
process.env.ORGANON_DATA_DIR = dataRoot;

const store = require('../bin/lib/store.cjs');
const domain = require('../bin/lib/mcp-domain.cjs');

function treeFingerprint(root) {
  const hash = createHash('sha256');
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(root, fullPath).replace(/\\/g, '/');
      hash.update(`${entry.isDirectory() ? 'd' : 'f'}:${relativePath}\0`);
      if (entry.isDirectory()) walk(fullPath);
      else hash.update(fs.readFileSync(fullPath));
    }
  };
  walk(root);
  return hash.digest('hex');
}

try {
  const operations = corpus.documents.map(document => ({
    opId: document.key,
    kind: 'note.create',
    input: { title: document.title, tags: document.tags, content: document.content },
  }));
  const committed = domain.handleBatchMutate({
    requestId: 'semantic-corpus-create-v1',
    expectedRevision: 0,
    operations,
  });
  const idsByKey = Object.fromEntries(corpus.documents.map(document => [document.key, committed.results[document.key].id]));

  const rebuilt = domain.rebuildNotesSemanticIndex();
  assert.strictEqual(rebuilt.schemaVersion, 1);
  assert.strictEqual(rebuilt.embeddingModel, 'organon-feature-hash-pt-v1');
  assert.strictEqual(rebuilt.dimension, 256);
  assert.strictEqual(rebuilt.revision, committed.revision);
  assert.strictEqual(rebuilt.notes, corpus.documents.length);
  assert.ok(fs.existsSync(rebuilt.path));

  const cli = spawnSync(process.execPath, [path.join(projectRoot, 'bin', 'organon.cjs'), 'index', 'rebuild', '--json'], {
    cwd: projectRoot,
    env: { ...process.env, ORGANON_DATA_DIR: dataRoot },
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.strictEqual(cli.status, 0, cli.stderr);
  const cliResult = JSON.parse(cli.stdout);
  assert.strictEqual(cliResult.revision, committed.revision);
  assert.strictEqual(cliResult.notes, corpus.documents.length);

  const revisionBeforeSearch = store.getStoreSnapshot().revision;
  const fingerprintBeforeSearch = treeFingerprint(dataRoot);
  let topOneHits = 0;
  let topThreeHits = 0;
  const evaluation = [];

  for (const sample of corpus.queries) {
    const response = domain.handleNotesSearch({ query: sample.query, limit: 3 });
    const expectedId = idsByKey[sample.expected];
    const rankedIds = response.results.map(result => result.noteId);
    if (rankedIds[0] === expectedId) topOneHits += 1;
    if (rankedIds.includes(expectedId)) topThreeHits += 1;
    assert.strictEqual(response.index.schemaVersion, 1);
    assert.strictEqual(response.index.embeddingModel, 'organon-feature-hash-pt-v1');
    assert.strictEqual(response.index.dimension, 256);
    assert.strictEqual(response.index.persisted, true);
    assert.ok(response.results.every(result => Number.isFinite(result.lexicalScore) && Number.isFinite(result.semanticScore)));
    assert.ok(response.results.every(result => result.offsets && result.offsets.start >= 0 && result.offsets.end >= result.offsets.start));
    evaluation.push({
      query: sample.query,
      expected: sample.expected,
      top: response.results[0]?.title || null,
      ranking: response.results.map(result => ({ title: result.title, score: result.score, lexical: result.lexicalScore, semantic: result.semanticScore })),
    });
  }

  const precisionAt1 = topOneHits / corpus.queries.length;
  const recallAt3 = topThreeHits / corpus.queries.length;
  assert.ok(
    precisionAt1 >= corpus.thresholds.precisionAt1,
    `precision@1 ${precisionAt1} abaixo de ${corpus.thresholds.precisionAt1}: ${JSON.stringify(evaluation)}`
  );
  assert.ok(
    recallAt3 >= corpus.thresholds.recallAt3,
    `recall@3 ${recallAt3} abaixo de ${corpus.thresholds.recallAt3}: ${JSON.stringify(evaluation)}`
  );
  assert.strictEqual(store.getStoreSnapshot().revision, revisionBeforeSearch, 'buscas alteraram a revisão');
  assert.strictEqual(treeFingerprint(dataRoot), fingerprintBeforeSearch, 'buscas alteraram arquivos no data root');

  process.stdout.write(`${JSON.stringify({
    corpus: corpus.documents.length,
    queries: corpus.queries.length,
    precisionAt1,
    recallAt3,
    readOnly: 'ok',
    cliRebuild: 'ok',
    evaluation,
  })}\n`);
} finally {
  fs.rmSync(dataRoot, { recursive: true, force: true });
}
