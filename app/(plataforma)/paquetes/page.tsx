import { api } from "@/lib/api";

import {
  Titulo,
  SinPermiso,
} from "@/components/reservas/ui";

import { PaquetesClient } from "./paquetes-client";

import type {
  ListaPaquetes,
  UnidadResidente,
} from "@/lib/paquetes";

export default async function PaquetesPage() {
  const usuario = await api<{ rol: string }>("auth/me");

  if (usuario.rol !== "RESIDENTE") {
    return <SinPermiso />;
  }

  const { datos: unidades } = await api<{
    datos: UnidadResidente[];
  }>("unidades/mias");

  if (!unidades.length) {
    return (
      <>
        <Titulo
          titulo="Mis paquetes"
          detalle="Consulta tus paquetes pendientes y los que ya fueron entregados."
        />

        <p className="panel">
          No tienes unidades vinculadas para consultar paquetes.
        </p>
      </>
    );
  }

  const parametros = new URLSearchParams({
    unidadId: unidades[0].id,
    estado: "PENDIENTE",
    pagina: "1",
    tamanoPagina: "20",
  });

  const inicial = await api<ListaPaquetes>(
    `paquetes/mios?${parametros.toString()}`,
  );

  return (
    <>
      <Titulo
        titulo="Mis paquetes"
        detalle="Consulta tus paquetes pendientes y el historial de entregas."
      />

      <PaquetesClient
        unidades={unidades}
        inicial={inicial}
        unidadInicial={unidades[0].id}
      />
    </>
  );
}
