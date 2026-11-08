import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, usuarioActual } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { Disponibilidad } from "@/components/reservas/disponibilidad";
import {
  hoyLocal,
  fechaValida,
  type Area,
  type Disponibilidad as Datos,
} from "@/lib/reservas";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fecha?: string }>;
}) {
  const user = await usuarioActual();
  if (user.rol === "SEGURIDAD") return <SinPermiso />;
  const { id } = await params;
  const hoy = hoyLocal();
  const fecha = (await searchParams).fecha ?? hoy;
  const area = (await api<{ datos: Area[] }>("areas")).datos.find(
    (a) => a.id === id && a.activa,
  );
  if (!area) notFound();
  if (!fechaValida(fecha, hoy))
    return (
      <section className="panel">
        <p role="alert">Elija una fecha entre hoy y los próximos 30 días</p>
        <Link className="button mt-4" href={`/areas/${id}/disponibilidad`}>
          Elegir otra fecha
        </Link>
      </section>
    );
  let datos: Datos;
  try {
    datos = await api<Datos>(`areas/${id}/disponibilidad?fecha=${fecha}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return (
    <>
      <Link className="mb-5 inline-block text-sm underline" href="/areas">
        ← Todas las áreas
      </Link>
      <Titulo
        titulo={area.nombre}
        detalle={`Capacidad: ${area.capacidad} personas. Cada bloque corresponde a una hora.`}
      />
      <Disponibilidad
        datos={datos}
        hoy={hoy}
        rol={user.rol}
        habilitada={area.horarios.some((h) => h.diaSemana === dia)}
      />
    </>
  );
}
