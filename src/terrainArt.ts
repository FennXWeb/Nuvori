import type {Region} from "./data";
import {getTerrain,terrainAt,terrainNoise,isUnderground,WORLD_COLUMNS,WORLD_ROWS,type TerrainTile} from "./terrain";
import {drawArt,paintSurface,surfaceTile} from "./illustratedArt";
import {terrainBlendAt,type BlendCell} from './terrainBlend';

export function terrainSurface(r:Region,tile:TerrainTile){
 const cave=isUnderground(r),snow=r.id==='rimewind'||r.id==='frostmere';
 if(tile==='water')return cave?5:4;
 if(tile==='bridge')return cave?2:12;
 if(tile==='cliff')return 11;
 if(tile==='hedge')return 10;
 if(tile==='steps')return 13;
 if(tile==='rubble')return 9;
 if(tile==='cave')return 8;
 if(tile==='path')return cave?8:r.kind==='Town'?2:1;
 if(cave)return 8;
 if(snow)return 6;
 if(r.biome==='desert'||r.id==='emberfall')return 7;
 if(r.biome==='dream'||r.id==='starfall')return 14;
 return 0;
}
type Texture={data:Uint8ClampedArray;width:number;height:number};
const textures=new Map<string,Texture>();
function texture(index:number){
 const key=String(index);if(textures.has(key))return textures.get(key)!;
 const tile=surfaceTile(index,[2,12,13].includes(index)?64:128);if(!tile)return;
 const pixels=tile.getContext('2d')!.getImageData(0,0,tile.width,tile.height);
 const result={data:pixels.data,width:tile.width,height:tile.height};textures.set(key,result);return result;
}
interface GroundLayer {canvas:HTMLCanvasElement;c:CanvasRenderingContext2D;painted:Uint8Array;cells:BlendCell[][];patch:ImageData}
// Retain at most two regions, with tiles composed once as they enter the viewport.
const layers=new Map<string,GroundLayer>();
function layer(r:Region){
 const existing=layers.get(r.id);if(existing){layers.delete(r.id);layers.set(r.id,existing);return existing;}
 const canvas=document.createElement('canvas');canvas.width=WORLD_COLUMNS*32;canvas.height=WORLD_ROWS*32;
 const c=canvas.getContext('2d')!,geometry=getTerrain(r);
 const entry:GroundLayer={canvas,c,painted:new Uint8Array(WORLD_COLUMNS*WORLD_ROWS),patch:c.createImageData(32,32),cells:geometry.tiles.map((row,y)=>row.map((tile,x)=>({tile,surface:terrainSurface(r,tile),horizontal:geometry.bridgeAxes.get(x+','+y)??true})))};
 layers.set(r.id,entry);if(layers.size>2)layers.delete(layers.keys().next().value!);return entry;
}
const outside:BlendCell={surface:11,tile:'cliff'};
function composeCell(entry:GroundLayer,gx:number,gy:number,r:Region){
 const at=(x:number,y:number)=>entry.cells[y]?.[x]??outside;
 const center=at(gx,gy),needed=new Set<number>();
 for(let y=gy-1;y<=gy+1;y++)for(let x=gx-1;x<=gx+1;x++)needed.add(at(x,y).surface);
 const materials=new Map<number,Texture>();for(const index of needed){const image=texture(index);if(!image)return false;materials.set(index,image);}
 const pixels=entry.patch.data;
 const tint=r.biome==='marsh'?[97,122,104,.38]:r.biome==='storm'?[119,134,157,.44]:[137,169,109,.2];
 // Same materials need no per-pixel mask; preserve their detail and world-space phase.
 const plain=needed.size===1||center.tile==='bridge'||center.tile==='steps';
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  const wx=gx*32+x,wy=gy*32+y,i=(y*32+x)*4;
  const samples=plain?[{cell:center,weight:1}]:terrainBlendAt(wx+.5,wy+.5,at);
  let red=0,green=0,blue=0,water=0,wall=0;
  for(const {cell,weight} of samples){
   const material=materials.get(cell.surface)!;
   const sx=cell.tile==='bridge'&&cell.horizontal?wy:wx,sy=cell.tile==='bridge'&&cell.horizontal?-wx:wy;
   const px=((sx%material.width)+material.width)%material.width,py=((sy%material.height)+material.height)%material.height,j=(py*material.width+px)*4;
   let rr=material.data[j],gg=material.data[j+1],bb=material.data[j+2];
   if(cell.surface===0){rr=rr*(1-tint[3])+tint[0]*tint[3];gg=gg*(1-tint[3])+tint[1]*tint[3];bb=bb*(1-tint[3])+tint[2]*tint[3];}
   if(cell.tile==='cliff'&&isUnderground(r)){rr*=.65;gg*=.7;bb*=.79;}
   if(cell.tile==='cliff'||cell.tile==='hedge')wall+=weight;
   red+=rr*weight;green+=gg*weight;blue+=bb*weight;if(cell.tile==='water')water+=weight;
  }
  // A sandy/stone wash follows the curved bank, rather than a rectangular foam border.
  const rim=water>0&&water<1?4*water*(1-water)*.22:0,bank=isUnderground(r)?[155,177,181]:[202,211,166];
  const contact=1-wall*(1-wall)*.5;
  pixels[i]=(red*(1-rim)+bank[0]*rim)*contact;pixels[i+1]=(green*(1-rim)+bank[1]*rim)*contact;pixels[i+2]=(blue*(1-rim)+bank[2]*rim)*contact;pixels[i+3]=255;
 }
 entry.c.putImageData(entry.patch,gx*32,gy*32);entry.painted[gy*WORLD_COLUMNS+gx]=1;return true;
}
/** Cache the blended material field; draw ripples and structural rails above it. */
export function drawTerrainTile(c:CanvasRenderingContext2D,gx:number,gy:number,r:Region,t:number,tile:TerrainTile):boolean{
 const x=gx*32,y=gy*32,cave=isUnderground(r),n=terrainNoise(gx,gy);
 const index=terrainSurface(r,tile);
 c.save();
 c.fillStyle=index===4?'#418c9b':cave?'#414956':'#8aa974';c.fillRect(x,y,33,33);
 const ground=layer(r);
 if(ground.painted[gy*WORLD_COLUMNS+gx]||composeCell(ground,gx,gy,r))c.drawImage(ground.canvas,x,y,32,32,x,y,32,32);
 else paintSurface(c,index,x,y,32,32,tile==='bridge'||index===2?64:128);
 if(tile==='water'){
  if(n>.63){c.globalAlpha=.06+.045*Math.sin(t*1.3+n*8);c.strokeStyle='#d3edf0';c.lineWidth=.8;c.beginPath();c.ellipse(x+16+Math.sin(t*.5+n*5)*2,y+13+n*6,6+n*4,1+n,0,Math.PI*.12,Math.PI*.95);c.stroke();c.globalAlpha=1;}
 }else if(tile==='bridge'){
  const horizontal=getTerrain(r).bridgeAxes.get(gx+','+gy)??true;
  for(const side of [-1,1])if(terrainAt(gx+(horizontal?0:side),gy+(horizontal?side:0),r)!=='bridge'){
   c.fillStyle='#4c3529';if(horizontal)c.fillRect(x,y+(side<0?0:29),33,3);else c.fillRect(x+(side<0?0:29),y,3,33);
   c.fillStyle='#ddbc84';if(horizontal)c.fillRect(x+7,y+(side<0?0:28),4,4);else c.fillRect(x+(side<0?0:28),y+7,4,4);
  }
 }
 c.restore();return true;
}
export function drawCaveMouth(c:CanvasRenderingContext2D,x:number,y:number,_name:string){drawArt(c,'illustrated-decor.png',13,x,y+30,125,115);}
