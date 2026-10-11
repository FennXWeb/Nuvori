// Bump when the Studio client requires new or incompatible local server routes.
export const STUDIO_API_VERSION=1;

export class StudioRestartRequired extends Error {
 constructor(){
  super('World Studio needs a restart to load this update. Save your draft, close the original World Studio terminal, then reopen Nuvori World Studio.cmd. Your saved drafts and beta saves are preserved.');
  this.name='StudioRestartRequired';
 }
}

export function requireCurrentStudio(session:{apiVersion?:unknown}|null|undefined){
 if(session?.apiVersion!==STUDIO_API_VERSION)throw new StudioRestartRequired();
}
