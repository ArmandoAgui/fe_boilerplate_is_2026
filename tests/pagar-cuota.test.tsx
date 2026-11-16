import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PagarCuota } from "@/components/cuotas/pagar-cuota";
import { EstadoDeCuenta } from "@/components/cuotas/estado-de-cuenta";
import { pagarCuota, type Resultado } from "@/app/actions/cuotas";
import {
  agruparTarjeta,
  erroresTarjeta,
  formatoVencimiento,
  type Cuota,
  type Pago,
} from "@/lib/cuotas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/cuotas", () => ({ pagarCuota: vi.fn() }));

const pagar = vi.mocked(pagarCuota);

const valida = {
  numeroTarjeta: "4242424242424242",
  titular: "Heber Canales",
  vencimiento: "12/28",
  cvv: "123",
};

const pago = (estado: Pago["estado"], motivoRechazo: string | null = null) =>
  ({
    datos: {
      id: "p1",
      referencia: "PAG-20261115-000001",
      estado,
      cuotaId: "c1",
      concepto: "Cuota de mantenimiento",
      monto: "50.00",
      ultimos4: "4242",
      fecha: "2026-11-15T18:00:00.000Z",
      motivoRechazo,
    },
  }) satisfies Resultado<Pago>;

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
    () => `00000000-0000-4000-8000-00000000000${++n}` as `${string}-${string}-${string}-${string}-${string}`,
  );
});

describe("H2: reglas de la tarjeta", () => {
  it("acepta datos válidos", () => {
    expect(erroresTarjeta(valida, "2026-11")).toEqual({});
  });

  it("usa los mismos mensajes que el backend", () => {
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
  });

  it("acepta el mes actual y rechaza uno anterior", () => {
    const con = (vencimiento: string) =>
      erroresTarjeta({ ...valida, vencimiento }, "2026-11").vencimiento;
    expect(con("11/26")).toBeUndefined();
    expect(con("10/26")).toBe("La tarjeta está vencida");
  });

  it("da formato a la tarjeta y al vencimiento mientras se escribe", () => {
    expect(agruparTarjeta("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatoVencimiento("1228")).toBe("12/28");
    expect(formatoVencimiento("12")).toBe("12");
    expect(formatoVencimiento("ab1x2")).toBe("12");
  });
});

describe("H2: pantalla Pago de cuota", () => {
  it("deshabilita Pagar hasta que los datos son válidos", () => {
    pantalla();
    expect(screen.getByRole("button", { name: "Pagar $50.00" })).toBeDisabled();
    llenar();
    expect(screen.getByRole("button", { name: "Pagar $50.00" })).toBeEnabled();
  });

  it("muestra el error bajo el campo al salir de él", () => {
    pantalla();
    const numero = screen.getByLabelText("Número de tarjeta");
    fireEvent.change(numero, { target: { value: "4242" } });
    expect(
      screen.queryByText("El número de tarjeta debe tener 16 dígitos"),
    ).not.toBeInTheDocument();
    fireEvent.blur(numero);
    expect(
      screen.getByText("El número de tarjeta debe tener 16 dígitos"),
    ).toBeInTheDocument();
    expect(numero).toHaveAttribute("aria-invalid", "true");
  });

  it("pide confirmación con el monto antes de cobrar", () => {
    pantalla();
    llenar();
    fireEvent.click(screen.getByRole("button", { name: "Pagar $50.00" }));
    expect(
      screen.getByText("¿Confirmas el pago de $50.00?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(pagar).not.toHaveBeenCalled();
  });

  it("muestra Procesando… sin permitir un segundo envío y abre el comprobante", async () => {
    let responder!: (r: Resultado<Pago>) => void;
    pagar.mockReturnValue(new Promise((r) => (responder = r)));
    pantalla();
    llenar();
    await pagarYConfirmar();

    const boton = await screen.findByRole("button", { name: "Procesando…" });
    expect(boton).toBeDisabled();
    expect(screen.getByLabelText("Número de tarjeta")).toBeDisabled();
    expect(pagar).toHaveBeenCalledTimes(1);
    expect(pagar).toHaveBeenCalledWith({
      ...valida,
      cuotaId: "c1",
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    });

    responder(pago("APROBADO"));
    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/pagos/p1"),
    );
  });

  it("con rechazo muestra el motivo y el reintento usa otra clave", async () => {
    pagar.mockResolvedValue(pago("RECHAZADO", "Fondos insuficientes"));
    pantalla();
    llenar({ ...valida, numeroTarjeta: "4000000000000002" });
    await pagarYConfirmar();

    expect(
      await screen.findByText(/Pago rechazado: Fondos insuficientes/),
    ).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();

    await pagarYConfirmar();
    await waitFor(() => expect(pagar).toHaveBeenCalledTimes(2));
    expect(pagar.mock.calls[1][0].idempotencyKey).toBe(
      "00000000-0000-4000-8000-000000000002",
    );
  });

  it("si la respuesta se pierde, el reintento conserva la clave", async () => {
    pagar.mockResolvedValueOnce({
      error: "No se pudo completar la operación. Intente de nuevo.",
    });
    pagar.mockResolvedValueOnce(pago("APROBADO"));
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

  it("muestra el error del backend, por ejemplo cuota ya pagada", async () => {
    pagar.mockResolvedValue({ error: "La cuota ya está pagada", status: 409 });
    pantalla();
    llenar();
    await pagarYConfirmar();
    expect(
      await screen.findByText("La cuota ya está pagada"),
    ).toBeInTheDocument();
  });
});

describe("H2: botón Pagar en el estado de cuenta", () => {
  const cuota = (periodo: string, estado: Cuota["estado"]): Cuota => ({
    id: `c-${periodo}`,
    concepto: "Cuota de mantenimiento",
    periodo,
    monto: "50.00",
    fechaVencimiento: `${periodo}-10`,
    estado,
  });

  it("aparece solo en cuotas pendientes o vencidas", () => {
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
