import test from 'node:test';
import assert from 'node:assert/strict';
import {createNuvo,evolve,gainXp,REGIONS,SPECIES_BY_ID} from '../src/data';
import {battleTurn,encounter,newSave,type Battle} from '../src/game';
import {fastTravel,travelFare,travelReason} from '../src/travel';
import {canWalk} from '../src/World';
const fresh=()=>newSave({name:'Keeper',palette:0,pronouns:'They / them'},'spriglet');
const fallen=()=>{const s=fresh();s.region='verdant';s.party[0].hp=0;return s;};
test('keeper victory, capture and escape never revive fallen companions',()=>{
 for(const action of ['strike','catch','run'] as const){
  const s=fallen(),b=encounter(s,()=>.5);const stand=battleTurn(s,b,{type:'stand'});stand.battle.wild.hp=1;
  const result=battleTurn(stand.save,stand.battle,{type:action},()=>0);
  assert.equal(result.error,undefined);assert.equal(result.battle.over,{strike:'won',catch:'caught',run:'fled'}[action]);assert.equal(result.save.party[0].hp,0);
  if(action!=='catch'){const next=encounter(result.save,()=>.5);assert.equal(next.lastStand,'choice');assert.ok(battleTurn(result.save,next,{type:'move',id:'bloom-0'}).error);}
 }
});
test('fainted crew cannot attack or revive through leveling, evolution, or tonics',()=>{
 const s=fallen();const b:Battle={wild:createNuvo('bubbfin',5,false),active:0,turn:0,reward:0,log:[]};
 for(const a of [{type:'move',id:'bloom-0'},{type:'potion'},{type:'switch',index:0}] as const){const r=battleTurn(s,b,a);assert.ok(r.error);assert.equal(r.save.party[0].hp,0);assert.equal(r.save.potions,s.potions);}
 const leveled=gainXp(s.party[0],1000).nuvo;assert.ok(leveled.level>5);assert.equal(leveled.hp,0);
 const n={...s.party[0],level:12};assert.equal(evolve(n,SPECIES_BY_ID[n.speciesId].evolvesTo[0]).hp,0);
 const rescue=battleTurn(s,{...b,lastStand:'choice'},{type:'retreat'});assert.equal(rescue.save.interior,'lodge');assert.ok(rescue.save.party[0].hp>0);
});
test('skyway travel prices connected destinations, charges exactly once, preserves crew, and lands safely',()=>{
 const s=fallen();s.region='mossbell';s.visited=REGIONS.map(r=>r.id);s.coins=5000;
 assert.equal(travelFare('mossbell','verdant'),55);
 for(const r of REGIONS.filter(r=>!r.hidden&&r.id!==s.region)){
  const fare=travelFare(s.region,r.id)!;assert.ok(fare>=55);const next=fastTravel({...s,interior:'shop',outside:{x:1,y:1}},r.id);
  assert.equal(next.coins,s.coins-fare);assert.deepEqual(next.party,s.party);assert.equal(next.interior,undefined);assert.equal(next.outside,undefined);assert.ok(canWalk(next.x,next.y,r),r.id);assert.throws(()=>fastTravel(next,r.id));
 }
 assert.equal(s.coins,5000);
});
test('skyways reject undiscovered, unknown, hidden, current and unaffordable destinations',()=>{
 const s=fresh();assert.throws(()=>fastTravel(s,'verdant'));assert.throws(()=>fastTravel(s,'invalid'));assert.throws(()=>fastTravel(s,'mossbell'));
 s.visited.push('verdant','dreamland');s.coins=54;assert.match(travelReason(s,'verdant'),/1 more/);assert.throws(()=>fastTravel(s,'verdant'));assert.throws(()=>fastTravel(s,'dreamland'));
 s.region='dreamland';s.coins=1000;assert.throws(()=>fastTravel(s,'mossbell'));
});
