const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'organon-meeting-mcp-'));
process.env.ORGANON_DATA_DIR = root;
const meeting = {
  id: 'meeting-fixture-1',
  title: 'Revisão do gateway',
  createdAt: '2026-10-02T10:00:00.000Z',
  updatedAt: '2026-10-02T11:00:00.000Z',
  durationSeconds: 3600,
  fullTranscript: 'Pedro: Ficou decidido usar o gateway local. Ana: Precisamos revisar o fallback até sexta-feira.',
  segments: [
    { id: 's1', speakerName: 'Pedro', text: 'Ficou decidido usar o gateway local.', startMs: 0, endMs: 3000 },
    { id: 's2', speakerName: 'Ana', text: 'Precisamos revisar o fallback até sexta-feira.', startMs: 3000, endMs: 7000 },
  ],
  intelligenceData: {
    executiveSummary: 'O time escolheu gateway local e deixou a revisão do fallback pendente.',
    decisions: [{ id: 'd1', text: 'Usar gateway local', confirmed: true }],
    actionItems: [{ id: 'a1', task: 'Revisar fallback', assignee: 'Ana', dueDate: 'sexta-feira', status: 'pending' }],
    openQuestions: [{ id: 'q1', text: 'Qual modelo usar?', status: 'open', confidence: 0.8 }],
    risks: [{ id: 'r1', text: 'Fallback sem teste', severity: 'medium', status: 'open', confidence: 0.8 }],
    findings: [], questions: [], auditLog: [],
  },
};
fs.writeFileSync(path.join(root, 'store.json'), JSON.stringify({ meetings: [meeting] }), 'utf8');

const domain = require('../bin/lib/mcp-meetings.cjs');
const mcp = require('../bin/lib/mcp.cjs');

try {
  const list = domain.handleMeetingList({});
  assert.equal(list.meetings.length, 1);
  assert.equal(list.meetings[0].hasTranscript, true);
  assert.ok(!JSON.stringify(list).includes('Ficou decidido'));

  const metadata = domain.handleMeetingRead({ idOrTitle: meeting.id });
  assert.equal(metadata.access, 'metadata');
  assert.equal(metadata.transcript, undefined);

  const full = domain.handleMeetingRead({ idOrTitle: meeting.id, access: 'full' });
  assert.match(full.transcript, /gateway local/);
  assert.equal(full.intelligence.actionItems[0].assignee, 'Ana');

  const search = domain.handleMeetingSearch({ query: 'revisar fallback', access: 'transcript' });
  assert.equal(search.results[0].meeting.id, meeting.id);
  assert.match(search.results[0].snippet.text, /fallback/);

  const summary = domain.handleMeetingSummarize({ idOrTitle: meeting.id, access: 'intelligence' });
  assert.equal(summary.generatedBy, 'organon-local');
  assert.equal(summary.actionItems[0].dueDate, 'sexta-feira');

  process.env.ORGANON_MCP_MEETING_ACCESS = 'metadata';
  assert.throws(
    () => domain.handleMeetingRead({ idOrTitle: meeting.id, access: 'full' }),
    error => error.code === 'ACCESS_DENIED',
  );
  delete process.env.ORGANON_MCP_MEETING_ACCESS;

  const required = ['organon_meeting_list', 'organon_meeting_read', 'organon_meeting_search', 'organon_meeting_summarize', 'organon_meeting_ask'];
  const names = mcp.MCP_TOOLS.map(tool => tool.name);
  required.forEach(name => assert.ok(names.includes(name), `Ferramenta ausente: ${name}`));

  const frame = {
    jsonrpc: '2.0', id: 7, method: 'tools/call',
    params: { name: 'organon_meeting_read', arguments: { idOrTitle: meeting.id, access: 'transcript' } },
  };
  const wire = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'organon.cjs'), 'mcp'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, ORGANON_DATA_DIR: root },
    input: `${JSON.stringify(frame)}\n`,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.equal(wire.status, 0, wire.stderr);
  const response = JSON.parse(wire.stdout.trim());
  assert.equal(response.id, 7);
  assert.match(response.result.structuredContent.data.transcript, /gateway local/);
  assert.ok(fs.existsSync(path.join(root, '_sistema', 'mcp', 'meeting-audit.jsonl')));
  console.log('Meeting MCP: list, scoped read, search, summary, policy ceiling, audit and wire protocol OK.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
