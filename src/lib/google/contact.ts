import { orderedEmails } from './details.ts';
import type { Person } from './server';
import type { ContactData } from './merge';
export function importContact(person:Person):ContactData|null {
  if(person.metadata?.deleted)return null;
  const name=person.names?.[0];
  const first_name=name?.givenName?.trim() || name?.displayName?.trim() || '';
  if(!first_name)return null;
  return {first_name,last_name:name?.familyName?.trim()||'',email:orderedEmails(person.emailAddresses)[0]?.value?.trim()||null,phone:person.phoneNumbers?.[0]?.value?.trim()||null};
}
