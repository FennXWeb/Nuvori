import {BASE_SPECIES,REGIONS,REGION_BY_ID,SPECIES_BY_ID} from '../data';
import {getTerrain,terrainBlocked,encounterTile,WORLD_COLUMNS as W,WORLD_ROWS as H,type TerrainTile} from '../terrain';
import {getMap,canWalk} from '../worldLayout';
import {worldDocument,installWorldDocument,type WorldDocument,type AuthoredCell,type WorldObject} from '../worldContent';
import type {Interior} from '../adventure';
import {TRAINERS} from '../expansion';

export const MATERIALS:TerrainTile[]=['ground','path','grass','water','bridge','cliff','hedge','cave','rubble','steps'];
export const ROOMS:Interior[]=['lodge','shop','nursery','tailor','barber'];
export const OBJECT_KINDS=[-2,-1,...Array.from({length:16},(_,i)=>i),...Array.from({length:7},(_,i)=>20+i),30,31,32,33,40,41,42,...Array.from({length:8},(_,i)=>50+i),...Array.from({length:12},(_,i)=>60+i)];
const interactions=['nursery','breeder','professor','heal','shop','landmark','sign','nurse','merchant','exit','tailor','barber','stylist','clothier','league'];
export function seedCell(id:string):AuthoredCell {
 const r=REGION_BY_ID[id],t=getTerrain(r);
 const entries=r.pool.map(i=>({species:BASE_SPECIES[i].id,weight:100,minLevel:r.level[0],maxLevel:r.level[1]}));
 if(id==='dreamland'){
  for(const entry of entries)entry.weight=80/entries.length;
  entries.push({species:'dreamweaver',weight:8,minLevel:30,maxLevel:35},{species:'oneirune',weight:12,minLevel:30,maxLevel:35});
 }
 return structuredClone({tiles:t.tiles,features:t.features,objects:getMap(r).map((p,i)=>({...p,id:`${id}-${i}`})),
  interiors:Object.fromEntries(ROOMS.map(room=>[room,getMap(r,room).map((p,i)=>({...p,id:`${id}-${room}-${i}`}))])),
  encounters:{enabled:r.kind!=='Town',rate:.22,entries,zones:[]}});
}
export function paint(tiles:TerrainTile[][],x:number,y:number,size:number,material:TerrainTile){
 const radius=(size-1)/2;
 for(let yy=Math.floor(y-radius);yy<=Math.ceil(y+radius);yy++)for(let xx=Math.floor(x-radius);xx<=Math.ceil(x+radius);xx++)
  if(yy>=0&&yy<H&&xx>=0&&xx<W&&Math.hypot(xx-x,yy-y)<=radius+.5)tiles[yy][xx]=material;
}
export function paintLine(tiles:TerrainTile[][],a:[number,number],b:[number,number],size:number,material:TerrainTile){
 const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));
 for(let i=0;i<=count;i++)paint(tiles,Math.round(a[0]+(b[0]-a[0])*i/count),Math.round(a[1]+(b[1]-a[1])*i/count),size,material);
}
export function flood(tiles:TerrainTile[][],x:number,y:number,material:TerrainTile){
 const old=tiles[y]?.[x];if(!old||old===material)return;
 const queue:[[number,number]]=[[x,y]];tiles[y][x]=material;
 for(let i=0;i<queue.length;i++){const [xx,yy]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(tiles[yy+dy]?.[xx+dx]===old){tiles[yy+dy][xx+dx]=material;queue.push([xx+dx,yy+dy]);}}
}
export interface Issue {severity:'error'|'warning';cell:string;message:string;x?:number;y?:number}
const record=(v:unknown):v is Record<string,any>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const short=(v:unknown)=>typeof v==='string'&&v.length<=120;
/** Both the editor and publisher validate untrusted imports with these same rules. */
export function inspectWorld(input:unknown):Issue[]{
 const issues:Issue[]=[],err=(cell:string,message:string)=>issues.push({severity:'error',cell,message});
 if(!record(input)||input.schema!==1||!record(input.cells)){err('world','Unsupported world document.');return issues;}
 if(Object.keys(input.cells).length>REGIONS.length){err('world','Too many cells.');return issues;}
 for(const [id,c] of Object.entries(input.cells)){
  if(!Object.hasOwn(REGION_BY_ID,id)||!record(c)){err(id,'Unknown cell.');continue;}
  if(!Array.isArray(c.tiles)||c.tiles.length!==H||c.tiles.some((row:unknown)=>!Array.isArray(row)||row.length!==W||row.some(t=>!MATERIALS.includes(t))))err(id,`Terrain must contain ${W} × ${H} valid tiles.`);
  const objects=(v:unknown,room='outside')=>{
   if(!Array.isArray(v)||v.length>1500){err(id,'Invalid object list.');return;}
   const ids=new Set<string>();
   for(const p of v){
    if(!record(p)||!finite(p.x,0,W-1)||!finite(p.y,0,H-1)||!finite(p.size,16,300)||!OBJECT_KINDS.includes(p.kind)||typeof p.solid!=='boolean'||(p.label!==undefined&&!short(p.label))||(p.id!==undefined&&(!short(p.id)||ids.has(p.id)))||
      (p.interact!==undefined&&(!short(p.interact)||(!interactions.includes(p.interact)&&!TRAINERS.some(t=>`trainer:${t.id}`===p.interact))))) {err(id,`Invalid ${room} object.`);break;}
    if(p.id)ids.add(p.id);
   }
  };
  objects(c.objects);
  if(c.interiors!==undefined){if(!record(c.interiors))err(id,'Invalid interiors.');else for(const [room,items] of Object.entries(c.interiors)){if(!ROOMS.includes(room as Interior))err(id,'Unknown interior.');else objects(items,room);}}
  if(!Array.isArray(c.features)||c.features.length>100||c.features.some((f:any)=>!record(f)||!short(f.name)||!finite(f.x,0,W-1)||!finite(f.y,0,H-1)||!['bridge','maze','lake','cave','steps'].includes(f.kind)))err(id,'Invalid landmark markers.');
  const e=c.encounters;
  if(!record(e)||typeof e.enabled!=='boolean'||!finite(e.rate,0,1)||!Array.isArray(e.zones)||e.zones.length>64){err(id,'Invalid encounter settings.');continue;}
  const table=(entries:unknown,required:boolean)=>{
   if(!Array.isArray(entries)||entries.length>500||(required&&!entries.length)){err(id,'An enabled habitat needs a spawn table.');return;}
   const seen=new Set<string>();
   for(const p of entries){
    if(!record(p)||!Object.hasOwn(SPECIES_BY_ID,p.species)||seen.has(p.species)||!finite(p.weight,.001,10000)||!Number.isInteger(p.minLevel)||!Number.isInteger(p.maxLevel)||!finite(p.minLevel,1,50)||!finite(p.maxLevel,p.minLevel,50)){err(id,'Invalid or duplicate Nuvo entry, weight, or level range (1–50).');continue;}
    seen.add(p.species);
    const family=SPECIES_BY_ID[p.species].base;
    if(family==='solunelle')err(id,'Solunelle remains a battle-pass exclusive.');
    if(['dreamweaver','oneirune'].includes(family)&&id!=='dreamland')err(id,'Dream mythicals belong in Dream Land.');
   }
   if(required&&entries.length&&entries.every(p=>record(p)&&SPECIES_BY_ID[p.species]?.base==='dreamweaver'))err(id,'Include another family after the Dreamweaver catch limit is reached.');
  };
  table(e.entries,e.enabled);
  const zoneIds=new Set<string>();
  for(const z of e.zones){
   if(!record(z)||!short(z.id)||zoneIds.has(z.id)||!short(z.name)||!Number.isInteger(z.x)||!Number.isInteger(z.y)||!Number.isInteger(z.width)||!Number.isInteger(z.height)||!finite(z.x,0,W-1)||!finite(z.y,0,H-1)||!finite(z.width,1,W-z.x)||!finite(z.height,1,H-z.y)||!finite(z.rate,0,1)){err(id,'Invalid habitat boundary.');continue;}
   zoneIds.add(z.id);table(z.entries,e.enabled);
  }
 }
 return issues;
}
/** Connectivity uses the same terrain and object collisions as the running game. */
export function validateWorld(input:unknown):Issue[]{
 const issues=inspectWorld(input);if(issues.length)return issues;
 const doc=input as WorldDocument,before=worldDocument();installWorldDocument(doc);
 try{for(const [id,c] of Object.entries(doc.cells)){
  const r=REGION_BY_ID[id],props=getMap(r),reached=new Set<string>(),queue:[number,number][]=[];
  const add=(x:number,y:number)=>{const key=`${x},${y}`;if(!reached.has(key)&&canWalk(x*32+16,y*32+16,r,props)){reached.add(key);queue.push([x,y]);}};
  add(17,15);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])add(x+dx,y+dy);}
  const issue=(severity:Issue['severity'],message:string,x?:number,y?:number)=>issues.push({severity,cell:id,message,x,y});
  if(!queue.length)issue('error','The arrival point must stay walkable.',17,15);
  for(const side of Object.keys(r.links)){const [x,y]=side==='north'?[18,1]:side==='south'?[18,50]:side==='west'?[1,13]:[70,13];if(!reached.has(`${x},${y}`))issue('error',`The ${side} exit is cut off from the arrival point.`,x,y);}
  for(const p of props.filter(p=>p.interact))if(!queue.some(([x,y])=>Math.hypot(x+.5-p.x,y+.5-p.y)<(p.solid?2.5:1.8)))issue('error',`${p.label??p.interact} cannot be reached.`,p.x,p.y);
  for(const p of props)if(['nurse','merchant','breeder','stylist','clothier','exit'].includes(p.interact??''))issue('error','Interior service interactions belong inside their building.',p.x,p.y);
  if(r.kind!=='Town'&&props.some(p=>['heal','shop','nursery','tailor','barber'].includes(p.interact??'')))issue('error','Enterable shops and lodges must stay in town cells.');
  if(r.kind==='Town')for(const service of ['heal','shop','nursery','tailor','barber','league'])if(!props.some(p=>p.interact===service))issue('error',`Keep a ${service} entrance in town.`);
  if(c.encounters.enabled&&!queue.some(([x,y])=>encounterTile(c.tiles[y][x])))issue('error','Wild encounters need reachable tall grass or cave rubble.');
  for(const z of c.encounters.zones)if(!queue.some(([x,y])=>x>=z.x&&x<z.x+z.width&&y>=z.y&&y<z.y+z.height&&encounterTile(c.tiles[y][x])))issue('warning',`${z.name} has no reachable encounter terrain.`,z.x,z.y);
  for(const [room,items] of Object.entries(c.interiors??{})){
   const walk=(x:number,y:number)=>canWalk(x*32+16,y*32+16,r,items,room as Interior),seen=new Set<string>(),todo:[number,number][]=[];
   const push=(x:number,y:number)=>{const k=`${x},${y}`;if(!seen.has(k)&&walk(x,y)){seen.add(k);todo.push([x,y]);}};
   push(18,19);for(let i=0;i<todo.length;i++){const [x,y]=todo[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])push(x+dx,y+dy);}
   if(!items.some(p=>p.interact==='exit'))issue('error',`${room}: keep a way outside.`);
   const service={lodge:'nurse',shop:'merchant',nursery:'breeder',tailor:'clothier',barber:'stylist'}[room as Interior];
   if(!items.some(p=>p.interact===service))issue('error',`${room}: keep its service counter.`);
   for(const p of items.filter(p=>p.interact))if(!todo.some(([x,y])=>Math.hypot(x+.5-p.x,y+.5-p.y)<(p.solid?2.5:1.8)))issue('error',`${room}: ${p.label??p.interact} is unreachable.`,p.x,p.y);
  }
 }}finally{installWorldDocument(before);}
 return issues;
}
export function objectBounds(p:WorldObject){return {left:p.x*32-p.size/2,top:p.y*32-p.size,right:p.x*32+p.size/2,bottom:p.y*32+8};}
