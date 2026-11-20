import { usuarioActual } from '@/lib/api';
import { SinPermiso,Titulo } from '@/components/reservas/ui';
import { NuevaAsamblea } from '@/components/asambleas/nueva-asamblea';
export default async function Page(){const user=await usuarioActual();if(user.rol!=='ADMINISTRADOR')return <SinPermiso/>;return <><Titulo titulo="Convocar asamblea" detalle="Crea un borrador con agenda y publica la convocatoria para residentes."/><NuevaAsamblea/></>}
