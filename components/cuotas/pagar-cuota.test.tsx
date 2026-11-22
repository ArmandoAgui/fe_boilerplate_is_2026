import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PagarCuota } from "@/components/cuotas/pagar-cuota";
import { EstadoDeCuenta } from "@/components/cuotas/estado-de-cuenta";
import PaginaPagar from "@/app/(plataforma)/cuotas/[id]/pagar/page";
import PaginaComprobante from "@/app/(plataforma)/pagos/[id]/page";
import { pagarCuota, type Resultado } from "@/app/actions/cuotas";
import { api, usuarioActual } from "@/lib/api";
import {
  agruparTarjeta,
  erroresTarjeta,
  formatoVencimiento,
  type Cuota,
  type DetalleCuota,
  type Pago,
} from "@/lib/cuotas";

// H2: criterios de interfaz (AC1 a AC3). Los de backend (AC4 a AC7) están en
// src/pagos/services/pagos.entrega.spec.ts del backend. La API y la acción de
// servidor se simulan: no llama al backend real.

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => navigation,
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("@/app/actions/cuotas", () => ({ pagarCuota: vi.fn() }));
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
  usuarioActual: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const pagar = vi.mocked(pagarCuota);
const llamarApi = vi.mocked(api);
const usuario = vi.mocked(usuarioActual);

const valida = {
  numeroTarjeta: "4242424242424242",
  titular: "Residente QA",
  vencimiento: "12/28",
  cvv: "123",
};

const pago = (
  estado: Pago["estado"],
  motivoRechazo: string | null = null,
): Pago => ({
  id: "p1",
  referencia: "PAG-20261120-000011",
  estado,
  cuotaId: "c1",
  concepto: "Cuota de mantenimiento",
  monto: "50.00",
  ultimos4: "4242",
  fecha: "2026-11-21T02:02:00.000Z",
  motivoRechazo,
});
const resultado = (p: Pago) => ({ datos: p }) satisfies Resultado<Pago>;

const pantalla = () =>
  render(
    <PagarCuota
      cuotaId="c1"
      monto="50.00"
      mesActual="2026-11"
      volverA="/cuotas?unidadId=u1"
    />,
  );

function llenar(datos = valida) {
  fireEvent.change(screen.getByLabelText("Número de tarjeta"), {
    target: { value: datos.numeroTarjeta },
  });
  fireEvent.change(screen.getByLabelText("Titular"), {
    target: { value: datos.titular },
  });
  fireEvent.change(screen.getByLabelText("Vencimiento"), {
    target: { value: datos.vencimiento },
  });
  fireEvent.change(screen.getByLabelText("Código de seguridad"), {
    target: { value: datos.cvv },
  });
}

/** Espera a que termine el intento anterior, si lo hubo, antes de pagar. */
async function pagarYConfirmar() {
  fireEvent.click(await screen.findByRole("button", { name: "Pagar $50.00" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  let n = 0;
  vi.spyOn(crypto, "randomUUID").mockImplementation(
    () =>
      `00000000-0000-4000-8000-00000000000${++n}` as ReturnType<
        typeof crypto.randomUUID
      >,
  );
});

describe("H2. Pagar una cuota pendiente", () => {
  it("AC1: /cuotas/:id/pagar muestra concepto, período, monto y vencimiento de la cuota", async () => {
    usuario.mockResolvedValue({ rol: "RESIDENTE" } as never);
    llamarApi.mockResolvedValue({
      id: "c1",
      unidadId: "u1",
      concepto: "Cuota de mantenimiento",
      periodo: "2026-11",
      monto: "52.50",
      montoBase: "50.00",
      recargo: "2.50",
      fechaVencimiento: "2026-11-15",
      estado: "VENCIDA",
      fechaPago: null,
    } satisfies DetalleCuota);
    render(await PaginaPagar({ params: Promise.resolve({ id: "c1" }) }));
    expect(llamarApi).toHaveBeenCalledWith("cuotas/c1");
    expect(screen.getByText("Resumen de la cuota")).toBeInTheDocument();
    expect(screen.getAllByText("Cuota de mantenimiento").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-11")).toBeInTheDocument();
    expect(screen.getByText("$52.50")).toBeInTheDocument();
    expect(screen.getByText("15/11/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar $52.50" })).toBeInTheDocument();
  });

  it("AC1: pide número de tarjeta (16 dígitos), titular, vencimiento MM/AA y código de seguridad (3 dígitos)", () => {
    pantalla();
    for (const campo of [
      "Número de tarjeta",
      "Titular",
      "Vencimiento",
      "Código de seguridad",
    ])
      expect(screen.getByLabelText(campo)).toBeInTheDocument();
    expect(screen.getByLabelText("Código de seguridad")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Pagar $50.00" })).toBeDisabled();
    llenar();
    expect(screen.getByRole("button", { name: "Pagar $50.00" })).toBeEnabled();
  });

  it("AC1: rechaza datos de tarjeta inválidos con el mensaje bajo cada campo", () => {
    expect(erroresTarjeta(valida, "2026-11")).toEqual({});
    expect(
      erroresTarjeta(
        { numeroTarjeta: "4242", titular: " A ", vencimiento: "13/28", cvv: "12" },
        "2026-11",
      ),
    ).toEqual({
      numeroTarjeta: "El número de tarjeta debe tener 16 dígitos",
      titular: "El titular debe tener entre 3 y 60 caracteres",
      vencimiento: "Use el formato MM/AA",
      cvv: "El código de seguridad debe tener 3 dígitos",
    });
    expect(
      erroresTarjeta({ ...valida, vencimiento: "10/26" }, "2026-11").vencimiento,
    ).toBe("La tarjeta está vencida");
    expect(agruparTarjeta("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatoVencimiento("1228")).toBe("12/28");

    pantalla();
    const numero = screen.getByLabelText("Número de tarjeta");
    fireEvent.change(numero, { target: { value: "4242" } });
    fireEvent.blur(numero);
    expect(
      screen.getByText("El número de tarjeta debe tener 16 dígitos"),
    ).toBeInTheDocument();
    expect(numero).toHaveAttribute("aria-invalid", "true");
  });

  it("AC2: mientras la pasarela responde muestra Procesando… y no permite enviar dos veces", async () => {
    let responder!: (r: Resultado<Pago>) => void;
    pagar.mockReturnValue(new Promise((r) => (responder = r)));
    pantalla();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Pagar $50.00" }));
    expect(
      screen.getByText("¿Confirmas el pago de $50.00?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar pago" }));

    const boton = await screen.findByRole("button", { name: "Procesando…" });
    expect(boton).toBeDisabled();
    expect(screen.getByLabelText("Número de tarjeta")).toBeDisabled();
    fireEvent.click(boton);
    expect(pagar).toHaveBeenCalledTimes(1);

    responder(resultado(pago("APROBADO")));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
  });

  it("AC2: si la respuesta se pierde, el reintento conserva la clave y no cobra dos veces", async () => {
    pagar
      .mockResolvedValueOnce({
        error: "No se pudo completar la operación. Intente de nuevo.",
      })
      .mockResolvedValueOnce(resultado(pago("APROBADO")));
    pantalla();
    llenar();
    await pagarYConfirmar();
    expect(
      await screen.findByText(
        "No se pudo completar la operación. Intente de nuevo.",
      ),
    ).toBeInTheDocument();
    await pagarYConfirmar();
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/pagos/p1"),
    );
    expect(pagar.mock.calls[1][0].idempotencyKey).toBe(
      pagar.mock.calls[0][0].idempotencyKey,
    );
  });

  it("AC3: muestra el error del backend, por ejemplo cuota ya pagada", async () => {
    pagar.mockResolvedValue({
      error: "La cuota ya está pagada o fue anulada",
      status: 409,
    });
    pantalla();
    llenar();
    await pagarYConfirmar();
    expect(
      await screen.findByText("La cuota ya está pagada o fue anulada"),
    ).toBeInTheDocument();
  });

  it("AC3: con pago aprobado abre el comprobante del pago", async () => {
    pagar.mockResolvedValue(resultado(pago("APROBADO")));
    pantalla();
    llenar();
    await pagarYConfirmar();
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/pagos/p1"),
    );
  });

  it("AC3: el comprobante muestra referencia, fecha y hora, concepto, monto y últimos 4 dígitos", async () => {
    usuario.mockResolvedValue({ rol: "RESIDENTE" } as never);
    llamarApi.mockImplementation(async (ruta: string) =>
      ruta.startsWith("pagos/") ? pago("APROBADO") : { unidadId: "u1" },
    );
    render(
      await PaginaComprobante({ params: Promise.resolve({ id: "p1" }) }),
    );
    expect(screen.getByText("Comprobante de pago")).toBeInTheDocument();
    expect(screen.getByText("PAG-20261120-000011")).toBeInTheDocument();
    expect(screen.getByText("20/11/2026 20:02")).toBeInTheDocument();
    expect(screen.getByText("Cuota de mantenimiento")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("•••• 4242")).toBeInTheDocument();
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
  });

  it("AC3: con pago rechazado muestra el motivo y la cuota queda disponible para reintentar", async () => {
    pagar
      .mockResolvedValueOnce(resultado(pago("RECHAZADO", "Fondos insuficientes")))
      .mockResolvedValueOnce(resultado(pago("APROBADO")));
    pantalla();
    llenar({ ...valida, numeroTarjeta: "4000000000000002" });
    await pagarYConfirmar();
    expect(
      await screen.findByText(/Pago rechazado: Fondos insuficientes/),
    ).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();

    // Reintento: es otra operación, así que lleva otra idempotencyKey.
    await pagarYConfirmar();
    await waitFor(() => expect(pagar).toHaveBeenCalledTimes(2));
    expect(pagar.mock.calls[1][0].idempotencyKey).not.toBe(
      pagar.mock.calls[0][0].idempotencyKey,
    );
  });

  it("AC3: el enlace Pagar aparece solo en cuotas pendientes o vencidas", () => {
    const cuota = (periodo: string, estado: Cuota["estado"]): Cuota => ({
      id: `c-${periodo}`,
      concepto: "Cuota de mantenimiento",
      periodo,
      monto: "50.00",
      fechaVencimiento: `${periodo}-10`,
      estado,
    });
    render(
      <EstadoDeCuenta
        unidades={[{ id: "u1", codigo: "A-101" }]}
        filtros={{ unidadId: "u1", periodo: "", estado: "" }}
        lista={{
          datos: [
            cuota("2026-10", "VENCIDA"),
            cuota("2026-11", "PENDIENTE"),
            cuota("2026-09", "PAGADA"),
          ],
          totalPendiente: "100.00",
          total: 3,
          pagina: 1,
          tamanoPagina: 20,
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Pagar la cuota 2026-10" }),
    ).toHaveAttribute("href", "/cuotas/c-2026-10/pagar");
    expect(
      screen.getByRole("link", { name: "Pagar la cuota 2026-11" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Pagar la cuota 2026-09" }),
    ).not.toBeInTheDocument();
  });
});
