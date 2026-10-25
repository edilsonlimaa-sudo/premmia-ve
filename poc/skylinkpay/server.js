// Servidor local de la POC: sirve public/ y delega la API a handler.js.
//   npm run dev  →  node --env-file=.env server.js  (http://localhost:3000)

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join, dirname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handle } from './handler.js'
import { config } from './skylink.js'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), 'public')
const PORT = Number(process.env.PORT ?? 3000)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' }

config() // falla pronto si falta el .env

async function serveStatic(res, urlPath) {
  const file = normalize(join(PUBLIC, urlPath === '/' ? '/index.html' : urlPath))
  if (!file.startsWith(PUBLIC) || !existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
  res.end(await readFile(file))
}

createServer((req, res) => {
  const path = new URL(req.url, 'http://local').pathname
  if (path.startsWith('/api/') || path === '/webhook') return handle(req, res)
  if (req.method === 'GET') return serveStatic(res, path)
  res.writeHead(405).end()
}).listen(PORT, () => {
  console.log(`POC Pago desde el carro → http://localhost:${PORT}  (webhook: POST /webhook)`)
})
