import {artImage,WORLD_ART} from './illustratedArt';
import {SKIN_TONES,LOOK_COLORS,DEFAULT_APPEARANCE,type Appearance} from './appearance';

type LegacyLook={outfit?:number;hair?:number;hairColor?:number;appearance?:Appearance};
export function keeperAppearance(palette=0,look:LegacyLook={}):Appearance{
 return look.appearance??{...DEFAULT_APPEARANCE,top:[0,5,8,3,9,2][look.outfit??0]??0,
  topTint:look.outfit?[8,2,6,7,3,5][look.outfit]:[8,6,10,2][palette]??8,
  hairStyle:look.hair??0,hairTint:look.hairColor===undefined?6:[1,3,2,11,4,6][look.hairColor]??6};
}
const cache=new Map<string,HTMLCanvasElement>();
const rgb=(hex:string)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
function part(file:string,index:number,a:Appearance,kind:'head'|'top'|'bottom'|'hat'|'accessory'){
 const image=artImage(file);if(!image)return undefined;
 const key=`${file}:${index}:${kind==='head'?[a.skin,a.hairTint,a.eyes]:kind==='top'||kind==='hat'?[a.skin,a.topTint]:kind==='bottom'?[a.skin,a.bottomTint,a.shoes]:''}`;
 const existing=cache.get(key);if(existing)return existing;
 const f=WORLD_ART[file].frames[index],out=document.createElement('canvas');out.width=f.width;out.height=f.height;
 const c=out.getContext('2d',{willReadFrequently:true})!;c.drawImage(image,f.x,f.y,f.width,f.height,0,0,f.width,f.height);
 if(kind!=='accessory'){
  const pixels=c.getImageData(0,0,out.width,out.height),d=pixels.data;
  const skin=rgb(SKIN_TONES[a.skin]),hair=rgb(LOOK_COLORS[a.hairTint]),eyes=rgb(LOOK_COLORS[a.eyes]),cloth=rgb(LOOK_COLORS[kind==='bottom'?a.bottomTint:a.topTint]),shoes=rgb(LOOK_COLORS[a.shoes]);
  for(let i=0;i<d.length;i+=4){if(d[i+3]<16)continue;const r=d[i],g=d[i+1],b=d[i+2],v=Math.max(r,g,b);let color:number[]|undefined,base=130;
   if(kind==='head'&&b>g*1.18&&r>g*1.1){color=hair;base=135;}
   else if(kind==='head'&&b>r*1.2&&g>r*1.2){color=eyes;base=165;}
   else if((kind==='top'||kind==='hat')&&g>r*1.18&&b>r*1.12){color=cloth;base=130;}
   else if(kind==='bottom'&&b>r*1.12&&g>r*1.04){color=cloth;base=115;}
   else if(kind==='bottom'&&i/4/out.width>out.height*.68&&r>g*1.14&&g>b*1.15){color=shoes;base=145;}
   else if(kind!=='hat'&&r>g*1.08&&g>b*1.08&&r>110&&g/r>.55&&g/r<.84&&b/g>.62){color=skin;base=245;}
   if(color){const shade=v/base;for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(color[k]*Math.min(1,shade)+Math.max(0,shade-1)*110));}
  }
  c.putImageData(pixels,0,0);
 }
 // Bound memory while keeping the active party, NPCs and preview palettes warm.
 if(cache.size>=256)cache.delete(cache.keys().next().value!);cache.set(key,out);return out;
}

// Jaw registration was measured on the source faces, independent of long hair bounds.
const jaws=[[241,240,240,239],[479,477,477,477],[718,713,715,716],[947,947,947,947],[1240,1238,1238,1235],[1486,1484,1484,1486],
 [248,246,246,246],[486,484,484,484],[713,712,712,712],[993,988,988,988],[1211,1208,1208,1208],[1463,1460,1460,1460]];

/** Layered illustrated keeper: anchored head, separate cloth, articulated legs and arms. */
export function keeperStep(phase:number,moving:boolean,running=false){
 const stride=moving?Math.sin(phase):0;
 return {stride,bob:moving?Math.abs(Math.cos(phase*2))*(running?2.6:1.5):Math.sin(phase)*.35,swing:stride*(running?.65:.42),lift:running?6:3.5};
}
export function drawIllustratedKeeper(c:CanvasRenderingContext2D,x:number,y:number,size:number,a:Appearance,direction=0,phase=0,moving=false,running=false){
 const dir=Math.max(0,Math.min(3,direction)),side=dir===1||dir===2;
 const headFile=a.hairStyle<6?'keeper-heads-a.png':'keeper-heads-b.png',headIndex=(a.hairStyle%6)*4+dir;
 const topFile=a.top<5?'keeper-tops-a.png':'keeper-tops-b.png';
 const head=part(headFile,headIndex,a,'head'),top=part(topFile,(a.top%5)*4+dir,a,'top'),bottom=part('keeper-bottoms.png',a.bottom*4+dir,a,'bottom');
 if(!head||!top||!bottom)return;
 c.save();c.translate(x,y);c.scale(size/100,size/100);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 const {stride,bob,swing,lift}=keeperStep(phase,moving,running);
 if(a.adornment===5){
  const cape=c.createLinearGradient(-20,-57,22,-7);cape.addColorStop(0,'#fff0c9');cape.addColorStop(.55,'#d6d1b8');cape.addColorStop(1,'#9aafba');
  c.fillStyle=cape;c.strokeStyle='#b59750';c.lineWidth=1.2;c.beginPath();c.moveTo(-19,-58-bob);c.quadraticCurveTo(-17+stride*3,-34,-26+stride*6,-9);c.quadraticCurveTo(0,-1,26+stride*6,-9);c.quadraticCurveTo(17+stride*3,-34,19,-58-bob);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#f4e4a9';for(const v of [-12,0,12]){c.beginPath();c.moveTo(v*.7,-53-bob);c.lineTo(v+stride*5,-11);c.stroke();}
 }
 const bw=side?24:32,bh=30;
 // Cropped limb sources pivot around their hips. Boots are never clipped at their old position.
 const waist=.38,legHeight=bh*(1-waist),sourceY=bottom.height*waist;
 for(const leg of [-1,1]){
  c.save();const hip=side?leg*2:leg*bw*.24;c.translate(hip,-legHeight-bob*.3);c.rotate(side?swing*leg:stride*leg*.08);
  if(side&&leg<0)c.filter='brightness(.85)';
  c.drawImage(bottom,leg<0?0:bottom.width/2,sourceY,bottom.width/2,bottom.height-sourceY,-bw/4,0,bw/2,legHeight-Math.max(0,stride*leg)*lift);c.restore();
 }
 c.drawImage(bottom,0,0,bottom.width,sourceY+bottom.height*.08,-bw/2,-bh-bob*.3,bw,bh*(waist+.08));
 const long=[5,8,9].includes(a.top),tw=side?32:44,th=long?49:40,ty=-62-bob;
 c.save();c.translate(0,ty);c.rotate(stride*.018);
 if(side){c.save();c.transform(1,0,-stride*(running?.09:.05),1,0,0);c.drawImage(top,-tw/2,0,tw,th);c.restore();}
 else{
  // Outer sleeves pivot at the shoulders while the chest stays attached to the waist.
  for(const arm of [-1,0,1]){c.save();if(arm){c.translate(arm*tw*.29,th*.19);c.rotate(stride*arm*(running?.23:.16));c.translate(-arm*tw*.29,-th*.19);}
   c.beginPath();c.rect(arm<0?-tw/2:arm>0?tw*.285:-tw*.30,0,arm?tw*.215:tw*.60,th);c.clip();c.drawImage(top,-tw/2,0,tw,th);c.restore();}
 }
 c.restore();
 drawStoryClothing(c,a.adornment??0,dir,bob,stride);
 if(a.accessory===3){const bag=part('keeper-accessories.png',8+dir,a,'accessory');if(bag)c.drawImage(bag,-14,-58-bob,27,33);}
 const f=WORLD_ART[headFile].frames[headIndex],hs=.215,chin=jaws[a.hairStyle][dir]-f.y;
 const hx=-head.width*hs/2;
 // Register headwear to the forehead/jaw, never the bounding box of long or spiky hair.
 // Both layers share bob and rotation, so the brim stays attached while walking.
 c.save();c.translate(0,-57-bob);c.rotate(stride*.015);
 c.save();if(a.hat===1||a.hat===2){c.beginPath();c.rect(-80,-34,160,120);c.clip();}
 c.drawImage(head,hx,-chin*hs,head.width*hs,head.height*hs);c.restore();
 if(a.hat){const hat=part('keeper-hats.png',(a.hat-1)*4+dir,a,'hat');if(hat){
  const width=a.hat===2?59:a.hat===3?18:a.hat===4?48:44,height=width*hat.height/hat.width;
  const attachment=[0,.91,.71,.46,.48,.84][a.hat],forehead=a.hat===3?-27:-26;
  c.drawImage(hat,a.hat===3?(dir===1?-22:dir===2?5:10):-width/2,forehead-height*attachment,width,height);
 }}
 if(a.adornment===5){c.fillStyle='#dbb55b';c.strokeStyle='#fff0b0';c.lineWidth=1;c.beginPath();c.moveTo(-17,-29);for(let i=0;i<5;i++){const px=-16+i*8;c.lineTo(px,-36-(i===2?5:0));c.lineTo(px+4,-31);}c.lineTo(17,-25);c.lineTo(-17,-25);c.closePath();c.fill();c.stroke();c.fillStyle='#65caba';c.beginPath();c.arc(0,-29,2.3,0,Math.PI*2);c.fill();}
 c.restore();
 if(a.accessory&&a.accessory!==3&&a.accessory!==5&&(dir!==3||a.accessory===2)){
  const accessory=part('keeper-accessories.png',(a.accessory-1)*4+dir,a,'accessory');
  if(accessory){const w=a.accessory===1?(side?17:32):a.accessory===2?29:side?4:36,h=a.accessory===1?13:a.accessory===2?19:7;
   c.drawImage(accessory,side&&a.accessory===1?(dir===1?-19:2):-w/2,a.accessory===1?-78-bob:a.accessory===2?-60-bob:-66-bob,w,h);}
 }
 if(a.accessory===5&&dir!==3){c.fillStyle='#92524c';for(const sideX of side?[dir===1?-1:1]:[-1,1])for(let i=0;i<3;i++){c.beginPath();c.arc(sideX*10+(i%2)*2,-67-bob+Math.floor(i/2)*2,.65,0,Math.PI*2);c.fill();}}
 c.restore();
}

function drawStoryClothing(c:CanvasRenderingContext2D,adornment:number,dir:number,bob:number,stride:number){
 if(!adornment)return;const side=dir===1||dir===2;
 c.save();c.translate(0,-bob);c.lineJoin='round';c.lineWidth=1.2;
 if(adornment===1){c.fillStyle='#57b99a';c.strokeStyle='#285e52';c.beginPath();c.moveTo(side?2:10,-58);c.lineTo(side?7:17,-55);c.lineTo(side?9:19,-34);c.lineTo(side?4:13,-38);c.lineTo(side?0:9,-34);c.closePath();c.fill();c.stroke();c.fillStyle='#f1d38c';c.beginPath();c.arc(side?4:13,-54,2.5,0,Math.PI*2);c.fill();}
 if(adornment===2||adornment===3){
  const fabric=c.createLinearGradient(-22,-62,22,-35);fabric.addColorStop(0,adornment===2?'#88cddd':'#b3a4e6');fabric.addColorStop(.45,adornment===2?'#3a91a8':'#6c60a3');fabric.addColorStop(1,adornment===2?'#285968':'#443d73');c.fillStyle=fabric;c.strokeStyle=adornment===2?'#abcdda':'#b3dccc';c.beginPath();c.moveTo(-18,-60);c.quadraticCurveTo(0,-66,18,-60);c.lineTo(side?15:24,adornment===2?-40:-49);c.quadraticCurveTo(0,-47,-24,adornment===2?-40:-49);c.closePath();c.fill();c.stroke();
  if(adornment===3){c.beginPath();c.moveTo(-13,-52);c.quadraticCurveTo(-29-stride*5,-35,-24-stride*8,-25);c.lineTo(-17-stride*8,-28);c.quadraticCurveTo(-20-stride*5,-41,-7,-52);c.fill();c.stroke();}
  if(dir!==3){c.fillStyle='#f3e8cc';c.beginPath();c.arc(side?8:0,-56,2.6,0,Math.PI*2);c.fill();}
 }
 if(adornment>=4){c.fillStyle='#d8b55d';c.strokeStyle='#fff0b8';for(const sx of side?[dir===1?-1:1]:[-1,1]){c.beginPath();c.ellipse(sx*17,-56,7,3.5,sx*.2,0,Math.PI*2);c.fill();c.stroke();for(let i=0;i<3;i++){c.beginPath();c.moveTo(sx*(13+i*3),-55);c.lineTo(sx*(13+i*3),-49);c.stroke();}}
  if(dir!==3){c.fillStyle='#fff0bd';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?2:5;c.lineTo((side?6:0)+Math.cos(a)*r,-53+Math.sin(a)*r);}c.closePath();c.fill();}
 }
 c.restore();
}
