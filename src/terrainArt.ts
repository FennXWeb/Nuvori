import type {Region} from "./data";
import {getTerrain,terrainAt,terrainNoise,isUnderground,type TerrainTile} from "./terrain";

/** Pixel terrain, including visible edges that match the blocked collision tiles. */
export function drawTerrainTile(c:CanvasRenderingContext2D,gx:number,gy:number,r:Region,t:number,tile:TerrainTile):boolean {
 const x=gx*32,y=gy*32,n=terrainNoise(gx,gy),cave=isUnderground(r),snow=r.id==="rimewind",desert=r.biome==="desert"||r.id==="emberfall";
 if(tile==="ground"||tile==="path"||tile==="grass")return false;
 c.save();c.translate(x,y);
 if(tile==="water"){
  c.fillStyle=cave?"#304758":r.biome==="dream"?"#646291":snow?"#6099ae":"#478f9d";c.fillRect(0,0,33,33);
  c.fillStyle=cave?"#426476":r.biome==="dream"?"#8e7da9":"#61acb3";c.globalAlpha=.44+Math.sin(gx*.3+gy*.2)*.07;c.fillRect(0,0,33,33);c.globalAlpha=1;
  for(const [dx,dy,xx,yy,w,h] of [[0,-1,0,0,32,3],[-1,0,0,0,3,32],[1,0,29,0,3,32],[0,1,0,29,32,3]]){
   if(!["water","bridge"].includes(terrainAt(gx+dx,gy+dy,r))){c.fillStyle=cave?"#91a8b9":"#afceba";c.fillRect(xx,yy,w,h);c.fillStyle="#ffffff25";c.fillRect(xx+1,yy+1,Math.max(1,w-2),Math.max(1,h-2));}
  }
  c.globalAlpha=.35+.15*Math.sin(t*1.5+n*8);c.fillStyle=snow?"#d7f1f0":"#c3e6de";
  c.fillRect(4+Math.sin(t+gy)*3,8+n*12,12,2);if(n>.55)c.fillRect(19,24,7,1);c.globalAlpha=1;
 }else if(tile==="bridge"){
  const horizontal=getTerrain(r).bridgeAxes.get(`${gx},${gy}`)??true;
  c.fillStyle=cave?"#576371":"#584b3b";c.fillRect(0,0,33,33);
  for(let i=0;i<4;i++){c.fillStyle=cave?(i%2?"#a3a5b0":"#9197a2"):(i%2?"#bca174":"#c9ad7d");if(horizontal)c.fillRect(i*8+1,0,6,33);else c.fillRect(0,i*8+1,33,6);}
  const edgeA=terrainAt(gx+(horizontal?0:-1),gy+(horizontal?-1:0),r)!=="bridge",edgeB=terrainAt(gx+(horizontal?0:1),gy+(horizontal?1:0),r)!=="bridge";
  for(const [edge,offset] of [[edgeA,1],[edgeB,28]] as const)if(edge){c.fillStyle="#534b41";if(horizontal)c.fillRect(0,offset,33,3);else c.fillRect(offset,0,3,33);c.fillStyle="#e7cf92";if(horizontal)c.fillRect(7,offset-1,4,5);else c.fillRect(offset-1,7,5,4);}
 }else if(tile==="hedge"){
  c.fillStyle="#294e3e";c.fillRect(0,0,33,33);c.fillStyle="#3b7950";c.fillRect(1,0,30,27);c.fillStyle="#508b58";c.fillRect(3,1,26,18);
  for(let i=0;i<5;i++){c.fillStyle=i%2?"#699a5e":"#467c4b";c.fillRect(3+terrainNoise(gx+i,gy)*23,2+terrainNoise(gy+i,gx)*21,6,5);}
  if(n>.92){c.fillStyle="#ebb1b6";c.fillRect(9,7,4,4);c.fillStyle="#f0d5a6";c.fillRect(10,8,2,2);}
 }else if(tile==="cliff"){
  const edge=(dx:number,dy:number)=>terrainAt(gx+dx,gy+dy,r)!=="cliff";
  c.fillStyle=cave?"#293544":desert?"#ad946b":snow?"#a4bcc4":"#87938d";c.fillRect(0,0,33,33);
  // Contiguous rock masses have exposed faces only at their edges, not a brick grid.
  c.fillStyle=cave?"#344351":desert?"#bba478":snow?"#bdcfd1":"#98a399";
  if(n>.45){c.fillRect(5+n*10,7,10,3);c.fillRect(8,21,6,2);}
  if(edge(0,1)){c.fillStyle=cave?"#435463":desert?"#c7ad7b":snow?"#d1e1df":"#a7b1a3";c.fillRect(0,8,33,5);c.fillStyle=cave?"#1e2938":desert?"#7f6d54":"#596b79";c.fillRect(0,13,33,20);c.fillStyle=cave?"#52636e":"#899899";c.fillRect(4,15,3,9);c.fillRect(22,20,3,6);c.fillStyle="#13253466";c.fillRect(0,30,33,3);}
  if(edge(0,-1)){c.fillStyle=cave?"#516371":snow?"#e6efe7":"#c0b68c";c.fillRect(0,0,33,4);}
  for(const dx of [-1,1])if(edge(dx,0)){c.fillStyle=cave?"#465762":desert?"#d0b884":"#bacbc5";c.fillRect(dx<0?0:28,0,4,32);}
  if(cave&&n>.985){c.fillStyle="#88b9d2";c.beginPath();c.moveTo(12,9);c.lineTo(18,3);c.lineTo(21,13);c.lineTo(17,18);c.fill();}
 }else if(tile==="steps"){
  c.fillStyle=desert?"#bda579":"#a5b0b3";c.fillRect(0,0,33,33);
  for(let i=0;i<5;i++){c.fillStyle=desert?"#dfc794":"#d0d9d5";c.fillRect(1,i*6,30,2);c.fillStyle="#64716b";c.fillRect(1,i*6+5,30,1);}
 }else{
  c.fillStyle=tile==="rubble"?"#707580":"#616774";c.fillRect(0,0,33,33);c.fillStyle="#8c91a0";
  for(let i=0;i<(tile==="rubble"?7:2);i++){const xx=terrainNoise(gx*7+i,gy)*26+2,yy=terrainNoise(gy*5+i,gx)*25+3;c.fillStyle=i%2?"#969b9e":"#515868";c.fillRect(xx,yy,i%3+2,2);}
  if(tile==="rubble"&&n>.7){c.fillStyle="#8abebc";c.fillRect(20,11,2,5);c.fillRect(17,13,3,3);}
 }
 c.restore();return true;
}

export function drawCaveMouth(c:CanvasRenderingContext2D,x:number,y:number,name:string){
 c.save();c.translate(x,y);c.fillStyle="#6b7986";c.beginPath();c.roundRect(-59,-55,118,91,[51,51,5,5]);c.fill();
 c.fillStyle="#334252";c.beginPath();c.roundRect(-43,-42,86,76,[38,38,2,2]);c.fill();
 c.fillStyle="#172937";c.beginPath();c.roundRect(-31,-28,62,62,[28,28,0,0]);c.fill();
 c.fillStyle="#a9b5b8";for(const px of [-52,43]){c.fillRect(px,-15,9,49);c.fillStyle="#e8c889";c.fillRect(px,-8,7,10);}
 c.font="600 10px sans-serif";c.textAlign="center";c.fillStyle="#f2e6c4";c.fillText(name,0,52);c.restore();
}
