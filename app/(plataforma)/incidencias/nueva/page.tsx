import { NuevaIncidencia } from "@/components/incidencias/nueva-incidencia";
import { SinPermiso } from "@/components/reservas/ui";
import { api, usuarioActual } from "@/lib/api";
import type { Area, Unidad } from "@/lib/reservas";

export default async function Page() {
  if ((await usuarioActual()).rol !== "RESIDENTE") return <SinPermiso />;

  const [{ datos: unidades }, { datos: areas }] = await Promise.all([
    api<{ datos: Unidad[] }>("unidades/mias"),
    api<{ datos: Area[] }>("areas"),
  ]);

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <p className="text-sm font-medium text-accent">
          Incidencias / Reportar
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Reportar incidencia
        </h1>
        <p className="mt-2 text-muted">
          Describe el problema y adjunta fotos para que la administración lo
          atienda.
        </p>
      </header>
      <NuevaIncidencia
        unidades={unidades}
        areas={areas
          .filter((area) => area.activa)
          .map(({ id, nombre }) => ({ id, nombre }))}
      />
    </div>
  );
}
