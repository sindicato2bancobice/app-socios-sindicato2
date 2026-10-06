export async function processDeletions(resources:string[],remove:(resource:string)=>Promise<unknown>,complete:(resource:string)=>Promise<void>){
  // Persist completion only after Google confirms deletion. A failed completion is safe to retry.
  for(const resource of resources){await remove(resource);await complete(resource);}
}
