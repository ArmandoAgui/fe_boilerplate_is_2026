import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MisComunicados,
  ContenidoComunicado,
} from "@/components/comunicados/mis-comunicados";
import type { MisComunicados as Lista } from "@/lib/comunicados";
const lista: Lista = {
  datos: [
    {
      id: "c1",
      titulo: "Mantenimiento oficial",
      creadoAt: "2026-11-11T18:00:00Z",
      alcance: "TORRE",
      leido: false,
    },
  ],
  total: 11,
  pagina: 1,
  tamanoPagina: 10,
};
describe("H24 comunicados del residente", () => {
  it("muestra título, alcance, fecha y enlace al detalle sin incluir contenido", () => {
    render(<MisComunicados lista={lista} />);
    expect(
      screen.getByRole("link", { name: "Mantenimiento oficial" }),
    ).toHaveAttribute("href", "/comunicados/c1");
    expect(screen.getByText("Torre")).toBeInTheDocument();
    expect(screen.getByText("Sin leer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
      "href",
      "?pagina=2",
    );
    expect(
      screen.queryByRole("link", { name: "Anterior" }),
    ).not.toBeInTheDocument();
  });
  it("anuncia vacío y permite regresar desde una página sin datos", () => {
    render(
      <MisComunicados
        lista={{ datos: [], pagina: 2, tamanoPagina: 10, total: 1 }}
      />,
    );
    expect(
      screen.getByText("No hay comunicados para tu unidad"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior" })).toHaveAttribute(
      "href",
      "?pagina=1",
    );
  });
  it("presenta leído y no ofrece otra página si ya no hay más resultados", () => {
    render(
      <MisComunicados
        lista={{
          ...lista,
          total: 1,
          datos: [{ ...lista.datos[0], leido: true }],
        }}
      />,
    );
    expect(screen.getByText("Leído")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Siguiente" }),
    ).not.toBeInTheDocument();
  });
  it("renderiza contenido completo como texto, sin ejecutar HTML almacenado", () => {
    const { container } = render(
      <ContenidoComunicado
        comunicado={{
          ...lista.datos[0],
          contenido:
            "Línea 1\n<script>alert(1)</script><img src=x onerror=alert(2)>",
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Mantenimiento oficial" }),
    ).toBeInTheDocument();
    expect(container.querySelector("script, img")).toBeNull();
    expect(container).toHaveTextContent("<script>alert(1)</script>");
  });
});
