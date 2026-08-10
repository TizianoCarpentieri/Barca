const BASE_URL = 'https://sbarco.tizianocarpentieri.workers.dev'
const ORIGIN = 'https://tizianocarpentieri.github.io'

const [userId = 'antonio', mode = 'auto', ...questionParts] = process.argv.slice(2)
const question = questionParts.join(' ') || 'Rispondi soltanto: Sbarco v2 operativo.'

if (!['tiziano', 'antonio', 'peppe'].includes(userId)) {
  throw new Error('Utente non valido: usa tiziano, antonio o peppe')
}
if (!['auto', 'deep'].includes(mode)) {
  throw new Error('Modalita non valida: usa auto o deep')
}

const startedAt = Date.now()
const response = await fetch(`${BASE_URL}/api/chat`, {
  method: 'POST',
  headers: {
    Origin: ORIGIN,
    'Content-Type': 'application/json',
    'User-Agent': 'Sbarco-release-smoke',
  },
  body: JSON.stringify({ userId, question, mode }),
})
const headersAt = Date.now()

const reader = response.body.getReader()
const decoder = new TextDecoder()
let firstChunkAt = null
let raw = ''

while (true) {
  const chunk = await reader.read()
  if (chunk.done) break
  if (firstChunkAt == null) firstChunkAt = Date.now()
  raw += decoder.decode(chunk.value, { stream: true })
}
raw += decoder.decode()

const events = raw
  .split(/\r?\n/)
  .filter((line) => line.startsWith('data: '))
  .map((line) => {
    try {
      return JSON.parse(line.slice(6))
    } catch {
      return null
    }
  })
  .filter(Boolean)

const done = events.findLast((event) => event.done)
const error = events.findLast((event) => event.error)
const answer = events.filter((event) => event.token).map((event) => event.token).join('')
const statuses = events.filter((event) => event.status).map((event) => event.status.label)
const meta = events.findLast((event) => event.meta)?.meta ?? null

const report = {
  http: response.status,
  mode,
  userId,
  headersMs: headersAt - startedAt,
  firstChunkMs: firstChunkAt == null ? null : firstChunkAt - startedAt,
  totalMs: Date.now() - startedAt,
  statuses,
  meta,
  answer,
  remaining: done?.remaining ?? null,
  error: error?.error ?? null,
}

console.log(JSON.stringify(report, null, 2))

if (!response.ok || error || !done || !answer.trim()) process.exitCode = 1
