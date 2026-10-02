const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText
  module._compile(output, filename)
}

const { analyzeConversationTurn } = require('../src/renderer/services/meetingIntelligence/contextAnalysis.ts')
const { buildMeetingMemory, formatMeetingMemory } = require('../src/renderer/services/meetingIntelligence/meetingMemory.ts')

const base = { hasProject: true, allowWeb: false, priorStatements: [], openQuestions: [] }

const question = analyzeConversationTurn('Como funciona a autenticação no código do projeto?', base)
assert.equal(question.intent.intent, 'project_question')
assert.equal(question.suggestions[0].type, 'research_project')

const action = analyzeConversationTurn('Tarefa para Pedro até 10/10: revisar a autenticação.', base)
assert.equal(action.action.assignee, 'Pedro')
assert.equal(action.action.dueDate, '10/10')

const decision = analyzeConversationTurn('Ficou decidido usar o gateway local por padrão.', base)
assert.ok(decision.decision.confidence >= 0.9)
assert.ok(decision.suggestions.some(item => item.type === 'confirm_decision'))

const risk = analyzeConversationTurn('Existe risco crítico de vazamento em produção.', base)
assert.equal(risk.risk.severity, 'high')

const contradiction = analyzeConversationTurn('Não vamos liberar a integração hoje.', {
  ...base,
  priorStatements: ['Vamos liberar a integração hoje.'],
})
assert.ok(contradiction.contradiction)

const memory = buildMeetingMemory([
  {
    id: 'same-project', title: 'Anterior', createdAt: '2026-10-01T10:00:00Z', projectContext: { path: 'C:\\repo', name: 'Repo' },
    intelligenceData: {
      questions: [], findings: [], auditLog: [],
      decisions: [{ id: 'd1', text: 'Usar arquitetura modular', timestamp: '10:00', confirmed: true }],
      actionItems: [{ id: 'a1', task: 'Revisar testes', timestamp: '10:01', status: 'pending', assignee: 'Pedro', dueDate: 'sexta-feira' }],
      openQuestions: [{ id: 'q1', text: 'Qual modelo local?', timestamp: '10:02', status: 'open', confidence: 0.8 }],
      risks: [{ id: 'r1', text: 'Sem fallback', timestamp: '10:03', severity: 'medium', status: 'open', confidence: 0.8 }],
    },
  },
  {
    id: 'other-project', title: 'Outra', createdAt: '2026-10-02T10:00:00Z', projectContext: { path: 'C:\\other' },
    intelligenceData: { questions: [], findings: [], decisions: [], actionItems: [], auditLog: [] },
  },
], { enabled: true, name: 'Repo', path: 'C:\\repo', allowWebResearch: false, readOnly: true })

assert.deepEqual(memory.sourceMeetingIds, ['same-project'])
assert.match(formatMeetingMemory(memory), /Revisar testes/)
assert.match(formatMeetingMemory(memory), /Qual modelo local/)
console.log('Meeting intelligence: typed insights, contradictions, actions, risks and cross-meeting memory OK.')
