import Link from "next/link";
import { usuarioActual } from "@/lib/api";
import { Titulo } from "@/components/reservas/ui";
export default async function Home() {
  const usuario = await usuarioActual();
  return (
    <>
      <Titulo
        titulo={`Hola, ${usuario.nombre}`}
        detalle="Organiza tu próximo encuentro y disfruta los espacios de tu comunidad."
      />
      {usuario.rol !== "SEGURIDAD" ? (
        <section className="panel">
          <h2 className="text-xl font-semibold">Un espacio para cada plan</h2>
          <p className="my-4">
            Consulta los horarios y la capacidad de nuestras áreas comunes.
          </p>
          <Link className="button" href="/areas">
            Explorar áreas comunes
          </Link>
        </section>
      ) : (
        <p className="panel">Sesión de personal de seguridad iniciada.</p>
      )}
    </>
  );
}
