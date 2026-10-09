import test from "node:test";
import assert from "node:assert/strict";
import {newSave,validateSave} from "../src/game";
import {SEASON,PASS_REWARDS,awardPassXp,awardAdventureProgress,activatePassBoost,claimPassReward,passProgress,passTier} from "../src/season";
import {DEFAULT_APPEARANCE,APPEARANCE_LIMITS,validAppearance,cosmeticFor} from "../src/appearance";
import {REGIONS,REGION_BY_ID,SPECIES_BY_ID,BASE_SPECIES,createNuvo} from "../src/data";
import {terrainAt,terrainPath} from "../src/terrain";
import {WORLD_W,WORLD_H,getMap,canWalk,findPath} from "../src/World";
import {tallGrassAt,roadAt} from "../src/worldScenery";
import {startBreeding} from "../src/nursery";
const fresh=()=>newSave({name:"First Light",palette:0,pronouns:"They / them",appearance:DEFAULT_APPEARANCE},"spriglet");
const now=SEASON.starts+1000;
test("all 100 pass rewards can be claimed once, persist, and the final reward never enters wild pools",()=>{
 let s=awardPassXp(fresh(),30000,now);const initial=s.coins;
 assert.equal(passTier(s),100);assert.equal(PASS_REWARDS.length,100);
 for(const reward of PASS_REWARDS){s=claimPassReward(s,reward.tier);assert.ok(validateSave(s),`tier ${reward.tier}`);assert.throws(()=>claimPassReward(s,reward.tier));}
 assert.ok(s.coins>initial);assert.equal(s.cosmetics?.length,4);assert.ok(passProgress(s).boosts>0);
 assert.equal(s.party.filter(n=>n.speciesId==="solunelle").length,1);
 assert.equal(SPECIES_BY_ID.solunelle.rarity,"Mythical");
 assert.ok(REGIONS.every(r=>!r.pool.some(i=>BASE_SPECIES[i].id==="solunelle")));
 assert.deepEqual(JSON.parse(JSON.stringify(s)).passes,s.passes);
 assert.throws(()=>claimPassReward(fresh(),1));assert.throws(()=>claimPassReward(s,101));assert.throws(()=>claimPassReward(s,NaN));
});
test("temporary pass boosts double XP only while active, stack time, and do not grant rewards outside the season",()=>{
 let s=claimPassReward(awardPassXp(fresh(),3000,now),10);s=activatePassBoost(s,now);
 assert.equal(passProgress(s).boosts,0);assert.equal(passProgress(s).boostUntil,now+1800000);assert.throws(()=>activatePassBoost(s,now));
 assert.equal(passProgress(awardPassXp(s,75,now+2000)).xp,3150);
 assert.equal(passProgress(awardPassXp(s,75,now+1800001)).xp,3075);
 assert.equal(s.party[0].xp,0);
 assert.equal(awardPassXp(s,100,SEASON.ends),s);assert.equal(awardPassXp(s,100,SEASON.starts-1),s);
 s=claimPassReward(awardPassXp(s,30000,now),30);const boosted=activatePassBoost(s,now+100);
 assert.equal(passProgress(boosted).boostUntil,now+3600000);
});
test("adventure XP derives from new achievements and never repeats on unchanged state",()=>{
 const s=fresh(),next={...s,battles:1,caught:[...s.caught,"cindlet"],visited:[...s.visited,"verdant"]};
 const rewarded=awardAdventureProgress(s,next,now);assert.equal(passProgress(rewarded).xp,350);
 assert.equal(awardAdventureProgress(rewarded,rewarded,now),rewarded);
 assert.equal(passProgress(awardAdventureProgress(rewarded,{...rewarded,coins:9999},now)).xp,350);
});
test("a full reserve preserves the exclusive reward until room is available",()=>{
 let s=awardPassXp(fresh(),30000,now);s.party=Array.from({length:6},()=>createNuvo("spriglet"));s.box=Array.from({length:500},()=>createNuvo("cindlet"));
 assert.throws(()=>claimPassReward(s,100),/room/);assert.ok(!passProgress(s).claimed.includes(100));
 s.box.pop();const claimed=claimPassReward(s,100);assert.equal(claimed.box.at(-1)?.speciesId,"solunelle");assert.ok(validateSave(claimed));
});
test("legacy and expanded appearance saves validate, malformed layers and pass claims do not",()=>{
 const s=fresh();assert.ok(validateSave(s));assert.ok(validAppearance(DEFAULT_APPEARANCE));
 for(const [k,limit] of Object.entries(APPEARANCE_LIMITS)){assert.equal(validAppearance({...DEFAULT_APPEARANCE,[k]:limit}),false);assert.equal(validAppearance({...DEFAULT_APPEARANCE,[k]:-1}),false);}
 assert.ok(validateSave({...s,player:{name:"Legacy",palette:2,pronouns:"They / them"}}));
 assert.equal(validateSave({...s,passes:{s1:{xp:0,claimed:[100],boosts:0,boostUntil:0}}}),false);
 assert.equal(cosmeticFor("top",8),"s1-top-8");assert.equal(cosmeticFor("hat",4),"s1-hat-4");
});
test("nursery escrow reserves room even when the active crew has an empty slot",()=>{
 let s=awardPassXp(fresh(),30000,now);s.party=Array.from({length:6},()=>createNuvo("spriglet",5,false,"male"));s.box=Array.from({length:499},()=>createNuvo("spriglet",5,false,"female"));
 s=startBreeding(s,s.party[0].uid,s.box[0].uid,now);assert.equal(s.party.length,5);assert.ok(validateSave(s));
 assert.throws(()=>claimPassReward(s,100),/room/);assert.ok(!passProgress(s).claimed.includes(100));
});
test("outdoor cells quadruple in area; travel gates and town services remain reachable",()=>{
 assert.equal(WORLD_W*WORLD_H,36*26*4);
 for(const r of REGIONS){const props=getMap(r);assert.equal(props,getMap(r));
  for(const direction of Object.keys(r.links)){const [x,y]=direction==="north"?[576,72]:direction==="south"?[576,WORLD_H*32-72]:direction==="west"?[72,416]:[WORLD_W*32-72,416];assert.ok(findPath(560,496,x,y,r).length,`${r.id} ${direction}`);}
  if(r.kind==="Town"){assert.ok(props.filter(p=>p.kind>=30).length>=12);assert.equal(canWalk(36*32,9*32-20,r,props),false);}
 }
 const s=fresh();s.x=2200;s.y=1600;assert.ok(validateSave(s));
});
test("tall grass forms broad encounter patches outside towns and roads",()=>{
 const r=REGION_BY_ID.verdant;let tiles=0;
 for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){if(tallGrassAt(x+.5,y+.5,r)){tiles++;assert.equal(terrainPath(terrainAt(x+.5,y+.5,r)),false);}assert.equal(tallGrassAt(x+.5,y+.5,REGION_BY_ID.mossbell),false);}
 assert.ok(tiles>500&&tiles<2500);
});
