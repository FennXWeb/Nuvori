import test from "node:test";
import assert from "node:assert/strict";
import {ALL_FAMILIES,STARTERS,SPECIES,SPECIES_BY_ID,DREAMWEAVER_FORMS,createNuvo,evolve,maxHp,type Nuvo} from "../src/data";
import {newSave,validateSave,encounter,battleTurn,type Battle} from "../src/game";
import {startBreeding,finishBreeding,breedingDetails,normalizeSave,sexOf,canCatchDreamweaver} from "../src/nursery";
import {enterInterior,leaveInterior} from "../src/adventure";
import {getMap,findPath} from "../src/World";
import {REGION_BY_ID} from "../src/data";
const fresh=()=>newSave({name:"Nursery tester",palette:0,pronouns:"They / them"},"bubbfin");
const parents=()=>[createNuvo("spriglet-4",37,false,"male"),createNuvo("spriglet-8",39,true,"female")] as const;

test("every evolution tree is reachable and acyclic; starters branch at evolutions one, three and four",()=>{
  assert.equal(SPECIES.length,311);assert.equal(ALL_FAMILIES.length,27);assert.equal(new Set(SPECIES.map(s=>s.id)).size,311);
  for(const base of ALL_FAMILIES){const seen=new Set<string>();const walk=(id:string)=>{assert.ok(!seen.has(id),id);seen.add(id);const s=SPECIES_BY_ID[id];assert.equal(s.base,base.id);for(const child of s.evolvesTo){assert.equal(SPECIES_BY_ID[child].stage,s.stage+1);assert.ok(s.evolveLevel<=50);walk(child);}};walk(base.id);assert.equal(seen.size,SPECIES.filter(s=>s.base===base.id).length);}
  for(const base of STARTERS){const family=SPECIES.filter(s=>s.base===base.id);assert.deepEqual([0,1,2,3,4].map(stage=>family.filter(s=>s.stage===stage).length),[1,2,2,4,8]);for(const s of family)assert.equal(s.evolvesTo.length,[2,1,2,2,0][s.stage]);}
  assert.deepEqual([0,1,2,3].map(stage=>DREAMWEAVER_FORMS.filter(s=>s.stage===stage).length),[1,4,16,64]);
  assert.ok(new Set(ALL_FAMILIES.map(s=>Math.max(...SPECIES.filter(n=>n.base===s.id).map(n=>n.stage)))).size>=4);
});
test("legacy saves keep companions, gender is deterministic, malformed sex is rejected, evolution preserves sex",()=>{
  const s=fresh();delete (s.party[0] as Partial<Nuvo>).sex;assert.ok(validateSave(s));
  const migrated=normalizeSave(s);assert.equal(migrated.party[0].sex,sexOf(s.party[0]));assert.deepEqual(normalizeSave(s),migrated);assert.equal(migrated.party[0].uid,s.party[0].uid);
  const n=createNuvo("spriglet",12,false,"female");assert.equal(evolve(n,"spriglet-1").sex,"female");
  assert.equal(validateSave({...s,party:[{...n,sex:"unknown"}]}),false);
  assert.equal(validateSave({...s,box:[s.party[0]]}),false);
});
test("cross-branch parents produce level-1 base offspring; timers survive saves; collecting and cancellation preserve parents exactly once",()=>{
  const s=fresh(),[a,b]=parents();s.box=[a,b];const result=startBreeding(s,a.uid,b.uid,1000);
  assert.ok(validateSave(result));assert.equal(result.box.length,0);assert.equal(result.nursery!.child.speciesId,"spriglet");assert.equal(result.nursery!.child.level,1);assert.equal(result.nursery!.child.xp,0);assert.equal(result.nursery!.child.hp,maxHp(result.nursery!.child));assert.equal(result.nursery!.child.origin,"nursery");
  const saved=normalizeSave(JSON.parse(JSON.stringify(result)));assert.deepEqual(saved.nursery,result.nursery);
  assert.throws(()=>finishBreeding(saved,saved.nursery!.id,"collect",saved.nursery!.readyAt-1),/not ready/);
  const done=finishBreeding(saved,saved.nursery!.id,"collect",saved.nursery!.readyAt);
  assert.ok(validateSave(done));assert.equal(done.nursery,undefined);assert.equal(done.party.length+done.box.length,4);assert.deepEqual(done.party.find(n=>n.uid===a.uid),a);assert.deepEqual(done.party.find(n=>n.uid===b.uid),b);
  assert.throws(()=>finishBreeding(done,saved.nursery!.id,"collect",saved.nursery!.readyAt),/already ended/);
  const cancelled=finishBreeding(saved,saved.nursery!.id,"cancel",1001);assert.equal(cancelled.party.length+cancelled.box.length,3);assert.ok(validateSave(cancelled));
  assert.throws(()=>startBreeding(result,a.uid,b.uid),/already caring/);
});
test("nursery rejects mismatched sex/family, one-parent tricks, last healthy crew and full capacity",()=>{
  const [a,b]=parents(),s=fresh();s.box=[a,b];
  assert.throws(()=>startBreeding(s,a.uid,a.uid),/different/);
  assert.throws(()=>startBreeding({...s,box:[a,{...b,sex:"male"}]},a.uid,b.uid),/male and one female/);
  assert.throws(()=>startBreeding({...s,box:[a,{...b,speciesId:"voltik"}]},a.uid,b.uid),/same Nuvo family/);
  assert.throws(()=>startBreeding({...s,party:[a,b],box:[]},a.uid,b.uid),/healthy/);
  const full={...s,party:[...s.party,...Array.from({length:5},()=>createNuvo("bubbfin"))],box:[a,b,...Array.from({length:498},()=>createNuvo("bubbfin"))]};assert.throws(()=>startBreeding(full,a.uid,b.uid),/room/);
  const result=startBreeding(s,a.uid,b.uid);assert.equal(validateSave({...result,nursery:{...result.nursery!,readyAt:result.nursery!.readyAt-1000}}),false);
});
test("breeding durations increase with rarity, parent levels and evolution stages",()=>{
  const a=createNuvo("spriglet",1,false,"male"),b=createNuvo("spriglet",1,false,"female");
  assert.equal(breedingDetails(a,b).seconds,900);assert.ok(breedingDetails({...a,level:50},b).seconds>900);assert.ok(breedingDetails({...a,speciesId:"spriglet-9"},b).seconds>900);
  assert.equal(breedingDetails({...a,speciesId:"dreamweaver"},{...b,speciesId:"dreamweaver"}).seconds,7200);
  assert.equal(breedingDetails({...a,speciesId:"mushbur"},{...b,speciesId:"mushbur"}).seconds,300);
});
test("Dreamweaver allows one wild capture per sex, remembers evolved parents, never spends an orb on a capped capture, permits nursery descendants",()=>{
  let s=fresh();s.orbs=50;const male=createNuvo("dreamweaver",30,false,"male"),female=createNuvo("dreamweaver",30,false,"female");
  const battle=(wild:Nuvo):Battle=>({wild,active:0,log:[],turn:0,reward:0});
  s=battleTurn(s,battle(male),{type:"catch"},()=>0).save;
  assert.equal(s.dreamweaverCaptures!.male,male.uid);assert.ok(!canCatchDreamweaver(s,male));assert.ok(canCatchDreamweaver(s,female));
  s.party=s.party.map(n=>n.uid===male.uid?evolve(n,"dreamweaver-1"):n);
  const blocked=battleTurn(s,battle(createNuvo("dreamweaver",30,false,"male")),{type:"catch"},()=>0);assert.match(blocked.error!,/already caught/);assert.equal(blocked.save.orbs,s.orbs);
  s=battleTurn(s,battle(female),{type:"catch"},()=>0).save;
  const job=startBreeding(s,male.uid,female.uid,1);const done=finishBreeding(job,job.nursery!.id,"collect",job.nursery!.readyAt);
  assert.equal(done.party.filter(n=>SPECIES_BY_ID[n.speciesId].base==="dreamweaver").length,3);assert.ok(validateSave(done));
  assert.deepEqual(done.dreamweaverCaptures,s.dreamweaverCaptures);
  assert.notEqual(encounter({...done,region:"dreamland"},()=>0).wild.speciesId,"dreamweaver");
  const first=encounter({...fresh(),region:"dreamland"},()=>0).wild;assert.equal(first.speciesId,"dreamweaver");
  assert.notEqual(encounter({...fresh(),region:"verdant"},()=>0).wild.speciesId,"dreamweaver");
});
test("nursery buildings have reachable entrances, an interior counter, and preserve outdoor positions",()=>{
  const r=REGION_BY_ID.mossbell,building=getMap(r).find(p=>p.interact==="nursery")!;assert.ok(building);
  assert.ok(findPath(560,496,building.x*32,(building.y+1.6)*32,r).length);
  const inside=enterInterior(fresh(),"nursery",224,780);assert.ok(validateSave(inside));assert.ok(findPath(576,608,576,368,r,"nursery").length);
  assert.ok(getMap(r,"nursery").some(p=>p.interact==="breeder"));assert.equal(leaveInterior(inside).x,224);
});
