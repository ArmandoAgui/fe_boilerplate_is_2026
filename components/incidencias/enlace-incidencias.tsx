"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ruta = "/incidencias/nueva";

export function EnlaceIncidencias() {
  const activo = usePathname() === ruta;
  return (
    <Link
      href={ruta}
      aria-current={activo ? "page" : undefined}
      className={
        activo ? "border-b-accent! font-semibold text-accent" : undefined
      }
    >
      Incidencias
    </Link>
  );
}
