import Link from "next/link";
import { api, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { ResultadosVotacion } from "@/components/asambleas/resultados-votacion";
import type { Asamblea } from "@/lib/asambleas";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await usuarioActual();
  if (user.rol !== "ADMINISTRADOR") return <SinPermiso />;
  const asamblea = (await api<Asamblea[]>("asambleas")).find((a) => a.id === id);
  if (!asamblea)
    return (
      <section className="panel">
        <h1>Asamblea inexistente o no publicada</h1>
        <Link className="button mt-4" href="/asambleas">
          Volver a asambleas
        </Link>
      </section>
    );
  return (
    <>
      <Titulo titulo="Resultados de votación" detalle={asamblea.titulo} />
      <ResultadosVotacion temas={asamblea.temas} />
    </>
  );
}
