import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { GestionPaquetes } from "@/components/integracion/paquetes";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ buscar?: string; pagina?: string; estado?: string }>;
}) {
  const user = await usuarioActual();
  if (!["SEGURIDAD", "ADMINISTRADOR"].includes(user.rol)) return <SinPermiso />;
  const q = await searchParams,
    pagina = Number(q.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000)
    return <p role="alert">Página inválida</p>;
  const estado = ["PENDIENTE", "ENTREGADO", "ANULADO"].includes(q.estado ?? "")
    ? q.estado!
    : "PENDIENTE";
  const params = new URLSearchParams({
    buscar: q.buscar ?? "",
    estado,
    pagina: String(pagina),
  });
  const lista = await api<{
    datos: {
      id: string;
      codigo: string;
      empresa: string;
      unidadCodigo: string;
      estado: string;
      recibidoAt: string;
    }[];
    total: number;
  }>(`paquetes?${params}`);
  function href(n: number) {
    return `?${new URLSearchParams({ buscar: q.buscar ?? "", estado, pagina: String(n) })}`;
  }
  return (
    <>
      <Titulo
        titulo="Paquetería"
        detalle="Registra entregas a residentes y conserva evidencia de las correcciones."
      />
      {user.rol === "SEGURIDAD" && (
        <Link className="button mb-4" href="/seguridad/paquetes/nuevo">
          Recibir paquete
        </Link>
      )}
      <form className="panel mb-4 flex flex-wrap items-end gap-3">
        <label>
          Unidad o código
          <input
            className="field mt-1"
            name="buscar"
            defaultValue={q.buscar}
            maxLength={60}
          />
        </label>
        <label>
          Estado
          <select className="field mt-1" name="estado" defaultValue={estado}>
            {["PENDIENTE", "ENTREGADO", "ANULADO"].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <button className="button-secondary">Buscar</button>
      </form>
      <GestionPaquetes
        datos={lista.datos}
        puedeEntregar={user.rol === "SEGURIDAD"}
      />
      <nav className="mt-4 flex justify-between">
        {pagina > 1 ? <Link href={href(pagina - 1)}>Anterior</Link> : <span />}
        {pagina * 20 < lista.total && (
          <Link href={href(pagina + 1)}>Siguiente</Link>
        )}
      </nav>
    </>
  );
}
