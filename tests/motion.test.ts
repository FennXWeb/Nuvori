import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPECIES,SPECIES_BY_ID,createNuvo,maxHp} from '../src/data';
import {newSave,battleTurn,type Battle} from '../src/game';
import {directionalSprite,MOTION_ATLASES,motionPose,ACTION_SECONDS,type NuvoAction,gaitFor} from '../src/nuvoAnimation';
import {MOTION_SHEETS} from '../scripts/measure-motion';
import {measureWorldArt} from '../scripts/measure-world-art';
import {presentationAt,sceneDuration} from '../src/battlePresentation';
import {buildResidents,residentAt} from '../src/townLife';
import {REGIONS} from '../src/data';
import {canWalk,findPath} from '../src/World';
import {keeperStep} from '../src/keeperArt';
import {raidCues} from '../src/raidPresentation';
import type {Raid} from '../src/League';

test('every Nuvo form has a complete side/rear atlas and all four directions',()=>{
 for(const s of SPECIES)for(const direction of [0,1,2,3]){
  const sprite=directionalSprite(s,direction);assert.ok(sprite.frame,s.id);assert.ok(sprite.frame.width>10&&sprite.frame.height>10);
  if(direction)assert.ok(sprite.file.startsWith('motion-'),`${s.id} direction ${direction} must not fall back to its portrait`);
 }
});
test('directional sheets retain intact isolated silhouettes and source hashes',()=>{
 for(const [file,cols,rows] of MOTION_SHEETS)assert.deepEqual(MOTION_ATLASES[file],measureWorldArt(readFileSync(new URL('../public/assets/'+file,import.meta.url)),cols,rows),file);
});
test('all action rigs stay finite and reduced motion removes displacement',()=>{
 for(const s of SPECIES)for(const action of Object.keys(ACTION_SECONDS) as NuvoAction[])for(const time of [0,.1,.4,.8,3,100]){
  const pose=motionPose(action,time,gaitFor(s.id));assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.alpha>=0&&pose.alpha<=1);assert.ok(pose.sx>0&&pose.sy>0);
  const quiet=motionPose(action,time,gaitFor(s.id),true);assert.equal(quiet.x+quiet.y+quiet.angle+quiet.limbs+quiet.flutter,0);
 }
 assert.ok(keeperStep(.7,true,true).swing>keeperStep(.7,true).swing);
 assert.equal(keeperStep(.7,false).swing,0);
});
const setup=()=>{const save=newSave({name:'Motion QA',palette:0,pronouns:'They / them'},'spriglet');save.party[0]=createNuvo('spriglet',10,false);const wild=createNuvo('cindlet',10,false);const battle:Battle={wild,active:0,turn:0,reward:0,log:[]};return {save,battle};};
test('enemy attacks and switching are ordered and non-move turns clear stale effects',()=>{
 const {save,battle}=setup();save.party.push(createNuvo('bubbfin',10,false));
 const next=battleTurn(save,battle,{type:'switch',index:1},()=>.5);assert.equal(next.error,undefined);
 assert.deepEqual(next.battle.scenes!.slice(0,2).map(s=>s.kind),['recall','summon']);
 assert.ok(next.battle.scenes!.some(s=>s.kind==='attack'&&s.side==='wild'));
 assert.equal(next.battle.animation,undefined);
 const initial={player:save.party[0],wild:battle.wild};
 assert.equal(presentationAt(initial,next.battle.scenes!,0).player.uid,save.party[0].uid);
 assert.equal(presentationAt(initial,next.battle.scenes!,501).player.uid,save.party[1].uid);
});
test('a fast knockout never animates a dead opponent attacking and trainer replacement waits for faint',()=>{
 const {save,battle}=setup();save.party[0]=createNuvo('voltik-6',50,false);save.party[0].moves=['volt-1'];save.party[0].pp['volt-1']=20;battle.wild.hp=1;
 battle.opponentQueue=[createNuvo('bubbfin',5,false)];battle.trainerId='motion';battle.trainerName='QA';
 const result=battleTurn(save,battle,{type:'move',id:'volt-1'},()=>.1);assert.equal(result.error,undefined);
 const scenes=result.battle.scenes!,faint=scenes.findIndex(s=>s.kind==='faint'&&s.side==='wild'),summon=scenes.findIndex(s=>s.kind==='summon'&&s.side==='wild');
 assert.ok(faint>=0&&summon>faint);assert.ok(!scenes.some(s=>s.kind==='attack'&&s.side==='wild'));
 const durationBefore=scenes.slice(0,summon).reduce((n,s)=>n+s.duration,0),initial={player:save.party[0],wild:battle.wild};
 assert.equal(presentationAt(initial,scenes,durationBefore-1).wild.uid,battle.wild.uid);
 assert.equal(presentationAt(initial,scenes,durationBefore).wild.uid,result.battle.wild.uid);
 assert.ok(sceneDuration(scenes)>1700);
});
test('status damage can faint a Nuvo and summon the next healthy teammate',()=>{
 const {save,battle}=setup();save.party[0].hp=1;save.party[0].status='poison';save.party.push(createNuvo('wisplet',10,false));battle.wild.moves=['bloom-3'];battle.wild.pp={'bloom-3':10};
 const result=battleTurn(save,battle,{type:'move',id:save.party[0].moves[0]},()=>.99);
 assert.ok(result.battle.scenes!.some(s=>s.kind==='faint'&&s.side==='player'));
 assert.ok(result.battle.scenes!.some(s=>s.kind==='summon'&&s.nuvo.uid===save.party[1].uid));
});
test('confirmed multiplayer snapshots animate attacks, fainting, and replacements in order',()=>{
 const a=createNuvo('spriglet',12,false),b=createNuvo('cindlet',12,false);
 const before:Raid={id:'qa',code:'TESTTEST',host:'keeper',guardian:'mossbell',status:'active',hp:1000,max_hp:1000,revision:1,log:[],expires_at:'',members:[{user_id:'keeper',name:'QA',player:{palette:0},party:[a,b],active:0,phase:'crew',keeper_hp:10,keeper_max:10,damage:0,claimed:false}]};
 const after=structuredClone(before);after.revision++;after.hp-=40;after.members[0].damage=40;after.members[0].party[0].pp[a.moves[0]]--;after.members[0].party[0].hp=0;after.members[0].active=1;
 const cues=raidCues(before,after),mine=cues.filter(c=>c.actor==='keeper');
 assert.deepEqual(mine.map(c=>c.action),['attack','damaged','faint','summon']);
 assert.equal(mine[0].move,a.moves[0]);assert.equal(mine[2].nuvo?.uid,a.uid);assert.equal(mine[3].nuvo?.uid,b.uid);assert.ok(mine[3].at>=mine[2].at+800);
 assert.ok(cues.some(c=>c.actor==='guardian'&&c.action==='attack'));assert.deepEqual(raidCues(after,after),[]);
 const won=structuredClone(after);won.revision++;won.hp=0;
 assert.ok(raidCues(after,won).some(c=>c.actor==='guardian'&&c.action==='faint'));
});
test('town residents have closed reachable walks, pause at stops, and never enter blocked tiles',()=>{
 for(const region of REGIONS.filter(r=>r.kind==='Town')){
  const residents=buildResidents(region,(x,y,tx,ty)=>findPath(x,y,tx,ty,region),(x,y)=>canWalk(x,y,region));
  assert.ok(residents.length>=8,`${region.id}: ${residents.length} routes`);
  for(const resident of residents){assert.ok(resident.duration>0);assert.deepEqual(resident.segments[0].from,resident.segments.at(-1)!.to);assert.ok(resident.segments.some(s=>!s.moving));
   for(const segment of resident.segments)for(const fraction of [0,.5,.99]){const p=residentAt(resident,segment.start+segment.duration*fraction);assert.ok(canWalk(p.x,p.y,region),`${region.id} ${resident.name} ${p.x},${p.y}`);}
  }
 }
});
