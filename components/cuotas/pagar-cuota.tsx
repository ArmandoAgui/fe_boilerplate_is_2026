"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { pagarCuota } from "@/app/actions/cuotas";
import {
  agruparTarjeta,
  dinero,
  erroresTarjeta,
  formatoVencimiento,
  soloDigitos,
  type CampoTarjeta,
  type DatosTarjeta,
} from "@/lib/cuotas";

const VACIO: DatosTarjeta = {
  numeroTarjeta: "",
  titular: "",
  vencimiento: "",
  cvv: "",
};

export function PagarCuota({
  cuotaId,
  monto,
  mesActual,
  volverA,
}: {
  cuotaId: string;
  monto: string;
  mesActual: string;
  volverA: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [datos, setDatos] = useState(VACIO);
  const [tocados, setTocados] = useState<Set<CampoTarjeta>>(new Set());
  const [rechazo, setRechazo] = useState("");
  const [error, setError] = useState("");
  const [procesando, startPago] = useTransition();
  // Una clave por intento de pago. Si la respuesta se pierde y el residente
  // vuelve a enviar, el backend reconoce la misma clave y devuelve el primer
  // resultado en lugar de cobrar otra vez.
  const clave = useRef<string | null>(null);

  const errores = erroresTarjeta(datos, mesActual);
  const hayErrores = Object.keys(errores).length > 0;
  const total = dinero(monto);
  // El error se muestra cuando el residente ya salió del campo, no mientras
  // empieza a escribir.
  const errorDe = (campo: CampoTarjeta) =>
    tocados.has(campo) ? errores[campo] : undefined;

  function cambiar(campo: CampoTarjeta, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  function tocar(campo: CampoTarjeta) {
    setTocados((t) => new Set(t).add(campo));
  }

  function confirmar() {
    dialog.current?.close();
    setRechazo("");
    setError("");
    clave.current ??= crypto.randomUUID();
    const idempotencyKey = clave.current;
    startPago(async () => {
      const r = await pagarCuota({ ...datos, cuotaId, idempotencyKey });
      if (r.datos?.estado === "APROBADO") {
        router.push(`/pagos/${r.datos.id}`);
        return;
      }
      if (r.datos) {
        // Rechazado: ese intento ya terminó; el siguiente es otra operación.
        clave.current = null;
        setRechazo(r.datos.motivoRechazo ?? "La pasarela no indicó el motivo");
        return;
      }
      // Con status, el backend respondió y no cobró: el reintento es nuevo.
      // Sin status (red caída o tiempo agotado) no sabemos si se cobró, así
      // que se conserva la clave para que el reintento no cobre dos veces.
      if (r.status) clave.current = null;
      setError(r.error ?? "No se pudo completar el pago. Intente de nuevo.");
    });
  }

  return (
    <section className="panel" aria-labelledby="pago-titulo">
      <h2 id="pago-titulo" className="mb-4 text-lg font-semibold">
        Datos de la tarjeta
      </h2>

      {rechazo && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[var(--danger)] p-3 text-sm font-medium text-[var(--danger)]"
        >
          Pago rechazado: {rechazo}. La cuota sigue pendiente; puedes revisar
          los datos e intentar de nuevo.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!hayErrores && !procesando) dialog.current?.showModal();
        }}
      >
        <fieldset disabled={procesando} className="grid gap-4">
          <legend className="sr-only">Datos de la tarjeta</legend>
          <Campo
            id="numeroTarjeta"
            etiqueta="Número de tarjeta"
            error={errorDe("numeroTarjeta")}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            value={agruparTarjeta(datos.numeroTarjeta)}
            onChange={(e) =>
              cambiar("numeroTarjeta", soloDigitos(e.target.value, 16))
            }
            onBlur={() => tocar("numeroTarjeta")}
          />
          <Campo
            id="titular"
            etiqueta="Titular"
            error={errorDe("titular")}
            autoComplete="cc-name"
            placeholder="Como aparece en la tarjeta"
            maxLength={60}
            value={datos.titular}
            onChange={(e) => cambiar("titular", e.target.value)}
            onBlur={() => tocar("titular")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="vencimiento"
              etiqueta="Vencimiento"
              error={errorDe("vencimiento")}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              maxLength={5}
              value={datos.vencimiento}
              onChange={(e) =>
                cambiar("vencimiento", formatoVencimiento(e.target.value))
              }
              onBlur={() => tocar("vencimiento")}
            />
            <Campo
              id="cvv"
              etiqueta="Código de seguridad"
              error={errorDe("cvv")}
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={3}
              value={datos.cvv}
              onChange={(e) => cambiar("cvv", soloDigitos(e.target.value, 3))}
              onBlur={() => tocar("cvv")}
            />
          </div>
        </fieldset>

        <p className="mt-4 text-xs text-muted">
          Pasarela de prueba: la tarjeta terminada en 4242 se aprueba. No se
          guarda el número completo ni el código de seguridad.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            className="button"
            disabled={hayErrores || procesando}
            aria-busy={procesando}
          >
            {procesando ? "Procesando…" : `Pagar ${total}`}
          </button>
          <Link
            href={volverA}
            className={`button-secondary${procesando ? " pointer-events-none opacity-50" : ""}`}
            aria-disabled={procesando}
            tabIndex={procesando ? -1 : undefined}
          >
            Cancelar
          </Link>
        </div>
      </form>

      <dialog
        ref={dialog}
        aria-labelledby="confirmar-pago-titulo"
        className="panel m-auto max-w-md"
      >
        <h2 id="confirmar-pago-titulo" className="text-xl font-semibold">
          Confirmar pago
        </h2>
        <p className="mt-3">¿Confirmas el pago de {total}?</p>
        <p className="mt-1 text-sm text-muted">
          El pago no se puede deshacer.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="button-secondary"
            onClick={() => dialog.current?.close()}
          >
            Volver
          </button>
          <button type="button" className="button" onClick={confirmar}>
            Confirmar pago
          </button>
        </div>
      </dialog>
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  error,
  ...input
}: {
  id: CampoTarjeta;
  etiqueta: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="text-sm">
      <label htmlFor={id} className="block font-medium">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        className={`field mt-1${error ? " border-[var(--danger)]" : ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
