import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { AjustarCuotas } from "@/components/integracion/administracion";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  if ((await usuarioActual()).rol !== "ADMINISTRADOR") return <SinPermiso />;
  const pagina = Number((await searchParams).pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000)
    return <p>Página inválida</p>;
  const lista = await api<
    Parameters<typeof AjustarCuotas>[0] & { total: number }
  >(`administracion/cuotas?pagina=${pagina}`);
  return (
    <>
      <Titulo
        titulo="Administrar cuotas"
        detalle="Corrige o anula cuotas pendientes con un motivo registrado."
      />
      <Link className="button mb-4" href="/admin/cuotas/generar">
        Generar cuotas
      </Link>
      <AjustarCuotas
        datos={lista.datos}
        tarifaMensual={lista.tarifaMensual}
        porcentajeRecargo={lista.porcentajeRecargo}
      />
      <nav className="mt-4 flex justify-between">
        {pagina > 1 ? (
          <Link href={`?pagina=${pagina - 1}`}>Anterior</Link>
        ) : (
          <span />
        )}
        {pagina * 20 < lista.total && (
          <Link href={`?pagina=${pagina + 1}`}>Siguiente</Link>
        )}
      </nav>
    </>
  );
}
