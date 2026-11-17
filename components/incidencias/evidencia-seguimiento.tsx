"use client";

import Image from "next/image";
import { useState } from "react";

export function EvidenciaSeguimiento({
  incidenciaId,
  evidenciaId,
  indice,
}: {
  incidenciaId: string;
  evidenciaId: string;
  indice: number;
}) {
  const [error, setError] = useState(false);
  const src =
    "/api/seguimiento/incidencias/" +
    encodeURIComponent(incidenciaId) +
    "/evidencias/" +
    encodeURIComponent(evidenciaId);

  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-alt">
      {error ? (
        <span className="grid h-full place-items-center px-3 text-center text-xs text-muted">
          Foto no disponible
        </span>
      ) : (
        <Image
          src={src}
          alt={"Foto " + indice + " de la incidencia"}
          fill
          sizes="(max-width: 640px) 42vw, 12rem"
          unoptimized
          onError={() => setError(true)}
          className="object-cover"
        />
      )}
    </div>
  );
}
