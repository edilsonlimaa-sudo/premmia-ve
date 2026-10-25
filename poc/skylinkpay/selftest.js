// Comprobación local de la firma, sin red ni credenciales reales.
// Reproduce el ejemplo del panel y verifica que la cadena firmada tenga la forma esperada.
import { createHmac } from 'node:crypto'
import { sign, stableJson } from './skylink.js'

const apiKey = 'clave-de-prueba'
const body = { buyOrder: 'ORD-1001', sessionId: 'SES-1001', amount: 2500, currency: 'VES', installments: 1, expirable: true }
const payload = stableJson(body)
const expectedPayload = '{"amount":2500,"buyOrder":"ORD-1001","currency":"VES","expirable":true,"installments":1,"sessionId":"SES-1001"}'

let failed = 0
function check(name, ok, extra = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`)
  if (!ok) failed++
}

check('body serializado como en el panel (claves ordenadas)', payload === expectedPayload, payload)

const ts = 1700000000000
const manualPost = createHmac('sha256', apiKey)
  .update(`POST\n/api/v1/merchant/transactions\n${ts}\n${expectedPayload}`)
  .digest('hex')
check('firma POST = HMAC de las 4 líneas', sign({ method: 'post', path: '/api/v1/merchant/transactions', timestamp: ts, payload, apiKey }) === manualPost)

const manualGet = createHmac('sha256', apiKey)
  .update(`GET\n/api/v1/merchant/transactions/token/abc\n${ts}\nnull`)
  .digest('hex')
check('firma GET usa "null" como 4ª línea', sign({ method: 'GET', path: '/api/v1/merchant/transactions/token/abc', timestamp: ts, payload: null, apiKey }) === manualGet)

check('firma en hexadecimal de 64 caracteres', /^[0-9a-f]{64}$/.test(manualPost))

process.exit(failed ? 1 : 0)
