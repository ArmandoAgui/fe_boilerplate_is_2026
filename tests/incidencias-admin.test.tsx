import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdministrarIncidencias } from "@/components/incidencias/administrar-incidencias";
import {
  actualizarEstadoIncidencia,
  guardarAsignacionIncidencia,
} from "@/app/actions/incidencias-admin";
import type {
  IncidenciaDetalle,
  IncidenciaResumen,
  ListaIncidencias,
} from "@/lib/incidencias-admin";

const { navegacion } = vi.hoisted(() => ({
  navegacion: { push: vi.fn(), refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navegacion,
}));
vi.mock("@/app/actions/incidencias-admin", () => ({
  actualizarEstadoIncidencia: vi.fn(),
  guardarAsignacionIncidencia: vi.fn(),
}));

const responsableId = "d9428888-122b-4a52-a1c5-550c57d5d8c2";
const incidencia: IncidenciaResumen = {
  id: "a71ddc0a-23d9-4ff2-9211-8d40a090adee",
  codigo: "INC-0009",
  lugar: "Unidad A-101",
  categoria: "Fuga",
  creadaAt: "2026-11-03T14:14:00.000Z",
  prioridad: null,
  responsable: null,
  estado: "ABIERTA",
};
const lista: ListaIncidencias = {
  datos: [incidencia],
  total: 1,
  pagina: 1,
  tamanoPagina: 20,
};
const responsables = [
  { id: responsableId, nombre: "José Pérez" },
  {
    id: "43c19ad2-7016-42cd-8a14-4850e9e05e2f",
    nombre: "Carlos Alvarado",
  },
];

function pantalla(props: Partial<React.ComponentProps<typeof AdministrarIncidencias>> = {}) {
  return render(
    <AdministrarIncidencias
      incidencias={lista}
      seleccionada={incidencia}
      responsables={responsables}
      {...props}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navegacion.push.mockReset();
  navegacion.refresh.mockReset();
});

describe("H10: priorizar y asignar incidencias", () => {
  it("muestra filtros, fila seleccionada y los valores nulos del listado", () => {
    pantalla();
    expect(screen.getByRole("heading", { name: "Incidencias" })).toBeInTheDocument();
    expect(screen.getAllByText("Sin prioridad")).toHaveLength(2);
    expect(screen.getAllByText("Sin asignar")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Ver incidencia INC-0009" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByLabelText("Estado")).toHaveValue("");
    expect(
      within(screen.getByRole("region", { name: "Filtros de incidencias" })).getByLabelText("Prioridad"),
    ).toHaveValue("");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("muestra el historial H12 y carga las fotos mediante la ruta privada local", () => {
    const evidenciaId = "f422f158-98f8-4bfa-b45f-c6bf507613d5";
    const detalle: IncidenciaDetalle = {
      id: incidencia.id,
      codigo: incidencia.codigo,
      categoria: incidencia.categoria,
      descripcion: "Fuga bajo el lavatrastos.",
      lugar: incidencia.lugar,
      estado: "ASIGNADA",
      prioridad: null,
      responsable: null,
      evidencias: [{
        id: evidenciaId,
        url: `/api/v1/incidencias/${incidencia.id}/evidencias/${evidenciaId}`,
      }],
      historial: [
        {
          campo: "ESTADO",
          valorAnterior: "ASIGNADA",
          valorNuevo: "EN_PROCESO",
          actor: "Carlos Alvarado",
          fecha: "2026-11-03T16:20:00.000Z",
        },
        {
          campo: "RESPONSABLE",
          valorAnterior: null,
          valorNuevo: responsableId,
          actor: "Carlos Alvarado",
          fecha: "2026-11-03T16:10:00.000Z",
        },
      ],
    };

    pantalla({ detalle });

    expect(screen.getByText("Estado: Asignada → En proceso")).toBeInTheDocument();
    expect(screen.getByText("Responsable: Sin asignar → Responsable actualizado")).toBeInTheDocument();
    expect(screen.getAllByText("Por: Carlos Alvarado")).toHaveLength(2);
    expect(screen.getByAltText("Evidencia de INC-0009")).toHaveAttribute(
      "src",
      `http://localhost:3000/api/incidencias/${incidencia.id}/evidencias/${evidenciaId}`,
    );
    expect(screen.queryByText(responsableId)).not.toBeInTheDocument();
  });

  it("envía únicamente la prioridad modificada y actualiza el listado", async () => {
    vi.mocked(guardarAsignacionIncidencia).mockResolvedValue({
      datos: {
        id: incidencia.id,
        prioridad: "ALTA",
        responsable: null,
        estado: "ABIERTA",
      },
    });
    pantalla();
    fireEvent.change(screen.getAllByLabelText("Prioridad")[1], {
      target: { value: "ALTA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(guardarAsignacionIncidencia).toHaveBeenCalledWith(incidencia.id, {
        prioridad: "ALTA",
      }),
    );
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(navegacion.refresh).toHaveBeenCalled();
  });

  it("envía solo el responsable cuando no cambia la prioridad", async () => {
    vi.mocked(guardarAsignacionIncidencia).mockResolvedValue({
      datos: {
        id: incidencia.id,
        prioridad: null,
        responsable: { id: responsableId, nombre: "José Pérez" },
        estado: "ASIGNADA",
      },
    });
    pantalla();
    fireEvent.change(screen.getByLabelText("Responsable"), {
      target: { value: responsableId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(guardarAsignacionIncidencia).toHaveBeenCalledWith(incidencia.id, {
        responsableId,
      }),
    );
  });

  it("envía ambos cambios, refleja el éxito y cierra el panel si sale del filtro", async () => {
    vi.mocked(guardarAsignacionIncidencia).mockResolvedValue({
      datos: {
        id: incidencia.id,
        prioridad: "ALTA",
        responsable: { id: responsableId, nombre: "José Pérez" },
        estado: "ASIGNADA",
      },
    });
    pantalla({ estado: "ABIERTA" });
    fireEvent.change(screen.getAllByLabelText("Prioridad")[1], {
      target: { value: "ALTA" },
    });
    fireEvent.change(screen.getByLabelText("Responsable"), {
      target: { value: responsableId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(guardarAsignacionIncidencia).toHaveBeenCalledWith(incidencia.id, {
        prioridad: "ALTA",
        responsableId,
      }),
    );
    expect(await screen.findByText("Cambios guardados")).toBeInTheDocument();
    expect(navegacion.push).toHaveBeenCalledWith(
      "/admin/incidencias?estado=ABIERTA&sinSeleccion=1",
    );
  });

  it("bloquea el cambio de una incidencia resuelta", () => {
    const resuelta = { ...incidencia, estado: "RESUELTA" as const };
    pantalla({ seleccionada: resuelta });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    expect(screen.getAllByLabelText("Prioridad")[1]).toBeDisabled();
    expect(screen.getByLabelText("Responsable")).toBeDisabled();
  });

  it("muestra el conflicto 409 y refresca la incidencia", async () => {
    vi.mocked(guardarAsignacionIncidencia).mockResolvedValue({
      error: "La incidencia ya fue resuelta.",
      status: 409,
    });
    // La rama de conflicto se valida con una fila todavía editable, como puede
    // ocurrir si otro administrador la resuelve mientras el panel está abierto.
    pantalla();
    fireEvent.change(screen.getAllByLabelText("Prioridad")[1], {
      target: { value: "ALTA" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La incidencia ya fue resuelta",
    );
    expect(navegacion.refresh).toHaveBeenCalled();
  });

  it("confirma el inicio de atención solo después de aceptar el diálogo", async () => {
    const asignada = { ...incidencia, estado: "ASIGNADA" as const };
    vi.mocked(actualizarEstadoIncidencia).mockResolvedValue({
      datos: {
        id: incidencia.id,
        estado: "EN_PROCESO",
        actualizadaAt: "2026-11-03T14:14:00.000Z",
      },
      estadoActual: "EN_PROCESO",
      estadoVerificado: true,
    });

    pantalla({ seleccionada: asignada, incidencias: { ...lista, datos: [asignada] } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar atención" }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent(
      "¿Iniciar la atención de la incidencia INC-0009? Pasará a En proceso.",
    );
    expect(actualizarEstadoIncidencia).not.toHaveBeenCalled();

    fireEvent.click(within(dialogo).getByRole("button", { name: "Volver" }));
    expect(actualizarEstadoIncidencia).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Iniciar atención" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Iniciar atención" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(actualizarEstadoIncidencia).toHaveBeenCalledWith(
        incidencia.id,
        "EN_PROCESO",
      ),
    );
    expect(await screen.findByText("Atención iniciada")).toBeInTheDocument();
    expect(within(screen.getByRole("complementary", { name: "Detalle de INC-0009" })).getByText("En proceso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como resuelta" })).toBeDisabled();
    expect(navegacion.refresh).toHaveBeenCalled();
  });

  it("confirma la resolución y mantiene el estado aunque H28 devuelva 500", async () => {
    const enProceso = { ...incidencia, estado: "EN_PROCESO" as const };
    vi.mocked(actualizarEstadoIncidencia).mockResolvedValue({
      error: "No se pudo completar la operación. Intente de nuevo.",
      status: 500,
      estadoActual: "RESUELTA",
      estadoVerificado: true,
    });

    pantalla({ seleccionada: enProceso, incidencias: { ...lista, datos: [enProceso] } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como resuelta" }));
    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent(
      "¿Marcar la incidencia INC-0009 como Resuelta? El residente recibirá un aviso.",
    );
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(actualizarEstadoIncidencia).toHaveBeenCalledWith(
        incidencia.id,
        "RESUELTA",
      ),
    );
    expect(
      await screen.findByText(
        "La incidencia quedó resuelta, pero no se pudo confirmar el aviso al residente.",
      ),
    ).toHaveAttribute("role", "status");
    expect(screen.queryByRole("button", { name: "Marcar como resuelta" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Guardar cambios|Guardando…/ }),
      ).toBeDisabled(),
    );
  });

  it("exige descartar los cambios H10 antes de abrir la confirmación H11", () => {
    const asignada = { ...incidencia, estado: "ASIGNADA" as const };
    pantalla({ seleccionada: asignada, incidencias: { ...lista, datos: [asignada] } });
    fireEvent.change(screen.getAllByLabelText("Prioridad")[1], {
      target: { value: "ALTA" },
    });

    expect(screen.getByRole("button", { name: "Iniciar atención" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(screen.getByRole("button", { name: "Iniciar atención" })).toBeEnabled();
    expect(actualizarEstadoIncidencia).not.toHaveBeenCalled();
  });

  it("mantiene la selección e identifica el campo si la API rechaza un valor", async () => {
    vi.mocked(guardarAsignacionIncidencia).mockResolvedValue({
      error: "Seleccione un responsable activo.",
      status: 400,
      campo: "responsableId",
    });
    pantalla();
    fireEvent.change(screen.getByLabelText("Responsable"), {
      target: { value: responsableId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Seleccione un responsable activo.",
    );
    expect(screen.getByLabelText("Responsable")).toHaveValue(responsableId);
    expect(screen.getByLabelText("Responsable")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("pagina el listado sin conservar la incidencia seleccionada", () => {
    pantalla({
      incidencias: { ...lista, total: 45 },
    });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(navegacion.push).toHaveBeenCalledWith(
      "/admin/incidencias?pagina=2&sinSeleccion=1",
    );
  });

  it("muestra el resultado vacío y permite cambiar filtros", () => {
    pantalla({
      incidencias: { ...lista, datos: [], total: 0 },
      seleccionada: undefined,
    });
    expect(
      screen.getByText("No hay incidencias para los filtros elegidos"),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Estado"), {
      target: { value: "ASIGNADA" },
    });
    expect(navegacion.push).toHaveBeenCalledWith(
      "/admin/incidencias?estado=ASIGNADA&sinSeleccion=1",
    );
  });
});
