export type Preferencias = {
  visible: boolean;
  mostrarTelefono: boolean;
  mostrarCorreo: boolean;
  mostrarUnidad: boolean;
};
export type Ficha = {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  unidad: string | null;
};
export type PaginaDirectorio = {
  datos: Ficha[];
  total: number;
  pagina: number;
  tamanoPagina: number;
};
