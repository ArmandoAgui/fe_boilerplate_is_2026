"use client";
import { useState } from "react";
export function PantallaCompleta() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="button-secondary"
        onClick={async () => {
          try {
            await document.documentElement.requestFullscreen();
          } catch {
            setError(
              "La pantalla completa no está disponible en este navegador.",
            );
          }
        }}
      >
        Presentar en pantalla completa
      </button>
      {error && <p role="status">{error}</p>}
    </>
  );
}
