export type ContactData = { first_name: string; last_name: string; email: string | null; phone: string | null };
export const fields = ['first_name', 'last_name', 'email', 'phone'] as const;
export function normalizeEmail(value: string | null | undefined) { return (value || '').trim().toLowerCase(); }
// Three-way merge: retain one-sided changes; never silently overwrite concurrent edits.
export function mergeContact(base: ContactData, local: ContactData, remote: ContactData) {
  const result = { ...local }; const conflicts: string[] = [];
  for (const key of fields) {
    const l = local[key] || ''; const r = remote[key] || ''; const b = base[key] || '';
    if (l !== b && r !== b && l !== r) conflicts.push(key);
    else if (r !== b) Object.assign(result, { [key]: remote[key] });
  }
  if (!result.first_name || !result.last_name) conflicts.push('name_required');
  return { result, conflicts };
}
export function sameContact(a: ContactData, b: ContactData) { return fields.every(key => (a[key] || '') === (b[key] || '')); }
