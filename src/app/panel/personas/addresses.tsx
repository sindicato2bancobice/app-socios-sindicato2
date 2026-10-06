import type { GoogleAddress } from '@/lib/google/details';
const fields: [keyof GoogleAddress,string][]=[['streetAddress','Calle y número'],['extendedAddress','Complemento'],['poBox','Casilla postal'],['city','Ciudad / localidad'],['region','Región'],['postalCode','Código postal'],['country','País'],['countryCode','Código de país']];
export function Addresses({addresses}:{addresses:GoogleAddress[]|null}){
  return <section className="card member-form"><h2>Direcciones de Google</h2><p>Se muestran todas las direcciones con su etiqueta original. La ubicación laboral no se deduce de estos datos.</p>
    {addresses===null?<p>Sincroniza con Google para cargar las direcciones.</p>:addresses.length?addresses.map((address,index)=><article className="address-item" key={index}>
      <h3>{address.formattedType||address.type||`Dirección ${index+1}`}{address.metadata?.primary?' · Principal':''}</h3>
      {address.type&&<p>Etiqueta original: {address.type}</p>}
      {address.formattedValue&&<p style={{whiteSpace:'pre-wrap'}}>{address.formattedValue}</p>}
      <dl className="address-fields">{fields.map(([key,label])=>typeof address[key]==='string'&&address[key]?<div key={key}><dt>{label}</dt><dd>{String(address[key])}</dd></div>:null)}</dl>
    </article>):<p>No hay direcciones registradas en Google.</p>}
  </section>;
}
