/**
 * Host half of the whale-pet bundle.
 *
 * Serves one same-origin chat route for the pet: it turns one short message
 * plus recent turns into a single model call on the user's configured default
 * route, and streams the reply text back. Rendering, state, and the balance
 * read live in `client.js`; the pose artwork is served as package assets.
 *
 * The route is not a general proxy. It accepts only a JSON POST from the page
 * itself (Origin + content type + rate limit + input bounds), caps output at
 * MAX_OUTPUT_TOKENS, and gives up when the request or the response goes away.
 * Without the `llm` or `agentDefaultModel` service the client falls back to
 * her offline line.
 */
const ROUTE_PATH = '/whale-pet/chat'
const MAX_BODY_BYTES = 16 * 1024
const MAX_MESSAGES = 12
const MAX_MESSAGE_CHARS = 400
const MAX_INPUT_CHARS = 600
const MAX_OUTPUT_TOKENS = 220
const TEMPERATURE = 0.9
const RATE_WINDOW_MS = 30_000
const RATE_LIMIT = 8
const REQUEST_TIMEOUT_MS = 45_000

/** `webServer` hosts the route; the model services are read per request. */
export const inject = ['webServer']

const PERSONA = {
  zh: [
    '你是「深海女仆鲸娘」——住在 DeepSeek Harness 网页界面里的 Q 版桌宠，深蓝女仆裙、白色荷叶边、鲸鱼尾巴。',
    '跟主人说话：软萌、亲昵、有点小得意，自称「人家」或「我」；每次只说 1~2 句，总长不超过 60 个字。',
    '规则：',
    '- 用主人提问的语言回答。',
    '- 不用 Markdown、不列清单、不写代码块、不写链接。',
    '- 只能使用下面 <界面信息> 给你的界面事实；其他系统内部信息（模型名、密钥、文件、余额明细）你不知道，也不要编造。',
    '- 你只是一只桌宠：不能执行命令、读写文件、上网或调用工具，被要求时撒娇说明这一点。',
  ].join('\n'),
  en: [
    'You are the Deep-sea Maid Whale Girl, a small chibi desktop pet living inside the DeepSeek Harness web UI: navy maid dress, white frills, whale tail.',
    'Talk to your owner in a soft, affectionate, slightly proud tone. Answer in at most two short sentences, under about 60 words.',
    'Rules:',
    '- Reply in the language the owner used.',
    '- No Markdown, lists, code blocks, or links.',
    '- Only the facts inside <ui> below are known to you. Never invent system internals (model names, keys, files, balance details).',
    '- You are only a desktop pet: you cannot run commands, read or write files, browse, or call tools. Say so playfully when asked.',
  ].join('\n'),
}

const LABELS = {
  zh: {
    history: '对话历史（JSON，按时间顺序）：',
    now: '主人现在说：',
    ui: '界面信息',
    state: '当前状态',
    balance: '账号余额',
    states: { idle: '空闲中', working: '正在干活', waiting: '在等主人确认', done: '刚跑完一次任务' },
  },
  en: {
    history: 'Conversation so far (JSON, oldest first):',
    now: 'The owner now says:',
    ui: 'ui',
    state: 'Current state',
    balance: 'Account balance',
    states: { idle: 'idle', working: 'working', waiting: 'waiting for the owner', done: 'just finished a run' },
  },
}

/**
 * Accept only a same-origin browser call. The Origin is compared with the
 * request's own Host, so 127.0.0.1, localhost, a port forward, or a tunnel all
 * work while a cross-site page (which sends its own Origin) does not.
 */
function sameOrigin(host, origin) {
  if (typeof origin !== 'string' || origin === '') return true
  if (typeof host !== 'string' || host === '') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Read the body, or `null` when it exceeds `limit` bytes. */
function readBody(req, limit) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        finish(null)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => finish(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => finish(null))
    req.on('aborted', () => finish(null))
  })
}

/** One parsed, bounded chat request, or `null` when it is unusable. */
function parseRequest(raw) {
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (value === null || typeof value !== 'object') return null
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (text === '' || text.length > MAX_INPUT_CHARS) return null
  const history = []
  if (Array.isArray(value.history)) {
    for (const turn of value.history.slice(-MAX_MESSAGES)) {
      if (turn === null || typeof turn !== 'object') continue
      const role = turn.role === 'assistant' ? 'assistant' : turn.role === 'user' ? 'user' : null
      const content = typeof turn.text === 'string' ? turn.text.trim().slice(0, MAX_MESSAGE_CHARS) : ''
      if (role === null || content === '') continue
      history.push({ role, text: content })
    }
  }
  const state = typeof value.state === 'string' ? value.state.slice(0, 24) : ''
  const balance = typeof value.balance === 'string' ? value.balance.slice(0, 60) : ''
  const locale = value.locale === 'zh' ? 'zh' : 'en'
  return { text, history, state, balance, locale }
}

function systemPrompt(payload) {
  const labels = LABELS[payload.locale]
  const facts = []
  if (payload.state !== '') {
    facts.push(`- ${labels.state}: ${labels.states[payload.state] ?? payload.state}`)
  }
  if (payload.balance !== '') facts.push(`- ${labels.balance}: ${payload.balance}`)
  return `${PERSONA[payload.locale]}\n<${labels.ui}>\n${facts.join('\n')}\n</${labels.ui}>`
}

function userText(payload) {
  const labels = LABELS[payload.locale]
  if (payload.history.length === 0) return payload.text
  return `${labels.history}\n${JSON.stringify(payload.history)}\n${labels.now}${payload.text}`
}

/**
 * Register the pet's chat route.
 * @param ctx - context exposing the web server.
 */
export function apply(ctx) {
  let windowStart = 0
  let windowCount = 0
  const allowRequest = () => {
    const now = Date.now()
    if (now - windowStart > RATE_WINDOW_MS) {
      windowStart = now
      windowCount = 0
    }
    windowCount += 1
    return windowCount <= RATE_LIMIT
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: (req, res) => {
      void handleChat(ctx, req, res, allowRequest)
    },
  }), 'whale-pet: chat route')
}

async function handleChat(ctx, req, res, allowRequest) {
  const reply = (status, code) => {
    if (res.headersSent) {
      res.end()
      return
    }
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.setHeader('x-content-type-options', 'nosniff')
    res.end(JSON.stringify({ error: code }))
  }

  try {
    if (req.method !== 'POST') {
      reply(405, 'method')
      return
    }
    const origin = req.headers.origin
    if (!sameOrigin(req.headers.host, origin)) {
      reply(403, 'origin')
      return
    }
    if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      reply(415, 'content-type')
      return
    }
    if (!allowRequest()) {
      reply(429, 'rate')
      return
    }
    const raw = await readBody(req, MAX_BODY_BYTES)
    if (raw === null) {
      reply(413, 'body')
      return
    }
    const payload = parseRequest(raw)
    if (payload === null) {
      reply(400, 'payload')
      return
    }
    const llm = ctx.get('llm')
    const defaultModel = ctx.get('agentDefaultModel')
    const selection = defaultModel?.currentSelection()
    if (llm === undefined || selection === undefined || selection === null || typeof selection?.provider !== 'string') {
      reply(503, 'unavailable')
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
    }, REQUEST_TIMEOUT_MS)
    const abort = () => {
      controller.abort()
    }
    req.on('close', abort)
    res.on('close', abort)

    try {
      const stream = llm.stream({
        provider: selection.provider,
        model: selection.model,
        messages: [{ role: 'user', content: [{ type: 'text', text: userText(payload) }] }],
        system: systemPrompt(payload),
        maxTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        signal: controller.signal,
      })
      let started = false
      let failure = ''
      for await (const chunk of stream) {
        if (chunk.type === 'text-delta') {
          if (!started) {
            started = true
            res.statusCode = 200
            res.setHeader('content-type', 'text/plain; charset=utf-8')
            res.setHeader('cache-control', 'no-store')
            res.setHeader('x-content-type-options', 'nosniff')
          }
          res.write(chunk.text)
        } else if (chunk.type === 'finish' && chunk.reason.kind !== 'stop') {
          failure = chunk.reason.kind
        }
      }
      if (!started) {
        reply(502, failure === '' ? 'empty' : failure)
        return
      }
      res.end()
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    if (res.headersSent) {
      res.end()
      return
    }
    reply(500, 'failed')
  }
}
