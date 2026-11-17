// Reglas de la agenda de citas, sin nada de pantalla: se prueban solas con `npm test`.
// Las horas se manejan como minutos desde la medianoche (09:30 → 570).

export class ErrorReserva extends Error {}

export const aMinutos = (hora) => {
  const [h, m] = String(hora).split(':').map(Number)
  return h * 60 + m
}
export const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

export const HORARIO = { inicio: '09:00', fin: '19:00', descanso: ['12:30', '14:00'], diasCerrados: [0] } // 0 = domingo

const dos = (n) => String(n).padStart(2, '0')
export const aFecha = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
export const deFecha = (s) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}
export const sumarDias = (fecha, n) => {
  const d = deFecha(fecha)
  d.setDate(d.getDate() + n)
  return aFecha(d)
}
/** Los 7 días (lunes a domingo) de la semana que contiene la fecha. */
export function semanaDe(fecha) {
  const lunes = sumarDias(fecha, -((deFecha(fecha).getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

/** Dos intervalos [inicio, fin) se superponen si uno empieza antes de que el otro termine. */
export const seSuperponen = (a, b) => a.inicio < b.fin && b.inicio < a.fin

const activas = (citas, fecha) => citas.filter((c) => c.fecha === fecha && c.estado !== 'cancelada')
const intervalo = (c) => ({ inicio: aMinutos(c.hora), fin: aMinutos(c.hora) + c.minutos })

/** Horas en las que cabe un servicio ese día: dentro del horario, fuera del descanso y sin chocar con otra cita. */
export function espaciosLibres({ fecha, minutos, citas, horario = HORARIO, paso = 30, ahora = null }) {
  if (horario.diasCerrados.includes(deFecha(fecha).getDay())) return []
  const ocupados = activas(citas, fecha).map(intervalo)
  if (horario.descanso) ocupados.push({ inicio: aMinutos(horario.descanso[0]), fin: aMinutos(horario.descanso[1]) })
  // Si la fecha es hoy, no se ofrecen horas que ya pasaron.
  const minimo = ahora && aFecha(ahora) === fecha ? ahora.getHours() * 60 + ahora.getMinutes() : -1
  const libres = []
  for (let inicio = aMinutos(horario.inicio); inicio + minutos <= aMinutos(horario.fin); inicio += paso) {
    const candidato = { inicio, fin: inicio + minutos }
    if (inicio > minimo && !ocupados.some((o) => seSuperponen(candidato, o))) libres.push(aHora(inicio))
  }
  return libres
}

export function crearCita({ citas, fecha, hora, servicio, cliente, telefono, horario = HORARIO, id = `c${Date.now().toString(36)}` }) {
  const nombre = String(cliente ?? '').trim()
  const fono = String(telefono ?? '').replace(/\D/g, '')
  if (nombre.length < 3) throw new ErrorReserva('Escribe el nombre del cliente.')
  if (fono.length < 7 || fono.length > 12) throw new ErrorReserva('El teléfono debe tener entre 7 y 12 dígitos.')
  if (!servicio) throw new ErrorReserva('Elige un servicio.')
  if (!espaciosLibres({ fecha, minutos: servicio.minutos, citas, horario }).includes(hora)) {
    throw new ErrorReserva(`El ${fecha} a las ${hora} ya no está disponible.`)
  }
  return { id, fecha, hora, minutos: servicio.minutos, servicio: servicio.nombre, precio: servicio.precio, cliente: nombre, telefono: fono, estado: 'confirmada' }
}

export const cambiarEstado = (citas, id, estado) => citas.map((c) => (c.id === id ? { ...c, estado } : c))

export const citasDelDia = (citas, fecha) => citas.filter((c) => c.fecha === fecha).sort((a, b) => aMinutos(a.hora) - aMinutos(b.hora))

/** Resumen del día: citas activas, ingreso esperado y porcentaje del horario ocupado. */
export function resumenDia(citas, fecha, horario = HORARIO) {
  const del = activas(citas, fecha)
  const descanso = horario.descanso ? aMinutos(horario.descanso[1]) - aMinutos(horario.descanso[0]) : 0
  const disponibles = aMinutos(horario.fin) - aMinutos(horario.inicio) - descanso
  const ocupados = del.reduce((s, c) => s + c.minutos, 0)
  return {
    citas: del.length,
    ingreso: del.reduce((s, c) => s + c.precio, 0),
    atendidas: del.filter((c) => c.estado === 'atendida').length,
    ocupacion: horario.diasCerrados.includes(deFecha(fecha).getDay()) ? 0 : Math.round((ocupados / disponibles) * 100),
  }
}

/** Enlace para enviar el recordatorio por WhatsApp (número con código de país; por defecto, Bolivia +591). */
export function enlaceWhatsApp(cita, negocio = 'Estudio Aurora', codigoPais = '591') {
  const numero = cita.telefono.length <= 8 ? codigoPais + cita.telefono : cita.telefono
  const [a, m, d] = cita.fecha.split('-')
  const texto = `Hola ${cita.cliente.split(' ')[0]}, te recordamos tu cita en ${negocio}: ${cita.servicio}, el ${d}/${m}/${a} a las ${cita.hora}. Si no puedes asistir, avísanos por este medio.`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
