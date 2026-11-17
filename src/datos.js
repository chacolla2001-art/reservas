// Servicios del negocio, citas de ejemplo y guardado en el navegador. Los precios van en centavos.
import { aFecha, semanaDe } from './logica.js'

const CLAVE = 'reservas-v1'

export const SERVICIOS = [
  { id: 'corte', nombre: 'Corte de cabello', minutos: 30, precio: 4000 },
  { id: 'barba', nombre: 'Corte y barba', minutos: 60, precio: 6500 },
  { id: 'color', nombre: 'Coloración', minutos: 90, precio: 18000 },
  { id: 'manicure', nombre: 'Manicure', minutos: 60, precio: 5000 },
  { id: 'facial', nombre: 'Limpieza facial', minutos: 60, precio: 9000 },
]

// Citas de ejemplo repartidas en la semana actual (nombres y teléfonos inventados).
function citasDeEjemplo(hoy = new Date()) {
  const dias = semanaDe(aFecha(hoy))
  const s = (id) => SERVICIOS.find((x) => x.id === id)
  const c = (i, dia, hora, servicio, cliente, telefono, estado = 'confirmada') => {
    const srv = s(servicio)
    return { id: `e${i}`, fecha: dias[dia], hora, minutos: srv.minutos, servicio: srv.nombre, precio: srv.precio, cliente, telefono, estado }
  }
  return [
    c(1, 0, '09:00', 'corte', 'Carla Mendoza', '00000001', 'atendida'),
    c(2, 0, '10:00', 'color', 'Rosa Quispe', '00000002', 'atendida'),
    c(3, 0, '15:00', 'manicure', 'Lucía Vargas', '00000003'),
    c(4, 1, '09:30', 'barba', 'Diego Flores', '00000004'),
    c(5, 1, '11:00', 'facial', 'Paola Rivero', '00000005'),
    c(6, 1, '16:30', 'corte', 'Hugo Salazar', '00000006', 'cancelada'),
    c(7, 2, '10:00', 'corte', 'Marcelo Ortiz', '00000007'),
    c(8, 2, '14:00', 'color', 'Andrea Paz', '00000008'),
    c(9, 3, '09:00', 'manicure', 'Silvia Rojas', '00000009'),
    c(10, 3, '17:00', 'barba', 'Jorge Lima', '00000010'),
    c(11, 4, '10:30', 'facial', 'Natalia Cruz', '00000011'),
    c(12, 4, '15:00', 'corte', 'Iván Torrez', '00000012'),
    c(13, 5, '09:00', 'color', 'Gabriela Soto', '00000013'),
    c(14, 5, '11:00', 'corte', 'Ramiro Peña', '00000014'),
  ]
}

export function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE))
    if (Array.isArray(guardado?.citas)) return guardado.citas
  } catch {
    /* almacenamiento vacío o dañado */
  }
  return citasDeEjemplo()
}

export function guardar(citas) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ citas }))
  } catch {
    /* sin almacenamiento: sigue funcionando en memoria */
  }
}
