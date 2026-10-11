import type {Raid} from './League';
import type {NuvoAction} from './nuvoAnimation';
import type {Nuvo} from './data';
import {isKeeperOnField} from './leagueArenaModel';
export interface RaidCue {at:number;actor:string;action:NuvoAction;nuvo?:Nuvo;move?:string;damage?:number;keeper?:boolean}
/** Derive presentation only from confirmed server snapshots; never simulate shared damage. */
export function raidCues(before:Raid|undefined,after:Raid):RaidCue[]{
 if(!before||before.id!==after.id||before.status==='lobby'&&after.status==='active')return [{at:0,actor:'guardian',action:after.hp<=0?'faint':'summon'},...after.members.map(m=>({at:150,actor:m.user_id,action:(m.phase==='crew'&&m.party[m.active].hp>0||m.phase==='keeper'&&m.keeper_hp>0?'summon':'faint') as NuvoAction,nuvo:m.party[m.active],keeper:isKeeperOnField(m)}))];
 if(before.revision===after.revision)return [];
 const cues:RaidCue[]=[];
 if(after.hp<before.hp)cues.push({at:650,actor:'guardian',action:'damaged',damage:before.hp-after.hp});
 let retaliated=false;
 for(const member of after.members){
  const old=before.members.find(m=>m.user_id===member.user_id),now=member.party[member.active];
  if(!old){cues.push({at:0,actor:member.user_id,action:'summon',nuvo:now});continue;}
  const was=old.party[old.active],same=member.party.find(n=>n.uid===was.uid),move=same?.moves.find(id=>(same.pp[id]??0)<(was.pp[id]??0));
  if(old.phase==='choice'&&member.phase==='keeper')cues.push({at:0,actor:member.user_id,action:'summon',keeper:true});
  if(move||member.damage>old.damage)cues.push({at:0,actor:member.user_id,action:'attack',nuvo:was,move,keeper:old.phase==='keeper'});
  if(old.phase==='keeper'&&member.keeper_hp<old.keeper_hp){retaliated=true;cues.push({at:1300,actor:member.user_id,action:'damaged',keeper:true,damage:old.keeper_hp-member.keeper_hp});if(member.keeper_hp<=0)cues.push({at:1700,actor:member.user_id,action:'faint',keeper:true});}
  // Switching invites a hit against the incoming Nuvo, which may immediately faint.
  // Infer that target even when the server has already switched back to the old leader.
  const hit=member.party.find(n=>n.hp<(old.party.find(p=>p.uid===n.uid)?.hp??n.hp)),hitBefore=old.party.find(n=>n.uid===hit?.uid);
  const incoming=hit??now;
  if(old.phase==='crew'&&incoming.uid!==was.uid){
   if(was.hp>0)cues.push({at:0,actor:member.user_id,action:'recall',nuvo:was});
   cues.push({at:500,actor:member.user_id,action:'summon',nuvo:hitBefore??incoming});
  }
  if(hit&&hitBefore){retaliated=true;cues.push({at:1300,actor:member.user_id,action:'damaged',nuvo:hit,damage:hitBefore.hp-hit.hp});if(hit.hp<=0)cues.push({at:1700,actor:member.user_id,action:'faint',nuvo:hit});}
  if(old.phase==='crew'&&now.uid!==incoming.uid)cues.push({at:hit&&hit.hp<=0?2500:1800,actor:member.user_id,action:'summon',nuvo:now});
 }
 if(retaliated&&after.hp>0)cues.push({at:850,actor:'guardian',action:'attack'});
 if(after.hp<=0&&before.hp>0)cues.push({at:1100,actor:'guardian',action:'faint'});
 return cues.sort((a,b)=>a.at-b.at);
}
