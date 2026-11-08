import { api } from "@/lib/api";
import { SinPermiso, Titulo } from "@/components/reservas/ui";
import { AsambleaForm } from "./asamblea-form";

export default async function NuevaAsambleaPage() {
  const usuario = await api<{ rol: string }>("auth/me");

  if (usuario.rol !== "ADMINISTRADOR") {
    return <SinPermiso />;
  }

  return (
    <>
      <Titulo
        titulo="Convocar asamblea"
        detalle="Crea una asamblea y define los temas que serán sometidos a votación."
      />

      <AsambleaForm />
    </>
  );
}
