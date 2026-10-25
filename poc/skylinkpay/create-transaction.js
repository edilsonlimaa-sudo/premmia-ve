// Crea un cobro en SkyLinkPay y guarda la respuesta en transactions.log.
// Uso: node --env-file=.env create-transaction.js [montoBs] [placa]
//   montoBs: en bolívares, p. ej. 25 o 25.50 (se convierte a céntimos). Default 25.
//   placa:   opcional; se incluye en buyOrder para la POC. Default POC.

import { appendFile } from 'node:fs/promises'
import { createTransaction } from './skylink.js'

const [, , montoArg = '25', placaArg = 'POC'] = process.argv
const montoBs = Number(montoArg.replace(',', '.'))
if (!Number.isFinite(montoBs) || montoBs <= 0) {
  console.error('Monto inválido:', montoArg)
  process.exit(1)
}
const amount = Math.round(montoBs * 100) // céntimos
const placa = placaArg.toUpperCase().replace(/[^A-Z0-9]/g, '')
const stamp = Date.now()
const buyOrder = `${placa}-${stamp}`
const sessionId = `POC-${stamp}`

const res = await createTransaction({ amount, currency: 'VES', buyOrder, sessionId }, { verbose: true })

console.log(JSON.stringify(res.body, null, 2))
await appendFile(
  new URL('./transactions.log', import.meta.url),
  JSON.stringify({ at: new Date().toISOString(), action: 'create', placa, amount, buyOrder, sessionId, status: res.status, response: res.body }) + '\n',
)

const data = res.body?.data
if (res.ok && data?.token) {
  console.log('\nToken :', data.token)
  console.log('URL   :', data.url)
  console.log(`\nAbre la URL para pagar. Luego: npm run status -- ${data.token}`)
} else {
  process.exit(2)
}
