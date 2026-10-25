// Consulta un cobro por su token y dice si está pagado.
// Uso: node --env-file=.env get-by-token.js <token> [--watch]
//   --watch: consulta cada 5 s hasta que el cobro quede aprobado (o Ctrl+C).

import { appendFile } from 'node:fs/promises'
import { getByToken, isPaid } from './skylink.js'

const args = process.argv.slice(2)
const watch = args.includes('--watch')
const token = args.find((a) => !a.startsWith('--'))
if (!token) {
  console.error('Uso: node --env-file=.env get-by-token.js <token> [--watch]')
  process.exit(1)
}

async function once() {
  const res = await getByToken(token, { verbose: !watch })
  await appendFile(
    new URL('./transactions.log', import.meta.url),
    JSON.stringify({ at: new Date().toISOString(), action: 'get', token, status: res.status, response: res.body }) + '\n',
  )
  const d = res.body?.data
  if (!res.ok || !d) {
    console.log(JSON.stringify(res.body, null, 2))
    return false
  }
  const line = `${new Date().toLocaleTimeString()}  status=${d.status}  resultCode=${d.resultCode}  settlement=${d.settlementStatus ?? '-'}  ${d.amount / 100} ${d.currency}  buyOrder=${d.buyOrder}`
  console.log(line)
  if (isPaid(d)) {
    console.log('\n✅ PAGO CONFIRMADO')
    console.log(JSON.stringify(d, null, 2))
    return true
  }
  if (!watch) console.log(JSON.stringify(d, null, 2))
  return false
}

if (!watch) {
  await once()
} else {
  console.log('Consultando cada 5 s… (Ctrl+C para salir)')
  while (!(await once())) await new Promise((r) => setTimeout(r, 5000))
}
