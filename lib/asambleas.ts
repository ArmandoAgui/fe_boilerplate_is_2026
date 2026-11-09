export type OpcionVoto={id:string;texto:string};
export type Tema={id:string;pregunta:string;aperturaAt:string;cierreAt:string;estado:'PUBLICADA'|'ABIERTO'|'CERRADO';opciones:OpcionVoto[]};
export type Asamblea={id:string;titulo:string;fechaAt:string;descripcion:string|null;estado:'BORRADOR'|'PUBLICADA';temas:Tema[]};
export type Unidad={id:string;codigo:string};
