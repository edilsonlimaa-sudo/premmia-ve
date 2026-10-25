const $ = (id) => document.getElementById(id)
const fmtBs = (n) => `Bs ${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }) : '')
const pinKey = 'poc-pin'
const api = async (method, path, body) => {
  const headers = body ? { 'Content-Type': 'application/json' } : {}
  const pin = localStorage.getItem(pinKey)
  if (pin) headers['x-poc-pin'] = pin
  const r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await r.json().catch(() => ({}))
  if (r.status === 401 && data.code === 'PIN') {
    // La URL pública está protegida con POC_PIN: pedirlo una vez y reintentar.
    const typed = prompt('Esta POC está protegida. Escribe el PIN:')
    if (!typed) throw new Error('PIN requerido')
    localStorage.setItem(pinKey, typed.trim())
    return api(method, path, body)
  }
  if (!r.ok) throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { data })
  return data
}

// --- tabs --------------------------------------------------------------------
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => {
      x.classList.toggle('active', x === t)
      x.setAttribute('aria-selected', x === t)
    })
    $('view-conductor').hidden = t.dataset.view !== 'conductor'
    $('view-bombero').hidden = t.dataset.view !== 'bombero'
    if (t.dataset.view === 'bombero') loadList()
  }),
)

// --- conductor ---------------------------------------------------------------
let current = null
let pollTimer = null

function renderCobro(c) {
  current = c
  $('c-form').hidden = true
  $('c-cobro').hidden = false
  $('c-cobro-placa').textContent = c.placa
  $('c-cobro-monto').textContent = fmtBs(c.montoBs)
  $('c-pagar').href = c.url
  $('c-json').textContent = JSON.stringify(c, null, 2)
  const st = $('c-status')
  if (c.paid) {
    st.dataset.state = 'paid'
    $('c-status-text').textContent = 'PAGADO'
    $('c-pagar').hidden = true
    $('c-pagado').hidden = false
    $('c-pagado-detalle').textContent = `${c.paymentMethod || ''} ${c.bankReference ? '· ref ' + c.bankReference : ''} · ${fmtTime(c.paidAt)}`
    stopPoll()
  } else {
    st.dataset.state = 'pending'
    $('c-status-text').textContent = `Pendiente de pago · ${c.resultMessage || c.status}`
    $('c-pagar').hidden = false
    $('c-pagado').hidden = true
  }
}

function startPoll() {
  stopPoll()
  pollTimer = setInterval(async () => {
    if (!current || current.paid) return stopPoll()
    try {
      renderCobro(await api('GET', `/api/cobros/${encodeURIComponent(current.id)}`))
    } catch (e) {
      $('c-status').dataset.state = 'error'
      $('c-status-text').textContent = `No se pudo consultar: ${e.message}`
    }
  }, 4000)
}
const stopPoll = () => pollTimer && (clearInterval(pollTimer), (pollTimer = null))

$('c-placa').addEventListener('input', (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')))
$('c-generar').addEventListener('click', async () => {
  const btn = $('c-generar')
  const err = $('c-error')
  err.hidden = true
  btn.disabled = true
  btn.textContent = 'Creando cobro en SkyLinkPay…'
  try {
    const c = await api('POST', '/api/cobros', { placa: $('c-placa').value, montoBs: $('c-monto').value })
    renderCobro(c)
    startPoll()
  } catch (e) {
    err.hidden = false
    err.textContent = e.message + (e.data?.skylink ? '\n' + JSON.stringify(e.data.skylink, null, 2) : '')
  } finally {
    btn.disabled = false
    btn.textContent = 'Generar cobro'
  }
})
$('c-nuevo').addEventListener('click', () => {
  stopPoll()
  current = null
  $('c-cobro').hidden = true
  $('c-form').hidden = false
  $('c-placa').focus()
})
// Al volver del checkout (pestaña vuelve a estar visible), consultar enseguida.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && current && !current.paid) api('GET', `/api/cobros/${encodeURIComponent(current.id)}`).then(renderCobro).catch(() => {})
})

// --- bombero -----------------------------------------------------------------
$('b-placa').addEventListener('input', (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')))
$('b-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const placa = $('b-placa').value.trim()
  if (placa.length < 3) return $('b-placa').focus()
  const out = $('b-result')
  const v = $('b-verdict')
  out.hidden = false
  $('b-placa-out').textContent = placa
  v.className = 'verdict pending'
  v.textContent = 'Consultando…'
  $('b-detalle').textContent = ''
  try {
    const c = await api('GET', `/api/placa/${encodeURIComponent(placa)}`)
    if (c.paid) {
      v.className = 'verdict paid'
      v.textContent = `✓ PAGADO · ${fmtBs(c.montoBs)}`
      $('b-detalle').textContent = `Pagado a las ${fmtTime(c.paidAt)} · ${c.paymentMethod || ''} ${c.bankReference ? '· ref ' + c.bankReference : ''}`
    } else {
      v.className = 'verdict pending'
      v.textContent = `PENDIENTE · ${fmtBs(c.montoBs)}`
      $('b-detalle').textContent = `Cobro creado a las ${fmtTime(c.createdAt)}, aún sin confirmar (${c.resultMessage || c.status}).`
    }
  } catch (e) {
    v.className = 'verdict none'
    v.textContent = e.data?.code === 'SIN_COBROS' ? 'SIN PAGO' : 'ERROR'
    $('b-detalle').textContent = e.message
  }
  loadList()
})

async function loadList() {
  const ul = $('b-list')
  try {
    const list = await api('GET', '/api/cobros')
    ul.innerHTML = list.length
      ? list
          .map(
            (c) =>
              `<li><span class="pl">${c.placa}</span><span>${fmtBs(c.montoBs)}</span><span class="muted small">${fmtTime(c.createdAt)}</span><span class="badge ${c.paid ? 'paid' : 'pending'}">${c.paid ? 'PAGADO' : 'PENDIENTE'}</span></li>`,
          )
          .join('')
      : '<li class="muted">Todavía no hay cobros.</li>'
  } catch (e) {
    ul.innerHTML = `<li class="error">${e.message}</li>`
  }
}
