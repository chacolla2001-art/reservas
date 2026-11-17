import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ErrorReserva, aHora, aMinutos, cambiarEstado, citasDelDia, crearCita, enlaceWhatsApp, espaciosLibres, resumenDia, seSuperponen, semanaDe, sumarDias } from '../src/logica.js'

const LUNES = '2026-11-16'
const corte = { id: 'corte', nombre: 'Corte de cabello', minutos: 30, precio: 4000 }
const color = { id: 'color', nombre: 'Coloración', minutos: 90, precio: 18000 }
const cita = (hora, minutos = 30, extra = {}) => ({ id: hora, fecha: LUNES, hora, minutos, servicio: 'Corte', precio: 4000, cliente: 'Ana', telefono: '70000000', estado: 'confirmada', ...extra })

test('convierte horas a minutos y de vuelta', () => {
  assert.equal(aMinutos('09:30'), 570)
  assert.equal(aHora(570), '09:30')
  assert.equal(aHora(aMinutos('18:05')), '18:05')
})

test('la semana empieza el lunes, también si la fecha es domingo', () => {
  assert.deepEqual(semanaDe('2026-11-18').slice(0, 2), ['2026-11-16', '2026-11-17'])
  assert.equal(semanaDe('2026-11-22')[0], '2026-11-16')
  assert.equal(sumarDias('2026-12-31', 1), '2027-01-01')
})

test('dos intervalos que solo se tocan no se superponen', () => {
  assert.ok(seSuperponen({ inicio: 540, fin: 600 }, { inicio: 570, fin: 630 }))
  assert.ok(!seSuperponen({ inicio: 540, fin: 600 }, { inicio: 600, fin: 630 }))
})

test('día sin citas: ofrece todo el horario menos el descanso', () => {
  const libres = espaciosLibres({ fecha: LUNES, minutos: 30, citas: [] })
  assert.equal(libres[0], '09:00')
  assert.equal(libres.at(-1), '18:30')
  assert.ok(libres.includes('12:00') && libres.includes('14:00'))
  assert.ok(!libres.includes('12:30') && !libres.includes('13:30'))
  assert.equal(libres.length, 17)
})

test('un servicio largo no cabe si choca con una cita o con el descanso', () => {
  const libres = espaciosLibres({ fecha: LUNES, minutos: 90, citas: [cita('10:00')] })
  assert.ok(libres.includes('10:30'))
  assert.ok(!libres.includes('09:00') && !libres.includes('09:30') && !libres.includes('10:00'))
  assert.ok(!libres.includes('11:30'), 'terminaría dentro del descanso')
  assert.ok(!libres.includes('18:00'), 'terminaría después del cierre')
})

test('las citas canceladas liberan su espacio', () => {
  const citas = [cita('10:00', 30, { estado: 'cancelada' })]
  assert.ok(espaciosLibres({ fecha: LUNES, minutos: 30, citas }).includes('10:00'))
})

test('domingo cerrado y horas pasadas de hoy no se ofrecen', () => {
  assert.deepEqual(espaciosLibres({ fecha: '2026-11-22', minutos: 30, citas: [] }), [])
  const libres = espaciosLibres({ fecha: LUNES, minutos: 30, citas: [], ahora: new Date(2026, 10, 16, 15, 10) })
  assert.equal(libres[0], '15:30')
})

test('crear cita valida los datos y evita la doble reserva', () => {
  const nueva = crearCita({ citas: [], fecha: LUNES, hora: '10:00', servicio: color, cliente: '  María López ', telefono: '0 000-0001', id: 'x1' })
  assert.deepEqual([nueva.cliente, nueva.telefono, nueva.minutos, nueva.estado], ['María López', '00000001', 90, 'confirmada'])
  assert.throws(() => crearCita({ citas: [nueva], fecha: LUNES, hora: '10:30', servicio: corte, cliente: 'Luis Rojas', telefono: '00000002' }), /ya no está disponible/)
  assert.throws(() => crearCita({ citas: [], fecha: LUNES, hora: '10:00', servicio: corte, cliente: 'Al', telefono: '00000002' }), ErrorReserva)
  assert.throws(() => crearCita({ citas: [], fecha: LUNES, hora: '10:00', servicio: corte, cliente: 'Luis Rojas', telefono: '123' }), /teléfono/)
})

test('resumen del día: citas, ingreso y ocupación', () => {
  const citas = [cita('09:00'), cita('10:00', 90, { precio: 18000, estado: 'atendida' }), cita('16:00', 30, { estado: 'cancelada' })]
  assert.deepEqual(resumenDia(citas, LUNES), { citas: 2, ingreso: 22000, atendidas: 1, ocupacion: 24 })
  assert.equal(resumenDia([], '2026-11-22').ocupacion, 0)
})

test('ordena las citas del día y cambia su estado sin tocar el original', () => {
  const citas = [cita('15:00'), cita('09:00')]
  assert.deepEqual(citasDelDia(citas, LUNES).map((c) => c.hora), ['09:00', '15:00'])
  const despues = cambiarEstado(citas, '15:00', 'cancelada')
  assert.equal(despues[0].estado, 'cancelada')
  assert.equal(citas[0].estado, 'confirmada')
})

test('arma el recordatorio de WhatsApp con el código de país', () => {
  const url = enlaceWhatsApp(cita('10:00', 30, { cliente: 'María López', telefono: '00000001', servicio: 'Corte de cabello' }), 'Estudio Aurora')
  assert.ok(url.startsWith('https://wa.me/59100000001?text='))
  const texto = decodeURIComponent(url.split('text=')[1])
  assert.match(texto, /Hola María, te recordamos tu cita en Estudio Aurora: Corte de cabello, el 16\/11\/2026 a las 10:00/)
})
