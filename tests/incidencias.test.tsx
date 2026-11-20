import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { crearIncidencia } from "@/app/actions/incidencias";
import { NuevaIncidencia } from "@/components/incidencias/nueva-incidencia";
import { MAX_BYTES_FOTO, type ResultadoIncidencia } from "@/lib/incidencias";

vi.mock("@/app/actions/incidencias", () => ({ crearIncidencia: vi.fn() }));
const crear = vi.mocked(crearIncidencia);
const unidades = [
  { id: "u1", codigo: "A-101" },
  { id: "u2", codigo: "A-102" },
];
const areas = [{ id: "a1", nombre: "Gimnasio" }];
const descripcion = "Hay una fuga debajo del lavatrastos.";
const confirmada = { codigo: "INC-0009", estado: "ABIERTA" } as const;

const crearUrl = vi.fn(
  (archivo: File) => `blob:http://localhost/${archivo.name}`,
);
const revocarUrl = vi.fn();
Object.defineProperties(URL, {
  createObjectURL: { configurable: true, value: crearUrl },
  revokeObjectURL: { configurable: true, value: revocarUrl },
});

beforeEach(() => {
  vi.clearAllMocks();
  crear.mockReset().mockResolvedValue(confirmada);
});

function llenar(texto = descripcion) {
  fireEvent.change(screen.getByLabelText("Categoría"), {
    target: { value: "FUGA" },
  });
  fireEvent.change(screen.getByLabelText("Descripción"), {
    target: { value: texto },
  });
}

function cargar(...files: File[]) {
  fireEvent.change(screen.getByLabelText("Agregar foto"), {
    target: { files },
  });
}

function enviar() {
  return screen.getByRole("button", { name: "Enviar reporte" });
}

function foto(nombre: string) {
  return new File(["png"], nombre, { type: "image/png" });
}

it("envía la ubicación activa y confirma con el código real", async () => {
  render(<NuevaIncidencia unidades={unidades} areas={areas} />);
  expect(screen.getByRole("combobox", { name: "Unidad" })).toHaveValue("u1");
  fireEvent.change(screen.getByLabelText("Unidad"), {
    target: { value: "u2" },
  });
  fireEvent.click(screen.getByRole("radio", { name: "Área común" }));
  expect(screen.getByRole("combobox", { name: "Área común" })).toHaveValue(
    "a1",
  );
  llenar(`  ${descripcion}  `);
  fireEvent.click(enviar());

  expect(await screen.findByText("INC-0009")).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Abierta");
  const [datos] = crear.mock.calls[0];
  expect(Object.fromEntries(datos)).toEqual({
    lugarTipo: "AREA_COMUN",
    areaId: "a1",
    categoria: "FUGA",
    descripcion,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Reportar otra incidencia" }),
  );
  expect(screen.getByLabelText("Descripción")).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Unidad" })).toHaveValue("u1");
});

it("permite elegir el catálogo alternativo cuando no hay unidades", () => {
  render(<NuevaIncidencia unidades={[]} areas={areas} />);
  llenar();
  expect(
    screen.getByText("No tienes unidades activas vinculadas."),
  ).toBeVisible();
  expect(enviar()).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: "Área común" }));
  expect(enviar()).toBeEnabled();
});

it("avisa cuando no hay áreas activas", () => {
  render(<NuevaIncidencia unidades={unidades} areas={[]} />);
  llenar();
  fireEvent.click(screen.getByRole("radio", { name: "Área común" }));
  expect(screen.getByText("No hay áreas comunes activas.")).toBeVisible();
  expect(enviar()).toBeDisabled();
});

it.each([
  [9, false],
  [10, true],
  [500, true],
  [501, false],
])("valida %i caracteres en la descripción", (longitud, valido) => {
  render(<NuevaIncidencia unidades={unidades} areas={areas} />);
  llenar(`  ${"x".repeat(longitud)}  `);
  expect(screen.getByText(`${longitud} / 500`)).toBeVisible();
  if (valido) expect(enviar()).toBeEnabled();
  else expect(enviar()).toBeDisabled();
});

it("marca archivos inválidos y conserva las fotos válidas hasta el envío", async () => {
  render(<NuevaIncidencia unidades={unidades} areas={areas} />);
  llenar();
  cargar(
    new File(["pdf"], "plano.pdf", { type: "application/pdf" }),
    new File([new Uint8Array(MAX_BYTES_FOTO + 1)], "grande.jpg", {
      type: "image/jpeg",
    }),
    new File([], "vacia.jpg", { type: "image/jpeg" }),
    foto("primera.png"),
    foto("segunda.png"),
    foto("tercera.png"),
    foto("cuarta.png"),
  );
  expect(
    screen.getAllByText("Solo se permiten JPG o PNG de hasta 5 MB"),
  ).toHaveLength(2);
  expect(screen.getByText("El archivo está vacío.")).toBeVisible();
  expect(screen.getByText("Se permite un máximo de 3 fotos.")).toBeVisible();
  expect(enviar()).toBeDisabled();
  for (const nombre of [
    "plano.pdf",
    "grande.jpg",
    "vacia.jpg",
    "cuarta.png",
    "segunda.png",
  ]) {
    fireEvent.click(screen.getByRole("button", { name: `Quitar ${nombre}` }));
  }
  expect(screen.getAllByRole("img")).toHaveLength(2);
  expect(revocarUrl).toHaveBeenCalledWith("blob:http://localhost/segunda.png");
  fireEvent.click(enviar());
  expect(await screen.findByText("INC-0009")).toBeVisible();
  expect(crear.mock.calls[0][0].getAll("fotos")).toEqual([
    foto("primera.png"),
    foto("tercera.png"),
  ]);
  expect(revocarUrl).toHaveBeenCalledTimes(3);
});

it("bloquea envíos simultáneos y conserva los datos para corregir un error", async () => {
  let responder!: (resultado: ResultadoIncidencia) => void;
  crear.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        responder = resolve;
      }),
  );
  const { unmount } = render(
    <NuevaIncidencia unidades={unidades} areas={areas} />,
  );
  llenar();
  cargar(foto("fuga.png"));
  const boton = enviar();
  fireEvent.click(boton);
  fireEvent.submit(boton.closest("form")!);
  expect(crear).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();

  responder({ status: 403, campo: "unidadId", error: "Unidad ajena." });
  await waitFor(() =>
    expect(screen.getByLabelText("Unidad")).toHaveAccessibleDescription(
      "Unidad ajena.",
    ),
  );
  expect(screen.getByLabelText("Descripción")).toHaveValue(descripcion);
  expect(screen.getByRole("img", { name: "fuga.png" })).toBeVisible();
  await waitFor(() => expect(enviar()).toBeEnabled());
  unmount();
  expect(revocarUrl).toHaveBeenCalledWith("blob:http://localhost/fuga.png");
});
