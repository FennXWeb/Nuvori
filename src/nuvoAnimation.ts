import {SPECIES_BY_ID, TYPE_COLORS, type Species} from './data';
import {nuvoSprite, spriteFill, type SpriteRect, type SpriteAtlas} from './sprites';
import motionFrames from './motionFrames.json';
import {artImage} from './illustratedArt';

export type NuvoAction='idle'|'walk'|'attack'|'damaged'|'faint'|'summon'|'recall';
export type Gait='walk'|'hop'|'fly'|'swim'|'crawl'|'float';
export const ACTION_SECONDS:Record<NuvoAction,number>={idle:2.4,walk:.6,attack:.8,damaged:.42,faint:.85,summon:.85,recall:.5};
export const MOTION_ATLASES=motionFrames as Record<string,SpriteAtlas>;
const TAU=Math.PI*2;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

export function gaitFor(id:string):Gait{
 const s=SPECIES_BY_ID[id];
 if(s.base==='dreamweaver')return s.stage===3?(['walk','walk','fly','swim'] as Gait[])[(s.art?.frame??0)%4]:'float';
 if(s.id==='oneirune')return 'float';
 if([3,9,12].includes(s.sprite))return 'fly';
 if([2,6,14,19].includes(s.sprite))return 'swim';
 if([4,21].includes(s.sprite))return 'hop';
 if([7,11,18].includes(s.sprite))return 'crawl';
 return 'walk';
}

/** Down is the original portrait, left/right share a profile, up has its own rear art. */
export function directionalSprite(s:Species,direction:number){
 const original=nuvoSprite(s);
 if(direction===0)return {...original,flip:false};
 const index=s.art?s.art.frame:s.id==='oneirune'?0:s.sprite;
 let file:string,frameIndex=index;
 if(original.file==='nuvo-atlas.png'){
  file='motion-base.png';const row=Math.floor(index/5),col=index%5;
  // The base sheet contains one spare pair per row; these measured slots are deliberate.
  frameIndex=row*12+(col===4&&row<4?10:col*2)+(direction===3?1:0);
 }else if(original.file.startsWith('evolution-'))file=`motion-evolution-${s.branch}-${direction===3?'rear':'side'}.png`;
 else {
  const stem=original.file.replace('-evolutions','').replace('.png','');
  file=`motion-${stem}.png`;frameIndex=index*2+(direction===3?1:0);
 }
 const atlas=MOTION_ATLASES[file],frame=atlas?.frames[frameIndex];
 const pointsLeft=direction!==3&&(file==='motion-voltik.png'
  ||file==='motion-bubbfin.png'&&[3,5,7,9].includes(index)
  ||file==='motion-cindlet.png'&&index===9
  ||file==='motion-wisplet.png'&&index===7
  ||file==='motion-dreamweaver-beginnings.png'&&index>0&&index<5
  ||file==='motion-dreamweaver-ascendants.png'&&index%4===3
  ||/^motion-dreamweaver-crown-[023]\.png$/.test(file)&&index%4!==2);
 return frame?{file,atlas,frame,flip:direction!==3&&((direction===1)!==pointsLeft)}:{...original,flip:direction===1};
}

export function motionPose(action:NuvoAction,time:number,gait:Gait,reduced=false){
 const p=clamp(time/ACTION_SECONDS[action]),step=time*TAU/(gait==='crawl'?.9:.6);
 let x=0,y=0,angle=0,sx=1,sy=1,alpha=1,flash=0,limbs=0,flutter=0;
 if(action==='idle') {sy=1+Math.sin(time*2.4)*.018;flutter=Math.sin(time*3)*.035;if(['fly','float','swim'].includes(gait))y=-.045+Math.sin(time*2.8)*.018;}
 if(action==='walk'){
  limbs=Math.sin(step);flutter=Math.sin(step*1.6)*.18;
  y=gait==='hop'?-Math.max(0,Math.sin(step))*.13:gait==='fly'||gait==='float'?-.065+Math.sin(step)*.025:-Math.abs(Math.sin(step))*.025;
  angle=Math.sin(step)*(gait==='swim'?.06:gait==='crawl'?.015:.025);sy=1-Math.sin(step*2)*.018;
 }
 if(action==='attack'){
  const wind=p<.28?p/.28:Math.max(0,1-(p-.28)/.12),strike=p<.28?0:p<.48?(p-.28)/.2:Math.max(0,1-(p-.48)/.52);
  x=-wind*.07+Math.sin(strike*Math.PI/2)*.22;y=-Math.sin(strike*Math.PI)*.07;
  angle=-wind*.065+strike*.10;sx=1+wind*.035;sy=1-wind*.055;limbs=strike*.8;flutter=strike*.23;
 }
 if(action==='damaged'){x=-Math.sin(p*Math.PI)*.075+Math.sin(p*TAU*3)*.018*(1-p);angle=-Math.sin(p*Math.PI)*.12;flash=Math.sin(p*Math.PI)*.55;sy=1-Math.sin(p*Math.PI)*.045;}
 if(action==='faint'){const fall=clamp((p-.1)/.75);y=fall*.09;angle=fall*.95;sx=1-fall*.13;sy=1-fall*.32;alpha=1-fall*.75;}
 if(action==='summon'||action==='recall'){const q=action==='summon'?p:1-p;const ease=1-Math.pow(1-q,3);sx=sy=.08+.92*ease;alpha=clamp(q*3);y=-(1-ease)*.24;flash=(1-q)*.65;}
 if(reduced){x=0;y=0;angle=0;limbs=0;flutter=0;sx=sy=1;flash=0;alpha=action==='faint'?.3:1;}
 return {x,y,angle,sx,sy,alpha,flash,limbs,flutter,p};
}

/** Continuous mesh deformation keeps adjoining body regions attached throughout each gait. */
export function drawRig(c:CanvasRenderingContext2D,image:HTMLImageElement,f:SpriteRect,w:number,h:number,gait:Gait,limbs:number,flutter:number){
 if(Math.abs(limbs)+Math.abs(flutter)<.005){c.drawImage(image,f.x,f.y,f.width,f.height,-w/2,-h,w,h);return;}
 const cols=6,rows=6;
 const point=(u:number,v:number)=>{
  const feet=clamp((v-.57)/.43),wing=clamp((Math.abs(u-.5)-.12)/.38),neck=Math.sin(v*Math.PI);
  let dx=0,dy=0;
  if(gait==='walk'||gait==='crawl'){dx=limbs*feet*feet*(u<.5?-1:1)*w*.055;dy=-Math.max(0,limbs*(u<.5?-1:1))*feet*h*.055;}
  if(gait==='fly'){dy=flutter*wing*wing*h*.45;dx=-Math.abs(flutter)*wing*(u-.5)*w*.3;}
  if(gait==='swim'||gait==='float'){dx=Math.sin(v*Math.PI*2)*limbs*w*.026;dy=flutter*neck*h*.07;}
  if(gait==='hop')dy=-Math.max(0,limbs)*feet*h*.04;
  return {x:(u-.5)*w+dx,y:(v-1)*h+dy,sx:f.x+u*f.width,sy:f.y+v*f.height};
 };
 type Vertex=ReturnType<typeof point>;
 const triangle=(a:Vertex,b:Vertex,d:Vertex)=>{
  const den=a.sx*(b.sy-d.sy)+b.sx*(d.sy-a.sy)+d.sx*(a.sy-b.sy);if(!den)return;
  const solve=(aa:number,bb:number,dd:number)=>[(aa*(b.sy-d.sy)+bb*(d.sy-a.sy)+dd*(a.sy-b.sy))/den,(aa*(d.sx-b.sx)+bb*(a.sx-d.sx)+dd*(b.sx-a.sx))/den,(aa*(b.sx*d.sy-d.sx*b.sy)+bb*(d.sx*a.sy-a.sx*d.sy)+dd*(a.sx*b.sy-b.sx*a.sy))/den];
  const xx=solve(a.x,b.x,d.x),yy=solve(a.y,b.y,d.y),mx=(a.x+b.x+d.x)/3,my=(a.y+b.y+d.y)/3;
  c.save();c.beginPath();for(const [i,v] of [a,b,d].entries()){const vx=v.x+(v.x-mx)*.006,vy=v.y+(v.y-my)*.006;if(i)c.lineTo(vx,vy);else c.moveTo(vx,vy);}c.closePath();c.clip();
  c.transform(xx[0],yy[0],xx[1],yy[1],xx[2],yy[2]);c.drawImage(image,f.x,f.y,f.width,f.height,f.x,f.y,f.width,f.height);c.restore();
 };
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const a=point(col/cols,row/rows),b=point((col+1)/cols,row/rows),d=point(col/cols,(row+1)/rows),e=point((col+1)/cols,(row+1)/rows);
  triangle(a,b,d);triangle(b,e,d);
 }
}

export function drawNuvoActor(c:CanvasRenderingContext2D,id:string,x:number,y:number,size:number,direction:number,action:NuvoAction,time:number,prismatic=false,reduced=false){
 const s=SPECIES_BY_ID[id];if(!s)return;
 const sprite=directionalSprite(s,direction),image=artImage(sprite.file);if(!image)return;
 const gait=gaitFor(id),pose=motionPose(action,time,gait,reduced),scale=size*spriteFill(s)/Math.max(sprite.frame.width,sprite.frame.height),w=sprite.frame.width*scale,h=sprite.frame.height*scale;
 const facing=direction===1?-1:1;
 c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
 c.globalAlpha=pose.alpha*.18;c.fillStyle='#173936';c.beginPath();c.ellipse(x,y,Math.min(w*.35,size*.25),size*.045,0,0,TAU);c.fill();c.globalAlpha=pose.alpha;
 c.translate(x+pose.x*size*facing,y+pose.y*size);c.rotate(pose.angle*facing);c.scale((sprite.flip?-1:1)*pose.sx,pose.sy);
 if(prismatic||pose.flash)c.filter=`${prismatic?'hue-rotate(140deg) ':''}brightness(${1+pose.flash})`;
 drawRig(c,image,sprite.frame,w,h,gait,pose.limbs,pose.flutter);c.restore();
 if(!reduced&&(action==='summon'||action==='recall')){
  const p=pose.p,rad=size*(.08+p*.48),color=TYPE_COLORS[s.types[0]];c.save();c.globalAlpha=Math.sin(p*Math.PI)*.8;c.strokeStyle=color;c.lineWidth=2;
  c.beginPath();c.ellipse(x,y-4,rad,rad*.3,0,0,TAU);c.stroke();c.fillStyle=color;
  for(let i=0;i<12;i++){const a=i*TAU/12+p*2;c.beginPath();c.arc(x+Math.cos(a)*rad,y-h*.45+Math.sin(a)*rad,2+(1-p)*2,0,TAU);c.fill();}c.restore();
 }
 if(prismatic&&!reduced){c.save();c.fillStyle='#fff2a2';const t=time*2;c.fillRect(x+Math.cos(t)*size*.3,y-h*.5+Math.sin(t)*size*.25,2,2);c.restore();}
}
