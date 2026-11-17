// Pantalla de la agenda: dibuja el estado y delega las reglas en logica.js.
import { ErrorReserva, HORARIO, aFecha, aHora, aMinutos, cambiarEstado, citasDelDia, crearCita, deFecha, enlaceWhatsApp, espaciosLibres, resumenDia, semanaDe, sumarDias } from './logica.js'
import { SERVICIOS, cargar, guardar } from './datos.js'

const $ = (s) => document.querySelector(s)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const bs = (centavos) => `Bs ${(centavos / 100).toLocaleString('es-BO', { minimumFractionDigits: 0 })}`
const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const HOY = aFecha(new Date())

let citas = cargar()
let dia = HOY
let horaElegida = ''

function avisar(texto, error = false) {
  document.querySelector('.aviso-flotante')?.remove()
  const caja = Object.assign(document.createElement('div'), { className: `aviso-flotante${error ? ' error' : ''}`, textContent: texto })
  caja.setAttribute('role', 'status')
  document.body.append(caja)
  setTimeout(() => caja.remove(), 2800)
}

const fechaLarga = (f) => {
  const d = deFecha(f)
  return `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

function dibujarResumen() {
  const r = resumenDia(citas, dia)
  $('#kpis').innerHTML = [
    [r.citas, 'citas del día'],
    [bs(r.ingreso), 'ingreso esperado'],
    [`${r.ocupacion} %`, 'del horario ocupado'],
    [`${r.atendidas} de ${r.citas}`, 'ya atendidas'],
  ]
    .map(([valor, etiqueta], i) => `<div class="kpi entra" style="animation-delay:${i * 60}ms"><b>${esc(valor)}</b><span>${etiqueta}</span></div>`)
    .join('')
}

function dibujarSemana() {
  const semana = semanaDe(dia)
  const [a, b] = [deFecha(semana[0]), deFecha(semana[6])]
  $('#titulo-semana').textContent = `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)} ${b.getFullYear()}`
  $('#semana').innerHTML = semana
    .map((f, i) => {
      const n = citasDelDia(citas, f).filter((c) => c.estado !== 'cancelada').length
      const cerrado = HORARIO.diasCerrados.includes(deFecha(f).getDay())
      return `<button class="dia ${cerrado ? 'cerrado' : ''} ${f === HOY ? 'es-hoy' : ''}" role="tab" aria-selected="${f === dia}" data-dia="${f}" title="${n} cita${n === 1 ? '' : 's'}">
        <small>${DIAS[i]}</small><b>${deFecha(f).getDate()}</b><span class="puntos">${'<i></i>'.repeat(Math.min(n, 5))}</span></button>`
    })
    .join('')
}

function dibujarAgenda() {
  $('#titulo-dia').textContent = `Citas del ${fechaLarga(dia)}`
  const lista = citasDelDia(citas, dia)
  $('#agenda').innerHTML =
    lista
      .map(
        (c, i) => `<li class="cita entra ${c.estado}" style="animation-delay:${i * 45}ms">
          <div class="hora">${c.hora}<small>hasta ${aHora(aMinutos(c.hora) + c.minutos)}</small></div>
          <div class="quien"><b>${esc(c.cliente)}</b><span class="suave">${esc(c.servicio)} · ${bs(c.precio)}</span></div>
          <div class="acciones">
            ${c.estado === 'confirmada' ? `<a class="boton" href="${esc(enlaceWhatsApp(c))}" target="_blank" rel="noopener">Recordar por WhatsApp</a><button class="chico" data-atender="${esc(c.id)}">Atendida</button><button class="chico fantasma" data-cancelar="${esc(c.id)}">Cancelar</button>` : `<span class="chip ${c.estado === 'cancelada' ? 'peligro' : ''}">${c.estado}</span>`}
          </div></li>`,
      )
      .join('') || `<li class="suave">${HORARIO.diasCerrados.includes(deFecha(dia).getDay()) ? 'Cerrado este día.' : 'Sin citas todavía. Usa «Nueva cita» para agendar.'}</li>`
}

function dibujarHoras() {
  const servicio = SERVICIOS.find((s) => s.id === $('#servicio').value)
  const fecha = $('#fecha').value
  const libres = fecha ? espaciosLibres({ fecha, minutos: servicio.minutos, citas, ahora: new Date() }) : []
  if (!libres.includes(horaElegida)) horaElegida = ''
  $('#horas').innerHTML =
    libres.map((h) => `<button type="button" role="radio" aria-checked="${h === horaElegida}" data-hora="${h}">${h}</button>`).join('') ||
    '<span class="suave" style="grid-column:1/-1">No hay horarios libres ese día para este servicio.</span>'
}

function dibujar() {
  dibujarResumen()
  dibujarSemana()
  dibujarAgenda()
  dibujarHoras()
}

function irA(fecha) {
  dia = fecha
  $('#fecha').value = fecha < HOY ? HOY : fecha
  dibujar()
}

// ---------- eventos ----------
$('#servicio').innerHTML = SERVICIOS.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${s.minutos} min · ${bs(s.precio)}</option>`).join('')
$('#fecha').min = HOY
$('#semana').addEventListener('click', (e) => {
  const f = e.target.closest('[data-dia]')?.dataset.dia
  if (f) irA(f)
})
$('#anterior').addEventListener('click', () => irA(sumarDias(dia, -7)))
$('#siguiente').addEventListener('click', () => irA(sumarDias(dia, 7)))
$('#hoy').addEventListener('click', () => irA(HOY))
$('#servicio').addEventListener('change', dibujarHoras)
$('#fecha').addEventListener('change', () => {
  if ($('#fecha').value) irA($('#fecha').value)
})
$('#horas').addEventListener('click', (e) => {
  const h = e.target.closest('[data-hora]')?.dataset.hora
  if (!h) return
  horaElegida = h
  dibujarHoras()
})
$('#form-cita').addEventListener('submit', (e) => {
  e.preventDefault()
  const d = Object.fromEntries(new FormData(e.target))
  try {
    if (!horaElegida) throw new ErrorReserva('Elige un horario disponible.')
    const nueva = crearCita({ citas, fecha: d.fecha, hora: horaElegida, servicio: SERVICIOS.find((s) => s.id === d.servicio), cliente: d.cliente, telefono: d.telefono })
    citas = [...citas, nueva]
    guardar(citas)
    horaElegida = ''
    e.target.cliente.value = ''
    e.target.telefono.value = ''
    irA(nueva.fecha)
    avisar(`Cita reservada: ${nueva.cliente}, ${fechaLarga(nueva.fecha)} a las ${nueva.hora}.`)
  } catch (err) {
    if (err instanceof ErrorReserva) avisar(err.message, true)
    else throw err
  }
})
$('#agenda').addEventListener('click', (e) => {
  const cancelar = e.target.closest('[data-cancelar]')?.dataset.cancelar
  const atender = e.target.closest('[data-atender]')?.dataset.atender
  if (!cancelar && !atender) return
  citas = cambiarEstado(citas, cancelar || atender, cancelar ? 'cancelada' : 'atendida')
  guardar(citas)
  dibujar()
  avisar(cancelar ? 'Cita cancelada: el horario quedó libre.' : 'Cita marcada como atendida.')
})

// Enlace de demostración (…/#demo): abre en el próximo día con atención, para ver horarios libres aunque hoy ya haya cerrado.
let inicial = HOY
if (location.hash === '#demo') {
  inicial = sumarDias(HOY, 1)
  while (HORARIO.diasCerrados.includes(deFecha(inicial).getDay())) inicial = sumarDias(inicial, 1)
}
irA(inicial)
