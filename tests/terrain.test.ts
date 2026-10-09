import test from "node:test";
import assert from "node:assert/strict";
import {BASE_SPECIES,SPECIES,REGIONS,REGION_BY_ID,wildHabitats} from "../src/data";
import {getTerrain,terrainAt,terrainBlocked,encounterTile,WORLD_COLUMNS,WORLD_ROWS} from "../src/terrain";
import {getMap,canWalk,findPath,safeWorldPosition} from "../src/World";
import {encounter,newSave,validateSave} from "../src/game";
import {TRAINERS} from "../src/expansion";

const fresh=()=>newSave({name:"Trail keeper",palette:0,pronouns:"They"},"spriglet");
function reachable(region:typeof REGIONS[number]){
 const props=getMap(region),seen=new Set<string>(["17,15"]),queue:[[number,number],...[number,number][]]=[[17,15]];
 for(let head=0;head<queue.length;head++){const [x,y]=queue[head];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,key=`${xx},${yy}`;if(!seen.has(key)&&canWalk(xx*32+16,yy*32+16,region,props)){seen.add(key);queue.push([xx,yy]);}}}
 return seen;
}
test("every original family has multiple genuine wild habitats and accurate guide text",()=>{
 for(const base of BASE_SPECIES){const habitats=wildHabitats(base.id);assert.ok(habitats.length>=2,base.name);assert.ok(habitats.every(r=>r.kind!=="Town"&&!r.hidden));assert.equal(base.habitat,habitats.map(r=>r.name).join(" · "));for(const s of SPECIES.filter(s=>s.base===base.id))assert.equal(s.habitat,base.habitat);}
 for(const r of REGIONS.filter(r=>r.kind!=="Town"&&!r.hidden))for(let i=0;i<r.pool.length;i++){
  const rolls=[(i+.5)/r.pool.length,.5,.99,.5,.99];const b=encounter({...fresh(),region:r.id},()=>rolls.shift()??.5);assert.equal(b.wild.speciesId,BASE_SPECIES[r.pool[i]].id,`${r.id}:${i}`);
 }
 assert.throws(()=>encounter(fresh()),/towns/);assert.throws(()=>encounter({...fresh(),region:"verdant",interior:"lodge"}),/towns/);
 assert.ok(REGIONS.every(r=>r.pool.every(i=>i>=0&&i<25))); // Dream mythicals and pass-exclusive Solunelle keep their special rules.
});
test("all new and existing regions have reachable exits, trainers, landmarks and encounter terrain",()=>{
 assert.equal(REGIONS.filter(r=>!r.hidden).length,20);
 const reverse={north:"south",south:"north",east:"west",west:"east"} as const;
 for(const r of REGIONS){const reached=reachable(r),terrain=getTerrain(r);assert.equal(terrain.tiles.length,WORLD_ROWS);assert.ok(terrain.tiles.every(row=>row.length===WORLD_COLUMNS));
  for(const [side,id] of Object.entries(r.links)){assert.equal(REGION_BY_ID[id!].links[reverse[side as keyof typeof reverse]],r.id);const [x,y]=side==="north"?[18,1]:side==="south"?[18,50]:side==="west"?[1,13]:[70,13];assert.ok(reached.has(`${x},${y}`),`${r.id} ${side}`);}
  const trainer=TRAINERS.find(t=>t.region===r.id);if(trainer){assert.ok(trainer.name);assert.ok(reached.has(`${Math.floor(trainer.x)},${Math.floor(trainer.y)}`),`${r.id} trainer`);}
  const [lx,ly]=r.landmarkPosition??[18,7];assert.ok([...reached].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x+.5-lx,y+.5-ly)<2.5;}),`${r.id} landmark`);
  const habitat=[...reached].filter(k=>{const [x,y]=k.split(',').map(Number);return encounterTile(terrainAt(x+.5,y+.5,r));});
  assert.ok(r.kind==="Town"?habitat.length===0:habitat.length>60,`${r.id} reachable habitat: ${habitat.length}`);
  if(r.kind!=="Town")for(const [x,y] of [[17,13],[18,20]])assert.equal(encounterTile(terrainAt(x+.5,y+.5,r)),false);
 }
});
test("rivers, caves and mazes use real collision geometry and safe connected crossings",()=>{
 for(const id of ["brookbend","verdant","tideglass","lanternlake","mirelight","echohollow","glassvein","rimewind"]){const r=REGION_BY_ID[id],terrain=getTerrain(r),reached=reachable(r);let bridges=0,water=0;
  for(let y=1;y<WORLD_ROWS-1;y++)for(let x=1;x<WORLD_COLUMNS-1;x++){const tile=terrain.tiles[y][x];if(tile==="water"){water++;assert.equal(canWalk(x*32+16,y*32+16,r),false);}if(tile==="bridge"){bridges++;assert.ok(reached.has(`${x},${y}`),`${id} bridge ${x},${y}`);assert.equal(encounterTile(tile),false);}}
  assert.ok(bridges>4&&water>30,id);
 }
 const maze=REGION_BY_ID.bramble;assert.equal(terrainAt(39,32,maze),"hedge");assert.ok(terrainBlocked(terrainAt(39,32,maze)));assert.equal(canWalk(39*32+16,32*32+16,maze),false);
 assert.ok(findPath(36*32+16,25*32+16,64*32+16,42*32+16,maze).length>60);
 for(const id of ["echohollow","glassvein"]){const t=getTerrain(REGION_BY_ID[id]);assert.ok(t.underground);assert.ok(t.tiles.flat().filter(x=>x==="cliff").length>1700);assert.ok(t.tiles.flat().some(x=>x==="rubble"));}
});
test("old saves on newly blocked terrain are relocated onto reachable ground without altering the collection",()=>{
 const r=REGION_BY_ID.verdant,s={...fresh(),region:r.id,x:39*32+16,y:6*32+16};assert.equal(canWalk(s.x,s.y,r),false);
 const [x,y]=safeWorldPosition(s.x,s.y,r);assert.ok(canWalk(x,y,r));assert.ok(findPath(560,496,x,y,r).length);assert.ok(validateSave({...s,x,y}));assert.deepEqual(safeWorldPosition(560,496,r),[560,496]);
});
