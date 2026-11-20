import { api,usuarioActual } from '@/lib/api';
import { SinPermiso,Titulo } from '@/components/reservas/ui';
import { ListaAsambleas } from '@/components/asambleas/lista-asambleas';
import type { Asamblea,Unidad } from '@/lib/asambleas';
export default async function Page(){const user=await usuarioActual();if(user.rol!=='RESIDENTE'&&user.rol!=='ADMINISTRADOR')return <SinPermiso/>;const asambleas=await api<Asamblea[]>('asambleas');const unidades=user.rol==='RESIDENTE'?(await api<{datos:Unidad[]}>('unidades/mias')).datos:[];return <><Titulo titulo="Asambleas" detalle="Convocatorias y temas de decisión de la comunidad."/><ListaAsambleas asambleas={asambleas} unidades={unidades} rol={user.rol}/></>}
