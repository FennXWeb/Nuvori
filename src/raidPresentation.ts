import type {Raid} from './League';
import type {NuvoAction} from './nuvoAnimation';
import type {Nuvo} from './data';
export interface RaidCue {at:number;actor:string;action:NuvoAction;nuvo?:Nuvo;move?:string}
/** Derive presentation only from confirmed server snapshots; never simulate shared damage. */
export function raidCues(before:Raid|undefined,after:Raid):RaidCue[]{
 if(!before||before.id!==after.id||before.status==='lobby'&&after.status==='active')return [{at:0,actor:'guardian',action:'summon'},...after.members.map(m=>({at:150,actor:m.user_id,action:'summon' as const,nuvo:m.party[m.active]}))];
 if(before.revision===after.revision)return [];
 const cues:RaidCue[]=[];
 if(after.hp<before.hp)cues.push({at:650,actor:'guardian',action:'damaged'});
 let retaliated=false;
 for(const member of after.members){
  const old=before.members.find(m=>m.user_id===member.user_id),now=member.party[member.active];
  if(!old){cues.push({at:0,actor:member.user_id,action:'summon',nuvo:now});continue;}
  const was=old.party[old.active],same=member.party.find(n=>n.uid===was.uid),move=same?.moves.find(id=>(same.pp[id]??0)<(was.pp[id]??0));
  if(move||member.damage>old.damage)cues.push({at:0,actor:member.user_id,action:'attack',nuvo:was,move});
  if(same&&same.hp<was.hp){retaliated=true;cues.push({at:1300,actor:member.user_id,action:'damaged',nuvo:same});}
  if(same&&same.hp<=0&&was.hp>0)cues.push({at:1700,actor:member.user_id,action:'faint',nuvo:same});
  if(now.uid!==was.uid){if(same&&same.hp>0)cues.push({at:0,actor:member.user_id,action:'recall',nuvo:was});cues.push({at:same&&same.hp<=0?2500:500,actor:member.user_id,action:'summon',nuvo:now});}
 }
 if(retaliated&&after.hp>0)cues.push({at:850,actor:'guardian',action:'attack'});
 if(after.hp<=0&&before.hp>0)cues.push({at:1100,actor:'guardian',action:'faint'});
 return cues.sort((a,b)=>a.at-b.at);
}
