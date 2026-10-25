// Cliente mínimo de SkyLinkPay con firma HMAC-SHA256.
// Variables de entorno (cargar con `node --env-file=.env ...`):
//   SKYLINK_BASE_URL, SKYLINK_COMMERCE_CODE, SKYLINK_API_KEY
//
// Firma: HMAC-SHA256 (hex) de "METHOD\npath\ntimestamp\nbody" con la API key como secreto.
// - path sin dominio ni query
// - timestamp = Date.now() en ms, el mismo de X-Timestamp
// - body = el JSON exacto que se envía; para GET sin cuerpo, la palabra "null"

import { createHmac } from 'node:crypto'

function env(name) {
  const v = process.env[name]
  if (!v || v.startsWith('<')) {
    throw new Error(`Falta ${name}. Copia poc/skylinkpay/.env.example a .env y rellénalo.`)
  }
  return v
}

export function config() {
  return {
    baseUrl: env('SKYLINK_BASE_URL').replace(/\/$/, ''),
    commerceCode: env('SKYLINK_COMMERCE_CODE'),
    apiKey: env('SKYLINK_API_KEY'),
  }
}

/** Serializa con claves ordenadas alfabéticamente (como el ejemplo del panel). */
export function stableJson(obj) {
  return JSON.stringify(sortKeys(obj))
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])]),
    )
  }
  return v
}

export function sign({ method, path, timestamp, payload, apiKey }) {
  const toSign = [method.toUpperCase(), path, String(timestamp), payload ?? 'null'].join('\n')
  return createHmac('sha256', apiKey).update(toSign).digest('hex')
}

/**
 * Hace una petición firmada. `body` undefined => GET/DELETE sin cuerpo.
 * Devuelve { status, ok, body, raw, requestId } sin lanzar en errores HTTP.
 */
export async function request(method, path, body, { verbose = false } = {}) {
  const { baseUrl, commerceCode, apiKey } = config()
  const timestamp = Date.now()
  const payload = body === undefined ? null : stableJson(body)
  const signature = sign({ method, path, timestamp, payload, apiKey })

  const headers = {
    'X-Api-Key': apiKey,
    'X-Commerce-Code': commerceCode,
    'X-Commerce-Id': commerceCode,
    'X-Timestamp': String(timestamp),
    'X-Signature': signature,
    Accept: 'application/json',
  }
  if (payload !== null) headers['Content-Type'] = 'application/json'

  if (verbose) {
    console.error(`→ ${method.toUpperCase()} ${baseUrl}${path}`)
    if (payload !== null) console.error(`  body: ${payload}`)
  }

  const res = await fetch(baseUrl + path, {
    method: method.toUpperCase(),
    headers,
    body: payload ?? undefined,
  })
  const raw = await res.text()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = undefined
  }
  if (verbose) console.error(`← HTTP ${res.status}`)
  return { status: res.status, ok: res.ok, body: parsed ?? raw, raw }
}

// --- Endpoints ---------------------------------------------------------------

export function createTransaction({ amount, currency = 'VES', buyOrder, sessionId, installments = 1, expirable = true }, opts) {
  return request(
    'POST',
    '/api/v1/merchant/transactions',
    { amount, buyOrder, currency, expirable, installments, sessionId },
    opts,
  )
}

export function getByToken(token, opts) {
  return request('GET', `/api/v1/merchant/transactions/token/${encodeURIComponent(token)}`, undefined, opts)
}

/** Regla de "pago confirmado" acordada en docs/skylinkpay/integracion.md §5.2. */
export function isPaid(data) {
  return data?.status === 'authorized' && data?.resultCode === 'APPROVED'
}
