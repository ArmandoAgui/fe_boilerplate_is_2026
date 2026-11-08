import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MisVisitas } from "@/components/visitas/mis-visitas";
import { NuevaVisita } from "@/components/visitas/nueva-visita";
import { SinPermiso } from "@/components/visitas/ui";
import {
  cancelarAutorizacion,
  crearAutorizacion,
} from "@/app/actions/visitas";
import {
  HORA,
  aISO,
  errorDocumento,
  errorNombre,
  errorVigencia,
  paraInput,
  type Autorizacion,
  type EstadoVisita,
  type ListaAutorizaciones,
} from "@/lib/visitas";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/visitas", () => ({
  crearAutorizacion: vi.fn(),
  cancelarAutorizacion: vi.fn(),
}));

const base: Autorizacion = {
  id: "a1",
  visitanteNombre: "Juan Perez",
  unidadCodigo: "A-101",
  inicio: "2099-01-02T16:00:00Z",
  fin: "2099-01-02T22:00:00Z",
  estado: "VIGENTE",
};
const lista = (datos: Autorizacion[]): ListaAutorizaciones => ({
  datos,
  total: datos.length,
  pagina: 1,
  tamanoPagina: 20,
});
const unidades = [
  { id: "u1", codigo: "A-101" },
  { id: "u2", codigo: "A-102" },
];

beforeEach(() => vi.clearAllMocks());

describe("Reglas de vigencia en el cliente", () => {
  const ahora = Date.parse("2026-11-08T18:00:00Z");
  const en = (h: number) => paraInput(ahora + h * HORA);

  it("acepta una vigencia válida", () =>
    expect(errorVigencia(en(2), en(10), ahora)).toBe(""));

  it("rechaza más de 24 horas con el texto de la card", () =>
    expect(errorVigencia(en(1), en(26), ahora)).toBe(
      "La vigencia máxima es de 24 horas",
    ));

  it("acepta exactamente 24 horas", () =>
    expect(errorVigencia(en(1), en(25), ahora)).toBe(""));

  it("rechaza un fin que no supera al inicio", () =>
    expect(errorVigencia(en(5), en(5), ahora)).toBe(
      "El fin debe ser posterior al inicio",
    ));

  it("rechaza un inicio en el pasado", () =>
    expect(errorVigencia(en(-1), en(5), ahora)).toBe(
      "El inicio no puede ser anterior a ahora",
    ));

  it("rechaza un inicio a más de 30 días", () =>
    expect(errorVigencia(en(30 * 24 + 2), en(30 * 24 + 4), ahora)).toBe(
      "El inicio no puede superar los 30 días a futuro",
    ));

  it.each(["Jo", "a".repeat(101)])("rechaza el nombre %s", (v) =>
    expect(errorNombre(v)).not.toBe(""),
  );

  it.each(["0123-4567", "123", "a".repeat(21), "con espacio"])(
    "rechaza el documento %s",
    (v) => expect(errorDocumento(v)).not.toBe(""),
  );

  it("acepta un documento alfanumérico válido", () =>
    expect(errorDocumento("012345678")).toBe(""));

  // El backend exige zona explícita; sin esto la vigencia se corre seis horas.
  it("agrega el offset del condominio al enviar", () =>
    expect(aISO("2026-11-08T10:00")).toBe("2026-11-08T10:00:00-06:00"));
});

describe("Mis visitantes", () => {
  it("muestra el vacío cuando no hay autorizaciones", () => {
    render(<MisVisitas lista={lista([])} />);
    expect(screen.getByText("No tienes visitas autorizadas")).toBeVisible();
  });

  it("muestra la unidad y el estado de cada autorización", () => {
    render(<MisVisitas lista={lista([base])} />);
    expect(screen.getByText("Juan Perez")).toBeVisible();
    expect(screen.getByText("A-101")).toBeVisible();
    expect(screen.getByText("Vigente")).toBeVisible();
  });

  it("anuncia la visita recién autorizada", () => {
    render(<MisVisitas lista={lista([base])} autorizada="Juan Perez" />);
    expect(screen.getByText(/Visita autorizada/)).toBeVisible();
  });

  it.each<EstadoVisita>(["USADA", "CANCELADA"])(
    "no ofrece cancelar una autorización %s",
    (estado) => {
      render(<MisVisitas lista={lista([{ ...base, estado }])} />);
      expect(screen.queryByRole("button", { name: /Cancelar la autorización de/ })).toBeNull();
    },
  );

  // Vencida llega como VIGENTE con el fin pasado: el botón no debe aparecer.
  it("no ofrece cancelar una vigente cuyo fin ya pasó", () => {
    render(
      <MisVisitas
        lista={lista([
          {
            ...base,
            inicio: "2020-01-01T10:00:00Z",
            fin: "2020-01-01T18:00:00Z",
          },
        ])}
      />,
    );
    expect(screen.queryByRole("button", { name: /Cancelar la autorización de/ })).toBeNull();
  });

  it("confirma con el nombre del visitante antes de cancelar", async () => {
    vi.mocked(cancelarAutorizacion).mockResolvedValue({ ok: true });
    render(<MisVisitas lista={lista([base])} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancelar la autorización de/ }));
    expect(
      screen.getByText("¿Cancelar la autorización de Juan Perez?"),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar autorización" }),
    );
    await waitFor(() =>
      expect(cancelarAutorizacion).toHaveBeenCalledWith("a1"),
    );
    expect(await screen.findByText("Autorización cancelada")).toBeVisible();
  });

  it("muestra el error del servidor y no marca como cancelada", async () => {
    vi.mocked(cancelarAutorizacion).mockResolvedValue({
      error: "Solo se puede cancelar una autorización vigente",
      status: 409,
    });
    render(<MisVisitas lista={lista([base])} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancelar la autorización de/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Cancelar autorización" }),
    );
    expect(
      await screen.findByText(
        "Solo se puede cancelar una autorización vigente",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Autorización cancelada")).toBeNull();
  });
});

describe("Autorizar una visita", () => {
  it("avisa cuando el residente no tiene unidades vinculadas", () => {
    render(<NuevaVisita unidades={[]} />);
    expect(screen.getByText(/no puedes autorizar visitas/)).toBeVisible();
  });

  it("muestra la ayuda de la vigencia máxima", () => {
    render(<NuevaVisita unidades={unidades} />);
    expect(
      screen.getByText(
        "Vigencia máxima: 24 horas. La autorización sirve para un solo ingreso.",
      ),
    ).toBeVisible();
  });

  it("mantiene Guardar deshabilitado hasta completar el formulario", () => {
    render(<NuevaVisita unidades={unidades} />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  function completar(horasInicio = 2, horasFin = 10) {
    render(<NuevaVisita unidades={unidades} />);
    fireEvent.change(screen.getByLabelText("Nombre del visitante"), {
      target: { value: "Juan Perez" },
    });
    fireEvent.change(screen.getByLabelText("Documento"), {
      target: { value: "012345678" },
    });
    fireEvent.change(screen.getByLabelText("Inicio"), {
      target: { value: paraInput(Date.now() + horasInicio * HORA) },
    });
    fireEvent.change(screen.getByLabelText("Fin"), {
      target: { value: paraInput(Date.now() + horasFin * HORA) },
    });
  }

  it("bloquea el envío cuando la vigencia supera 24 horas", () => {
    completar(1, 26);
    expect(screen.getByText("La vigencia máxima es de 24 horas")).toBeVisible();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("envía la primera unidad y las fechas con zona horaria", async () => {
    vi.mocked(crearAutorizacion).mockResolvedValue({ ok: true });
    completar();
    const guardar = screen.getByRole("button", { name: "Guardar" });
    expect(guardar).toBeEnabled();
    fireEvent.click(guardar);
    await waitFor(() => expect(crearAutorizacion).toHaveBeenCalledOnce());
    const enviado = vi.mocked(crearAutorizacion).mock.calls[0][0];
    expect(enviado.unidadId).toBe("u1");
    expect(enviado.visitanteNombre).toBe("Juan Perez");
    expect(enviado.inicio).toMatch(/-06:00$/);
    expect(enviado.fin).toMatch(/-06:00$/);
  });

  it("rechaza un inicio que pasó mientras el formulario seguía abierto", () => {
    const inicial = Date.parse("2026-11-08T18:00:00Z");
    const reloj = vi.spyOn(Date, "now").mockReturnValue(inicial);
    try {
      completar(2, 10);
      const guardar = screen.getByRole("button", { name: "Guardar" });
      expect(guardar).toBeEnabled();
      reloj.mockReturnValue(inicial + 3 * HORA);
      fireEvent.click(guardar);
      expect(screen.getByText("El inicio no puede ser anterior a ahora")).toBeVisible();
      expect(crearAutorizacion).not.toHaveBeenCalled();
    } finally {
      reloj.mockRestore();
    }
  });

  it("muestra el error que devuelve el servidor", async () => {
    vi.mocked(crearAutorizacion).mockResolvedValue({
      error: "La unidad no está vinculada a tu usuario",
      status: 403,
    });
    completar();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(
      await screen.findByText("La unidad no está vinculada a tu usuario"),
    ).toBeVisible();
  });
});

describe("Sin permiso", () => {
  it("ofrece volver al inicio", () => {
    render(<SinPermiso />);
    expect(
      screen.getByText("No tienes permiso para ver esta página"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ir al inicio" })).toBeVisible();
  });
});
