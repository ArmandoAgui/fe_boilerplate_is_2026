import { usuarioActual } from "@/lib/api";
import { AuthProvider } from "@/components/auth-provider";
import { EstructuraPlataforma } from "@/components/plataforma/estructura";
export default async function PlataformaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  return (
    <AuthProvider usuario={usuario} unidades={[]}>
      <EstructuraPlataforma usuario={usuario}>{children}</EstructuraPlataforma>
    </AuthProvider>
  );
}
