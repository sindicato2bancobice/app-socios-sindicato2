export async function googleRequest<T>(url:string,options:RequestInit,fetcher:typeof fetch=fetch,wait:(ms:number)=>Promise<void>=ms=>new Promise(resolve=>setTimeout(resolve,ms))):Promise<T>{
  for(let attempt=0;attempt<3;attempt++){
    const response=await fetcher(url,{...options,signal:AbortSignal.timeout(15000)});
    if(response.ok)return response.json();
    if(response.status===429){
      const header=response.headers.get('Retry-After');
      const seconds=header===null?NaN:Number(header);
      const delay=Number.isFinite(seconds)?Math.max(1000,seconds*1000):1000*2**attempt;
      // Do not keep a server action waiting for long quota windows.
      if(attempt<2 && delay<=5000){await response.body?.cancel();await wait(delay);continue;}
      throw new Error('Google limitó temporalmente las solicitudes (429). Espera unos minutos y vuelve a sincronizar. La ficha guardada en la app se conserva; la sincronización puede haber completado parte de los contactos.');
    }
    // Never retry uncertain network failures or contact creation automatically.
    throw new Error(`Google Contacts: error ${response.status}. La sincronización no terminó; revisa y vuelve a sincronizar.`);
  }
  throw new Error('La sincronización no terminó');
}
