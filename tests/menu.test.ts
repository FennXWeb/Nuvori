import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {newSave,validateSave} from '../src/game';
import {menuProgress,RELEASES} from '../src/menuModel';
import {SEASON,awardPassXp,claimPassReward} from '../src/season';
import {measureWorldArt} from '../scripts/measure-world-art';
import atlas from '../src/menuRewardFrames.json';

const fresh=()=>newSave({name:'Menu keeper',palette:2,pronouns:'They / them'},'spriglet');
test('lobby previews start empty and never create an adventure or earned rewards',()=>{
 const preview=menuProgress(null,SEASON.starts);
 assert.equal(preview.tier,0);assert.equal(preview.available,0);assert.equal(preview.progress.xp,0);
 assert.equal(preview.wheelClaimed,false);assert.equal(preview.resetLabel,'24:00:00');
 assert.equal(preview.active,true);assert.equal(menuProgress(null,SEASON.starts-1).active,false);
 assert.equal(menuProgress(null,SEASON.ends).active,false);assert.equal(menuProgress(null,SEASON.ends).daysLeft,0);
});
test('lobby reward counts follow real claims and keep earned rewards claimable after season close',()=>{
 const original=awardPassXp(fresh(),30000,SEASON.starts),before=JSON.stringify(original);
 assert.equal(menuProgress(original).available,100);assert.equal(JSON.stringify(original),before);
 let claimed=claimPassReward(original,100);claimed=claimPassReward(claimed,20);claimed=claimPassReward(claimed,1);
 const progress=menuProgress(claimed,SEASON.ends+86400000);
 assert.equal(progress.tier,100);assert.equal(progress.available,97);assert.equal(progress.active,false);
 assert.equal(claimed.party.filter(n=>n.speciesId==='solunelle').length,1);assert.ok(validateSave(claimed));
 assert.equal(menuProgress(fresh()).available,0,'switching adventures does not retain the prior account badge');
});
test('daily wheel countdown crosses UTC midnight and preserves a claimed future-day lock',()=>{
 const now=Date.UTC(2026,9,9,23,59,59),save={...fresh(),dailySpinDay:'2026-10-09'};
 assert.equal(menuProgress(save,now).wheelClaimed,true);assert.equal(menuProgress(save,now).resetLabel,'00:00:01');
 assert.equal(menuProgress(save,now+1000).wheelClaimed,false);assert.equal(menuProgress(save,now+1000).resetLabel,'24:00:00');
 assert.equal(menuProgress({...save,dailySpinDay:'2026-10-11'},now).wheelClaimed,true);
});
test('reward atlas has complete measured sprites and Solunelle has true transparent alpha',()=>{
 const measured=measureWorldArt(readFileSync(new URL('../public/assets/menu-rewards.png',import.meta.url)),3,3);
 assert.deepEqual(measured,atlas);assert.equal(measured.frames.length,9);
 const art=PNG.sync.read(readFileSync(new URL('../public/assets/menu-solunelle.png',import.meta.url)));
 let empty=0,solid=0;for(let i=3;i<art.data.length;i+=4){if(art.data[i]<16)empty++;if(art.data[i]>240)solid++;}
 assert.ok(empty>art.width*art.height*.3);assert.ok(solid>art.width*art.height*.2);
});
test('in-game latest release matches the packaged version and documented release notes',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(RELEASES[0].version,pkg.version);
 const notes=readFileSync(new URL('../docs/RELEASE-NOTES.md',import.meta.url),'utf8');
 for(const release of RELEASES)assert.ok(notes.includes(`## ${release.version} ·`));
});
