import { createServer } from "node:http";

const port = Number(process.env.H27_API_PORT ?? 3100);
const prefijo = "/api/v1";
const usuarios = {
  residente: {
    id: "155d8cf6-0c59-46d3-9a7d-30ee6a02a401",
    email: "residente@condominio.test",
    nombre: "Rosa Martínez",
    rol: "RESIDENTE",
  },
  admin: {
    id: "e6eec89a-cb46-4ac7-9ef2-49efc60d2057",
    email: "admin@condominio.test",
    nombre: "Carlos Alvarado",
    rol: "ADMINISTRADOR",
  },
  seguridad: {
    id: "d8178e09-cc45-4df6-b141-d893a6dfc91d",
    email: "seguridad@condominio.test",
    nombre: "José Pérez",
    rol: "SEGURIDAD",
  },
};
const sesiones = new Map([
  ["h27-residente-token", usuarios.residente],
  ["h27-admin-token", usuarios.admin],
  ["h27-seguridad-token", usuarios.seguridad],
]);
const semilla = [
  {
    id: "c9f9a0a1-1111-4111-8111-000000000001",
    moduloOrigen: "PAQUETERIA",
    tipoEvento: "PAQUETE_RECIBIDO",
    titulo: "Llegó un paquete para tu unidad",
    mensaje: "Paquete PAQ-000027 de Amazon recibido el 14/11/2026 10:25.",
    referenciaId: "2fae8427-a2b6-493d-8afb-3c6e603a6bc1",
    estado: "NO_LEIDA",
    creadaAt: "2026-11-14T16:25:00.000Z",
  },
  {
    id: "c9f9a0a1-1111-4111-8111-000000000002",
    moduloOrigen: "COMUNICADOS",
    tipoEvento: "COMUNICADO_NUEVO",
    titulo: "Nuevo comunicado",
    mensaje: "Corte de agua programado en Torre A.",
    referenciaId: "6a42676f-52bd-40a7-9ed1-0d4eec9205ab",
    estado: "NO_LEIDA",
    creadaAt: "2026-11-14T16:10:00.000Z",
  },
  {
    id: "c9f9a0a1-1111-4111-8111-000000000003",
    moduloOrigen: "INCIDENCIAS",
    tipoEvento: "INCIDENCIA_RESUELTA",
    titulo: "Tu incidencia fue resuelta",
    mensaje: "INC-0003, limpieza del asador, quedó Resuelta.",
    referenciaId: "f9e40d22-b0e3-46fb-8bed-412da001d48d",
    estado: "NO_LEIDA",
    creadaAt: "2026-11-01T16:00:00.000Z",
  },
  {
    id: "c9f9a0a1-1111-4111-8111-000000000004",
    moduloOrigen: "ASAMBLEAS",
    tipoEvento: "VOTACION_ABIERTA",
    titulo: "Votación abierta",
    mensaje: "Ya puedes votar en la asamblea extraordinaria de octubre.",
    referenciaId: "ae607871-d9ed-4bdf-8237-c5c1bf378bd8",
    estado: "LEIDA",
    creadaAt: "2026-10-26T16:00:00.000Z",
  },
  {
    id: "c9f9a0a1-1111-4111-8111-000000000005",
    moduloOrigen: "CUOTAS",
    tipoEvento: "CUOTA_POR_VENCER",
    titulo: "Tu cuota vence pronto",
    mensaje: "La cuota 2026-10 de la unidad A-101 vence el 10/10/2026.",
    referenciaId: null,
    estado: "LEIDA",
    creadaAt: "2026-10-07T16:00:00.000Z",
  },
];
let avisos = structuredClone(semilla);
let lecturas = 0;
let parches = 0;

function responder(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
  });
  res.end(JSON.stringify(data));
}

function usuarioDe(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  return sesiones.get(token);
}

async function cuerpo(req) {
  let data = "";
  for await (const parte of req) data += parte;
  return data ? JSON.parse(data) : {};
}

function queryValida(url) {
  const permitidas = new Set(["moduloOrigen", "estado", "pagina", "tamanoPagina"]);
  for (const clave of new Set(url.searchParams.keys())) {
    if (!permitidas.has(clave) || url.searchParams.getAll(clave).length !== 1)
      return false;
  }
  const modulo = url.searchParams.get("moduloOrigen");
  if (modulo && !["CUOTAS", "PAQUETERIA", "COMUNICADOS", "ASAMBLEAS", "INCIDENCIAS"].includes(modulo))
    return false;
  const estado = url.searchParams.get("estado");
  if (estado && !["NO_LEIDA", "LEIDA"].includes(estado)) return false;
  const pagina = Number(url.searchParams.get("pagina") ?? 1);
  const tamano = Number(url.searchParams.get("tamanoPagina") ?? 20);
  return Number.isSafeInteger(pagina) && pagina > 0 &&
    Number.isSafeInteger(tamano) && tamano >= 1 && tamano <= 50 &&
    Number.isSafeInteger((pagina - 1) * tamano);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const ruta = url.pathname;
    if (ruta === "/__test/state" && req.method === "GET")
      return responder(res, 200, {
        lecturas,
        parches,
        noLeidas: avisos.filter((aviso) => aviso.estado === "NO_LEIDA").length,
      });
    if (ruta === "/__test/reset" && req.method === "POST") {
      avisos = structuredClone(semilla);
      lecturas = 0;
      parches = 0;
      return responder(res, 200, { ok: true });
    }
    const prepararNoLeidas = ruta.match(/^\/__test\/unread\/(\d+)$/);
    if (req.method === "POST" && prepararNoLeidas) {
      const cantidad = Number(prepararNoLeidas[1]);
      if (!Number.isSafeInteger(cantidad) || cantidad > 150)
        return responder(res, 400, { message: "Cantidad de prueba inválida" });
      avisos = Array.from({ length: cantidad }, (_, indice) => ({
        ...semilla[indice % semilla.length],
        id: `00000000-0000-4000-8000-${String(indice + 1).padStart(12, "0")}`,
        estado: "NO_LEIDA",
        creadaAt: new Date(Date.now() - indice * 1_000).toISOString(),
      }));
      lecturas = 0;
      parches = 0;
      return responder(res, 200, { ok: true });
    }

    if (req.method === "POST" && ruta === `${prefijo}/auth/login`) {
      const credenciales = await cuerpo(req);
      if (credenciales.password !== "Prueba123!")
        return responder(res, 401, { message: "Credenciales incorrectas" });
      const usuario = Object.values(usuarios).find((item) => item.email === credenciales.email);
      if (!usuario) return responder(res, 401, { message: "Credenciales incorrectas" });
      const accessToken = usuario.rol === "RESIDENTE"
        ? "h27-residente-token"
        : usuario.rol === "ADMINISTRADOR"
          ? "h27-admin-token"
          : "h27-seguridad-token";
      return responder(res, 201, { accessToken });
    }

    const usuario = usuarioDe(req);
    if (!usuario) return responder(res, 401, { message: "Sesión inválida" });
    if (req.method === "GET" && ruta === `${prefijo}/auth/me`)
      return responder(res, 200, usuario);

    if (ruta === `${prefijo}/notificaciones/mias` && req.method === "GET") {
      if (usuario.rol !== "RESIDENTE")
        return responder(res, 403, { message: "No autorizado" });
      if (!queryValida(url)) return responder(res, 400, { message: "Consulta inválida" });
      lecturas += 1;
      const modulo = url.searchParams.get("moduloOrigen");
      const estado = url.searchParams.get("estado");
      const pagina = Number(url.searchParams.get("pagina") ?? 1);
      const tamanoPagina = Number(url.searchParams.get("tamanoPagina") ?? 20);
      const filtrados = avisos
        .filter((aviso) => (!modulo || aviso.moduloOrigen === modulo) && (!estado || aviso.estado === estado))
        .sort((a, b) => b.creadaAt.localeCompare(a.creadaAt) || b.id.localeCompare(a.id));
      const inicio = (pagina - 1) * tamanoPagina;
      return responder(res, 200, {
        datos: filtrados.slice(inicio, inicio + tamanoPagina),
        noLeidas: avisos.filter((aviso) => aviso.estado === "NO_LEIDA").length,
        total: filtrados.length,
        pagina,
        tamanoPagina,
      });
    }

    const lectura = ruta.match(new RegExp(`^${prefijo}/notificaciones/([^/]+)/lectura$`));
    if (req.method === "PATCH" && lectura) {
      if (usuario.rol !== "RESIDENTE")
        return responder(res, 403, { message: "No autorizado" });
      parches += 1;
      const aviso = avisos.find((item) => item.id === lectura[1]);
      if (!aviso) return responder(res, 404, { message: "Aviso no encontrado" });
      if (aviso.estado === "NO_LEIDA") {
        aviso.estado = "LEIDA";
        aviso.leidaAt = "2026-11-14T16:30:00.000Z";
      }
      return responder(res, 200, {
        id: aviso.id,
        estado: "LEIDA",
        leidaAt: aviso.leidaAt ?? "2026-11-14T16:30:00.000Z",
      });
    }

    if (req.method === "GET" && ruta === `${prefijo}/unidades/mias`)
      return responder(res, 200, { datos: [] });

    return responder(res, 404, { message: "Ruta no encontrada" });
  } catch {
    return responder(res, 500, { message: "Error interno de la fixture H27" });
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Fixture API H27 lista en http://127.0.0.1:${port}\n`);
});
