import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreferenciasDirectorio } from "@/components/directorio/preferencias";
import { guardarPreferencias } from "@/app/actions/directorio";

vi.mock("@/app/actions/directorio", () => ({
  guardarPreferencias: vi.fn(),
}));

const iniciales = {
  visible: false,
  mostrarTelefono: false,
  mostrarCorreo: false,
  mostrarUnidad: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(guardarPreferencias).mockResolvedValue({ ok: true });
});

describe("H25. Configurar visibilidad del directorio", () => {
  it("AC1: inicia oculto, deshabilita los campos y muestra que no aparece en el directorio", () => {
    render(
      <PreferenciasDirectorio
        inicial={iniciales}
        nombre="Residente de prueba"
        correo="residente@sonnet5.test"
        unidades={["A-101"]}
      />,
    );

    expect(screen.getByRole("switch", { name: "Aparecer en el directorio" })).not.toBeChecked();
    expect(screen.getByLabelText("Teléfono")).toBeDisabled();
    expect(screen.getByLabelText("Correo")).toBeDisabled();
    expect(screen.getByLabelText("Unidad")).toBeDisabled();
    expect(screen.getByText("No apareces en el directorio")).toBeInTheDocument();
  });

  it("AC1: al activar la visibilidad habilita los campos y actualiza la vista previa", async () => {
    render(
      <PreferenciasDirectorio
        inicial={iniciales}
        nombre="Residente de prueba"
        correo="residente@sonnet5.test"
        unidades={["A-101"]}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Aparecer en el directorio" }));
    await user.click(screen.getByLabelText("Teléfono"));
    await user.click(screen.getByLabelText("Unidad"));

    expect(screen.getByLabelText("Teléfono")).toBeEnabled();
    expect(screen.getByLabelText("Correo")).toBeEnabled();
    expect(screen.getByLabelText("Unidad")).toBeEnabled();
    expect(screen.getByText("Residente de prueba")).toBeInTheDocument();
    expect(screen.getByText("Teléfono: tu número registrado")).toBeInTheDocument();
    expect(screen.getByText("Unidad: A-101")).toBeInTheDocument();
  });

  it("AC2: guarda únicamente las opciones seleccionadas y confirma el guardado", async () => {
    render(
      <PreferenciasDirectorio
        inicial={iniciales}
        nombre="Residente de prueba"
        correo="residente@sonnet5.test"
        unidades={["A-101"]}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Aparecer en el directorio" }));
    await user.click(screen.getByLabelText("Correo"));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));

    await waitFor(() => {
      expect(guardarPreferencias).toHaveBeenCalledWith({
        visible: true,
        mostrarTelefono: false,
        mostrarCorreo: true,
        mostrarUnidad: false,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Preferencias guardadas");
  });

  it("AC1: al apagar la visibilidad desmarca los campos y guarda todo en falso", async () => {
    render(
      <PreferenciasDirectorio
        inicial={{
          visible: true,
          mostrarTelefono: true,
          mostrarCorreo: true,
          mostrarUnidad: true,
        }}
        nombre="Residente de prueba"
        correo="residente@sonnet5.test"
        unidades={["A-101"]}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Aparecer en el directorio" }));

    expect(screen.getByLabelText("Teléfono")).not.toBeChecked();
    expect(screen.getByLabelText("Correo")).not.toBeChecked();
    expect(screen.getByLabelText("Unidad")).not.toBeChecked();
    expect(screen.getByText("No apareces en el directorio")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));
    await waitFor(() => {
      expect(guardarPreferencias).toHaveBeenCalledWith({
        visible: false,
        mostrarTelefono: false,
        mostrarCorreo: false,
        mostrarUnidad: false,
      });
    });
  });

  it("AC2: muestra el error devuelto por la acción si el guardado falla", async () => {
    vi.mocked(guardarPreferencias).mockResolvedValue({ error: "No se pudo guardar" });

    render(
      <PreferenciasDirectorio
        inicial={iniciales}
        nombre="Residente de prueba"
        correo="residente@sonnet5.test"
        unidades={["A-101"]}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("switch", { name: "Aparecer en el directorio" }));
    await user.click(screen.getByRole("button", { name: "Guardar preferencias" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });
});
