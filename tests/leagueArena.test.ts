import test from 'node:test';
import assert from 'node:assert/strict';
import {canLeagueAct,leagueOutcome,memberVitals,soloLeagueGuardian,vitalityPercent} from '../src/leagueArenaModel';
import {raidCues} from '../src/raidPresentation';
import {createNuvo,maxHp} from '../src/data';
import {LEAGUE_GUARDIANS} from '../src/expansion';
import type {Raid} from '../src/League';
import {newSave} from '../src/game';
import {freshStory,prepareStoryBattle} from '../src/story';
import {STORY_STEPS} from '../src/storyContent';
const room=():Raid=>({id:'room',code:'AURALIS4',host:'you',guardian:'heartwood',status:'active',hp:900,max_hp:900,revision:1,log:[],expires_at:'',members:[{user_id:'you',name:'Rowan',player:{palette:0},party:[createNuvo('spriglet',20,false),createNuvo('bubbfin',20,false)],active:0,phase:'crew',keeper_hp:0,keeper_max:0,claimed:false,damage:0}]});
test('Champions commands prevent duplicate, exhausted, fainted and wrong-phase actions',()=>{
 const r=room(),me=r.members[0],move=me.party[0].moves[0];
 assert.equal(canLeagueAct(r,me,'move',move),true);assert.equal(canLeagueAct(r,me,'move',move,true),false);assert.equal(canLeagueAct(r,me,'move','not-known'),false);
 me.party[0].pp[move]=0;assert.equal(canLeagueAct(r,me,'move',move),false);
 assert.equal(canLeagueAct(r,me,'switch','1'),true);for(const choice of ['0','99','-1','NaN',''])assert.equal(canLeagueAct(r,me,'switch',choice),false);
 me.party[1].hp=0;assert.equal(canLeagueAct(r,me,'switch','1'),false);
 me.phase='choice';assert.equal(canLeagueAct(r,me,'stand'),true);assert.equal(canLeagueAct(r,me,'strike'),false);assert.equal(canLeagueAct(r,me,'withdraw'),true);
 me.phase='keeper';me.keeper_hp=20;assert.equal(canLeagueAct(r,me,'strike'),true);assert.equal(canLeagueAct(r,me,'brace'),true);assert.equal(canLeagueAct(r,me,'switch','1'),false);
 me.phase='out';assert.equal(canLeagueAct(r,me,'strike'),false);r.status='won';me.phase='crew';assert.equal(canLeagueAct(r,me,'withdraw'),false);
});
test('rewards and rescue distinguish a shared victory from a withdrawn keeper',()=>{
 const r=room(),me=r.members[0];assert.equal(leagueOutcome(r,me),null);r.status='won';assert.equal(leagueOutcome(r,me),'victory');me.phase='out';assert.equal(leagueOutcome(r,me),'rescue');r.status='active';assert.equal(leagueOutcome(r,me),'rescue');r.status='lost';me.phase='crew';assert.equal(leagueOutcome(r,me),'rescue');
});
test('keeper health uses courage instead of showing a dead companion as alive',()=>{
 const m=room().members[0];assert.equal(memberVitals(m).max,maxHp(m.party[0]));m.party.forEach(n=>n.hp=0);m.phase='keeper';m.keeper_hp=80;m.keeper_max=140;
 assert.deepEqual([memberVitals(m).hp,memberVitals(m).max,memberVitals(m).keeper],[80,140,true]);assert.equal(m.party[0].hp,0);
 m.phase='out';m.keeper_hp=0;assert.equal(memberVitals(m).keeper,true);assert.equal(memberVitals(m).hp,0);
 assert.equal(vitalityPercent(-5,100),0);assert.equal(vitalityPercent(150,100),100);assert.equal(vitalityPercent(0,0),0);
});
test('switching animates retaliation against the incoming Nuvo, including immediate faint and replacement',()=>{
 const before=room(),after=structuredClone(before);after.revision++;after.members[0].active=1;after.members[0].party[1].hp-=20;
 let cues=raidCues(before,after),mine=cues.filter(c=>c.actor==='you');
 assert.deepEqual(mine.map(c=>c.action),['recall','summon','damaged']);assert.equal(mine[2].nuvo?.uid,after.members[0].party[1].uid);assert.equal(mine[2].damage,20);assert.ok(cues.some(c=>c.actor==='guardian'&&c.action==='attack'));
 after.members[0].party[1].hp=0;after.members[0].active=0;cues=raidCues(before,after);mine=cues.filter(c=>c.actor==='you');
 assert.deepEqual(mine.map(c=>c.action),['recall','summon','damaged','faint','summon']);assert.equal(mine[3].nuvo?.uid,after.members[0].party[1].uid);assert.equal(mine[4].nuvo?.uid,before.members[0].party[0].uid);assert.ok(mine[4].at>=mine[3].at+800);
});
test('keeper attacks and damage have their own confirmed animation cues',()=>{
 const before=room();before.members[0].phase='keeper';before.members[0].party.forEach(n=>n.hp=0);before.members[0].keeper_hp=30;before.members[0].keeper_max=100;
 const after=structuredClone(before);after.revision++;after.hp-=40;after.members[0].damage+=40;after.members[0].keeper_hp=0;after.members[0].phase='out';
 const cues=raidCues(before,after),keeper=cues.filter(c=>c.actor==='you');
 assert.deepEqual(keeper.map(c=>c.action),['attack','damaged','faint']);assert.ok(keeper.every(c=>c.keeper));assert.equal(keeper[1].damage,30);assert.equal(cues.find(c=>c.actor==='guardian'&&c.action==='damaged')!.damage,40);assert.ok(cues.some(c=>c.actor==='guardian'&&c.action==='attack'));assert.equal(before.members[0].keeper_hp,30);
});
test('rejoining finished rooms never summons a defeated guardian or fallen Nuvo',()=>{
 const r=room();r.hp=0;r.status='lost';r.members[0].party.forEach(n=>n.hp=0);r.members[0].phase='out';const cues=raidCues(undefined,r);assert.ok(cues.every(c=>c.action==='faint'));
 const before=room();before.members[0].phase='choice';const after=structuredClone(before);after.revision++;after.members[0].phase='keeper';after.members[0].keeper_hp=100;
 assert.ok(raidCues(before,after).some(c=>c.keeper&&c.action==='summon'));
});
test('every solo story guardian resolves to the same visual trial as its shared room',()=>{
 for(const guardian of LEAGUE_GUARDIANS){const step=STORY_STEPS.find(s=>s.league===guardian.id)!;const save={...newSave({name:'Rowan',palette:0,pronouns:'They'},'spriglet'),region:guardian.region,story:{...freshStory(),chapter:STORY_STEPS.indexOf(step)}};const {battle}=prepareStoryBattle(save,step.id);assert.equal(soloLeagueGuardian(battle),guardian);assert.equal(soloLeagueGuardian({...battle,guardianMaxHp:undefined}),undefined);}
});
