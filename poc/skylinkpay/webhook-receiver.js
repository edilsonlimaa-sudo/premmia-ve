// Receptor de webhook para la POC de SkyLinkPay.
// Acepta cualquier método y ruta, registra cabeceras + cuerpo en consola y en
// webhooks.log (una línea JSON por evento) y responde 200 de inmediato
// (SkyLinkPay corta a los 10 segundos).

import { createServer } from 'node:http'
import { appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const LOG = join(dirname(fileURLToPath(import.meta.url)), 'webhooks.log')

const server = createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', async () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    let body = raw
    try {
      body = raw ? JSON.parse(raw) : null
    } catch {
      /* no es JSON: se guarda tal cual */
    }

    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('skylinkpay-poc webhook receiver OK\n')
      return
    }

    const event = {
      receivedAt: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
      raw,
    }

    // Responder primero: la validación de firma se hace después, con lo registrado.
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ received: true }))

    console.log('\n=== WEBHOOK', event.receivedAt, req.method, req.url, '===')
    console.log('headers:', JSON.stringify(req.headers, null, 2))
    console.log('body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2))
    try {
      await appendFile(LOG, JSON.stringify(event) + '\n')
    } catch (e) {
      console.error('No se pudo escribir webhooks.log', e)
    }
  })
})

server.listen(PORT, () => {
  console.log(`Receptor escuchando en http://localhost:${PORT} · log: ${LOG}`)
})
