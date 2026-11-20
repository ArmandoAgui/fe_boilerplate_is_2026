import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { MisComunicados } from "@/components/comunicados/mis-comunicados";
import type { MisComunicados as Lista } from "@/lib/comunicados";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  if ((await usuarioActual()).rol !== "RESIDENTE") return <SinPermiso />;
  const pagina = Number((await searchParams).pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1)
    return (
      <p role="alert">
        Página inválida. <Link href="/comunicados">Volver</Link>
      </p>
    );
  const lista = await api<Lista>(
    `comunicados/mios?pagina=${pagina}&tamanoPagina=10`,
  );
  return (
    <>
      <Titulo
        titulo="Comunicados"
        detalle="Avisos oficiales para tus unidades, del más reciente al más antiguo."
      />
      <MisComunicados lista={lista} />
    </>
  );
}
