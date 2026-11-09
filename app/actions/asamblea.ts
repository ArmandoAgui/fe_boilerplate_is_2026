"use server";
import { revalidatePath } from 'next/cache';
import { api,ApiError } from '@/lib/api';
import type { ListaPaquetes } from '@/lib/paquetes';
import type { Asamblea } from '@/lib/asambleas';
export type Resultado={ok?:boolean;error?:string;status?:number;data?:unknown};
function fallo(e:unknown):Resultado{if(e instanceof ApiError)return {error:e.message,status:e.status};if(e instanceof Error&&'digest'in e)throw e;return {error:'No se pudo completar la operación. Intente de nuevo.'};}
export async function listarPaquetes(unidadId:string,estado:'PENDIENTE'|'ENTREGADO',pagina=1):Promise<ListaPaquetes|Resultado>{try{return await api<ListaPaquetes>(`paquetes/mios?unidadId=${encodeURIComponent(unidadId)}&estado=${estado}&pagina=${pagina}&tamanoPagina=20`);}catch(e){return fallo(e);}}
export async function crearAsamblea(data:unknown):Promise<Resultado>{try{const creada=await api<Asamblea>('asambleas',{method:'POST',body:JSON.stringify(data)});revalidatePath('/admin/asambleas/nueva');return {ok:true,data:creada};}catch(e){return fallo(e);}}
export async function publicarAsamblea(id:string):Promise<Resultado>{try{const result=await api('asambleas/'+encodeURIComponent(id)+'/publicacion',{method:'POST',body:JSON.stringify({})});revalidatePath('/asambleas');revalidatePath('/admin/asambleas/nueva');return {ok:true,data:result};}catch(e){return fallo(e);}}
export async function emitirVoto(temaId:string,data:{unidadId:string;opcionId:string}):Promise<Resultado>{try{const result=await api(`votaciones/${encodeURIComponent(temaId)}/votos`,{method:'POST',body:JSON.stringify(data)});revalidatePath('/asambleas');return {ok:true,data:result};}catch(e){return fallo(e);}}
export async function estadoVoto(temaId:string,unidadId:string):Promise<Resultado>{try{return {ok:true,data:await api(`votaciones/${encodeURIComponent(temaId)}/miestado?unidadId=${encodeURIComponent(unidadId)}`)}}catch(e){return fallo(e);}}
