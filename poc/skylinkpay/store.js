// Persistencia de los cobros de la POC.
// - Local:  data.json junto a este archivo (ignorado por git).
// - Vercel: Upstash Redis por REST (sin dependencias). Se activa si existen
//           KV_REST_API_URL + KV_REST_API_TOKEN (integración "Upstash for Redis" del
//           marketplace de Vercel) o UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Volumen pequeño: se guarda todo el array bajo una sola clave.

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = 'skylinkpay-poc:cobros'

function redisConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

class RedisStore {
  constructor({ url, token }) {
    this.url = url
    this.token = token
  }
  async cmd(...args) {
    const r = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const j = await r.json()
    if (!r.ok || j.error) throw new Error(`Redis: ${j.error ?? r.status}`)
    return j.result
  }
  async load() {
    const raw = await this.cmd('GET', KEY)
    return raw ? JSON.parse(raw) : []
  }
  async save(list) {
    await this.cmd('SET', KEY, JSON.stringify(list))
  }
  get kind() {
    return 'redis'
  }
}

class FileStore {
  constructor(file) {
    this.file = file
  }
  async load() {
    if (!existsSync(this.file)) return []
    try {
      return JSON.parse(await readFile(this.file, 'utf8'))
    } catch {
      return []
    }
  }
  async save(list) {
    await writeFile(this.file, JSON.stringify(list, null, 2))
  }
  get kind() {
    return 'file'
  }
}

export function createStore() {
  const redis = redisConfig()
  if (redis) return new RedisStore(redis)
  if (process.env.VERCEL) {
    throw new Error('En Vercel hace falta Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN).')
  }
  return new FileStore(join(dirname(fileURLToPath(import.meta.url)), 'data.json'))
}
