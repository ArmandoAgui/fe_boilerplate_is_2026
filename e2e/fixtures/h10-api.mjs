import { createServer } from "node:http";

const port = Number(process.env.H10_API_PORT ?? 3100);
const prefijo = "/api/v1";
const usuarios = {
  admin: {
    id: "b7599849-f317-45a2-96e8-45fa31cc297d",
    email: "admin@condominio.test",
    nombre: "Carlos Alvarado",
    rol: "ADMINISTRADOR",
  },
  seguridad: {
    id: "63a66821-50c2-4b07-9e4a-7f386389ae4a",
    email: "seguridad@condominio.test",
    nombre: "José Pérez",
    rol: "SEGURIDAD",
  },
};
const sesiones = new Map([
  ["h10-admin-token", usuarios.admin],
  ["h10-seguridad-token", usuarios.seguridad],
]);
const responsables = [
  { id: usuarios.seguridad.id, nombre: usuarios.seguridad.nombre },
  {
    id: "6c32fa71-2909-44de-963f-e7ce25a05c82",
    nombre: usuarios.admin.nombre,
  },
];
let incidencias = [
  {
    id: "322c0032-fced-46bb-9fd2-fcf71abf4d75",
    codigo: "INC-0007",
    lugar: "Ascensor Torre B",
    categoria: "Ascensor",
    creadaAt: "2026-11-02T14:00:00.000Z",
    prioridad: "URGENTE",
    responsable: responsables[0],
    estado: "EN_PROCESO",
  },
  {
    id: "527b46fc-2d27-4c84-8800-9553fd01a922",
    codigo: "INC-0009",
    lugar: "Unidad A-101",
    categoria: "Fuga",
    creadaAt: "2026-11-03T14:14:00.000Z",
    prioridad: "ALTA",
    responsable: null,
    estado: "ABIERTA",
  },
  {
    id: "4fb13146-cf7c-4a04-94ca-b9446c71cc19",
    codigo: "INC-0005",
    lugar: "Gimnasio",
    categoria: "Electricidad",
    creadaAt: "2026-10-29T14:00:00.000Z",
    prioridad: "MEDIA",
    responsable: responsables[1],
    estado: "ASIGNADA",
  },
];

function responder(res, status, datos) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(datos));
}

function usuarioDe(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return sesiones.get(token);
}

async function cuerpo(req) {
  let datos = "";
  for await (const parte of req) datos += parte;
  return datos ? JSON.parse(datos) : {};
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const ruta = url.pathname;
    if (req.method === "POST" && ruta === prefijo + "/auth/login") {
      const credenciales = await cuerpo(req);
      if (credenciales.password !== "Prueba123!") {
        return responder(res, 401, { message: "Credenciales incorrectas" });
      }
      if (credenciales.email === usuarios.admin.email)
        return responder(res, 201, { accessToken: "h10-admin-token" });
      if (credenciales.email === usuarios.seguridad.email)
        return responder(res, 201, { accessToken: "h10-seguridad-token" });
      return responder(res, 401, { message: "Credenciales incorrectas" });
    }

    const usuario = usuarioDe(req);
    if (!usuario) return responder(res, 401, { message: "Sesión inválida" });
    if (req.method === "GET" && ruta === prefijo + "/auth/me")
      return responder(res, 200, usuario);

    if (ruta === prefijo + "/incidencias/responsables" && req.method === "GET") {
      if (usuario.rol !== "ADMINISTRADOR")
        return responder(res, 403, { message: "No autorizado" });
      return responder(res, 200, {
        datos: responsables,
        total: responsables.length,
        pagina: 1,
        tamanoPagina: 50,
      });
    }

    if (ruta === prefijo + "/incidencias" && req.method === "GET") {
      if (usuario.rol !== "ADMINISTRADOR")
        return responder(res, 403, { message: "No autorizado" });
      const filtradas = incidencias.filter(
        (incidencia) =>
          (!url.searchParams.has("estado") ||
            incidencia.estado === url.searchParams.get("estado")) &&
          (!url.searchParams.has("prioridad") ||
            incidencia.prioridad === url.searchParams.get("prioridad")),
      );
      const pagina = Number(url.searchParams.get("pagina") ?? 1);
      const tamanoPagina = Number(url.searchParams.get("tamanoPagina") ?? 20);
      const inicio = (pagina - 1) * tamanoPagina;
      return responder(res, 200, {
        datos: filtradas.slice(inicio, inicio + tamanoPagina),
        total: filtradas.length,
        pagina,
        tamanoPagina,
      });
    }

    const actualizar = ruta.match(
      new RegExp("^" + prefijo + "/incidencias/([^/]+)/asignacion$"),
    );
    if (req.method === "PATCH" && actualizar) {
      if (usuario.rol !== "ADMINISTRADOR")
        return responder(res, 403, { message: "No autorizado" });
      const incidencia = incidencias.find((item) => item.id === actualizar[1]);
      if (!incidencia)
        return responder(res, 404, { message: "Incidencia no encontrada" });
      if (incidencia.estado === "RESUELTA")
        return responder(res, 409, { message: "La incidencia ya fue resuelta" });
      const cambios = await cuerpo(req);
      if (cambios.prioridad) incidencia.prioridad = cambios.prioridad;
      if (cambios.responsableId) {
        incidencia.responsable =
          responsables.find((item) => item.id === cambios.responsableId) ?? null;
        if (incidencia.estado === "ABIERTA") incidencia.estado = "ASIGNADA";
      }
      return responder(res, 200, {
        id: incidencia.id,
        prioridad: incidencia.prioridad,
        responsable: incidencia.responsable,
        estado: incidencia.estado,
      });
    }

    if (
      req.method === "GET" &&
      new RegExp("^" + prefijo + "/incidencias/[^/]+$").test(ruta)
    ) {
      return responder(res, 404, { message: "El detalle H12 aún no está disponible" });
    }
    return responder(res, 404, { message: "Ruta no encontrada" });
  } catch {
    return responder(res, 500, { message: "Error interno de la API local" });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write("API de pruebas H10 lista en http://127.0.0.1:" + port + "\n");
});
