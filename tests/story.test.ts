import test from 'node:test';
import assert from 'node:assert/strict';
import {newSave,battleTurn,validateSave,useMove,type Save,type Battle} from '../src/game';
import {REGION_BY_ID,SPECIES_BY_ID,createNuvo,maxHp,MOVE_BY_ID} from '../src/data';
import {LEAGUE_GUARDIANS} from '../src/expansion';
import {STORY_STEPS,STORY_COSMETICS,HALL_WARDENS} from '../src/storyContent';
import {currentChapter,freshStory,storyProgress,finishStoryConversation,prepareStoryBattle,storyBattleResult,hallUnlocked,hallAttemptActive,recoverStory,leaveStoryRegion,storyTravelReason,tutorialEncounter,nextStoryRoute,equipStoryCosmetic} from '../src/story';
import {fastTravel,travelReason} from '../src/travel';
import {getMap,findPath,safeWorldPosition,canWalk} from '../src/worldLayout';
import {getTerrain,encounterTile} from '../src/terrain';
import {normalizeSave} from '../src/nursery';
import {DEFAULT_APPEARANCE,validAppearance} from '../src/appearance';
const fresh=()=>newSave({name:'Rowan',palette:0,pronouns:'They / them'},'spriglet');
const at=(id:string):Save=>{const index=STORY_STEPS.findIndex(s=>s.id===id);assert.ok(index>=0);return {...fresh(),story:{...freshStory(),chapter:index},region:STORY_STEPS[index].region};};
test('campaign has valid content, three recurring rivals, all five Leagues, and unlockable finale',()=>{
 assert.equal(new Set(STORY_STEPS.map(s=>s.id)).size,STORY_STEPS.length);
 assert.deepEqual(STORY_STEPS.filter(s=>s.kind==='league').map(s=>s.league),LEAGUE_GUARDIANS.map(g=>g.id));
 for(const rival of ['ari','nox','vesper'])assert.equal(STORY_STEPS.filter(s=>s.kind==='rival'&&s.person===rival).length,3);
 assert.equal(HALL_WARDENS.length,5);assert.equal(STORY_STEPS.at(-1)!.id,'coronation');
 for(const step of STORY_STEPS){assert.ok(REGION_BY_ID[step.region],step.id);assert.ok(step.lines.length>=2);for(const species of step.team??[])assert.ok(SPECIES_BY_ID[species],species);const spot=safeWorldPosition(18.6*32,17*32,REGION_BY_ID[step.region]);assert.ok(canWalk(...spot,REGION_BY_ID[step.region]));assert.ok(findPath(560,496,...spot,REGION_BY_ID[step.region]).length,step.id);}
 for(const w of HALL_WARDENS)for(const id of w.team)assert.ok(SPECIES_BY_ID[id]);
 assert.equal(STORY_STEPS.filter(s=>s.cosmetic).length,5);
});
test('registration is saved once; old keepers keep their crews and can begin the story',()=>{
 const old=fresh();delete old.story;assert.ok(validateSave(old));const next=finishStoryConversation(old,'register');
 assert.equal(currentChapter(next)?.id,'grass-lesson');assert.deepEqual(next.party,old.party);assert.ok(next.cosmetics?.includes('story-thread'));
 assert.equal(finishStoryConversation(next,'register'),next);assert.equal(finishStoryConversation({...old,region:'verdant'},'register').story,undefined);
 assert.throws(()=>prepareStoryBattle(old,'ari-first'),/not available/);
 assert.ok(validateSave(next));assert.deepEqual(nextStoryRoute(next),['verdant']);
});
test('first catch uses an actual wild battle; failed, fled, gifted, and trainer encounters do not satisfy it',()=>{
 let s=at('first-catch'),b=tutorialEncounter(s)!;assert.ok(b.tutorial);assert.equal(b.wild.level,3);
 assert.equal(storyBattleResult(s,{...b,over:'fled'}),s);assert.equal(storyBattleResult(s,{...b,over:'won'}),s);assert.equal(storyBattleResult(s,{...b,over:'caught',trainerId:'test'}),s);
 assert.equal(tutorialEncounter({...s,region:'mossbell'}),undefined);assert.equal(tutorialEncounter(fresh()),undefined);
 b.wild.hp=Math.floor(maxHp(b.wild)/2);const count=s.party.length,orbs=s.orbs;
 const caught=battleTurn(s,b,{type:'catch'},()=>.999);assert.equal(caught.battle.over,'caught');assert.equal(caught.save.party.length,count+1);assert.equal(caught.save.orbs,orbs-1);assert.equal(currentChapter(caught.save)?.id,'ari-first');assert.ok(caught.save.caughtForms?.includes(b.wild.speciesId));assert.ok(validateSave(caught.save));
 assert.equal(storyBattleResult(caught.save,caught.battle),caught.save);
});
test('real rival wins advance exactly once; defeats leave the checkpoint available',()=>{
 let s=at('ari-first');s.party=[createNuvo('cindlet-3',50,false)];const {battle:b}=prepareStoryBattle(s,'ari-first');
 assert.ok(battleTurn(s,b,{type:'catch'}).error);assert.ok(battleTurn(s,b,{type:'run'}).error);
 assert.equal(storyBattleResult(s,{...b,over:'lost'}),s);
 b.wild.hp=1;const result=battleTurn(s,b,{type:'move',id:s.party[0].moves.find(id=>MOVE_BY_ID[id].power>0)!},()=>0);
 assert.equal(result.battle.over,'won');assert.equal(currentChapter(result.save)?.id,'brookbond');assert.equal(storyBattleResult(result.save,result.battle),result.save);assert.ok(validateSave(result.save));
});
test('solo guardians award the same crests, preserve named forms, and keep boss HP out of saves',()=>{
 for(const step of STORY_STEPS.filter(c=>c.kind==='league')){
  const s=at(step.id),g=LEAGUE_GUARDIANS.find(g=>g.id===step.league)!,{battle:b}=prepareStoryBattle(s,step.id);
  assert.equal(b.wild.speciesId,g.species);assert.equal(b.wild.level,g.level);assert.ok(b.guardianMaxHp!>maxHp(b.wild));assert.equal(b.wild.hp,b.guardianMaxHp);assert.equal(b.opponentQueue?.length,0);
  const next=storyBattleResult(s,{...b,over:'won'});assert.ok(next.leagueBadges?.includes(g.id));assert.ok(validateSave(next));assert.equal(next.party[0].hp,s.party[0].hp);
  const online={...s,leagueBadges:[g.id]};assert.equal(storyProgress(finishStoryConversation(online,step.id)).chapter,storyProgress(s).chapter+1);
 }
 const healer=createNuvo('spriglet',18,false);healer.moves=['bloom-5'];healer.pp={'bloom-5':10};healer.hp=maxHp(healer)+20;
 const result=useMove(healer,createNuvo('cindlet',5,false),'bloom-5',()=>0,maxHp(healer)*2);assert.ok(result.attacker.hp>=healer.hp);assert.ok(result.attacker.hp<=maxHp(healer)*2);
});
test('Hall is truly gated until the oath and all five crests; paths and fast travel enforce the lock',()=>{
 const before=at('hall-unsealed');assert.ok(storyTravelReason(before,'hall'));assert.equal(finishStoryConversation(before,'hall-unsealed'),before);assert.equal(hallUnlocked(before),false);
 const s=finishStoryConversation({...before,leagueBadges:LEAGUE_GUARDIANS.map(g=>g.id)},'hall-unsealed');assert.ok(hallUnlocked(s));assert.equal(currentChapter(s)?.kind,'hall');assert.equal(storyTravelReason(s,'hall'),'');assert.deepEqual(nextStoryRoute(s),['hall']);
 const locked={...fresh(),coins:5000,visited:['mossbell','hall']};assert.match(travelReason(locked,'hall'),/sealed/);assert.throws(()=>fastTravel(locked,'hall'),/sealed/);
 const travelled=fastTravel({...s,coins:5000,visited:[...s.visited,'hall']},'hall');assert.equal(travelled.region,'hall');
 assert.ok(findPath(560,496,576,1592,REGION_BY_ID.hall).length);assert.ok(getMap(REGION_BY_ID.hall).some(p=>p.interact==='landmark'));assert.equal(getTerrain(REGION_BY_ID.hall).tiles.flat().some(encounterTile),false);
});
test('Hall endurance carries damage, resets on loss, leaving or interrupted battle, and safely resumes between battles',()=>{
 let s=at('hall-endurance');s.party[0].hp=7;
 let challenge=prepareStoryBattle(s,'hall-endurance');assert.ok(hallAttemptActive(challenge.save));assert.equal(challenge.save.party[0].hp,7);
 assert.throws(()=>prepareStoryBattle(challenge.save,'hall-endurance'),/Finish/);
 s=storyBattleResult(challenge.save,{...challenge.battle,over:'won'});assert.equal(s.story?.hallWins,1);assert.equal(s.party[0].hp,7);assert.equal(s.story?.hallInFlight,false);assert.equal(recoverStory(s),s);
 assert.equal(storyBattleResult(s,{...challenge.battle,over:'won'}),s);assert.ok(validateSave(s));
 assert.equal(leaveStoryRegion(s,'crownspire').story?.hallWins,0);assert.equal(leaveStoryRegion(s,'hall'),s);
 challenge=prepareStoryBattle(s,'hall-endurance');assert.equal(recoverStory(challenge.save).story?.hallWins,0);assert.equal(recoverStory(challenge.save).story?.hallInFlight,false);
 const defeated=storyBattleResult(challenge.save,{...challenge.battle,over:'lost'});assert.equal(defeated.story?.hallWins,0);assert.equal(currentChapter(defeated)?.id,'hall-endurance');
 const fallen={...challenge.save,party:challenge.save.party.map(n=>({...n,hp:0}))};const rescued=battleTurn(fallen,{...challenge.battle,lastStand:'choice'},{type:'retreat'});assert.equal(rescued.save.story?.hallWins,0);assert.equal(rescued.save.story?.hallInFlight,false);assert.equal(rescued.save.interior,'lodge');
 for(let i=1;i<5;i++){const c=prepareStoryBattle(s,'hall-endurance');assert.equal(c.battle.trainerId,`story:hall-endurance:${i}`);s=storyBattleResult(c.save,{...c.battle,over:'won'});assert.equal(s.party[0].hp,7);assert.ok(validateSave(s));}
 assert.equal(currentChapter(s)?.id,'coronation');assert.equal(hallAttemptActive(s),false);
 const crowned=finishStoryConversation(s,'coronation');assert.equal(currentChapter(crowned),undefined);assert.ok(crowned.story?.completedAt);assert.ok(crowned.cosmetics?.includes('story-champion'));assert.equal(finishStoryConversation(crowned,'coronation'),crowned);
});
test('cosmetics are permanent, bounded, equippable only after earning, and survive normalization',()=>{
 let s=fresh();assert.equal(equipStoryCosmetic(s,5),s);assert.equal(validAppearance({...DEFAULT_APPEARANCE,adornment:6}),false);assert.equal(validAppearance({...DEFAULT_APPEARANCE,adornment:-1}),false);
 s={...s,cosmetics:STORY_COSMETICS.map(c=>c.id)};for(let i=0;i<=5;i++){const equipped=equipStoryCosmetic(s,i);assert.equal(equipped.player.appearance?.adornment,i);assert.ok(validateSave(equipped));assert.deepEqual(normalizeSave(equipped).player.appearance,equipped.player.appearance);}
 for(const patch of [{chapter:-1},{chapter:999},{hallWins:5},{hallWins:1},{hallInFlight:true},{completedAt:'invalid'}])assert.equal(validateSave({...s,story:{...freshStory(),...patch}}),false);
});
test('every chapter can be completed in order without resetting an established collection',()=>{
 let s=fresh();const uid=s.party[0].uid;
 for(const step of STORY_STEPS){assert.equal(currentChapter(s)?.id,step.id);s={...s,region:step.region,interior:undefined};
  if(step.kind==='talk')s=finishStoryConversation(s,step.id);
  else if(step.kind==='catch'){const b=tutorialEncounter(s)!;b.wild.hp=1;s=battleTurn(s,b,{type:'catch'},()=>0).save;}
  else if(step.kind==='hall'){for(let i=0;i<5;i++){const c=prepareStoryBattle(s,step.id);s=storyBattleResult(c.save,{...c.battle,over:'won'});}}
  else{const c=prepareStoryBattle(s,step.id);s=storyBattleResult(c.save,{...c.battle,over:'won'});}
  assert.ok(validateSave(s),step.id);assert.equal(s.party[0].uid,uid);
 }
 assert.equal(s.story?.chapter,STORY_STEPS.length);assert.deepEqual(s.leagueBadges,LEAGUE_GUARDIANS.map(g=>g.id));assert.equal(s.cosmetics?.length,5);
});
