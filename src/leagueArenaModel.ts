import {maxHp} from './data';
import {LEAGUE_GUARDIANS} from './expansion';
import type {Battle} from './game';
import type {LeagueMember,Raid} from './League';
export type LeagueGuardian=typeof LEAGUE_GUARDIANS[number];
export type LeagueAction='move'|'switch'|'stand'|'strike'|'brace'|'withdraw';
export const vitalityPercent=(hp:number,max:number)=>Math.max(0,Math.min(100,max>0?hp/max*100:0));
export const isKeeperOnField=(member:LeagueMember)=>member.phase==='keeper'||member.phase==='out'&&member.keeper_max>0;
export function memberVitals(member:LeagueMember){
 const keeper=isKeeperOnField(member),nuvo=member.party[member.active];
 return {hp:keeper?member.keeper_hp:nuvo.hp,max:keeper?member.keeper_max:maxHp(nuvo),keeper,nuvo};
}
export function leagueOutcome(raid:Raid,me:LeagueMember){
 return raid.status==='won'&&me.phase!=='out'?'victory':raid.status==='lost'||raid.status==='closed'||me.phase==='out'?'rescue':null;
}
export function canLeagueAct(raid:Raid,me:LeagueMember,action:LeagueAction,choice='',busy=false){
 if(busy||raid.status!=='active'||me.claimed||leagueOutcome(raid,me))return false;
 if(action==='withdraw')return true;
 if(action==='stand')return me.phase==='choice';
 if(action==='strike'||action==='brace')return me.phase==='keeper'&&me.keeper_hp>0;
 if(me.phase!=='crew')return false;
 if(action==='switch'){const i=Number(choice);return /^\d+$/.test(choice)&&i!==me.active&&Boolean(me.party[i]?.hp>0);}
 const nuvo=me.party[me.active];return nuvo.hp>0&&nuvo.moves.includes(choice)&&(nuvo.pp[choice]??0)>0;
}
export function soloLeagueGuardian(battle:Battle){
 return battle.guardianMaxHp?LEAGUE_GUARDIANS.find(g=>g.species===battle.wild.speciesId):undefined;
}
