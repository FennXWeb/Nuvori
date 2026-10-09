import {SPECIES,SPECIES_BY_ID,evolve,type Nuvo} from './data';
import type {Save} from './game';

/** Guide entries are individual forms; the old dex number identifies a family. */
export const GUIDE_SPECIES=SPECIES;
export const GUIDE_NUMBER=Object.fromEntries(GUIDE_SPECIES.map((s,index)=>[s.id,index+1]));
const parentById=Object.fromEntries(SPECIES.flatMap(s=>s.evolvesTo.map(id=>[id,s.id])));
const known=(ids:string[])=>ids.filter(id=>Object.hasOwn(SPECIES_BY_ID,id));
export function validFormRecords(value:unknown){
 return value===undefined||(Array.isArray(value)&&value.length<=SPECIES.length&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&Object.hasOwn(SPECIES_BY_ID,id)));
}
export function formRecords(save:Save|null):{caught:Set<string>;seen:Set<string>}{
 const caught=new Set(known(save?.caughtForms??[])),seen=new Set(known(save?.seenForms??[]));
 if(!save)return {caught,seen};
 const owned=[...save.party,...save.box,...(save.nursery?.parents??[])];
 for(const nuvo of owned)if(SPECIES_BY_ID[nuvo.speciesId])caught.add(nuvo.speciesId);
 if(save.caughtForms===undefined){
  // Legacy caught/seen values represented families, not proof of owning their base.
  // Single-form families, owned companions, and dismissed evolution notices are proof.
  const singular=(id:string)=>SPECIES_BY_ID[id]?.stage===0&&!SPECIES_BY_ID[id].evolvesTo.length;
  for(const id of known(save.caught).filter(singular))caught.add(id);
  for(const id of known(save.seen).filter(singular))seen.add(id);
  for(const notice of save.evolutionNotices??[]){const id=notice.slice(notice.lastIndexOf(':')+1);if(SPECIES_BY_ID[id])caught.add(id);}
  // Starter and nursery companions begin at the base and have one unambiguous lineage.
  // Wild captures may start at any stage, so their earlier forms are never inferred.
  for(const nuvo of owned)if(nuvo.origin==='starter'||nuvo.origin==='nursery'){
   let id=parentById[nuvo.speciesId];while(id){caught.add(id);id=parentById[id];}
  }
 }
 for(const id of caught)seen.add(id);
 return {caught,seen};
}
export function recordForms(save:Save,caughtIds:string[]=[],seenIds:string[]=[]):Save{
 const records=formRecords(save);
 for(const id of known(caughtIds)){records.caught.add(id);records.seen.add(id);}
 for(const id of known(seenIds))records.seen.add(id);
 return {...save,caughtForms:[...records.caught],seenForms:[...records.seen]};
}
export function caughtFormCount(save:Save|null){return formRecords(save).caught.size;}
/** Evolving records both ends before the cinematic, preserving earlier forms forever. */
export function evolveCompanion(save:Save,uid:string,target:string):{save:Save;before:Nuvo;after:Nuvo}{
 const before=[...save.party,...save.box].find(n=>n.uid===uid);
 if(!before)throw new Error('This Nuvo is not in your crew or reserve.');
 const after=evolve(before,target),recorded=recordForms(save,[before.speciesId,target]);
 return {before,after,save:{...recorded,party:save.party.map(n=>n.uid===uid?after:n),box:save.box.map(n=>n.uid===uid?after:n)}};
}
