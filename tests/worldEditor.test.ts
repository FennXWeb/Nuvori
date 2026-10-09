import test from 'node:test';
import assert from 'node:assert/strict';
import published from '../src/content/world.json';
import {REGIONS,REGION_BY_ID,SPECIES_BY_ID} from '../src/data';
import {seedCell,paintLine,flood,inspectWorld,validateWorld} from '../src/editor/model';
import {installWorldDocument,worldDocument,spawnTableAt,weightedSpawn,type WorldDocument} from '../src/worldContent';
import {terrainAt} from '../src/terrain';
import {getMap,canWalk} from '../src/worldLayout';
import {newSave,encounter} from '../src/game';
import {authorizedRequest,verifyPrivateWorkspace,type Runner} from '../scripts/editor-security';

const reset=()=>installWorldDocument({schema:1,cells:{}});
const fresh=()=>({...newSave({name:'Designer',palette:0,pronouns:'They'},'spriglet'),region:'verdant',x:560,y:496});
test('materializing every existing cell preserves valid geometry, exits, services and interiors',()=>{
 reset();const doc:WorldDocument={schema:1,cells:Object.fromEntries(REGIONS.map(r=>[r.id,seedCell(r.id)]))};
 assert.deepEqual(inspectWorld(doc),[]);assert.deepEqual(validateWorld(doc).filter(i=>i.severity==='error'),[]);
});
test('checked-in beta world is independently validated, even when regression fixtures use the base world',()=>{
 assert.deepEqual(validateWorld(published).filter(i=>i.severity==='error'),[]);
});
test('brush interpolation leaves no gaps; flood fill stops at boundaries',()=>{
 const cell=seedCell('mossbell');cell.tiles=cell.tiles.map(r=>r.map(()=> 'ground'));
 paintLine(cell.tiles,[0,20],[71,20],1,'water');assert.ok(cell.tiles[20].every(t=>t==='water'));
 flood(cell.tiles,1,1,'grass');assert.ok(cell.tiles[19].every(t=>t==='grass'));assert.ok(cell.tiles[21].every(t=>t==='ground'));
 paintLine(cell.tiles,[-4,-4],[4,4],5,'path');assert.equal(cell.tiles.length,52);assert.ok(cell.tiles.every(r=>r.length===72));
});
test('authored terrain and relocated objects control actual game collisions and interior layout',()=>{
 reset();const cell=seedCell('mossbell'),old=structuredClone(cell.objects.find(p=>p.interact==='heal')!);
 cell.tiles[15][17]='water';cell.objects.find(p=>p.interact==='heal')!.x=40;
 cell.interiors!.lodge![0].x=12;
 installWorldDocument({schema:1,cells:{mossbell:cell}});
 assert.equal(terrainAt(17,15,REGION_BY_ID.mossbell),'water');assert.equal(canWalk(560,496,REGION_BY_ID.mossbell),false);
 assert.equal(getMap(REGION_BY_ID.mossbell).find(p=>p.interact==='heal')!.x,40);assert.equal(old.x,9);
 assert.equal(getMap(REGION_BY_ID.mossbell,'lodge')[0].x,12);
 reset();assert.notEqual(terrainAt(17,15,REGION_BY_ID.mossbell),'water');assert.equal(getMap(REGION_BY_ID.mossbell).find(p=>p.interact==='heal')!.x,9);
});
test('spawn zones use exact boundaries and last-zone priority with weighted probabilities and level ranges',()=>{
 reset();const c=seedCell('verdant');c.encounters.entries=[{species:'spriglet',weight:100,minLevel:2,maxLevel:2}];
 c.encounters.zones=[{id:'a',name:'Lagoon',x:10,y:10,width:10,height:10,rate:.4,entries:[{species:'bubbfin',weight:90,minLevel:11,maxLevel:11},{species:'cindlet',weight:10,minLevel:16,maxLevel:16}]},{id:'b',name:'Inner grove',x:12,y:12,width:2,height:2,rate:.1,entries:[{species:'spriglet',weight:1,minLevel:24,maxLevel:24}]}];
 installWorldDocument({schema:1,cells:{verdant:c}});
 assert.equal(spawnTableAt('verdant',10,10)!.rate,.4);assert.equal(spawnTableAt('verdant',20,19)!.rate,.22);assert.equal(spawnTableAt('verdant',13.99,13.99)!.rate,.1);assert.equal(spawnTableAt('verdant',14,14)!.rate,.4);
 const table=c.encounters.zones[0].entries;assert.equal(weightedSpawn(table,.8999)!.species,'bubbfin');assert.equal(weightedSpawn(table,.9)!.species,'cindlet');assert.equal(weightedSpawn([],0),undefined);
 const b=encounter({...fresh(),x:13*32,y:13*32},()=>.5);assert.equal(b.wild.speciesId,'spriglet');assert.equal(b.wild.level,24);
 c.encounters.enabled=false;assert.throws(()=>encounter(fresh()),/Wild Nuvo/);reset();
});
test('editor can author town habitats while preserving exclusive Nuvo restrictions',()=>{
 reset();const cell=seedCell('mossbell');cell.encounters.enabled=true;cell.tiles[16][17]='grass';cell.encounters.entries=[{species:'bubbfin',weight:1,minLevel:5,maxLevel:5}];
 installWorldDocument({schema:1,cells:{mossbell:cell}});
 const s={...fresh(),region:'mossbell'},b=encounter(s,()=>.5);assert.equal(b.wild.speciesId,'bubbfin');assert.equal(b.wild.level,5);
 reset();for(const species of ['dreamweaver','oneirune','solunelle']){cell.encounters.entries[0].species=species;assert.ok(inspectWorld({schema:1,cells:{mossbell:cell}}).length>0);}
});
test('validation rejects malformed imports and blocked exits without mutating the active document',()=>{
 reset();const before=worldDocument(),c=seedCell('verdant');
 c.tiles[15][17]='water';assert.ok(validateWorld({schema:1,cells:{verdant:c}}).some(i=>i.message.includes('arrival point')));assert.equal(worldDocument(),before);
 const invalid:any={schema:1,cells:{verdant:seedCell('verdant')}};invalid.cells.verdant.encounters.entries[0].weight=NaN;assert.ok(inspectWorld(invalid).length);
 invalid.cells.verdant=seedCell('verdant');invalid.cells.verdant.objects[0].x=100;assert.ok(inspectWorld(invalid).length);
 invalid.cells.verdant=seedCell('verdant');invalid.cells.verdant.tiles[0].pop();assert.ok(inspectWorld(invalid).length);
 assert.ok(inspectWorld({schema:2,cells:{}}).length);assert.ok(inspectWorld({schema:1,cells:{bad:{}}}).length);
});
test('editor API rejects missing capabilities, foreign origins, DNS rebinding, and remote clients',()=>{
 const key='a'.repeat(64),headers={host:'127.0.0.1:5187','x-nuvori-editor-key':key,origin:'http://127.0.0.1:5187'};
 assert.equal(authorizedRequest(headers,'127.0.0.1',key,5187),true);
 for(const patch of [{'x-nuvori-editor-key':''},{origin:'https://evil.example'},{host:'evil.example:5187'},{'x-nuvori-editor-key':'b'.repeat(64)}])assert.equal(authorizedRequest({...headers,...patch},'127.0.0.1',key,5187),false);
 assert.equal(authorizedRequest(headers,'192.168.1.2',key,5187),false);
});
test('studio publication requires the owner, private repository, and testing branch on the server',async()=>{
 const answers=['codex/testing','https://github.com/FennXWeb/Nuvori-Testing.git','FennXWeb',JSON.stringify({visibility:'PRIVATE',nameWithOwner:'FennXWeb/Nuvori-Testing'})];
 const runner=(values:string[]):Runner=>async()=>values.shift()!;
 await verifyPrivateWorkspace(runner([...answers]));
 for(const [i,bad] of [[0,'main'],[1,'https://github.com/FennXWeb/Nuvori.git'],[2,'another-user'],[3,JSON.stringify({visibility:'PUBLIC',nameWithOwner:'FennXWeb/Nuvori-Testing'})]] as const){const values=[...answers];values[i]=bad;await assert.rejects(verifyPrivateWorkspace(runner(values)));}
});
