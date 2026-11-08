"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          placeholder="tu@correo.com"
          className="field"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>

      <p aria-live="polite" className="field-error min-h-5">
        {state.error}
      </p>

      <button type="submit" disabled={pending} className="button w-full">
        {pending ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
