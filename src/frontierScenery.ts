import {drawArt} from './illustratedArt';
export const LANDMARK_ART=['saffron','threadhaven','mirelight','tempest','crownspire','dreamland','brookbend','bramble','echohollow','glassvein','lanternlake','rimewind'];
export function drawFrontierLandmark(c:CanvasRenderingContext2D,id:string,x:number,y:number,t:number):boolean{
 const index=LANDMARK_ART.indexOf(id);if(index<0)return false;
 drawArt(c,'illustrated-landmarks.png',index,x,y+7,155,170);
 if(['crownspire','dreamland','echohollow','tempest'].includes(id)){
  c.save();c.globalAlpha=.35;for(let i=0;i<5;i++){const a=t*.4+i*1.26;c.fillStyle=i%2?'#fce5a0':'#bceaf5';c.beginPath();c.arc(x+Math.cos(a)*45,y-50+Math.sin(a)*55,1.5+Math.sin(t*2+i)*.5,0,7);c.fill();}c.restore();
 }
 return true;
}
