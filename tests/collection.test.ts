import test from 'node:test';
import assert from 'node:assert/strict';
import {newSave,battleTurn,validateSave,readSave,writeSave,type Battle,type Save} from '../src/game';
import {SPECIES,SPECIES_BY_ID,createNuvo} from '../src/data';
import {GUIDE_SPECIES,GUIDE_NUMBER,formRecords,recordForms,evolveCompanion} from '../src/collection';
import {normalizeSave,startBreeding,finishBreeding} from '../src/nursery';
import {claimPassReward} from '../src/season';
import {caughtBefore} from '../src/adventure';
const fresh=()=>newSave({name:'Guide test',palette:0,pronouns:'They / them'},'spriglet');
const caught=(s:Save)=>[...formRecords(s).caught].sort();
const battle=(id:string):Battle=>({wild:createNuvo(id,3,false),active:0,turn:0,log:[],reward:0});

test('every evolution, including all 85 Dreamweaver forms, has its own guide entry and number',()=>{
 assert.equal(GUIDE_SPECIES.length,SPECIES.length);assert.equal(new Set(Object.values(GUIDE_NUMBER)).size,SPECIES.length);
 assert.equal(GUIDE_SPECIES.filter(s=>s.base==='dreamweaver').length,85);
 for(const s of SPECIES){assert.equal(GUIDE_SPECIES[GUIDE_NUMBER[s.id]-1],s);assert.ok(GUIDE_NUMBER[s.id]>0);}
});
test('catching an evolved wild Nuvo records exactly that form and leaves its base and sibling uncollected',()=>{
 const original=fresh(),result=battleTurn(original,battle('cindlet-1'),{type:'catch'},()=>0);
 assert.equal(result.battle.over,'caught');assert.deepEqual(caught(result.save),['cindlet-1','spriglet']);
 assert.equal(caughtBefore(result.save,'cindlet'),false);assert.equal(caughtBefore(result.save,'cindlet-2'),false);
 assert.ok(result.save.caught.includes('cindlet'),'legacy family objectives still count families');
 assert.deepEqual(caught(original),['spriglet']);assert.ok(validateSave(result.save));
 const again=battleTurn(result.save,battle('cindlet-1'),{type:'catch'},()=>0);assert.deepEqual(caught(again.save),caught(result.save));
});
test('evolution retains every obtained form through later stages and never unlocks sibling branches',()=>{
 let save=fresh();save.party[0].level=50;const uid=save.party[0].uid;
 for(const id of ['spriglet-1','spriglet-3','spriglet-4','spriglet-9'])save=evolveCompanion(save,uid,id).save;
 assert.deepEqual(caught(save),['spriglet','spriglet-1','spriglet-3','spriglet-4','spriglet-9']);
 assert.ok(!caughtBefore(save,'spriglet-2'));assert.ok(!caughtBefore(save,'spriglet-10'));
 assert.ok(validateSave(save));assert.throws(()=>evolveCompanion(save,uid,'spriglet-10'));
 // The history remains even if the owned companion is no longer present.
 save.party=[createNuvo('bubbfin',5,false)];assert.ok(caughtBefore(save,'spriglet-9'));
 assert.deepEqual(save.caught,['spriglet'],'family-based season rewards are unchanged');
});
test('seeing or fleeing from an evolved Nuvo does not mark it, its base or its siblings caught',()=>{
 const seen=recordForms(fresh(),[],['cindlet-2']);assert.deepEqual(caught(seen),['spriglet']);
 assert.ok(formRecords(seen).seen.has('cindlet-2'));assert.ok(!formRecords(seen).seen.has('cindlet'));
 const fled=battleTurn(seen,battle('cindlet-2'),{type:'run'},()=>0).save;assert.deepEqual(caught(fled),['spriglet']);
});
test('legacy migration uses confirmed ownership and notices, never ambiguous family flags or pending offspring',()=>{
 const legacy=fresh();delete legacy.caughtForms;delete legacy.seenForms;
 legacy.party=[{...createNuvo('spriglet-3',30,false),origin:'starter'}];
 legacy.box=[{...createNuvo('cindlet-1',18,false),origin:'wild'}];
 legacy.caught=['spriglet','cindlet','bubbfin','oneirune'];legacy.seen=['voltik'];
 legacy.evolutionNotices=['old-companion:bubbfin-2'];
 const next=normalizeSave(legacy);
 assert.deepEqual(caught(next),['bubbfin-2','cindlet-1','oneirune','spriglet','spriglet-1','spriglet-3']);
 assert.equal(caughtBefore(next,'cindlet'),false);assert.equal(caughtBefore(next,'cindlet-2'),false);assert.equal(caughtBefore(next,'bubbfin'),false);
 assert.ok(!formRecords(next).seen.has('voltik'));assert.deepEqual(normalizeSave(next),next);assert.equal(legacy.caughtForms,undefined);
 const nursery=fresh();nursery.box=[{...createNuvo('cindlet-1',20,false,'male'),origin:'wild'},{...createNuvo('cindlet-2',20,false,'female'),origin:'wild'}];
 const started=startBreeding(nursery,nursery.box[0].uid,nursery.box[1].uid,0),job=started.nursery!;
 assert.ok(caughtBefore(normalizeSave(started),'cindlet-1'));assert.ok(!caughtBefore(normalizeSave(started),'cindlet'));
 const cancelled=finishBreeding(started,job.id,'cancel',job.readyAt);assert.ok(!caughtBefore(cancelled,'cindlet'));
 const collected=finishBreeding(started,job.id,'collect',job.readyAt);assert.ok(caughtBefore(collected,'cindlet'));assert.ok(validateSave(collected));
});
test('exact records survive device export/import and reject malformed records; claimed rewards count as obtained',()=>{
 const s=fresh();s.party[0].level=12;const evolved=evolveCompanion(s,s.party[0].uid,'spriglet-1').save;
 const snapshot=JSON.stringify(evolved),imported=JSON.parse(snapshot);assert.ok(validateSave(imported));assert.deepEqual(caught(normalizeSave(imported)),caught(evolved));
 for(const record of [null,['unknown'],['spriglet','spriglet'],['__proto__'],[1]]){
  assert.ok(!validateSave({...s,caughtForms:record}));assert.ok(!validateSave({...s,seenForms:record}));
 }
 const pass={...s,passes:{s1:{xp:30000,claimed:[],boosts:0,boostUntil:0}}};assert.ok(caughtBefore(claimPassReward(pass,100),'solunelle'));
 const storage=new Map<string,string>(),original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});writeSave(evolved);assert.deepEqual(caught(readSave()!),caught(evolved));}
 finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});
