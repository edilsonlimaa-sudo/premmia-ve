// App POC "Pago desde el carro" integrado con SkyLinkPay.
// Sin dependencias: node:http sirve el frontend (public/) y una API mínima.
//
//   npm run dev            → node --env-file=.env server.js   (http://localhost:3000)
//
// API
//   POST /api/cobros                 { placa, montoBs }  → crea el cobro en SkyLinkPay
//   GET  /api/cobros                 últimos cobros
//   GET  /api/cobros/:id             un cobro (refresca el estado en SkyLinkPay si no está pagado)
//   GET  /api/placa/:placa           último cobro de esa placa (refrescado)
//   POST /webhook                    receptor de "URL de notificaciones" (registra y refresca)
//
// Persistencia: data.json (ignorado por git). Logs: webhooks.log, transactions.log.

import { createServer } from 'node:http'
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTransaction, getByToken, isPaid, config } from './skylink.js'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(ROOT, 'public')
const DATA = join(ROOT, 'data.json')
const PORT = Number(process.env.PORT ?? 3000)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' }

config() // falla pronto si falta el .env

// --- store -------------------------------------------------------------------
/** @type {Array<any>} */
let cobros = []
try {
  if (existsSync(DATA)) cobros = JSON.parse(await readFile(DATA, 'utf8'))
} catch (e) {
  console.error('No se pudo leer data.json, empezando vacío', e)
}
async function persist() {
  await writeFile(DATA, JSON.stringify(cobros, null, 2))
}
const log = (file, obj) => appendFile(join(ROOT, file), JSON.stringify({ at: new Date().toISOString(), ...obj }) + '\n').catch(() => {})

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

/** Consulta SkyLinkPay por token y actualiza el cobro. No lanza. */
async function refresh(c, source = 'poll') {
  if (!c?.token || isPaid(c)) return c
  try {
    const res = await getByToken(c.token)
    await log('transactions.log', { action: 'get', source, token: c.token, status: res.status, response: res.body })
    if (res.ok && res.body?.data) {
      applySkylinkData(c, res.body.data, source)
      await persist()
    } else {
      c.lastError = { status: res.status, body: res.body }
    }
  } catch (e) {
    c.lastError = { message: String(e) }
  }
  return c
}

// --- http helpers ------------------------------------------------------------
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}
const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
const parseJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return undefined
  }
}

async function serveStatic(res, urlPath) {
  let file = urlPath === '/' ? '/index.html' : urlPath
  file = normalize(join(PUBLIC, file))
  if (!file.startsWith(PUBLIC) || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }
  const data = await readFile(file)
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  res.end(data)
}

// --- routes ------------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  try {
    // Webhook de SkyLinkPay: responder rápido (timeout de 10 s) y procesar después.
    if (req.method === 'POST' && path === '/webhook') {
      const raw = await readBody(req)
      const body = parseJson(raw)
      json(res, 200, { received: true })
      console.log('\n=== WEBHOOK ===\n', raw)
      await log('webhooks.log', { headers: req.headers, body, raw })
      const token = body?.data?.token ?? body?.token ?? body?.transaction?.token
      const c = token && cobros.find((x) => x.token === token)
      if (c) await refresh(c, 'webhook')
      return
    }

    if (req.method === 'POST' && path === '/api/cobros') {
      const body = parseJson(await readBody(req))
      const placa = normPlaca(body?.placa)
      const montoBs = Number(String(body?.montoBs ?? '').replace(',', '.'))
      if (placa.length < 3) return json(res, 400, { error: 'Placa inválida' })
      if (!Number.isFinite(montoBs) || montoBs <= 0) return json(res, 400, { error: 'Monto inválido' })
      const amount = Math.round(montoBs * 100)
      const stamp = Date.now()
      const buyOrder = `${placa}-${stamp}`
      const sessionId = `POC-${stamp}`
      const r = await createTransaction({ amount, currency: 'VES', buyOrder, sessionId })
      await log('transactions.log', { action: 'create', placa, amount, buyOrder, status: r.status, response: r.body })
      const d = r.body?.data
      if (!r.ok || !d?.token) return json(res, 502, { error: 'SkyLinkPay rechazó el cobro', skylink: r.body, httpStatus: r.status })
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
      cobros.push(c)
      await persist()
      return json(res, 201, publicView(c))
    }

    if (req.method === 'GET' && path === '/api/cobros') {
      return json(res, 200, [...cobros].reverse().slice(0, 50).map(publicView))
    }

    let m
    if (req.method === 'GET' && (m = path.match(/^\/api\/cobros\/([^/]+)$/))) {
      const c = cobros.find((x) => x.id === decodeURIComponent(m[1]))
      if (!c) return json(res, 404, { error: 'Cobro no encontrado' })
      await refresh(c)
      return json(res, 200, publicView(c))
    }

    if (req.method === 'GET' && (m = path.match(/^\/api\/placa\/([^/]+)$/))) {
      const placa = normPlaca(decodeURIComponent(m[1]))
      const list = cobros.filter((x) => x.placa === placa)
      if (placa.length < 3) return json(res, 400, { error: 'Placa inválida', code: 'PLACA_INVALIDA' })
      if (list.length === 0) return json(res, 404, { error: 'Sin cobros para esta placa', code: 'SIN_COBROS', placa })
      const c = list[list.length - 1]
      await refresh(c)
      return json(res, 200, { ...publicView(c), total: list.length })
    }

    if (req.method === 'GET') return serveStatic(res, path)
    json(res, 405, { error: 'Método no permitido' })
  } catch (e) {
    console.error(e)
    json(res, 500, { error: String(e?.message ?? e) })
  }
})

server.listen(PORT, () => {
  console.log(`POC Pago desde el carro → http://localhost:${PORT}  (webhook: POST /webhook)`)
})
