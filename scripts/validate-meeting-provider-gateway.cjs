const assert = require('node:assert/strict')
const { MeetingProviderGateway } = require('../dist/main/meeting/providers/providerGateway')

function fakeProvider(id, { local, web, available = true, fail = false, calls }) {
  return {
    id,
    name: `Fake ${id}`,
    capabilities: { local, web, projectContext: true, structuredOutput: true },
    async status() {
      return {
        id,
        name: `Fake ${id}`,
        available,
        installed: true,
        authenticated: true,
        detail: available ? 'ready' : 'offline',
        capabilities: this.capabilities,
      }
    },
    async run(_prompt, options) {
      calls.push({ id, web: options.web })
      if (fail) throw new Error('fixture failure')
      return { findings: `answer:${id}`, sources: [], providerId: id }
    },
  }
}

async function main() {
  const calls = []
  const gateway = new MeetingProviderGateway([
    fakeProvider('ollama', { local: true, web: false, calls }),
    fakeProvider('codex', { local: false, web: true, fail: true, calls }),
    fakeProvider('claude', { local: false, web: true, calls }),
    fakeProvider('gemini', { local: false, web: false, calls }),
    fakeProvider('antigravity', { local: false, web: true, available: false, calls }),
  ])
  const signal = new AbortController().signal

  const privateStatus = await gateway.status({ allowExternalAI: false, allowLocalAI: true })
  assert.equal(privateStatus.recommendedProviderId, 'ollama')
  assert.equal(privateStatus.providers.length, 5)
  const privateAnswer = await gateway.run('local only', false, signal, () => {}, { allowExternalAI: false, allowLocalAI: true })
  assert.equal(privateAnswer.providerId, 'ollama')

  await assert.rejects(
    () => gateway.run('search web', true, signal, () => {}, { allowExternalAI: false, allowLocalAI: true }),
    /autorização explícita/i,
  )

  calls.length = 0
  const fallback = await gateway.run('fallback', false, signal, () => {}, {
    preferredProviderId: 'codex',
    allowExternalAI: true,
    allowLocalAI: true,
  })
  assert.equal(fallback.providerId, 'ollama')
  assert.deepEqual(calls.map(call => call.id), ['codex', 'ollama'])

  calls.length = 0
  const webAnswer = await gateway.run('web', true, signal, () => {}, {
    preferredProviderId: 'codex',
    allowExternalAI: true,
    allowLocalAI: true,
  })
  assert.equal(webAnswer.providerId, 'claude')
  assert.deepEqual(calls.map(call => call.id), ['codex', 'claude'])
  assert.ok(calls.every(call => call.id !== 'ollama' && call.id !== 'gemini'))

  const blocked = await gateway.status({ allowExternalAI: false, allowLocalAI: false })
  assert.equal(blocked.available, false)
  console.log('Meeting provider gateway: privacy, discovery, capability filtering and fallback OK.')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
