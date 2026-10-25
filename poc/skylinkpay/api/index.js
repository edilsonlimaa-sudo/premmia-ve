// Entrada para Vercel (función serverless Node). vercel.json reenvía /api/* y /webhook aquí.
// Los archivos de public/ los sirve Vercel como estáticos.
import { handle } from '../handler.js'

export default function vercelHandler(req, res) {
  return handle(req, res)
}
