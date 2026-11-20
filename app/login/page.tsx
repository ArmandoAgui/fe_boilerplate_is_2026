import type { Metadata } from "next";
import { ThemePicker } from "@/components/theme-provider";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col px-5 py-5">
      <div className="flex justify-end">
        <ThemePicker />
      </div>
      <div className="flex flex-1 items-center justify-center py-8">
        <main className="panel w-full max-w-sm !p-8">
          <p className="mb-2 text-sm font-medium text-accent">
            Nuestra comunidad
          </p>
          <h1 className="mb-2 text-2xl font-semibold">Iniciar sesión</h1>
          <p className="mb-6 text-sm text-muted">
            Accede a los espacios y servicios de tu condominio.
          </p>
          <LoginForm />
        </main>
      </div>
    </div>
  );
}
