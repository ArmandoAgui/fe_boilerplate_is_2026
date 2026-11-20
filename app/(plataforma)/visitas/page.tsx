import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, TituloVisitas } from "@/components/visitas/ui";
import { MisVisitas } from "@/components/visitas/mis-visitas";
import type { ListaAutorizaciones } from "@/lib/visitas";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; autorizada?: string }>;
}) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;
  const query = await searchParams;
  const pagina = Number(query.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida. <Link href="/visitas">Volver a mis visitantes</Link>
      </p>
    );
  const lista = await api<ListaAutorizaciones>(
    `visitas/autorizaciones/mias?pagina=${pagina}&tamanoPagina=20`,
  );
  return (
    <>
      <TituloVisitas
        titulo="Mis visitantes"
        detalle="Autorizaciones de ingreso para tus unidades."
        accion={
          <Link className="button" href="/visitas/nueva">
            Autorizar visita
          </Link>
        }
      />
      <MisVisitas lista={lista} autorizada={query.autorizada} />
    </>
  );
}
