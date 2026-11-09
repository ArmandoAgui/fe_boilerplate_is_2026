import { beforeEach, expect, it, vi } from "vitest";
import { crearIncidencia } from "@/app/actions/incidencias";
import { api, ApiError, usuarioActual } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
      public campo?: string,
    ) {
      super(message);
    }
  },
  api: vi.fn(),
  usuarioActual: vi.fn(),
}));

const id = "33ab250f-f52c-4003-8a1d-c4dd4e79ca68";
function formulario() {
  const datos = new FormData();
  datos.set("lugarTipo", "UNIDAD");
  datos.set("unidadId", id);
  datos.set("categoria", "FUGA");
  datos.set("descripcion", "  Hay una fuga en la cocina.  ");
  return datos;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(usuarioActual).mockResolvedValue({
    id,
    email: "residente@condominio.test",
    nombre: "Residente",
    rol: "RESIDENTE",
  });
});

it("envía multipart y devuelve solo los campos de confirmación", async () => {
  const datos = formulario();
  datos.append("fotos", new File(["png"], "foto.png", { type: "image/png" }));
  vi.mocked(api).mockResolvedValue({
    id,
    codigo: "INC-0001",
    estado: "ABIERTA",
    evidencias: [],
  });
  expect(await crearIncidencia(datos)).toEqual({
    codigo: "INC-0001",
    estado: "ABIERTA",
  });
  const [ruta, init] = vi.mocked(api).mock.calls[0];
  expect(ruta).toBe("incidencias");
  expect(init?.method).toBe("POST");
  const cuerpo = init?.body as FormData;
  expect(cuerpo.get("unidadId")).toBe(id);
  expect(cuerpo.has("areaId")).toBe(false);
  expect(cuerpo.get("descripcion")).toBe("Hay una fuga en la cocina.");
  expect(cuerpo.getAll("fotos")).toHaveLength(1);
});

it("rechaza un formulario con ambas ubicaciones y un archivo que no sea JPG/PNG", async () => {
  const datos = formulario();
  datos.set("areaId", id);
  expect(await crearIncidencia(datos)).toMatchObject({
    campo: "unidadId",
    status: 400,
  });
  datos.delete("areaId");
  datos.append(
    "fotos",
    new File(["pdf"], "plano.pdf", { type: "application/pdf" }),
  );
  expect(await crearIncidencia(datos)).toMatchObject({
    campo: "fotos",
    status: 400,
  });
  expect(api).not.toHaveBeenCalled();
});

it("bloquea el envío directo de un rol distinto de residente", async () => {
  vi.mocked(usuarioActual).mockResolvedValue({
    id,
    email: "admin@condominio.test",
    nombre: "Administrador",
    rol: "ADMINISTRADOR",
  });
  expect(await crearIncidencia(formulario())).toMatchObject({ status: 403 });
  expect(api).not.toHaveBeenCalled();
});

it("propaga campo y estado del error de la API y mantiene la redirección", async () => {
  vi.mocked(api).mockRejectedValue(
    new ApiError(400, "Área inactiva.", "areaId"),
  );
  expect(await crearIncidencia(formulario())).toEqual({
    error: "Área inactiva.",
    campo: "areaId",
    status: 400,
  });
  const redireccion = Object.assign(new Error("NEXT_REDIRECT"), {
    digest: "NEXT_REDIRECT",
  });
  vi.mocked(usuarioActual).mockRejectedValue(redireccion);
  await expect(crearIncidencia(formulario())).rejects.toBe(redireccion);
});
