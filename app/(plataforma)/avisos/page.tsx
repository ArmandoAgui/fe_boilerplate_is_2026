import { Suspense } from "react";
import { BandejaAvisos } from "@/components/notificaciones/bandeja";
import { SinPermiso } from "@/components/reservas/ui";
import { usuarioActual } from "@/lib/api";

export default async function Page() {
  const usuario = await usuarioActual();
  if (usuario.rol !== "RESIDENTE") return <SinPermiso />;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-5">
        <h1 className="text-3xl font-semibold tracking-tight">Avisos</h1>
        <p className="mt-1 text-sm text-muted">
          Todo lo que te corresponde, sin importar qué parte del sistema lo generó.
        </p>
      </header>
      <Suspense fallback={<p role="status" className="panel">Cargando avisos…</p>}>
        <BandejaAvisos />
      </Suspense>
    </div>
  );
}
