export type OpcionVoto = { id: string; texto: string };
export type Tema = {
  id: string;
  pregunta: string;
  aperturaAt: string;
  cierreAt: string;
  estado: "PUBLICADA" | "ABIERTO" | "CERRADO";
  opciones: OpcionVoto[];
};
export type Asamblea = {
  id: string;
  titulo: string;
  fechaAt: string;
  descripcion: string | null;
  estado: "BORRADOR" | "PUBLICADA";
  temas: Tema[];
};
export type Unidad = { id: string; codigo: string };
export type OpcionResultado = {
  opcionId: string;
  texto: string;
  votos: number;
  porcentaje: number;
};
export type UnidadVotante = {
  unidadId: string;
  codigo: string;
  fecha: string;
  opcion?: string | null;
};
export type ResultadosTema = {
  temaId: string;
  titulo: string;
  opciones: OpcionResultado[];
  totalVotos: number;
  unidadesHabilitadas: number;
  participacion: number;
  unidadesVotantes: UnidadVotante[];
};
export function porcentaje1(n: number) {
  return `${n.toFixed(1)}%`;
}
export function fechaHora(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("es-SV", {
      timeZone: "America/El_Salvador",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
