export type Rol = "RESIDENTE" | "ADMINISTRADOR" | "SEGURIDAD";
export type Usuario = { id: string; email: string; nombre: string; rol: Rol };
export type Unidad = { id: string; codigo: string };
export type Horario = {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
};
export type Area = {
  id: string;
  nombre: string;
  capacidad: number;
  activa: boolean;
  horarios: Horario[];
};
export type Bloque = {
  inicio: string;
  fin: string;
  estado: "DISPONIBLE" | "OCUPADO" | "FUERA_DE_HORARIO";
};
export type Disponibilidad = {
  areaId: string;
  fecha: string;
  bloques: Bloque[];
};
export type Reserva = {
  id: string;
  codigo: string;
  areaId: string;
  unidadId: string;
  areaNombre: string;
  unidadCodigo: string;
  inicio: string;
  fin: string;
  asistentes: number;
  estado: "CONFIRMADA" | "CANCELADA";
};
export type ListaReservas = {
  datos: Reserva[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};
export const dias = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
export function hoyLocal(ahora = new Date()) {
  return new Date(ahora.getTime() - 6 * 3600000).toISOString().slice(0, 10);
}
export function limiteFecha(hoy: string) {
  const d = new Date(`${hoy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}
export function fechaValida(fecha: string, hoy: string) {
  const d = new Date(`${fecha}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    Number.isFinite(d.getTime()) &&
    d.toISOString().slice(0, 10) === fecha &&
    fecha >= hoy &&
    fecha <= limiteFecha(hoy)
  );
}
export function puedeCancelar(reserva: Reserva, ahora = Date.now()) {
  return (
    reserva.estado === "CONFIRMADA" &&
    new Date(reserva.inicio).getTime() - ahora > 7200000
  );
}
export function fechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
export function hora(iso: string) {
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
export function errorHorarios(horarios: Horario[]) {
  if (!horarios.length) return "Agregue al menos una franja";
  const orden = [...horarios].sort(
    (a, b) =>
      a.diaSemana - b.diaSemana || a.horaInicio.localeCompare(b.horaInicio),
  );
  for (let i = 0; i < orden.length; i++) {
    const h = orden[i];
    if (
      !Number.isInteger(h.diaSemana) ||
      h.diaSemana < 0 ||
      h.diaSemana > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.horaInicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.horaFin) ||
      h.horaFin <= h.horaInicio
    )
      return "La hora de fin debe ser posterior a la de inicio";
    if (
      i &&
      orden[i - 1].diaSemana === h.diaSemana &&
      orden[i - 1].horaFin > h.horaInicio
    )
      return "Las franjas no pueden traslaparse";
  }
  return "";
}
