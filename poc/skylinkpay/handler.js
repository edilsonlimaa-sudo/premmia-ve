// Lógica HTTP de la POC "Pago desde el carro", compartida por:
//   - server.js   (local, node:http)
//   - api/index.js (Vercel, función serverless)
//
// API
//   POST /api/cobros            { placa, montoBs }  → crea el cobro en SkyLinkPay
//   GET  /api/cobros            últimos cobros
//   GET  /api/cobros/:id        un cobro (refresca el estado en SkyLinkPay si no está pagado)
//   GET  /api/placa/:placa      último cobro de esa placa (refrescado)
//   POST /webhook               receptor de "URL de notificaciones" (registra, refresca, responde)
//   GET  /api/health            diagnóstico (sin secretos)

import { appendFile } from 'node:fs/promises'
import { createTransaction, getByToken, isPaid, config } from './skylink.js'
import { createStore } from './store.js'

const store = createStore()
const ON_VERCEL = Boolean(process.env.VERCEL)
const PIN = process.env.POC_PIN || '' // opcional: protege la creación de cobros en una URL pública

// En local se escriben logs JSONL; en Vercel el disco es efímero → solo console.
async function log(file, obj) {
  const entry = { at: new Date().toISOString(), ...obj }
  if (ON_VERCEL) {
    console.log(`[${file}]`, JSON.stringify(entry))
    return
  }
  await appendFile(new URL(`./${file}`, import.meta.url), JSON.stringify(entry) + '\n').catch(() => {})
}

const normPlaca = (p) => String(p ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

function publicView(c) {
  return {
    id: c.id,
    placa: c.placa,
    amount: c.amount,
    currency: c.currency,
    montoBs: c.amount / 100,
    token: c.token,
    url: c.url,
    status: c.status,
    resultCode: c.resultCode,
    resultMessage: c.resultMessage,
    paymentMethod: c.paymentMethod ?? null,
    bankReference: c.bankReference ?? null,
    paid: isPaid(c),
    createdAt: c.createdAt,
    paidAt: c.paidAt ?? null,
    lastCheckedAt: c.lastCheckedAt ?? null,
    lastSource: c.lastSource ?? null,
  }
}

function applySkylinkData(c, d, source) {
  const wasPaid = isPaid(c)
  Object.assign(c, {
    status: d.status,
    resultCode: d.resultCode,
    resultMessage: d.resultMessage,
    settlementStatus: d.settlementStatus,
    paymentMethod: d.paymentMethod,
    bankReference: d.bankReference,
    lastCheckedAt: new Date().toISOString(),
    lastSource: source,
  })
  if (!wasPaid && isPaid(c)) c.paidAt = new Date().toISOString()
}

/** Consulta SkyLinkPay por token y actualiza el cobro dentro de `list`. No lanza. */
async function refresh(list, c, source = 'poll') {
  if (!c?.token || isPaid(c)) return c
  try {
    const res = await getByToken(c.token)
    await log('transactions.log', { action: 'get', source, token: c.token, status: res.status, response: res.body })
    if (res.ok && res.body?.data) {
      applySkylinkData(c, res.body.data, source)
      delete c.lastError
      await store.save(list)
    } else {
      c.lastError = { status: res.status, body: res.body }
    }
  } catch (e) {
    c.lastError = { message: String(e) }
  }
  return c
}

// --- helpers -----------------------------------------------------------------
function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}
async function rawBody(req) {
  // Vercel ya puede haber leído el cuerpo (req.body); en node:http hay que leer el stream.
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
  }
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(''))
  })
}
const parseJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return undefined
  }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))])

// --- handler -----------------------------------------------------------------
export async function handle(req, res) {
  const url = new URL(req.url, 'http://local')
  const path = url.pathname.replace(/\/+$/, '') || '/'
  const method = (req.method || 'GET').toUpperCase()

  try {
    if (method === 'GET' && path === '/api/health') {
      let cfg = null
      try {
        const c = config()
        cfg = { baseUrl: c.baseUrl, commerceCode: `…${c.commerceCode.slice(-4)}`, apiKey: `…${c.apiKey.slice(-4)}` }
      } catch (e) {
        cfg = { error: String(e.message) }
      }
      return send(res, 200, { ok: true, vercel: ON_VERCEL, store: store.kind, pin: Boolean(PIN), skylink: cfg })
    }

    // Webhook de SkyLinkPay. Timeout de 10 s: refrescamos (acotado a 6 s) y respondemos.
    if (method === 'POST' && path === '/webhook') {
      const raw = await rawBody(req)
      const body = parseJson(raw)
      await log('webhooks.log', { headers: req.headers, body, raw })
      console.log('=== WEBHOOK ===', raw)
      const token = body?.data?.token ?? body?.token ?? body?.transaction?.token
      let refreshed = false
      if (token) {
        const list = await store.load()
        const c = list.find((x) => x.token === token)
        if (c) {
          await withTimeout(refresh(list, c, 'webhook'), 6000)
          refreshed = true
        }
      }
      return send(res, 200, { received: true, refreshed })
    }

    if (method === 'POST' && path === '/api/cobros') {
      if (PIN && req.headers['x-poc-pin'] !== PIN) return send(res, 401, { error: 'PIN incorrecto', code: 'PIN' })
      const body = parseJson(await rawBody(req))
      const placa = normPlaca(body?.placa)
      const montoBs = Number(String(body?.montoBs ?? '').replace(',', '.'))
      if (placa.length < 3) return send(res, 400, { error: 'Placa inválida' })
      if (!Number.isFinite(montoBs) || montoBs <= 0) return send(res, 400, { error: 'Monto inválido' })
      const amount = Math.round(montoBs * 100)
      const stamp = Date.now()
      const buyOrder = `${placa}-${stamp}`
      const sessionId = `POC-${stamp}`
      const r = await createTransaction({ amount, currency: 'VES', buyOrder, sessionId })
      await log('transactions.log', { action: 'create', placa, amount, buyOrder, status: r.status, response: r.body })
      const d = r.body?.data
      if (!r.ok || !d?.token) return send(res, 502, { error: 'SkyLinkPay rechazó el cobro', skylink: r.body, httpStatus: r.status })
      const c = {
        id: d.id,
        placa,
        amount: d.amount ?? amount,
        currency: d.currency ?? 'VES',
        buyOrder,
        sessionId,
        token: d.token,
        url: d.url,
        createdAt: new Date().toISOString(),
      }
      applySkylinkData(c, d, 'create')
      const list = await store.load()
      list.push(c)
      await store.save(list)
      return send(res, 201, publicView(c))
    }

    if (method === 'GET' && path === '/api/cobros') {
      const list = await store.load()
      return send(res, 200, [...list].reverse().slice(0, 50).map(publicView))
    }

    let m
    if (method === 'GET' && (m = path.match(/^\/api\/cobros\/([^/]+)$/))) {
      const list = await store.load()
      const c = list.find((x) => x.id === decodeURIComponent(m[1]))
      if (!c) return send(res, 404, { error: 'Cobro no encontrado' })
      await refresh(list, c)
      return send(res, 200, publicView(c))
    }

    if (method === 'GET' && (m = path.match(/^\/api\/placa\/([^/]+)$/))) {
      const placa = normPlaca(decodeURIComponent(m[1]))
      if (placa.length < 3) return send(res, 400, { error: 'Placa inválida', code: 'PLACA_INVALIDA' })
      const list = await store.load()
      const mine = list.filter((x) => x.placa === placa)
      if (mine.length === 0) return send(res, 404, { error: 'Sin cobros para esta placa', code: 'SIN_COBROS', placa })
      const c = mine[mine.length - 1]
      await refresh(list, c)
      return send(res, 200, { ...publicView(c), total: mine.length })
    }

    return send(res, 404, { error: 'Ruta no encontrada', path })
  } catch (e) {
    console.error(e)
    return send(res, 500, { error: String(e?.message ?? e) })
  }
}
