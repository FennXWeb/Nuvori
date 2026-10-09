import test from 'node:test';
import assert from 'node:assert/strict';
import {periodicPixels,terrainBlendAt,type BlendCell,type TerrainSampler} from '../src/terrainBlend';

const grass:BlendCell={surface:0,tile:'ground'},dirt:BlendCell={surface:1,tile:'path'},water:BlendCell={surface:4,tile:'water'};
const amount=(samples:ReturnType<typeof terrainBlendAt>,surface:number)=>samples.reduce((n,s)=>n+(s.cell.surface===surface?s.weight:0),0);
test('periodic materials join exactly on both axes, stay opaque and keep their detailed centers',()=>{
 const size=128,pixels=new Uint8ClampedArray(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;pixels[i]=x*2;pixels[i+1]=y*2;pixels[i+2]=(x*17+y*31)%256;pixels[i+3]=255;}
 const tiled=periodicPixels(pixels,size,size,20);
 for(let t=0;t<size;t++)for(let k=0;k<4;k++){
  assert.equal(tiled[t*size*4+k],tiled[(t*size+size-1)*4+k]);
  assert.equal(tiled[t*4+k],tiled[((size-1)*size+t)*4+k]);
 }
 for(let y=20;y<size-20;y++)for(let x=20;x<size-20;x++)for(let k=0;k<4;k++)assert.equal(tiled[(y*size+x)*4+k],pixels[(y*size+x)*4+k]);
 for(let i=3;i<tiled.length;i+=4)assert.equal(tiled[i],255);
 assert.notEqual(tiled[0],pixels[0],'source pixels are copied, not changed in place');
});
test('path borders blend continuously across tile boundaries and have organic edge variation',()=>{
 const at:TerrainSampler=x=>x<2?grass:dirt;
 for(let y=0;y<160;y+=.7){
  const a=amount(terrainBlendAt(64-.0001,y,at),1),b=amount(terrainBlendAt(64+.0001,y,at),1);
  assert.ok(Math.abs(a-b)<.001);assert.ok(a>.1&&a<.9);
 }
 const edge=Array.from({length:50},(_,y)=>amount(terrainBlendAt(64,y*3,at),1));
 assert.ok(Math.max(...edge)-Math.min(...edge)>.15,'the edge should not remain a ruler-straight line');
 assert.equal(amount(terrainBlendAt(48,48,at),1),0);assert.equal(amount(terrainBlendAt(80,48,at),1),1);
});
test('corners, junctions and shorelines blend all touching materials without gaps or repeat seams',()=>{
 const at:TerrainSampler=(x,y)=>x<2?grass:y<2?dirt:water;
 const corner=terrainBlendAt(64,64,at);assert.equal(new Set(corner.map(s=>s.cell.surface)).size,3);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const samples=terrainBlendAt(x+.5,y+.5,at),total=samples.reduce((sum,s)=>sum+s.weight,0);
  assert.ok(total>.99995&&total<=1.000001);assert.ok(samples.every(s=>s.weight>0&&s.weight<=1));
 }
 for(const boundary of [16,32,48,64,80,96])for(let t=0;t<128;t+=.8)for(const id of [0,1,4]){
  const before=terrainBlendAt(boundary-.00001,t,at),after=terrainBlendAt(boundary+.00001,t,at);
  assert.ok(Math.abs(amount(before,id)-amount(after,id))<.001,'material hardness must not introduce grid lines');
 }
 const plain:TerrainSampler=()=>dirt;
 for(const x of [31.9999,32,32.0001,63.9999,64,64.0001])assert.ok(Math.abs(amount(terrainBlendAt(x,48,plain),1)-1)<.00002);
});
test('bridge decks and stairs retain their full structural footprint instead of bleeding into rivers',()=>{
 const deck:BlendCell={surface:12,tile:'bridge',horizontal:true},steps:BlendCell={surface:13,tile:'steps'};
 const at:TerrainSampler=(x,y)=>y===2?deck:x===1?steps:water;
 assert.deepEqual(terrainBlendAt(95.9,64.1,at),[{cell:deck,weight:1}]);
 assert.deepEqual(terrainBlendAt(32.1,48,at),[{cell:steps,weight:1}]);
 assert.equal(amount(terrainBlendAt(95,63.9,at),12),0);
});
