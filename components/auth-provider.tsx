"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Usuario, Unidad } from "@/lib/reservas";
type Auth = { usuario: Usuario; rol: Usuario["rol"]; unidades: Unidad[] };
const AuthContext = createContext<StoreApi<Auth> | null>(null);
export function AuthProvider({
  usuario,
  unidades,
  children,
}: {
  usuario: Usuario;
  unidades: Unidad[];
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<Auth>(() => ({ usuario, rol: usuario.rol, unidades })),
  );
  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
export function useAuthStore<T>(selector: (state: Auth) => T) {
  const store = useContext(AuthContext);
  if (!store) throw new Error("Falta AuthProvider");
  return useStore(store, selector);
}
