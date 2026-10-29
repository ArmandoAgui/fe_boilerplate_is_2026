"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Disponibilidad as Datos, Rol } from "@/lib/reservas";
import { limiteFecha } from "@/lib/reservas";
const etiquetas = {
  DISPONIBLE: "Disponible",
  OCUPADO: "Ocupado",
  FUERA_DE_HORARIO: "Fuera de horario",
};
export function Disponibilidad({
  datos,
  hoy,
  rol,
  habilitada,
}: {
  datos: Datos;
  hoy: string;
  rol: Rol;
  habilitada: boolean;
}) {
  const router = useRouter();
  return (
    <>
      <label className="mb-6 block max-w-xs font-medium">
        Fecha
        <input
          className="field mt-2"
          type="date"
          required
          min={hoy}
          max={limiteFecha(hoy)}
          value={datos.fecha}
          onChange={(e) => {
            if (e.target.validity.valid && e.target.value)
              router.push(`?fecha=${e.target.value}`);
          }}
        />
      </label>
      <ul
        aria-label="Leyenda de disponibilidad"
        className="mb-5 flex flex-wrap gap-4 text-sm"
      >
        <li>✓ Disponible</li>
        <li>● Ocupado</li>
        <li>▧ Fuera de horario</li>
      </ul>
      {!habilitada && (
        <p className="panel mb-4">El área no está habilitada este día</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {datos.bloques.map((b) => {
          const clase =
            b.estado === "DISPONIBLE"
              ? "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"
              : b.estado === "OCUPADO"
                ? "border-zinc-300 bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                : "border-zinc-300 text-zinc-600 dark:text-zinc-400 [background-image:repeating-linear-gradient(135deg,transparent,transparent_6px,#88888812_6px,#88888812_8px)]";
          const contenido = (
            <>
              <span className="block font-semibold">
                {b.inicio}–{b.fin}
              </span>
              <span className="text-sm">
                {b.estado === "DISPONIBLE"
                  ? "✓ "
                  : b.estado === "OCUPADO"
                    ? "● "
                    : "▧ "}
                {etiquetas[b.estado]}
              </span>
            </>
          );
          return b.estado === "DISPONIBLE" && rol === "RESIDENTE" ? (
            <Link
              key={b.inicio}
              className={`rounded-lg border p-4 hover:ring-2 hover:ring-emerald-600 ${clase}`}
              aria-label={`Reservar ${b.inicio}, disponible`}
              href={`/reservas/nueva?areaId=${datos.areaId}&fecha=${datos.fecha}&hora=${b.inicio}`}
            >
              {contenido}
            </Link>
          ) : (
            <div key={b.inicio} className={`rounded-lg border p-4 ${clase}`}>
              {contenido}
            </div>
          );
        })}
      </div>
    </>
  );
}
