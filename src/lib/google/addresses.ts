import type { GoogleAddress } from './details';
export const addressFields=['type','formattedValue','poBox','streetAddress','extendedAddress','city','region','postalCode','country','countryCode'] as const;
export function writableAddresses(addresses:GoogleAddress[]){return addresses.map(address=>Object.fromEntries(addressFields.flatMap(key=>address[key]?[ [key,address[key]] ]:[])) as GoogleAddress);}
export function sameAddresses(a:GoogleAddress[],b:GoogleAddress[]){
  const canonical=(list:GoogleAddress[])=>writableAddresses(list).map(address=>{
    return JSON.stringify(address);
  }).sort();
  return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}
export function mergeAddresses(base:GoogleAddress[]|undefined,local:GoogleAddress[]|null,remote:GoogleAddress[]){
  if(local===null)return {result:remote,conflict:false};
  if(base===undefined)return {result:remote,conflict:!sameAddresses(local,remote)};
  const localChanged=!sameAddresses(local,base),remoteChanged=!sameAddresses(remote,base);
  if(localChanged&&remoteChanged&&!sameAddresses(local,remote))return {result:local,conflict:true};
  return {result:localChanged?local:remote,conflict:false};
}
export function parseAddresses(value:string):GoogleAddress[]{
  const data:unknown=JSON.parse(value);if(!Array.isArray(data))throw new Error('Revisa las direcciones');
  return data.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('Dirección no válida');
    const result:GoogleAddress={};
    for(const key of addressFields){const value=item[key];if(value===undefined)continue;if(typeof value!=='string'||value.length>2000)throw new Error('Revisa los datos de la dirección');if(value.trim())result[key]=value.trim();}
    if(!addressFields.some(key=>key!=='type'&&result[key]))throw new Error('Completa la dirección o quítala de la lista');
    if(result.countryCode&&!/^[A-Za-z]{2}$/.test(result.countryCode))throw new Error('El código de país debe tener dos letras');
    if(result.countryCode)result.countryCode=result.countryCode.toUpperCase();return result;
  });
}
export function matchesAddress(addresses:GoogleAddress[]|null|undefined,query:string){
  const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL');
  const terms=normalize(query.trim()).split(/\s+/).filter(Boolean);if(!terms.length)return true;
  return (addresses||[]).some(address=>{const text=normalize(addressFields.map(key=>address[key]||'').join(' '));return terms.every(term=>text.includes(term));});
}
export function addressText(address:GoogleAddress){return address.streetAddress||address.poBox?[address.streetAddress,address.extendedAddress,address.poBox,address.city,address.region,address.postalCode,address.country||address.countryCode].filter(Boolean).join(', '):address.formattedValue||[address.city,address.region,address.country].filter(Boolean).join(', ');}
