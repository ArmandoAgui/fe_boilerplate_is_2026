import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Catalogo, Navegacion } from "@/components/reservas/ui";
import { Disponibilidad } from "@/components/reservas/disponibilidad";
import { NuevaReserva } from "@/components/reservas/nueva-reserva";
import { MisReservas } from "@/components/reservas/mis-reservas";
import { AdminAreas } from "@/components/reservas/admin-areas";
import { AuthProvider } from "@/components/auth-provider";
import Loading from "@/app/(plataforma)/loading";
import ErrorPage from "@/app/(plataforma)/error";
import {
  crearReserva,
  cancelarReserva,
  guardarArea,
} from "@/app/actions/reservas";
import {
  fechaValida,
  hoyLocal,
  errorHorarios,
  puedeCancelar,
  type Area,
  type Reserva,
} from "@/lib/reservas";
const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/app/actions/reservas", () => ({
  crearReserva: vi.fn(),
  cancelarReserva: vi.fn(),
  guardarArea: vi.fn(),
}));
const area: Area = {
  id: "area",
  nombre: "Salón de eventos",
  capacidad: 40,
  activa: true,
  horarios: Array.from({ length: 7 }, (_, diaSemana) => ({
    diaSemana,
    horaInicio: "06:00",
    horaFin: "22:00",
  })),
};
const reserva: Reserva = {
  id: "r",
  codigo: "RES-000001",
  areaId: "area",
  areaNombre: area.nombre,
  inicio: "2099-01-02T18:00:00Z",
  fin: "2099-01-02T19:00:00Z",
  asistentes: 2,
  estado: "CONFIRMADA",
};
function formulario(inicialHora = "12:00") {
  const hoy = hoyLocal();
  const manana = new Date(Date.now() + 86400000 - 6 * 3600000)
    .toISOString()
    .slice(0, 10);
  return render(
    <AuthProvider
      usuario={{
        id: "user",
        nombre: "Ana",
        email: "ana@condominio.test",
        rol: "RESIDENTE",
      }}
      unidades={[{ id: "u", codigo: "A-101" }]}
    >
      <NuevaReserva
        areas={[area]}
        hoy={hoy}
        inicial={{ areaId: "area", fecha: manana, hora: inicialHora }}
      />
    </AuthProvider>,
  );
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());
describe("H5 catálogo y disponibilidad", () => {
  it("renderiza catálogo con capacidad y enlace", () => {
    render(<Catalogo areas={[area]} />);
    expect(screen.getByText(/40 personas/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/areas/area/disponibilidad",
    );
  });
  it("muestra catálogo vacío", () => {
    render(<Catalogo areas={[]} />);
    expect(screen.getByText(/Aún no hay áreas/)).toBeInTheDocument();
  });
  it("muestra estados, enlace precargado y recarga por fecha", () => {
    render(
      <Disponibilidad
        hoy="2099-01-01"
        rol="RESIDENTE"
        habilitada={false}
        datos={{
          areaId: "area",
          fecha: "2099-01-02",
          bloques: [
            { inicio: "12:00", fin: "13:00", estado: "DISPONIBLE" },
            { inicio: "13:00", fin: "14:00", estado: "OCUPADO" },
            { inicio: "14:00", fin: "15:00", estado: "FUERA_DE_HORARIO" },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Reservar 12:00/ }),
    ).toHaveAttribute(
      "href",
      "/reservas/nueva?areaId=area&fecha=2099-01-02&hora=12:00",
    );
    expect(
      screen.getByText(/El área no está habilitada este día/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2099-01-03" },
    });
    expect(navigation.push).toHaveBeenCalledWith("?fecha=2099-01-03");
  });
  it("administrador consulta sin acción de reservar", () => {
    render(
      <Disponibilidad
        hoy="2099-01-01"
        rol="ADMINISTRADOR"
        habilitada
        datos={{
          areaId: "a",
          fecha: "2099-01-02",
          bloques: [{ inicio: "12:00", fin: "13:00", estado: "DISPONIBLE" }],
        }}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("muestra carga y permite reintentar errores", async () => {
    const retry = vi.fn();
    const view = render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
    view.unmount();
    render(<ErrorPage error={new Error()} retry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalled();
  });
});
describe("H6 formulario", () => {
  it("envía datos en UTC", async () => {
    vi.mocked(crearReserva).mockResolvedValue({ ok: true });
    formulario();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    );
    await waitFor(() =>
      expect(crearReserva).toHaveBeenCalledWith(
        expect.objectContaining({
          areaId: "area",
          asistentes: 1,
          duracionHoras: 1,
          inicio: expect.stringMatching(/T18:00:00.000Z$/),
        }),
      ),
    );
  });
  it("conserva formulario ante 409 y muestra mensaje exacto", async () => {
    vi.mocked(crearReserva).mockResolvedValue({
      status: 409,
      error: "Ese horario ya fue reservado. Elija otro.",
    });
    formulario();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese horario ya fue reservado. Elija otro.",
    );
    expect(
      screen.getByRole("region", { name: "Selección de reserva" }),
    ).toHaveTextContent("12:00");
    expect(
      screen.getByRole("heading", { name: "Salón de eventos" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Área común")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hora de inicio")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Fecha")).not.toBeInTheDocument();
  });
  it("valida capacidad y horario antes de confirmar", () => {
    formulario();
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "41" },
    });
    expect(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    ).toBeDisabled();
    expect(screen.getByText(/supera la capacidad/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "1" },
    });
  });
  it("rechaza una selección fuera del horario y permite volver a disponibilidad", () => {
    formulario("23:00");
    expect(screen.getByText(/fuera del horario/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "Elegir otro horario" }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("/areas/area/disponibilidad?fecha="),
    );
  });
  it("permite reservar sin unidades y no muestra selector de unidad", async () => {
    const hoy = hoyLocal();
    const manana = new Date(Date.now() + 86400000 - 6 * 3600000)
      .toISOString()
      .slice(0, 10);
    render(
      <AuthProvider
        usuario={{
          id: "user",
          nombre: "Ana",
          email: "a@a.test",
          rol: "RESIDENTE",
        }}
        unidades={[]}
      >
        <NuevaReserva
          areas={[area]}
          hoy={hoy}
          inicial={{ areaId: "area", fecha: manana, hora: "12:00" }}
        />
      </AuthProvider>,
    );
    expect(
      screen.queryByLabelText("Unidad habitacional"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    ).toBeEnabled();
    vi.mocked(crearReserva).mockResolvedValue({ ok: true });
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar reserva" }),
    );
    expect(crearReserva).toHaveBeenCalledWith(
      expect.not.objectContaining({ unidadId: expect.anything() }),
    );
  });
  it("sin selección invita a consultar disponibilidad", () => {
    render(<NuevaReserva areas={[area]} hoy={hoyLocal()} inicial={{}} />);
    expect(
      screen.getByRole("link", { name: "Consultar áreas" }),
    ).toHaveAttribute("href", "/areas");
    expect(
      screen.queryByRole("button", { name: "Confirmar reserva" }),
    ).not.toBeInTheDocument();
  });
});
describe("H7 cancelación", () => {
  it("muestra confirmación y actualiza estado", async () => {
    vi.mocked(cancelarReserva).mockResolvedValue({ ok: true });
    render(
      <MisReservas
        lista={{ datos: [reserva], total: 1, pagina: 1, tamanoPagina: 20 }}
        confirmada="RES-000001"
      />,
    );
    expect(screen.getByText(/Reserva confirmada/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(
      "¿Cancelar la reserva RES-000001? Esta acción no se puede deshacer",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Cancelar reserva" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Cancelada")).toBeInTheDocument(),
    );
    expect(screen.getByText("Reserva cancelada")).toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
  });
  it("oculta cancelación para reserva cancelada", () => {
    render(
      <MisReservas
        lista={{
          datos: [{ ...reserva, estado: "CANCELADA" }],
          total: 1,
          pagina: 1,
          tamanoPagina: 20,
        }}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
  });
  it("muestra vacío", () => {
    render(
      <MisReservas
        lista={{ datos: [], total: 0, pagina: 1, tamanoPagina: 20 }}
      />,
    );
    expect(screen.getByText("Aún no tienes reservas")).toBeInTheDocument();
  });
  it("muestra error de plazo sin cambiar estado", async () => {
    vi.mocked(cancelarReserva).mockResolvedValue({
      status: 409,
      error: "Solo se puede cancelar con 2 horas de anticipación",
    });
    render(
      <MisReservas
        lista={{ datos: [reserva], total: 1, pagina: 1, tamanoPagina: 20 }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar reserva" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/2 horas/),
    );
    expect(screen.getByText("Confirmada")).toBeInTheDocument();
  });
});
describe("H8 administración", () => {
  it("valida solapamientos y guarda todas las franjas", async () => {
    vi.mocked(guardarArea).mockResolvedValue({ ok: true });
    render(<AdminAreas areas={[]} />);
    expect(
      screen.getByText("Aún no hay áreas registradas"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Nueva área" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Nuevo salón");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar franja" }),
    );
    expect(
      screen.getByText("Las franjas no pueden traslaparse"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Aplicar 06:00–22:00 a toda la semana",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(guardarArea).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          nombre: "Nuevo salón",
          horarios: expect.arrayContaining([
            { diaSemana: 0, horaInicio: "06:00", horaFin: "22:00" },
          ]),
        }),
      ),
    );
    expect(await screen.findByText("Área guardada")).toBeInTheDocument();
  });
  it("edita área inactiva y rechaza capacidad inválida", async () => {
    render(<AdminAreas areas={[{ ...area, activa: false }]} />);
    expect(screen.getByText("Inactiva")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Editar Salón de eventos" }),
    );
    fireEvent.change(screen.getByLabelText("Capacidad"), {
      target: { value: "501" },
    });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
describe("permisos y fechas", () => {
  it.each(["RESIDENTE", "ADMINISTRADOR", "SEGURIDAD"] as const)(
    "navegación del rol %s",
    (rol) => {
      render(<Navegacion rol={rol} />);
      expect(!!screen.queryByRole("link", { name: "Administrar áreas" })).toBe(
        rol === "ADMINISTRADOR",
      );
      expect(!!screen.queryByRole("link", { name: "Mis reservas" })).toBe(
        rol === "RESIDENTE",
      );
    },
  );
  it("rango inclusivo 30 días y fechas reales", () => {
    expect(fechaValida("2099-01-31", "2099-01-01")).toBe(true);
    expect(fechaValida("2099-02-01", "2099-01-01")).toBe(false);
    expect(fechaValida("2099-02-30", "2099-02-01")).toBe(false);
    expect(fechaValida("2098-12-31", "2099-01-01")).toBe(false);
  });
  it("botón de cancelación exige más de 2 horas", () => {
    const inicio = new Date(reserva.inicio).getTime();
    expect(puedeCancelar(reserva, inicio - 7200000)).toBe(false);
    expect(puedeCancelar(reserva, inicio - 7200001)).toBe(true);
  });
  it("rechaza franjas vacías y hora final anterior", () => {
    expect(errorHorarios([])).toBeTruthy();
    expect(
      errorHorarios([{ diaSemana: 1, horaInicio: "12:00", horaFin: "11:00" }]),
    ).toBeTruthy();
  });
});
