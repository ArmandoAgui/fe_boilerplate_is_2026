export class ErrorNotificaciones extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ErrorNotificaciones";
  }
}

export async function solicitarJson<T>(
  ruta: string,
  init: RequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(15_000);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeout])
    : timeout;
  const response = await fetch(ruta, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json", ...init.headers },
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ErrorNotificaciones(
      response.status,
      typeof data?.message === "string"
        ? data.message
        : "No se pudo completar la operación. Intenta de nuevo.",
    );
  return data as T;
}
