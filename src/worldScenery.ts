import type {Region} from './data';
import {terrainAt,terrainNoise} from './terrain';
import {drawArt} from './illustratedArt';
export {WORLD_COLUMNS,WORLD_ROWS,WORLD_PIXEL_WIDTH,WORLD_PIXEL_HEIGHT,terrainNoise,roadAt} from './terrain';
export function tallGrassAt(x:number,y:number,r:Region){return terrainAt(x,y,r)==='grass';}
export function drawTallGrass(c:CanvasRenderingContext2D,gx:number,gy:number,t:number,r:Region,nearX:number,nearY:number,front=false){
 const n=terrainNoise(gx,gy),x=gx*32+16+(n-.5)*5,y=gy*32+35+terrainNoise(gy,gx)*4,near=Math.hypot(nearX-x,nearY-y)<40;
 c.save();c.translate(x,y);c.transform(1,0,Math.sin(t*2+n*8)*(near?.08:.025),1,0,0);
 if(r.biome==='dream')c.filter='hue-rotate(155deg)';
 const frame=r.biome==='marsh'?4:['tideglass','sunwake'].includes(r.id)?5:['frostmere','rimewind'].includes(r.id)?6:r.biome==='desert'?7:Math.floor(n*4);
 if(front){c.beginPath();c.rect(-20,-14,40,16);c.clip();}
 drawArt(c,'illustrated-grass.png',frame,0,0,52+n*4,40);c.restore();
}
export function drawTownDetail(c:CanvasRenderingContext2D,x:number,y:number,kind:number,t:number){
 if(kind===40)drawArt(c,'illustrated-decor.png',8,x,y+5,66,45);
 if(kind===41){drawArt(c,'illustrated-decor.png',9,x,y+3,38,66);c.save();c.globalAlpha=.06+Math.sin(t*2+x)*.015;const g=c.createRadialGradient(x,y-47,2,x,y-47,24);g.addColorStop(0,'#fff2ac');g.addColorStop(1,'#fff2ac00');c.fillStyle=g;c.fillRect(x-24,y-71,48,48);c.restore();}
 if(kind===42)for(const side of [-1,1])drawArt(c,'illustrated-decor.png',10,x+side*58,y+10,46,31);
}
