# SkyLinkPay – material bruto

Cole aqui tudo o que você recebeu ou sabe sobre a integração, na ordem que vier: e-mails,
PDFs convertidos em texto, exemplos de requisição e resposta, links de documentação, prints
descritos em texto, o que o contato deles falou por WhatsApp, condições comerciais.

Não precisa organizar. Eu leio este arquivo e destilo tudo em `integracion.md`.

⚠️ Substitua credenciais reais por marcadores: `<API_KEY>`, `<SECRET>`, `<MERCHANT_ID>`.
Este repositório está no GitHub.

---

## Bloco 1 – Painel "Cómo integrar Skylink Pay" (print, 2026-10-24)

Texto do painel:

> Cada endpoint muestra la petición y la respuesta de ejemplo. Tu servidor firma con HMAC;
> el tester firma por ti para que puedas probar sin salir del panel.
>
> 1. **Credenciales.** Copia el commerceCode y la apiKey de Configuración (GET /merchants/me).
>    Van en cada request.
> 2. **Firma en tu servidor.** HMAC-SHA256 de `METHOD\npath\ntimestamp\nbody` (con saltos de
>    línea), usando la API Key como secreto.
> 3. **Cinco cabeceras.** X-Api-Key, X-Commerce-Code, X-Commerce-Id, X-Timestamp y X-Signature.
> 4. **Cobra.** POST /api/v1/merchant/transactions y abre la URL /pay/{token}.

Campos mostrados:

- Código de comercio: `<COMMERCE_CODE>` (12 dígitos)
- API key HMAC: `<API_KEY>` (64 hex)
- Base URL: `https://dev-axis-payment.valinkgroup.com`
- Host: `dev-axis-payment.valinkgroup.com`

(Valores reais guardados em `poc/skylinkpay/.env`, fora do git.)

---

## Bloco 2 – Painel "Desarrolladores API" (print)

Lista de endpoints no menu lateral:

- COBROS
  - POST Crear transacción
  - GET Listar transacciones
  - GET Consultar transacción
  - GET Consultar por token
  - POST Reembolsar
  - POST Anular transacción
- TASAS
  - GET Tasa BCV

### POST Crear transacción

"Crea un cobro y devuelve el token y la URL de pago para el checkout."

URL: `https://dev-axis-payment.valinkgroup.com/api/v1/merchant/transactions`

Notas do painel:

- En el formulario el monto va en bolívares (25.00). En la respuesta `amount` ya está en
  céntimos: 2500 = Bs. 25,00.
- `expirable` va por cobro. El default es true. Con false el cobro no vence por tiempo, y el
  API solo lo acepta si currency es USD.
- Guarda `token` y `url`. Con el token consultas el cobro y con url abres la página de pago.

Ejemplo firmado de este endpoint ("Firma estas 4 líneas, en este orden, separadas por un salto
de línea. El path no lleva dominio ni query."):

| Línea | Valor |
|---|---|
| 1 · Método | `POST` |
| 2 · Path | `/api/v1/merchant/transactions` |
| 3 · Timestamp | `Date.now()` en milisegundos, el mismo de la cabecera |
| 4 · Body | `{"amount":2500,"buyOrder":"ORD-1001","currency":"VES","expirable":true,"installments":1,"sessionId":"SES-1001"}` |

Cabeceras:

| Header | Valor |
|---|---|
| Content-Type | application/json |
| X-Api-Key | `<API_KEY>` |
| X-Commerce-Code | `<COMMERCE_CODE>` |
| X-Commerce-Id | `<COMMERCE_CODE>` (mismo valor en el ejemplo) |
| X-Timestamp | el mismo timestamp de la línea 3 |
| X-Signature | HMAC-SHA256 de las 4 líneas, en hexadecimal |

---

## Bloco 3 – Request / response de ejemplo (print)

Lo que se envía ("path y query van en la URL; body es el JSON"):

```json
{
  "body": {
    "buyOrder": "ORD-1001",
    "sessionId": "SES-1001",
    "amount": 2500,
    "currency": "VES",
    "installments": 1,
    "expirable": true
  }
}
```

Respuesta de ejemplo:

```json
{
  "success": true,
  "message": "Transacción creada",
  "data": {
    "id": "uuid",
    "buyOrder": "ORD-1001",
    "sessionId": "SES-1001",
    "amount": 2500,
    "currency": "VES",
    "installments": 1,
    "expirable": true,
    "token": "payment-token",
    "url": "https://dev-axis-payment.valinkgroup.com/pay/payment-token",
    "status": "created",
    "resultCode": "PENDING",
    "resultMessage": "Operación pendiente de confirmación",
    "retryable": true
  }
}
```

---

## Bloco 4 – Painel "Configuración" (print)

"Crea tu comercio o consulta tus credenciales." Datos editables: nombre, contacto, liquidación,
URLs y logo del checkout.

- Logo de la tienda: PNG, JPG o WebP, máx. 4 MB, o URL. Lo ve el pagador al abrir el link.
- Nombre: (comercio de prueba: "Urbanización Los Frailejones")
- RIF o cédula: letra + número (V, E, J, G). *(valor omitido)*
- Teléfono: operadora (0412, 0414, 0416…) + 7 dígitos. *(valor omitido)*
- **URL de notificaciones**: "Recibe eventos del comercio. Puedes enviar un evento de prueba sin
  mover dinero." Botón **Probar webhook**.
- **URL de retorno**: por defecto la página de referencia de Skylink Pay
  `https://skylinkpay.valinkgroup.com/pago-exitoso`; se puede desmarcar y poner una propia.
- Banco y número de cuenta (liquidación). Ejemplo: 0102 · Banco de Venezuela.
- Botones: Probar webhook · Actualizar desde el servidor · Guardar cambios.
- Vista del checkout: logo, nombre del comercio, "Paga con Skylink Pay".

---

## Bloco 5 – "Probar webhook" com a URL placeholder (print, 2026-10-24)

Cabeçalho do painel: "Respuesta del webhook · Evento de prueba · revisa también el receptor
configurado".

```json
{
  "success": false,
  "message": "El webhook no respondió en 10 segundos.",
  "data": null
}
```

Conclusão: timeout de 10 s no webhook; a URL configurada (`https://mitienda.com.br`, placeholder)
não respondeu. Precisamos de um receptor público para capturar o payload do evento de teste.

---

## Bloco 6 – Evento de teste capturado no webhook.site (print, 2026-10-24 20:27 VET)

Request: `POST https://webhook.site/<id>` · 307 bytes · origem IP 3.83.34.63 (Ashburn, Virginia).

Cabeçalhos recebidos:

| Header | Valor |
|---|---|
| content-type | application/json |
| content-length | 307 |
| user-agent | SkylinkPay-Webhook-Test/1.0 |
| accept | */* |
| accept-encoding | br, gzip, deflate |
| accept-language | * |
| sec-fetch-mode | cors |
| x-invocation-id | pdx1::zw929-1792888049960-276fa95b9ad6 |
| x-vercel-id | pdx1::zw929-1792888049960-276fa95b9ad6 |
| host | webhook.site |

(Nenhum header de assinatura: sem X-Signature, X-Timestamp nem similar.)

Corpo:

```json
{
  "eventId": "5965d78c-a469-43c7-ad29-6c05011f4418",
  "eventType": "webhook.test",
  "test": true,
  "sentAt": "2026-10-25T00:27:30.275Z",
  "merchant": {
    "id": "<MERCHANT_ID>",
    "commerceCode": "<COMMERCE_CODE>",
    "name": "Urbanización Los Frailejones"
  },
  "message": "Prueba manual de webhook desde Skylink Pay."
}
```

---

## Bloco 7 – GET Consultar por token (print, 2026-10-24)

"Busca el cobro usando el token de pago del checkout."

URL: `https://dev-axis-payment.valinkgroup.com/api/v1/merchant/transactions/token/{token}`

Nota: "Misma forma que Consultar transacción. El token es el de la url /pay/{token}."

Ejemplo firmado (4 líneas):

| Línea | Valor |
|---|---|
| 1 · Método | `GET` |
| 2 · Path | `/api/v1/merchant/transactions/token/{token}` |
| 3 · Timestamp | `Date.now()` en milisegundos, el mismo de la cabecera |
| 4 · Body | `null` |

"Esta llamada no lleva cuerpo. No mandes `{}`, ni null, ni el token. La línea 4 existe solo
para firmar."

Cabeceras: X-Api-Key, X-Commerce-Code, X-Commerce-Id, X-Timestamp, X-Signature (sin
Content-Type en el ejemplo).

Respuesta de ejemplo:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "buyOrder": "ORD-1001",
    "sessionId": "SES-1001",
    "amount": 2500,
    "currency": "VES",
    "installments": 1,
    "token": "payment-token",
    "status": "authorized",
    "settlementStatus": "pending",
    "resultCode": "APPROVED",
    "resultMessage": "Cobro aprobado",
    "retryable": false,
    "expirable": true,
    "paymentMethod": "pago_movil_p2p",
    "paymentTypeCode": "P2P",
    "bankCode": "0191",
    "bankReference": "000000000000",
    "phoneNumber": "04120000000",
    "nationalId": "V00000000",
    "vesAmount": 2500,
    "mdrRateBps": 290,
    "commission": 0,
    "netAmount": 2500,
    "withholdingAmount": 0
  }
}
```

---

## Bloco 8

(cole aqui)

---

## Links

- Panel dev: https://dev-axis-payment.valinkgroup.com (login con la cuenta del comercio)
- Página de retorno por defecto: https://skylinkpay.valinkgroup.com/pago-exitoso

---

## Contato na SkyLinkPay e combinados comerciais

(quem é o contato, o que foi acordado sobre taxa, prazo, piloto)
