const assert = require('node:assert/strict')
const { MeetingProviderGateway } = require('../dist/main/meeting/providers/providerGateway')
const { redactSensitiveText } = require('../dist/main/meeting/privacyRedaction')

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
    async run(prompt, options) {
      calls.push({ id, web: options.web, prompt })
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

  const sensitive = 'joao@example.com CPF 123.456.789-00 telefone (11) 99999-8888 cartão 4111 1111 1111 1111 api_key=supersecret123 C:\\Users\\Pedro\\repo'
  const directRedaction = redactSensitiveText(sensitive)
  assert.ok(directRedaction.report.total >= 6)
  assert.doesNotMatch(directRedaction.text, /joao@example|123\.456|99999-8888|4111 1111|supersecret123|Users\\Pedro/)

  calls.length = 0
  const privacyGateway = new MeetingProviderGateway([fakeProvider('claude', { local: false, web: true, calls })])
  const privateExternal = await privacyGateway.run(sensitive, false, signal, () => {}, {
    preferredProviderId: 'claude', allowExternalAI: true, allowLocalAI: false, redactExternalAI: true,
  })
  assert.ok(privateExternal.privacy.applied)
  assert.doesNotMatch(calls[0].prompt, /joao@example|supersecret123/)

  calls.length = 0
  const localGateway = new MeetingProviderGateway([fakeProvider('ollama', { local: true, web: false, calls })])
  const local = await localGateway.run(sensitive, false, signal, () => {}, { allowExternalAI: false, allowLocalAI: true })
  assert.equal(local.privacy, undefined)
  assert.match(calls[0].prompt, /joao@example/)
  console.log('Meeting provider gateway: privacy, redaction, discovery, capability filtering and fallback OK.')
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
