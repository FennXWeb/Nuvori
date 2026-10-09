import type {Region} from "./data";
import {getTerrain,terrainAt,terrainNoise,isUnderground,type TerrainTile} from "./terrain";
import {drawArt,paintSurface} from "./illustratedArt";

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
/** Illustrated surfaces retain the collision grid; edge shading makes elevation readable. */
export function drawTerrainTile(c:CanvasRenderingContext2D,gx:number,gy:number,r:Region,t:number,tile:TerrainTile):boolean{
 const x=gx*32,y=gy*32,cave=isUnderground(r),n=terrainNoise(gx,gy);
 const index=terrainSurface(r,tile);
 c.save();
 c.fillStyle=index===4?'#418c9b':cave?'#414956':'#8aa974';c.fillRect(x,y,33,33);
 if(tile==='bridge'&&!cave&&(getTerrain(r).bridgeAxes.get(gx+','+gy)??true)){c.save();c.transform(0,1,-1,0,0,0);paintSurface(c,index,y,-x-33,33,33,64);c.restore();}
 else paintSurface(c,index,x,y,33,33,tile==='bridge'||index===2?64:128);
 if(index===0){c.fillStyle=r.biome==='marsh'?'#617a6860':r.biome==='storm'?'#77869d70':'#89a96d33';c.fillRect(x,y,33,33);}
 if(tile==='water'){
  c.globalAlpha=.09+.05*Math.sin(t*1.5+n*8);c.fillStyle='#e3ffff';c.beginPath();c.ellipse(x+16+Math.sin(t+n*5)*2,y+15,10,2,0,0,7);c.fill();c.globalAlpha=1;
  for(const [dx,dy,xx,yy,w,h] of [[0,-1,x,y,32,5],[-1,0,x,y,5,32],[1,0,x+27,y,5,32],[0,1,x,y+27,32,5]]){
   if(!['water','bridge'].includes(terrainAt(gx+dx,gy+dy,r))){c.fillStyle=cave?'#b1c9cd77':'#d8e5bcaa';c.fillRect(xx,yy,w,h);c.fillStyle='#162e4333';c.fillRect(xx+1,yy+1,Math.max(1,w-2),Math.max(1,h-2));}
  }
 }else if(tile==='cliff'||tile==='hedge'){
  const same=(dx:number,dy:number)=>terrainAt(gx+dx,gy+dy,r)===tile;
  if(!same(0,1)){const g=c.createLinearGradient(0,y+12,0,y+32);g.addColorStop(0,'#172b3000');g.addColorStop(1,'#152330dd');c.fillStyle=g;c.fillRect(x,y+12,33,20);}
  if(!same(0,-1)){c.fillStyle=tile==='hedge'?'#d3eb9277':'#e5d6b777';c.fillRect(x,y,33,2);}
  if(cave){c.fillStyle='#19243877';c.fillRect(x,y,33,33);}
 }else if(tile==='bridge'){
  const horizontal=getTerrain(r).bridgeAxes.get(gx+','+gy)??true;
  for(const side of [-1,1])if(terrainAt(gx+(horizontal?0:side),gy+(horizontal?side:0),r)!=='bridge'){
   c.fillStyle='#4c3529';if(horizontal)c.fillRect(x,y+(side<0?0:29),33,3);else c.fillRect(x+(side<0?0:29),y,3,33);
   c.fillStyle='#ddbc84';if(horizontal)c.fillRect(x+7,y+(side<0?0:28),4,4);else c.fillRect(x+(side<0?0:28),y+7,4,4);
  }
 }else if(tile==='path'){
  // Gentle dirt edging where paths meet vegetation, without obscuring walkable tiles.
  c.fillStyle='#72654940';for(const [dx,dy,xx,yy,w,h] of [[0,-1,x,y,32,2],[-1,0,x,y,2,32],[1,0,x+30,y,2,32],[0,1,x,y+30,32,2]])if(['ground','grass'].includes(terrainAt(gx+dx,gy+dy,r)))c.fillRect(xx,yy,w,h);
 }
 c.restore();return true;
}
export function drawCaveMouth(c:CanvasRenderingContext2D,x:number,y:number,_name:string){drawArt(c,'illustrated-decor.png',13,x,y+30,125,115);}
