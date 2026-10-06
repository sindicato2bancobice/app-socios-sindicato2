import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Directory, type DirectoryPerson } from './directory';

export default async function PeoplePage({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; created?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await requireUser();
  if (!profile?.active || !['administrator', 'director', 'collaborator'].includes(profile.role)) {
    return <div className="card"><h2>Acceso restringido</h2><p>Tu ficha personal está disponible en “Mi perfil”.</p></div>;
  }
  // Read every permitted row so totals and local filtering never stop at the API page limit.
  const people: DirectoryPerson[] = [];
  let loadFailed = false;
  for (let offset = 0; ;) {
    const { data, error, count } = await supabase.from('members')
      .select('id,first_name,last_name,rut,email,phone,branch,status', { count: 'exact' })
      .order('last_name').order('id').range(offset, offset + 999);
    if (error) { loadFailed = true; break; }
    people.push(...(data || []));
    if (people.length >= (count ?? 0)) break;
    if (!data?.length) { loadFailed = true; break; }
    offset += data.length;
  }
  const canEdit = ['administrator', 'director'].includes(profile.role);
  const initialStatus = ['active_member', 'adherent', 'inactive_member'].includes(params.status || '') ? params.status! : '';

  return <>
    <div className="page-heading"><div><span className="eyebrow">DIRECTORIO</span><h1>Socios y adherentes</h1><p>Consulta y administra la información registrada.</p></div>{canEdit && <Link className="button" href="/panel/personas/nueva"><Plus size={17} /> Nueva persona</Link>}</div>
    {params.created && <div className="success-banner">La persona fue registrada correctamente. En cualquier estado, se enviará a Google en la próxima sincronización.</div>}
    {params.deleted && <div className="success-banner">Ficha eliminada. Si estaba vinculada a Google, la eliminación se completará en la próxima sincronización.</div>}
    {loadFailed ? <div className="error-banner">No fue posible cargar los registros. Recarga para intentar nuevamente.</div> : <Directory key={`${params.q || ''}:${initialStatus}`} people={people} canEdit={canEdit} initialQuery={params.q || ''} initialStatus={initialStatus} />}
  </>;
}
