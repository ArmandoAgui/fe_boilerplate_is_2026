import { usuarioActual } from "@/lib/api";
import { AuthProvider } from "@/components/auth-provider";
import { ProveedorNotificaciones } from "@/components/notificaciones/proveedor";
import { EstructuraPlataforma } from "@/components/plataforma/estructura";
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  return (
    <AuthProvider usuario={usuario} unidades={[]}>
      {usuario.rol === "RESIDENTE" ? (
        <ProveedorNotificaciones key={usuario.id}>
          <EstructuraPlataforma usuario={usuario}>{children}</EstructuraPlataforma>
        </ProveedorNotificaciones>
      ) : (
        <EstructuraPlataforma usuario={usuario}>{children}</EstructuraPlataforma>
      )}
    </AuthProvider>
  );
}
