'use client';

import type { GoogleEmail } from '@/lib/google/details';
import Link from 'next/link';
import { Search, UsersRound } from 'lucide-react';
import { useState } from 'react';

export type DirectoryPerson = {
  id: string;
  first_name: string;
  last_name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  branch: string | null;
  status: string;
  google_emails?: GoogleEmail[] | null;
};

const states: Record<string, [string, string]> = {
  active_member: ['Socio', ''],
  adherent: ['Adherente', 'adherent'],
  inactive_member: ['Inactivo', 'inactive'],
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CL');

export function Directory({ people, canEdit, initialQuery, initialStatus }: {
  people: DirectoryPerson[];
  canEdit: boolean;
  initialQuery: string;
  initialStatus: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  const results = people.filter(person => {
    if (status && person.status !== status) return false;
    const fields = [person.first_name, person.last_name, `${person.first_name} ${person.last_name}`, person.rut, person.email, person.phone, ...(person.google_emails||[]).map(email=>email.value)].map(value => normalize(value || ''));
    return terms.every(term => fields.some(value => value.includes(term)));
  });
  const filtered = Boolean(status || terms.length);

  return <>
    <div className="filters">
      <label className="search-field">
        <Search aria-hidden="true" />
        <input type="search" name="q" aria-label="Buscar personas" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, RUT, correo o teléfono" />
      </label>
      <select name="status" aria-label="Estado de la persona" value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">Todos los estados</option>
        <option value="active_member">Socios activos</option>
        <option value="adherent">Adherentes</option>
        <option value="inactive_member">Inactivos</option>
      </select>
      <button type="button" className="button secondary" disabled={!query && !status} onClick={() => { setQuery(''); setStatus(''); }}>Limpiar filtros</button>
    </div>
    <div className="directory-summary" role="status" aria-live="polite" aria-atomic="true">
      <span>Total registrado: <strong>{people.length.toLocaleString('es-CL')}</strong> {people.length === 1 ? 'persona' : 'personas'}</span>
      {filtered && <span><strong>{results.length.toLocaleString('es-CL')}</strong> {results.length === 1 ? 'coincidencia' : 'coincidencias'}</span>}
    </div>
    <article className="card table-card">
      {results.length ? <div className="table-wrap"><table className="table">
        <thead><tr><th>Persona</th><th>RUT</th><th>Contacto</th><th>Sucursal</th><th>Estado</th></tr></thead>
        <tbody>{results.map(person => {
          const [label, css] = states[person.status] || [person.status, ''];
          return <tr key={person.id}>
            <td><div className="person-cell"><div className="person-avatar">{person.first_name[0]}{person.last_name[0]}</div>{canEdit ? <Link href={`/panel/personas/${person.id}`}><strong>{person.first_name} {person.last_name}</strong></Link> : <strong>{person.first_name} {person.last_name}</strong>}</div></td>
            <td>{person.rut || '—'}</td>
            <td><span>{person.email || '—'}</span><small>{person.phone}</small></td>
            <td>{person.branch || '—'}</td>
            <td><span className={`badge ${css}`}>{label}</span></td>
          </tr>;
        })}</tbody>
      </table></div> : <div className="large-empty"><UsersRound /><h2>{filtered ? 'No hay coincidencias' : 'No hay registros'}</h2><p>{filtered ? 'Prueba otra búsqueda o limpia los filtros.' : 'Agrega la primera persona para comenzar.'}</p></div>}
    </article>
  </>;
}
