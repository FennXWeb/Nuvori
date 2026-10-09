import { createNuvo } from "./data";
import type { Save } from "./game";
import type { OrbKind } from "./expansion";
export const SEASON = {id:"s1",name:"First Light",subtitle:"The Starlace Expedition",starts:Date.UTC(2026,9,9),ends:Date.UTC(2027,0,9),tiers:100,xpPerTier:300};
export interface PassProgress {xp:number;claimed:number[];boosts:number;boostUntil:number}
export type SeasonReward = {tier:number;kind:"coins"|"potions"|"orbs"|"boost"|"cosmetic"|"nuvo";amount:number;name:string;icon:string;orb?:OrbKind;cosmetic?:string};
const cosmetics:Record<number,[string,string]>={20:["s1-hat-4","Starlace halo"],40:["s1-top-8","Starlace coat"],60:["s1-hat-5","Dawnwarden crown"],80:["s1-top-9","Dawnwarden regalia"]};
export const PASS_REWARDS:SeasonReward[]=Array.from({length:100},(_,i)=>{
 const tier=i+1;
 if(tier===100)return {tier,kind:"nuvo",amount:1,name:"Solunelle",icon:"✦"};
 if(cosmetics[tier])return {tier,kind:"cosmetic",amount:1,name:cosmetics[tier][1],cosmetic:cosmetics[tier][0],icon:"✧"};
 if(tier%10===0)return {tier,kind:"boost",amount:1,name:"2× pass XP · 30 minutes",icon:"⚡"};
 if(tier%5===0)return {tier,kind:"orbs",orb:["verdant","tide","dusk","prism","swift"][Math.floor(tier/5)%5] as OrbKind,amount:3,name:"Specialty orb bundle",icon:"◈"};
 if(tier%3===0)return {tier,kind:"potions",amount:3+Math.floor(tier/25),name:"Restoring potions",icon:"♥"};
 if(tier%2===0)return {tier,kind:"orbs",orb:"binding",amount:4+Math.floor(tier/25),name:"Binding orbs",icon:"◉"};
 return {tier,kind:"coins",amount:100+Math.floor(tier/10)*25,name:"Keeper coins",icon:"✺"};
});
export function passProgress(save:Save):PassProgress{return save.passes?.[SEASON.id]??{xp:0,claimed:[],boosts:0,boostUntil:0};}
export function passTier(save:Save){return Math.min(100,Math.floor(passProgress(save).xp/SEASON.xpPerTier));}
export function validPasses(value:unknown):boolean{
 if(value===undefined)return true;if(!value||typeof value!=="object"||Array.isArray(value))return false;
 return Object.entries(value).length<=24&&Object.entries(value).every(([id,p])=>/^s\d{1,3}$/.test(id)&&p&&Number.isInteger(p.xp)&&p.xp>=0&&p.xp<=30000&&Array.isArray(p.claimed)&&p.claimed.length<=100&&new Set(p.claimed).size===p.claimed.length&&p.claimed.every((n:number)=>Number.isInteger(n)&&n>=1&&n<=Math.floor(p.xp/300))&&Number.isInteger(p.boosts)&&p.boosts>=0&&p.boosts<=100&&Number.isFinite(p.boostUntil)&&p.boostUntil>=0);
}
export function awardPassXp(save:Save,amount:number,now=Date.now()):Save{
 if(now<SEASON.starts||now>=SEASON.ends||!Number.isInteger(amount)||amount<=0)return save;
 const p=passProgress(save),xp=Math.min(30000,p.xp+amount*(p.boostUntil>now?2:1));
 return {...save,passes:{...save.passes,[SEASON.id]:{...p,xp}}};
}
/** Derive rewards from completed game transitions, never renders or button presses. */
export function awardAdventureProgress(before:Save,after:Save,now=Date.now()):Save{
 const battles=Math.max(0,after.battles-before.battles),caught=Math.max(0,after.caught.length-before.caught.length);
 const discoveries=Math.max(0,after.visited.length-before.visited.length)+Math.max(0,after.landmarks.length-before.landmarks.length);
 const trainers=Math.max(0,(after.defeatedTrainers?.length??0)-(before.defeatedTrainers?.length??0));
 const badges=Math.max(0,(after.leagueClaims?.length??0)-(before.leagueClaims?.length??0));
 return awardPassXp(after,battles*75+caught*125+discoveries*150+trainers*150+badges*300,now);
}
export function activatePassBoost(save:Save,now=Date.now()):Save{
 const p=passProgress(save);if(p.boosts<1||now<SEASON.starts||now>=SEASON.ends)throw new Error("No boost is available for this season.");
 return {...save,passes:{...save.passes,[SEASON.id]:{...p,boosts:p.boosts-1,boostUntil:Math.max(now,p.boostUntil)+30*60*1000}}};
}
export function claimPassReward(save:Save,tier:number):Save{
 const p=passProgress(save),reward=PASS_REWARDS[tier-1];
 if(!Number.isInteger(tier)||!reward||tier>passTier(save)||p.claimed.includes(tier))throw new Error("This reward is not available to claim.");
 if(reward.kind==="nuvo"&&save.party.length+save.box.length+(save.nursery?3:0)>=506)throw new Error("Make room in your reserve before claiming Solunelle.");
 let next={...save,passes:{...save.passes,[SEASON.id]:{...p,claimed:[...p.claimed,tier]}}};
 if(reward.kind==="coins")next.coins+=reward.amount;
 if(reward.kind==="potions")next.potions+=reward.amount;
 if(reward.kind==="orbs"){if(reward.orb==="binding")next.orbs+=reward.amount;else next.specialOrbs={...next.specialOrbs,[reward.orb!]:Math.min(100000,(next.specialOrbs?.[reward.orb as Exclude<OrbKind,"binding">]??0)+reward.amount)};}
 if(reward.kind==="boost")next.passes[SEASON.id].boosts+=reward.amount;
 if(reward.kind==="cosmetic")next.cosmetics=[...new Set([...(next.cosmetics??[]),reward.cosmetic!])];
 if(reward.kind==="nuvo"){
   const nuvo=createNuvo("solunelle",5,false);
   next={...next,party:next.party.length<6?[...next.party,nuvo]:next.party,box:next.party.length>=6?[...next.box,nuvo]:next.box,seen:[...new Set([...next.seen,"solunelle"])],caught:[...new Set([...next.caught,"solunelle"])]};
 }
 return next;
}
