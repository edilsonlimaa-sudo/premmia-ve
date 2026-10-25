# POC "Pago desde el carro" · SkyLinkPay

App de dos pantallas (Conductor / Bombero) que crea un cobro en SkyLinkPay, abre su checkout y
consulta el estado por token hasta verlo pagado. Referencia de la API: `../../docs/skylinkpay/`.

## Local

```bash
cp .env.example .env   # y rellenar
npm run dev            # http://localhost:3000
```

Guarda los cobros en `data.json` y escribe `transactions.log` / `webhooks.log` (todo ignorado por git).

Scripts sueltos: `npm run create -- 25 AB123CD`, `npm run status -- <token> --watch`, `npm run selftest`.

## Vercel (URL pública fija → sirve para la "URL de notificaciones")

1. En vercel.com → **Add New → Project** → importar `edilsonlimaa-sudo/premmia-ve`.
2. **Root Directory**: `poc/skylinkpay`. Framework preset: *Other*. Sin build command.
3. **Storage → Create → Upstash for Redis** (gratis) y conectarlo al proyecto. Eso crea las
   variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` automáticamente.
4. **Environment Variables**: `SKYLINK_BASE_URL`, `SKYLINK_COMMERCE_CODE`, `SKYLINK_API_KEY`
   (los valores del `.env`). Opcional: `POC_PIN` para que solo quien sepa el PIN pueda crear
   cobros desde la URL pública (el frontend lo pide una vez y lo recuerda en el navegador).
5. Deploy. Comprobar `https://<proyecto>.vercel.app/api/health` → `{ ok: true, store: "redis" }`.
6. En el panel de SkyLinkPay → Configuración → **URL de notificaciones**:
   `https://<proyecto>.vercel.app/webhook` → Guardar → **Probar webhook**. El evento aparece en
   Vercel → Logs de la función.

Cada push a `main` redepliega.

## Rutas

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/cobros` | `{ placa, montoBs }` → crea el cobro en SkyLinkPay |
| GET | `/api/cobros` | últimos 50 cobros |
| GET | `/api/cobros/:id` | un cobro, refrescando el estado si no está pagado |
| GET | `/api/placa/:placa` | último cobro de esa placa, refrescado |
| POST | `/webhook` | receptor de SkyLinkPay: registra y refresca por token |
| GET | `/api/health` | diagnóstico sin secretos |
