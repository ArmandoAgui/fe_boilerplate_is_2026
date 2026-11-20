"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { operacion } from "@/app/actions/integracion";
export function CambiarEstado({ id, estado }: { id: string; estado: string }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState("");
  const [pending, start] = useTransition();
  const siguiente =
    estado === "ASIGNADA"
      ? "EN_PROCESO"
      : estado === "EN_PROCESO"
        ? "RESUELTA"
        : null;
  if (!siguiente) return null;
  return (
    <section className="mt-4">
      <button
        className="button-secondary"
        disabled={pending}
        onClick={() => {
          if (
            siguiente === "RESUELTA" &&
            !window.confirm(
              "¿Marcar la incidencia como resuelta? Se notificará al residente.",
            )
          )
            return;
          start(async () => {
            const r = await operacion("estado", id, { estado: siguiente });
            setMensaje(r.error ?? "Estado actualizado");
            router.refresh();
          });
        }}
      >
        {pending
          ? "Actualizando…"
          : siguiente === "RESUELTA"
            ? "Marcar como resuelta"
            : "Iniciar atención"}
      </button>
      <p role="status">{mensaje}</p>
    </section>
  );
}
