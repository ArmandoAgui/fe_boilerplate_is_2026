"use server";

import { api } from "@/lib/api";

export type OpcionNueva = {
  texto: string;
};

export type TemaNuevo = {
  titulo: string;
  apertura: string;
  cierre: string;
  opciones: OpcionNueva[];
};

export type CrearAsambleaPayload = {
  titulo: string;
  fechaHora: string;
  descripcion?: string;
  temas: TemaNuevo[];
};

export async function crearAsamblea(
  payload: CrearAsambleaPayload,
) {
  return api<{ id: string; estado: string }>(
    "asambleas",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function publicarAsamblea(id: string) {
  return api<{ id: string; estado: string }>(
    `asambleas/${id}/publicacion`,
    {
      method: "POST",
    },
  );
}
