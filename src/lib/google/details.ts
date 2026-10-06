export type GoogleEmail={value:string;type?:string;displayName?:string;formattedType?:string;metadata?:{primary?:boolean}};
export type GoogleAddress={type?:string;formattedType?:string;formattedValue?:string;poBox?:string;streetAddress?:string;extendedAddress?:string;city?:string;region?:string;postalCode?:string;country?:string;countryCode?:string;metadata?:{primary?:boolean}};
export function orderedEmails(emails:GoogleEmail[]=[]){return [...emails].sort((a,b)=>Number(Boolean(b.metadata?.primary))-Number(Boolean(a.metadata?.primary)));}
export function writableEmails(emails:GoogleEmail[]){return emails.map(({value,type,displayName})=>({value,...(type?{type}:{}),...(displayName?{displayName}:{})}));}
export function sameEmails(a:GoogleEmail[],b:GoogleEmail[]){return JSON.stringify(writableEmails(a).map(item=>JSON.stringify(item)).sort())===JSON.stringify(writableEmails(b).map(item=>JSON.stringify(item)).sort());}
export function mergeEmails(base:GoogleEmail[]|undefined,local:GoogleEmail[]|null,remote:GoogleEmail[],legacyPrimary:string|null){
  if(local===null){
    // Upgrade an old ficha without ever discarding the other Google emails.
    const result=[...remote];
    if(legacyPrimary!==(remote[0]?.value||null)){
      if(legacyPrimary)result[0]={...(remote[0]||{}),value:legacyPrimary};else result.shift();
    }
    return {result,conflict:false};
  }
  if(base===undefined){
    // A newly created contact matches its complete local list; an uninitialized
    // existing contact with extra remote emails must be loaded before replacing it.
    return {result:remote,conflict:!sameEmails(local,remote)};
  }
  const localChanged=!sameEmails(local,base),remoteChanged=!sameEmails(remote,base);
  if(localChanged&&remoteChanged&&!sameEmails(local,remote))return {result:local,conflict:true};
  return {result:localChanged?local:remote,conflict:false};
}
export function parseEmails(value:string):GoogleEmail[]{
  const data:unknown=JSON.parse(value);
  if(!Array.isArray(data))throw new Error('Revisa la lista de correos');
  return data.map(item=>{
    if(!item||typeof item!=='object'||typeof item.value!=='string')throw new Error('Correo no válido');
    const value=item.value.trim();if(value.length>320||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Revisa los correos ingresados');
    if(item.type!==undefined&&(typeof item.type!=='string'||item.type.length>100))throw new Error('Etiqueta no válida');
    if(item.displayName!==undefined&&(typeof item.displayName!=='string'||item.displayName.length>200))throw new Error('Nombre de correo no válido');
    return {value,...(item.type?{type:item.type}:{}),...(item.displayName?{displayName:item.displayName}:{})};
  });
}
