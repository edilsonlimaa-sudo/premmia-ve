# SkyLinkPay – referência de integração

> Documento vivo. Fonte: `material-bruto.md` (prints do painel dev) + o que descobrirmos na POC.
> Última revisão: 2026-10-24. Itens marcados **(pendente)** ainda não foram confirmados.

## 1. O que a SkyLinkPay faz para nós

- Checkout hospedado: criamos uma cobrança via API, recebemos um `token` e uma `url`
  (`/pay/{token}`); o pagador abre a URL e paga lá (Pago Móvil; outros meios **pendente**).
- Conciliação: a SkyLinkPay confirma o pagamento e nos avisa por webhook na "URL de
  notificaciones" configurada no painel. Também dá para consultar por token.
- Liquidação: cai na conta bancária configurada no painel (banco + número de conta).
- Taxa: 3 % (a negociar; ver §8).

Papel na nossa ideia: o motorista paga pelo nosso checkout antes de chegar à bomba; quando a
SkyLinkPay confirma, marcamos a placa como paga e o frentista libera sem o motorista descer.

## 2. Ambientes

| Ambiente | URL base | Credenciais | Observações |
|---|---|---|---|
| Dev | `https://dev-axis-payment.valinkgroup.com` | `poc/skylinkpay/.env` | Painel com tester que assina por nós. Comércio de teste: "Urbanización Los Frailejones". |
| Produção | **(pendente)** | **(pendente)** | Perguntar URL base e como obter credenciais de produção. |

Credenciais: `commerceCode` (12 dígitos) e `apiKey` (64 hex), obtidas em Configuración ou via
`GET /merchants/me` **(path exato pendente; provavelmente `/api/v1/merchants/me`)**.

## 3. Autenticação: HMAC-SHA256 em cada request

Toda requisição leva cinco cabeçalhos além de `Content-Type: application/json`:

| Header | Valor |
|---|---|
| `X-Api-Key` | apiKey |
| `X-Commerce-Code` | commerceCode |
| `X-Commerce-Id` | commerceCode (mesmo valor no exemplo do painel) |
| `X-Timestamp` | `Date.now()` em **milissegundos** |
| `X-Signature` | HMAC-SHA256, em hexadecimal, da string abaixo, com a apiKey como segredo |

String assinada: quatro linhas separadas por `\n`, nesta ordem, **sem** `\n` final:

```
METHOD
path
timestamp
body
```

- `METHOD` em maiúsculas (`POST`, `GET`).
- `path` sem domínio e sem query string (ex.: `/api/v1/merchant/transactions`).
- `timestamp` idêntico ao header `X-Timestamp`.
- `body` é o JSON **exatamente como enviado** (mesma serialização, mesma ordem de chaves).
  No exemplo do painel as chaves estão em ordem alfabética
  (`amount, buyOrder, currency, expirable, installments, sessionId`).
- **GET (sem corpo):** a linha 4 é a palavra literal `null`. A requisição **não** leva body
  nenhum (nem `{}`, nem `null`, nem o token); a linha existe só para assinar.
- Tolerância de relógio e janela de validade do timestamp: **(pendente)**.

Referência em Node (a usar na POC):

```js
import { createHmac } from 'node:crypto'

export function signedHeaders({ method, path, body, apiKey, commerceCode }) {
  const timestamp = String(Date.now())
  const payload = body === undefined ? null : JSON.stringify(body)
  // Sem corpo (GET) a 4ª linha é a palavra "null"; com corpo, o JSON exato que será enviado.
  const toSign = [method.toUpperCase(), path, timestamp, payload ?? 'null'].join('\n')
  const signature = createHmac('sha256', apiKey).update(toSign).digest('hex')
  return {
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      'X-Commerce-Code': commerceCode,
      'X-Commerce-Id': commerceCode,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    payload, // enviar ESTA string como body (ou nenhum body quando for null)
  }
}
```

Implementação real: `poc/skylinkpay/skylink.js`.

## 4. Fluxo de pagamento (ponta a ponta)

1. Motorista informa placa e valor no nosso app → nosso backend chama **Crear transacción**
   com `buyOrder` = nosso id (ex.: `PLACA-AB123CD-<timestamp>`) e `sessionId` = sessão/dispositivo.
2. Guardamos `data.id`, `token`, `url`, `status`, `resultCode` junto com a placa.
3. Abrimos `url` (`/pay/{token}`) para o motorista pagar no checkout da SkyLinkPay.
4. Ao terminar, o pagador volta à **URL de retorno** (padrão: página da SkyLinkPay; pode ser a nossa).
5. A SkyLinkPay envia um evento à **URL de notificaciones** (webhook) → atualizamos o status
   da placa para pago. Fallback: polling com **Consultar por token**.
6. Frentista consulta a placa no app e vê "PAGADO" → abastece.

```
App motorista ──▶ Nosso backend ──▶ POST /api/v1/merchant/transactions
                       │◀──────────── { token, url, status: created }
                       │
   abre url /pay/{token} ──▶ Checkout SkyLinkPay ──▶ pagamento
                       │◀──────────── webhook (URL de notificaciones)
                       │
App frentista ──▶ GET placa ──▶ "PAGADO"
```

## 5. Endpoints

Base: `https://dev-axis-payment.valinkgroup.com`

| Grupo | Método | Rota | Status |
|---|---|---|---|
| Cobros | POST | `/api/v1/merchant/transactions` | documentado abaixo |
| Cobros | GET | Listar transacciones | **(rota pendente)** |
| Cobros | GET | Consultar transacción (por id) | "misma forma" que por token; rota provável `/api/v1/merchant/transactions/{id}` **(confirmar)** |
| Cobros | GET | `/api/v1/merchant/transactions/token/{token}` | documentado abaixo |
| Cobros | POST | Reembolsar | **(rota pendente)** |
| Cobros | POST | Anular transacción | **(rota pendente)** |
| Tasas | GET | Tasa BCV | **(rota pendente)** |
| Merchant | GET | `/merchants/me` (credenciais) | **(prefixo pendente)** |

### 5.1 Crear transacción — `POST /api/v1/merchant/transactions`

Request:

```json
{
  "buyOrder": "ORD-1001",
  "sessionId": "SES-1001",
  "amount": 2500,
  "currency": "VES",
  "installments": 1,
  "expirable": true
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `buyOrder` | string | Nosso identificador do pedido. Unicidade exigida? **(pendente)** |
| `sessionId` | string | Nosso identificador de sessão. |
| `amount` | inteiro | **Em céntimos**: `2500` = Bs 25,00. (Para USD, também em centavos? **pendente**) |
| `currency` | `"VES"` \| `"USD"` | |
| `installments` | inteiro | Usar `1`. |
| `expirable` | boolean | Default `true`. `false` só é aceito com `currency: "USD"` (cobrança sem vencimento). Tempo de expiração quando `true`: **(pendente)** |

Response (200):

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

Guardar `data.id`, `data.token` e `data.url`. Respostas de erro (formato, códigos HTTP,
assinatura inválida): **(pendente)**.

**Confirmado na prática (2026-10-24, POC):** a chamada real respondeu `HTTP 201` em ~3,8 s com a
assinatura aceita de primeira. O `token` real tem 64 hex. Além do exemplo do painel, a resposta
trouxe `settlementStatus: null`, `mdrRateBps: 290`, `partnerCommissionAmount: 0`,
`withholdingRateBps: 0`, `vesAmount`, `createdAt` e `updatedAt`. Não devolve `installments`
diferente de 1 nem campos do pagador (ainda não pagou).

### 5.2 Consultar por token — `GET /api/v1/merchant/transactions/token/{token}`

Busca a cobrança pelo token do checkout (o mesmo da URL `/pay/{token}`). Sem corpo; assinar com
a linha 4 = `null` (ver §3). É a **fonte de verdade** do status: usar para polling e para
confirmar qualquer webhook antes de marcar a placa como paga.

Response de exemplo (cobrança já paga):

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

Campos além dos de criação:

| Campo | Notas |
|---|---|
| `status` | `created` ao criar → `authorized` quando pago. Outros valores (falhou, expirou, anulado, reembolsado) **(pendente)**. |
| `resultCode` / `resultMessage` | `PENDING` → `APPROVED` / "Cobro aprobado". Outros **(pendente)**. |
| `settlementStatus` | Liquidação ao comércio: `pending` logo após pagar. Valores e prazo **(pendente)**. Não importa para liberar a bomba. |
| `retryable` | `true` enquanto pendente, `false` quando aprovado. |
| `paymentMethod` / `paymentTypeCode` | `pago_movil_p2p` / `P2P`. Outros meios **(pendente)**. |
| `bankCode`, `bankReference`, `phoneNumber`, `nationalId` | Dados do pagador no Pago Móvil. **Dados pessoais**: guardar só o necessário. |
| `vesAmount` | Valor em Bs (céntimos); relevante quando `currency` é USD. |
| `mdrRateBps` | Taxa do serviço em pontos-base: `290` = **2,90 %**. |
| `commission`, `netAmount`, `withholdingAmount` | Comissão cobrada, líquido ao comércio, retenção. No exemplo ainda zerados. |

**Regra de "pago confirmado" para a POC:** `status === 'authorized' && resultCode === 'APPROVED'`.

### 5.3 Webhook (URL de notificaciones)
- Configurado no painel, em Configuración → "URL de notificaciones". O botão **Probar webhook**
  envia um evento de teste sem mover dinheiro.
- **Timeout de 10 segundos.** Se a nossa URL não responder nesse tempo, o painel devolve
  `{"success": false, "message": "El webhook no respondió en 10 segundos.", "data": null}`.
  Regra para a POC: responder `200` imediatamente e processar depois.
- Receptor da POC: `POST /webhook` em `poc/skylinkpay/handler.js`. Em local (`npm run dev`)
  registra em `webhooks.log` e precisa de túnel (`npm run tunnel`). **Na Vercel** a URL é fixa:
  `https://<proyecto>.vercel.app/webhook` → é a que vai em "URL de notificaciones". Passos de
  deploy em `poc/skylinkpay/README.md` (root `poc/skylinkpay`, Upstash Redis do marketplace para
  guardar os cobros, variáveis `SKYLINK_*`).
- Se o evento trouxer `data.token`, o receptor consulta a API por token (limitado a 6 s) e
  responde `{ received: true, refreshed: true }`; sem token conhecido, só registra.

**Evento de teste capturado (2026-10-24, via webhook.site):**

- `POST` com `Content-Type: application/json`, `User-Agent: SkylinkPay-Webhook-Test/1.0`.
- Origem: IP `3.83.34.63`, headers `x-vercel-id` / `x-invocation-id` → o backend deles roda na
  Vercel (região `pdx1`). O IP pode mudar; **não** filtrar por IP.
- **Sem assinatura:** nenhum `X-Signature`, `X-Timestamp` ou `X-Api-Key`. Pelo menos o evento de
  teste não é assinado. Se os eventos de pagamento também não forem, o webhook sozinho **não é
  prova de pagamento**: tratar como "aviso" e confirmar sempre com **Consultar por token** (5.2)
  antes de marcar a placa como paga.

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

| Campo | Notas |
|---|---|
| `eventId` | uuid; usar para idempotência (ignorar repetidos). |
| `eventType` | `webhook.test` no teste. Tipos de evento de pagamento (ex.: `transaction.paid`?) **(pendente)**. |
| `test` | `true` no evento de teste; esperar `false` nos reais. |
| `sentAt` | ISO 8601 UTC. |
| `merchant` | `id` (uuid interno), `commerceCode`, `name`. Validar que `commerceCode` é o nosso. |
| `message` | texto livre. |
| dados da transação | ausentes no teste; esperar algo como `data` / `transaction` com `id`, `token`, `buyOrder`, `status` **(pendente)**. |

- Reentregas e idempotência: **(pendente)**. Guardar `eventId` processados.
- Payload, cabeçalhos e assinatura do webhook: **(pendente)**. Assumir que precisamos validar
  uma assinatura HMAC com a mesma apiKey até confirmar.
- Reentregas e idempotência: **(pendente)**. Tratar o webhook como idempotente pelo `data.id`.

### 5.4 Reembolsar / Anular — **(pendente)**
Existem no painel; regras e prazos a descobrir.

### 5.5 Tasa BCV — **(pendente)**
Útil para mostrar o valor em USD/Bs ao motorista.

## 6. Checkout e painel

- A página `/pay/{token}` mostra o nome e o RIF/cédula do comércio, o valor ("Monto total a pagar
  Bs. 25,00 · Pago en Bs. · Moneda local"), o número do pedido (`buyOrder`) e "Pago seguro".
- **Expira em ~15 minutos**: o checkout mostra "Tiempo restante para pagar" começando perto de
  14:00 logo após criar. Isso responde ao tempo de `expirable: true`. Para a bomba é suficiente,
  mas o app deve criar a cobrança só quando o motorista já estiver na fila.
- **Dois meios de pagamento** (dev, 2026-10-24):
  1. **Pago Móvil**: "paga desde la app de tu banco y luego avísanos aquí". O pagador faz o
     Pago Móvil no banco dele e confirma no checkout. Como a SkyLinkPay concilia isso é a parte
     que interessa **(observar no primeiro pagamento real)**.
  2. **Pago con código al teléfono (SMS)**: telefone da conta, cédula, banco e nome; chega um
     código por SMS e o pagamento sai da conta. É o débito imediato tipo C2P.
- Lista de bancos no checkout: BCV, Venezuela, Venezolano de Crédito, Mercantil, Provincial,
  Bancaribe, Exterior, Caroní, Banesco, Sofitasa, Plaza, Bangente, BFC, 100% Banco, Delsur,
  Tesoro, Agrícola, Bancrecer, R4, Activo, Bancamiga, BID, Banplus, Digital de los Trabajadores,
  Banfanb, N58, BNC, IMCP.
- Link "Cancelar pago y volver a la tienda" → provavelmente a URL de retorno **(confirmar)**.
- URL de retorno: para onde o **navegador do pagador** é redirecionado ao terminar no checkout.
  Padrão `https://skylinkpay.valinkgroup.com/pago-exitoso`; podemos apontar para uma página
  nossa (ex.: "recibimos tu pago, muestra la placa al bombero"). É experiência de usuário, **não
  confirmação**: qualquer um pode abrir a URL sem pagar, e o pagador pode fechar o navegador
  antes de chegar nela. A confirmação vem do webhook + consulta por token.
  Se levar o token como parâmetro **(pendente)**, a página consulta o status e mostra
  "procesando" até a API confirmar.
- Dados do comércio no painel: nome, RIF/cédula, telefone, banco e conta de liquidação.
- Hipótese de produto: um comércio SkyLinkPay por posto (a liquidação cai na conta do posto)
  **(confirmar se um mesmo login pode ter vários comércios; pendente)**.

## 7. Modelo de dados que a POC precisa guardar

| Campo | Origem | Para quê |
|---|---|---|
| `skylink_id` (uuid) | resposta de 5.1 | conciliar webhook / consulta |
| `token`, `url` | resposta de 5.1 | polling e reabrir checkout |
| `buy_order` | nosso | idempotência do nosso lado |
| `placa` | nosso app | o frentista consulta por placa |
| `amount`, `currency` | nosso app | mostrar ao frentista |
| `status`, `result_code` | create + webhook | pendiente / pagado / fallido / expirado |
| `created_at`, `paid_at` | ambos | auditoria |
| payload bruto do webhook | webhook | debug enquanto o formato não está documentado |

## 8. Condições comerciais e contato

- Contato: **(pendente)**
- Taxa: 3 % mencionada; a API devolve `mdrRateBps: 290` (2,90 %). Split a negociar ("tá aberto a negociar").
- Piloto: **(pendente)**

## 9. Perguntas em aberto para a SkyLinkPay

- [ ] Rotas exatas de Listar, Consultar (id), Reembolsar, Anular, Tasa BCV e `/merchants/me`.
- [x] ~~Como assinar um GET~~ → linha 4 = `null`, sem body.
- [x] ~~Rota de consultar por token~~ → `GET /api/v1/merchant/transactions/token/{token}`.
- [ ] Janela de validade do `X-Timestamp`.
- [ ] `mdrRateBps: 290` (2,90 %) é a taxa padrão? É sobre o bruto? Entra em `commission` após liquidar?
- [ ] Webhook: os eventos de pagamento são assinados? (o de teste não traz assinatura). Quais
      `eventType` existem e qual é o payload da transação? Política de reentrega?
- [ ] Lista completa de `status` e `resultCode` e qual significa "dinheiro confirmado".
- [x] ~~Tempo de expiração de uma cobrança `expirable: true`~~ → ~15 min (cronômetro do checkout).
- [x] ~~Meios de pagamento no checkout~~ → Pago Móvil (avisa depois de pagar) e código por SMS.
- [ ] `amount` em USD é em centavos?
- [ ] URL base e credenciais de produção; existe sandbox com dinheiro fictício?
- [ ] Um login pode administrar vários comércios (um por posto)?
- [ ] URL de retorno: o redirecionamento leva parâmetros (token, status, buyOrder)? Existe URL
      distinta para pagamento falho/cancelado ou tudo cai na mesma?
- [ ] Taxa final e split.

## 10. Decisões da POC

| Data | Decisão | Motivo |
|---|---|---|
| 2026-10-24 | Credenciais ficam em `poc/skylinkpay/.env` (ignorado pelo git); docs usam `<API_KEY>` / `<COMMERCE_CODE>`. | Repositório público no GitHub. |
| 2026-10-24 | POC será um serviço Node separado em `poc/skylinkpay`, não dentro do PWA. | Assinatura HMAC exige a apiKey no servidor; webhook precisa de endpoint público. |
| 2026-10-24 | O webhook é aviso, não prova: a placa só vira "pagada" após confirmar por consulta à API. | O evento de teste chegou sem assinatura; qualquer um que descubra a URL poderia forjar um POST. |
| 2026-10-24 | App POC "Pago desde el carro" em `poc/skylinkpay` (`npm run dev`): telas Conductor e Bombero, API própria, polling a cada 4 s por token. | Ver o fluxo ponta a ponta antes de desenhar o produto. Primeira cobrança real criada no dev: `HTTP 201`, checkout aberto. |
