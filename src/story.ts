import {BASE_SPECIES,REGION_BY_ID,SPECIES_BY_ID,createNuvo,maxHp,type Nuvo} from './data';
import {LEAGUE_GUARDIANS,trainerBattle} from './expansion';
import type {Save,Battle} from './game';
import {STORY_STEPS,STORY_COSMETICS,HALL_WARDENS,type StoryStep} from './storyContent';
export interface StoryProgress {version:1;chapter:number;hallWins:number;hallInFlight:boolean;completedAt?:string}
export const freshStory=():StoryProgress=>({version:1,chapter:0,hallWins:0,hallInFlight:false});
export const storyProgress=(s:Save)=>s.story??freshStory();
export const currentChapter=(s:Save)=>STORY_STEPS[storyProgress(s).chapter];
export const hallUnlocked=(s:Save)=>storyProgress(s).chapter>STORY_STEPS.findIndex(c=>c.id==='hall-unsealed');
export const hallAttemptActive=(s:Save)=>currentChapter(s)?.kind==='hall'&&(storyProgress(s).hallWins>0||storyProgress(s).hallInFlight);
export function validStory(p:unknown):p is StoryProgress|undefined {
 if(p===undefined)return true;if(!p||typeof p!=='object')return false;const v=p as StoryProgress;
 return v.version===1&&Number.isInteger(v.chapter)&&v.chapter>=0&&v.chapter<=STORY_STEPS.length&&Number.isInteger(v.hallWins)&&v.hallWins>=0&&v.hallWins<5&&typeof v.hallInFlight==='boolean'&&(v.completedAt===undefined||(v.chapter===STORY_STEPS.length&&typeof v.completedAt==='string'&&Number.isFinite(Date.parse(v.completedAt))))&&((v.hallWins===0&&!v.hallInFlight)||STORY_STEPS[v.chapter]?.kind==='hall');
}
export function recoverStory(s:Save):Save {
 // Battles are deliberately not saved. An interrupted endurance battle cannot be skipped.
 return s.story?.hallInFlight?{...s,story:{...s.story,hallInFlight:false,hallWins:0}}:s;
}
export function storyText(text:string,s:Save){const first=s.party.find(n=>n.origin==='starter')??s.box.find(n=>n.origin==='starter')??s.party[0];return text.replaceAll('{name}',s.player.name).replaceAll('{starter}',SPECIES_BY_ID[SPECIES_BY_ID[first.speciesId].base].name);}
function advance(s:Save):Save {
 const p=storyProgress(s),step=STORY_STEPS[p.chapter];if(!step)return s;
 const cosmetic=step.cosmetic?STORY_COSMETICS[step.cosmetic-1].id:undefined;
 return {...s,story:{version:1,chapter:p.chapter+1,hallWins:0,hallInFlight:false,...(p.chapter+1===STORY_STEPS.length?{completedAt:new Date().toISOString()}:{})},coins:s.coins+(step.coins??0),orbs:s.orbs+(step.orbs??0),potions:s.potions+(step.potions??0),cosmetics:cosmetic?[...new Set([...(s.cosmetics??[]),cosmetic])]:s.cosmetics};
}
export function storyActionReason(s:Save,step=currentChapter(s)) {
 if(!step)return 'Your champion story is complete.';
 if(s.region!==step.region||s.interior)return `Meet ${step.person==='iris'?'Champion Iris':'your story companion'} outside in ${REGION_BY_ID[step.region].name}.`;
 if(step.id==='hall-unsealed'&&!LEAGUE_GUARDIANS.every(g=>s.leagueBadges?.includes(g.id)))return 'All five League crests are needed to open the Hall.';
 if(step.kind==='catch')return 'Step into the tall grass to begin a real wild encounter.';
 return '';
}
export function finishStoryConversation(s:Save,id:string):Save {
 const step=currentChapter(s);if(!step||step.id!==id||storyActionReason(s))return s;
 if(step.kind==='talk'||(step.kind==='league'&&s.leagueBadges?.includes(step.league!)))return advance(s);
 return s;
}
export function prepareStoryBattle(s:Save,id:string):{save:Save;battle:Battle} {
 const step=currentChapter(s);if(!step||step.id!==id||!['rival','league','hall'].includes(step.kind))throw new Error('This story battle is not available yet.');
 const reason=storyActionReason(s);if(reason)throw new Error(reason);
 if(!s.party.some(n=>n.hp>0))throw new Error('Visit the Healing Lodge before starting a story challenge.');
 let name:string,team:string[],level:number,quote:string;
 if(step.kind==='hall'){
  if(storyProgress(s).hallInFlight)throw new Error('Finish the current Hall battle first.');
  const w=HALL_WARDENS[storyProgress(s).hallWins];name=w.name;team=[...w.team];level=w.level;quote=w.quote;
 }else if(step.kind==='league'){
  const g=LEAGUE_GUARDIANS.find(g=>g.id===step.league)!;name=g.name+' · Solo guardian';team=[g.species];level=g.level;quote=g.blurb;
 }else{name=step.person[0].toUpperCase()+step.person.slice(1);team=step.team!;level=step.level!;quote=step.lines.at(-1)!.words;}
 const battle=trainerBattle(s,{id:`story:${step.id}${step.kind==='hall'?`:${storyProgress(s).hallWins}`:''}`,name,region:step.region,x:18,y:17,species:team,level,quote:storyText(quote,s)});
 // League guardians use their named form, not an automatic later evolution. A solo
 // trial scales the multiplayer guardian's endurance to a single keeper's crew.
 if(step.kind==='league'){
  const g=LEAGUE_GUARDIANS.find(g=>g.id===step.league)!;
  battle.wild=createNuvo(g.species,g.level,false);battle.guardianMaxHp=Math.round(maxHp(battle.wild)*1.6);battle.wild.hp=battle.guardianMaxHp;
 }
 battle.storyId=step.id;
 return {save:step.kind==='hall'?{...s,story:{...storyProgress(s),hallInFlight:true}}:s,battle};
}
export function storyBattleResult(s:Save,b:Battle):Save {
 const step=currentChapter(s);if(!step||!b.over)return s;
 if(step.kind==='catch'&&s.region===step.region&&b.over==='caught'&&!b.trainerId)return advance(s);
 if(b.storyId!==step.id)return s;
 if(step.kind==='hall'){
  const p=storyProgress(s);if(!p.hallInFlight||b.trainerId!==`story:${step.id}:${p.hallWins}`)return s;
  if(b.over!=='won')return {...s,story:{...p,hallWins:0,hallInFlight:false}};
  if(p.hallWins===HALL_WARDENS.length-1)return advance(s);
  return {...s,story:{...p,hallWins:p.hallWins+1,hallInFlight:false}};
 }
 if(b.over==='won'&&b.trainerId===`story:${step.id}`){
  const next=step.kind==='league'?{...s,leagueBadges:[...new Set([...(s.leagueBadges??[]),step.league!])]}:s;
  return advance(next);
 }
 return s;
}
export function storyTravelReason(s:Save,to:string){return to==='hall'&&!hallUnlocked(s)?'The Hall is sealed. Complete the five Leagues and your rivals’ final challenges, then meet Elowen in Crownspire.':'';}
export function leaveStoryRegion(s:Save,to:string):Save {
 if(to!==s.region&&hallAttemptActive(s))return {...s,story:{...storyProgress(s),hallWins:0,hallInFlight:false}};
 return s;
}
export function tutorialEncounter(s:Save):Battle|undefined {
 if(currentChapter(s)?.kind!=='catch'||s.region!=='verdant'||s.interior)return;
 const choices=REGION_BY_ID.verdant.pool.map(i=>BASE_SPECIES[i]).filter(n=>n.id!==SPECIES_BY_ID[s.party[0].speciesId].base);
 const wild:Nuvo={...createNuvo(choices[0].id,3,false),origin:'wild'};
 return {wild,active:Math.max(0,s.party.findIndex(n=>n.hp>0)),log:['Elowen: “Use an Ability to weaken it, then open Satchel and throw a binding orb. Below half HP, I’ll help your first orb hold.”'],turn:0,reward:0,tutorial:true,lastStand:s.party.every(n=>n.hp<=0)?'choice':undefined};
}
export function nextStoryRoute(s:Save):string[] {
 const target=currentChapter(s)?.region;if(!target||s.region===target)return [];
 const queue:string[][]=[[s.region]],seen=new Set([s.region]);
 for(const path of queue)for(const id of Object.values(REGION_BY_ID[path.at(-1)!].links)){if(!id||seen.has(id)||storyTravelReason(s,id))continue;const next=[...path,id];if(id===target)return next.slice(1);seen.add(id);queue.push(next);}
 return [];
}
export function equipStoryCosmetic(s:Save,index:number):Save {
 if(!Number.isInteger(index)||index<0||index>STORY_COSMETICS.length||(index>0&&!s.cosmetics?.includes(STORY_COSMETICS[index-1].id)))return s;
 return {...s,player:{...s.player,appearance:{skin:1,eyes:8,hairStyle:0,hairTint:1,top:0,topTint:9,bottom:0,bottomTint:0,shoes:1,hat:0,accessory:0,...s.player.appearance,adornment:index}}};
}
export function storySuggestedLevel(step:StoryStep){return step.kind==='league'?LEAGUE_GUARDIANS.find(g=>g.id===step.league)?.level:step.kind==='hall'?46:step.level;}
