import type {Region} from "./data";
export const WORLD_COLUMNS=72, WORLD_ROWS=52, WORLD_PIXEL_WIDTH=2304, WORLD_PIXEL_HEIGHT=1664;
export const terrainNoise=(x:number,y:number,seed=1)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
export function roadAt(x:number,y:number,town=false){
 return Math.abs(x-18)<1.7||Math.abs(y-13)<1.5|| (town && ((y>5&&y<46&&[9,27,43,59].some(v=>Math.abs(x-v)<1.3))|| (x>5&&x<64&&[20,31,43].some(v=>Math.abs(y-v)<1.2)) || (x>38&&x<64&&y>27&&y<35)));
}
export function tallGrassAt(x:number,y:number,r:Region){
 if(r.kind==="Town"||roadAt(x,y)||x<3||y<3||x>69||y>49)return false;
 if(x>24&&x<35&&y>3&&y<11)return false;
 // Broad islands produce readable encounter zones, with ragged borders.
 return Math.sin(x*.27+r.name.length)*Math.cos(y*.31)+Math.sin((x+y)*.13)>.04;
}
export function drawTallGrass(c:CanvasRenderingContext2D,gx:number,gy:number,t:number,r:Region,nearX:number,nearY:number,front=false){
 const px=gx*32,py=gy*32,n=terrainNoise(gx,gy),near=Math.hypot(nearX-px-16,nearY-py-16)<35;
 const color=r.biome==="dream"?"#785ca9":r.id==="frostmere"?"#74a9a7":r.biome==="desert"?"#a58849":"#4b9658";
 if(!front){c.fillStyle=r.biome==="dream"?"#8365ac":r.id==="frostmere"?"#a8c7b8":r.biome==="desert"?"#b8a564":"#73ae69";c.fillRect(px,py,33,33);}
 for(let i=front?4:0;i<8;i++){
  const x=px+3+terrainNoise(gx*13+i,gy+7)*25,y=py+9+terrainNoise(gy*7+i,gx+12)*22,sway=Math.sin(t*2+n*8+i)*1.2+(near?Math.sin(t*18+i)*2.4:0);
  c.fillStyle=i%3?color:r.biome==="dream"?"#b097d5":"#a4cb7d";c.beginPath();c.moveTo(x-1,y+5);c.quadraticCurveTo(x-6,y-2,x-5+sway,y-7-i%3);c.lineTo(x+1,y+1);c.lineTo(x+3+sway,y-11);c.quadraticCurveTo(x+5,y-2,x+2,y+5);c.closePath();c.fill();
 }
}
export function drawTownDetail(c:CanvasRenderingContext2D,x:number,y:number,kind:number,t:number){
 c.save();c.translate(x,y);
 if(kind===40){c.fillStyle="#584c3f";c.fillRect(-28,-21,56,5);c.fillRect(-28,-13,56,5);c.fillRect(-26,-4,52,6);c.fillStyle="#c69a66";c.fillRect(-27,-20,54,3);c.fillRect(-27,-12,54,3);c.fillRect(-25,-3,50,3);c.fillStyle="#384c47";c.fillRect(-24,-24,3,30);c.fillRect(20,-24,3,30);}
 if(kind===41){c.fillStyle="#3c5751";c.fillRect(-2,-43,4,45);c.fillRect(-6,-1,12,3);c.fillRect(-8,-52,16,3);c.fillRect(-6,-49,12,15);c.fillStyle="#f2d395";c.fillRect(-4,-47,8,10);c.fillStyle="#fff1c4";c.fillRect(-2,-45,3,6);c.globalAlpha=.07+Math.sin(t*2+x)*.02;c.fillStyle="#f9ebae";c.beginPath();c.arc(0,-43,21,0,Math.PI*2);c.fill();}
 if(kind===42){for(const side of [-1,1]){c.fillStyle="#967951";c.fillRect(side*58-23,5,46,3);c.fillRect(side*58-23,-4,46,3);for(let i=0;i<4;i++){c.fillStyle="#6e654b";c.fillRect(side*58-22+i*14,-11,4,23);c.fillStyle="#d6cba4";c.fillRect(side*58-21+i*14,-11,2,22);}}}
 c.restore();
}
