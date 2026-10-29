"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: ReactNode;
}) {
  const [theme, updateTheme] = useState(initialTheme);
  function setTheme(value: Theme) {
    document.documentElement.dataset.theme = value;
    document.cookie = `community-theme=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    updateTheme(value);
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemePicker() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Falta ThemeProvider");
  return (
    <label className="theme-picker">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none" />
      </svg>
      <span className="sr-only">Apariencia</span>
      <select
        aria-label="Apariencia"
        value={context.theme}
        onChange={(event) => context.setTheme(event.target.value as Theme)}
      >
        <option value="light">Claro</option>
        <option value="dark">Oscuro</option>
        <option value="system">Sistema</option>
      </select>
    </label>
  );
}
