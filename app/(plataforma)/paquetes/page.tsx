import { api,usuarioActual } from '@/lib/api';
import { SinPermiso,Titulo } from '@/components/reservas/ui';
import { MisPaquetes } from '@/components/paquetes/mis-paquetes';
import type { ListaPaquetes } from '@/lib/paquetes';
export default async function Page(){const user=await usuarioActual();if(user.rol!=='RESIDENTE')return <SinPermiso/>;const {datos:unidades}=await api<{datos:{id:string;codigo:string}[]}>('unidades/mias');const first=unidades[0];const lista=first?await api<ListaPaquetes>(`paquetes/mios?unidadId=${first.id}&estado=PENDIENTE&pagina=1&tamanoPagina=20`):{datos:[],total:0,pagina:1,tamanoPagina:20};return <><Titulo titulo="Mis paquetes" detalle="Consulta tus entregas pendientes y el historial de paquetes recibidos."/><MisPaquetes lista={lista} unidades={unidades}/></>}
