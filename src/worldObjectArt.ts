import {artImage,drawArt} from './illustratedArt';
import {drawFrontierLandmark} from './frontierScenery';
import {drawTownDetail} from './worldScenery';
import {drawFountainWater} from './townLife';
import {drawDressedKeeper,DEFAULT_APPEARANCE} from './appearance';
import {drawFurniture} from './interiors';
import type {WorldObject} from './worldContent';
import type {Region} from './data';
import type {Interior} from './adventure';

/** Shared by the live game and editor so placement previews use the real artwork. */
export function drawWorldObject(c:CanvasRenderingContext2D,p:WorldObject,r:Region,time:number,interior?:Interior){
 const x=p.x*32,y=p.y*32;
 c.fillStyle='#264b3820';c.beginPath();c.ellipse(x,y-1,p.size*.23,p.size*.09,0,0,Math.PI*2);c.fill();
 if(p.interact==='landmark'&&drawFrontierLandmark(c,r.id,x,y,time))return;
 if(p.kind===-1){
  const seed=Array.from(p.label??'Elowen').reduce((n,ch)=>n+ch.charCodeAt(0),0);
  drawDressedKeeper(c,x,y,p.size,{...DEFAULT_APPEARANCE,skin:seed%6,hairStyle:seed%12,hairTint:seed%5,top:interior==='lodge'?5:interior==='barber'?7:seed%8,topTint:interior==='lodge'?4:seed%12,bottomTint:seed%4},0,time*2);
 }else if(p.kind>=60)drawArt(c,'town-decor.png',p.kind-60,x,y+4,p.size,p.size);
 else if(p.kind>=50)drawArt(c,'town-buildings.png',p.kind-50,x,y+8,p.size,p.size);
 else if(p.kind>=40){c.save();c.translate(x,y);const scale=p.size/(p.kind===40?60:56);c.scale(scale,scale);drawTownDetail(c,0,0,p.kind,time);c.restore();}
 else if(p.kind>=30){drawArt(c,'illustrated-buildings.png',4+p.kind-30,x,y+8,p.size,p.size);drawTownDetail(c,x,y,42,time);}
 else if(p.kind>=20){c.save();c.translate(x,y);const scale=p.size/(p.kind===21?65:76);c.scale(scale,scale);drawFurniture(c,p.kind,0,0,interior==='lodge',time);c.restore();}
 else if(['nursery','tailor','barber','league'].includes(p.interact??''))drawArt(c,'illustrated-buildings.png',['nursery','tailor','barber','league'].indexOf(p.interact!),x,y+7,p.size,p.size);
 else if(interior&&p.kind===13)drawArt(c,'illustrated-decor.png',7,x,y+6,44,52);
 else if(p.kind>=0){const image=artImage('world-atlas.png');if(image){const w=image.width/4,h=image.height/4;c.drawImage(image,p.kind%4*w,Math.floor(p.kind/4)*h,w,h,Math.round(x-p.size/2),Math.round(y-p.size*.83),p.size,p.size);}}
 if(p.kind===11)drawFountainWater(c,x,y,p.size,time);
}
