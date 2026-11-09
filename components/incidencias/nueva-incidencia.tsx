"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { crearIncidencia } from "@/app/actions/incidencias";
import {
  CATEGORIAS_INCIDENCIA,
  errorDescripcion,
  errorFoto,
  longitudDescripcion,
  MAX_DESCRIPCION,
  MAX_FOTOS,
  MENSAJE_ENVIO,
  MENSAJE_MAX_FOTOS,
  type ErrorIncidencia,
  type IncidenciaCreada,
  type LugarIncidencia,
} from "@/lib/incidencias";
import type { Area, Unidad } from "@/lib/reservas";

type Adjunto = { id: number; nombre: string } & (
  { archivo: File; url: string } | { error: string }
);

export function NuevaIncidencia({
  unidades,
  areas,
}: {
  unidades: Unidad[];
  areas: Pick<Area, "id" | "nombre">[];
}) {
  const [lugar, setLugar] = useState<LugarIncidencia>("UNIDAD");
  const [lugarId, setLugarId] = useState(unidades[0]?.id ?? "");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [errorServidor, setErrorServidor] = useState<ErrorIncidencia>();
  const [registrada, setRegistrada] = useState<IncidenciaCreada>();
  const [pendiente, startTransition] = useTransition();
  const enviando = useRef(false);
  const siguienteAdjunto = useRef(0);
  const urls = useRef(new Set<string>());
  const confirmacion = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const activas = urls.current;
    return () => {
      activas.forEach((url) => URL.revokeObjectURL(url));
      activas.clear();
    };
  }, []);

  useEffect(() => {
    if (registrada) confirmacion.current?.focus();
  }, [registrada]);

  const enUnidad = lugar === "UNIDAD";
  const campoLugar = enUnidad ? "unidadId" : "areaId";
  const opciones = enUnidad ? unidades : areas;
  const fotos = adjuntos.filter((adjunto) => "archivo" in adjunto);
  const mensajeDescripcion = errorDescripcion(descripcion);
  const valido = Boolean(
    lugarId &&
    categoria &&
    !mensajeDescripcion &&
    fotos.length === adjuntos.length,
  );
  const errorLugar = errorEn(campoLugar);
  const errorCategoria = errorEn("categoria");
  const errorTexto =
    (descripcion && mensajeDescripcion) || errorEn("descripcion");
  const errorFotos = errorEn("fotos");
  const errorTipo = errorEn("lugarTipo");

  function errorEn(campo: string) {
    return errorServidor?.campo === campo ? errorServidor.error : undefined;
  }

  function cambiarLugar(tipo: LugarIncidencia) {
    setLugar(tipo);
    setLugarId((tipo === "UNIDAD" ? unidades : areas)[0]?.id ?? "");
    if (errorLugar || errorTipo) setErrorServidor(undefined);
  }

  function agregar(archivos: FileList | null) {
    let cantidad = fotos.length;
    const nuevos = Array.from(archivos ?? [], (archivo): Adjunto => {
      const id = siguienteAdjunto.current++;
      const nombre = archivo.name;
      const error =
        errorFoto(archivo) || (cantidad >= MAX_FOTOS ? MENSAJE_MAX_FOTOS : "");
      if (error) return { id, nombre, error };
      cantidad++;
      const url = URL.createObjectURL(archivo);
      urls.current.add(url);
      return { id, nombre, archivo, url };
    });
    setAdjuntos((previos) => [...previos, ...nuevos]);
    if (errorFotos) setErrorServidor(undefined);
  }

  function quitar(adjunto: Adjunto) {
    if ("url" in adjunto) {
      URL.revokeObjectURL(adjunto.url);
      urls.current.delete(adjunto.url);
    }
    setAdjuntos((previos) => previos.filter(({ id }) => id !== adjunto.id));
    if (errorFotos) setErrorServidor(undefined);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido || pendiente || enviando.current) return;

    const datos = new FormData();
    datos.set("lugarTipo", lugar);
    datos.set(campoLugar, lugarId);
    datos.set("categoria", categoria);
    datos.set("descripcion", descripcion.trim());
    for (const { archivo } of fotos) datos.append("fotos", archivo);

    enviando.current = true;
    setErrorServidor(undefined);
    startTransition(async () => {
      try {
        const resultado = await crearIncidencia(datos);
        if ("error" in resultado) {
          setErrorServidor(resultado);
        } else {
          urls.current.forEach((url) => URL.revokeObjectURL(url));
          urls.current.clear();
          setAdjuntos([]);
          setRegistrada(resultado);
        }
      } catch {
        setErrorServidor({ error: MENSAJE_ENVIO });
      } finally {
        enviando.current = false;
      }
    });
  }

  if (registrada) {
    return (
      <section className="panel">
        <div role="status">
          <h2
            ref={confirmacion}
            tabIndex={-1}
            className="text-xl font-semibold"
          >
            Incidencia registrada
          </h2>
          <div className="my-4 flex flex-wrap items-center gap-3">
            <span className="font-semibold">{registrada.codigo}</span>
            <span className="status-confirmed rounded-full px-3 py-1 text-sm font-medium">
              Abierta
            </span>
          </div>
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            cambiarLugar("UNIDAD");
            setCategoria("");
            setDescripcion("");
            setRegistrada(undefined);
          }}
        >
          Reportar otra incidencia
        </button>
      </section>
    );
  }

  return (
    <form
      className="panel grid gap-5"
      noValidate
      onSubmit={enviar}
      aria-busy={pendiente}
    >
      {errorServidor && !errorServidor.campo && (
        <p className="field-error" role="alert">
          {errorServidor.error}
        </p>
      )}
      <fieldset disabled={pendiente} className="grid min-w-0 gap-5">
        <fieldset
          aria-describedby={errorTipo ? "error-incidencia-tipo" : undefined}
        >
          <legend className="text-sm font-semibold">Lugar</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {(
              [
                ["UNIDAD", "Mi unidad"],
                ["AREA_COMUN", "Área común"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <label key={valor} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="lugarTipo"
                  value={valor}
                  checked={lugar === valor}
                  onChange={() => cambiarLugar(valor)}
                  className="size-4 accent-accent"
                />
                {etiqueta}
              </label>
            ))}
          </div>
          <Mensaje id="error-incidencia-tipo" texto={errorTipo} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="incidencia-lugar" className="text-sm font-semibold">
              {enUnidad ? "Unidad" : "Área común"}
            </label>
            <select
              id="incidencia-lugar"
              className="field mt-1"
              value={lugarId}
              disabled={!opciones.length}
              required
              aria-invalid={Boolean(errorLugar)}
              aria-describedby={
                !opciones.length || errorLugar
                  ? "error-incidencia-lugar"
                  : undefined
              }
              onChange={(evento) => {
                setLugarId(evento.target.value);
                if (errorLugar) setErrorServidor(undefined);
              }}
            >
              {!opciones.length && (
                <option value="">Sin opciones disponibles</option>
              )}
              {opciones.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {"codigo" in opcion ? opcion.codigo : opcion.nombre}
                </option>
              ))}
            </select>
            <Mensaje
              id="error-incidencia-lugar"
              texto={
                errorLugar ??
                (!opciones.length
                  ? enUnidad
                    ? "No tienes unidades activas vinculadas."
                    : "No hay áreas comunes activas."
                  : undefined)
              }
            />
          </div>
          <div>
            <label
              htmlFor="incidencia-categoria"
              className="text-sm font-semibold"
            >
              Categoría
            </label>
            <select
              id="incidencia-categoria"
              className="field mt-1"
              value={categoria}
              required
              aria-invalid={Boolean(errorCategoria)}
              aria-describedby={
                errorCategoria ? "error-incidencia-categoria" : undefined
              }
              onChange={(evento) => {
                setCategoria(evento.target.value);
                if (errorCategoria) setErrorServidor(undefined);
              }}
            >
              <option value="" disabled>
                Selecciona una categoría
              </option>
              {Object.entries(CATEGORIAS_INCIDENCIA).map(
                ([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ),
              )}
            </select>
            <Mensaje id="error-incidencia-categoria" texto={errorCategoria} />
          </div>
        </div>

        <div>
          <label
            htmlFor="incidencia-descripcion"
            className="text-sm font-semibold"
          >
            Descripción
          </label>
          <textarea
            id="incidencia-descripcion"
            className="field mt-1 block resize-y"
            rows={3}
            required
            value={descripcion}
            aria-invalid={Boolean(errorTexto)}
            aria-describedby={
              errorTexto
                ? "incidencia-contador error-incidencia-descripcion"
                : "incidencia-contador"
            }
            onChange={(evento) => {
              setDescripcion(evento.target.value);
              if (errorEn("descripcion")) setErrorServidor(undefined);
            }}
          />
          <p
            id="incidencia-contador"
            className="mt-1 text-right text-xs tabular-nums text-muted"
          >
            {longitudDescripcion(descripcion)} / {MAX_DESCRIPCION}
          </p>
          <Mensaje id="error-incidencia-descripcion" texto={errorTexto} />
        </div>

        <fieldset
          aria-describedby={
            errorFotos
              ? "incidencia-fotos-ayuda error-incidencia-fotos"
              : "incidencia-fotos-ayuda"
          }
        >
          <legend className="text-sm font-semibold">Fotos (opcional)</legend>
          <div className="mt-2 flex flex-wrap items-start gap-3">
            {adjuntos.map((adjunto) => (
              <div key={adjunto.id} className="relative max-w-full">
                {"url" in adjunto ? (
                  <Image
                    unoptimized
                    src={adjunto.url}
                    alt={adjunto.nombre}
                    width={88}
                    height={68}
                    className="h-17 w-22 rounded-lg border border-line object-cover"
                  />
                ) : (
                  <p
                    role="alert"
                    className="min-h-17 max-w-44 break-all rounded-lg border border-[var(--danger)] p-2 pr-9 text-xs text-[var(--danger)]"
                  >
                    <strong className="block">{adjunto.nombre}</strong>
                    {adjunto.error}
                  </p>
                )}
                <button
                  type="button"
                  aria-label={`Quitar ${adjunto.nombre}`}
                  className="absolute right-1 top-1 inline-grid size-7 place-items-center rounded-full border border-line bg-surface text-foreground"
                  onClick={() => quitar(adjunto)}
                >
                  <span aria-hidden>×</span>
                </button>
              </div>
            ))}
            <label className="button-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]">
              Agregar foto
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                multiple
                aria-describedby="incidencia-fotos-ayuda"
                onChange={(evento) => {
                  agregar(evento.target.files);
                  evento.target.value = "";
                }}
              />
            </label>
          </div>
          <p id="incidencia-fotos-ayuda" className="mt-2 text-xs text-muted">
            Hasta 3 fotos JPG o PNG de máximo 5 MB cada una.
          </p>
          <Mensaje id="error-incidencia-fotos" texto={errorFotos} />
        </fieldset>
      </fieldset>

      <button
        type="submit"
        className="button justify-self-start"
        disabled={!valido || pendiente}
      >
        {pendiente ? "Enviando…" : "Enviar reporte"}
      </button>
    </form>
  );
}

function Mensaje({ id, texto }: { id: string; texto?: string }) {
  return texto ? (
    <p id={id} className="field-error" role="alert">
      {texto}
    </p>
  ) : null;
}
