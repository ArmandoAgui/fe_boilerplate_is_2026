export type EstadoPaquete='PENDIENTE'|'ENTREGADO';
export type Paquete={id:string;codigo:string;empresa:string;descripcion:string|null;recibidoAt:string;estado:EstadoPaquete;entregadoAt:string|null;retiraNombre:string|null};
export type ListaPaquetes={datos:Paquete[];total:number;pagina:number;tamanoPagina:number};
