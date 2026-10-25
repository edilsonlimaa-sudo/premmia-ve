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
  (`amount, buyOrder, currency, expirable, installments, sessionId`). Para GET o body é vazio
  **(confirmar se é string vazia ou se a linha some; pendente)**.
- Tolerância de relógio e janela de validade do timestamp: **(pendente)**.

Referência em Node (a usar na POC):

```js
import { createHmac } from 'node:crypto'

export function signedHeaders({ method, path, body, apiKey, commerceCode }) {
  const timestamp = String(Date.now())
  const payload = body ? JSON.stringify(body) : ''
  const toSign = [method.toUpperCase(), path, timestamp, payload].join('\n')
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
    payload, // enviar ESTA string como body, não re-serializar
  }
}
```

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
| Cobros | GET | Consultar transacción (por id) | **(rota pendente)** |
| Cobros | GET | Consultar por token | **(rota pendente)** |
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

### 5.2 Consultar por token — **(pendente)**
Usar para polling do status. Valores possíveis de `status` / `resultCode`: só conhecemos
`created` / `PENDING` **(lista completa pendente)**.

### 5.3 Webhook (URL de notificaciones) — **(pendente)**
- Configurado no painel, em Configuración → "URL de notificaciones". Tem botão **Probar webhook**
  que envia um evento de teste sem mover dinheiro: primeira coisa a usar na POC para capturar o
  payload real.
- Payload, cabeçalhos e assinatura do webhook: **(pendente)**. Assumir que precisamos validar
  uma assinatura HMAC com a mesma apiKey até confirmar.
- Reentregas e idempotência: **(pendente)**. Tratar o webhook como idempotente pelo `data.id`.

### 5.4 Reembolsar / Anular — **(pendente)**
Existem no painel; regras e prazos a descobrir.

### 5.5 Tasa BCV — **(pendente)**
Útil para mostrar o valor em USD/Bs ao motorista.

## 6. Checkout e painel

- A página `/pay/{token}` mostra logo e nome do comércio, "Paga con Skylink Pay".
- URL de retorno: padrão `https://skylinkpay.valinkgroup.com/pago-exitoso`; podemos apontar
  para uma página nossa (ex.: tela "pago recibido, muestre la placa").
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
- Taxa: 3 % mencionada; split a negociar ("tá aberto a negociar").
- Piloto: **(pendente)**

## 9. Perguntas em aberto para a SkyLinkPay

- [ ] Rotas exatas de Listar, Consultar (id), Consultar por token, Reembolsar, Anular, Tasa BCV e `/merchants/me`.
- [ ] Como assinar um GET (body vazio: linha vazia ou omitida?).
- [ ] Janela de validade do `X-Timestamp`.
- [ ] Payload e assinatura do webhook; política de reentrega.
- [ ] Lista completa de `status` e `resultCode` e qual significa "dinheiro confirmado".
- [ ] Tempo de expiração de uma cobrança `expirable: true`.
- [ ] `amount` em USD é em centavos?
- [ ] Meios de pagamento disponíveis no checkout (só Pago Móvil?).
- [ ] URL base e credenciais de produção; existe sandbox com dinheiro fictício?
- [ ] Um login pode administrar vários comércios (um por posto)?
- [ ] Taxa final e split.

## 10. Decisões da POC

| Data | Decisão | Motivo |
|---|---|---|
| 2026-10-24 | Credenciais ficam em `poc/skylinkpay/.env` (ignorado pelo git); docs usam `<API_KEY>` / `<COMMERCE_CODE>`. | Repositório público no GitHub. |
| 2026-10-24 | POC será um serviço Node separado em `poc/skylinkpay`, não dentro do PWA. | Assinatura HMAC exige a apiKey no servidor; webhook precisa de endpoint público. |
