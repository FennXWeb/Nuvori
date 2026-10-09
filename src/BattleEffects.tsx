import {useEffect,useRef} from "react";
import {MOVE_BY_ID,TYPE_COLORS,type Element} from "./data";
const TAU=Math.PI*2;
function glyph(c:CanvasRenderingContext2D,type:Element,size:number,t:number){
 c.beginPath();
 if(type==="Volt"){c.moveTo(-size,-size);c.lineTo(size*.4,-size*.2);c.lineTo(0,size*.1);c.lineTo(size,size);c.lineTo(-size*.25,size*.1);c.lineTo(0,-size*.2);}
 else if(type==="Bloom"){c.ellipse(0,0,size,size*.4,.5,0,TAU);}
 else if(type==="Flame"){c.moveTo(0,-size*1.8);c.bezierCurveTo(size*2,0,size, size,-size*.4,size);c.bezierCurveTo(-size*1.4,size,-size,-size*.2,0,-size*1.8);}
 else if(type==="Frost"||type==="Astral"){for(let i=0;i<10;i++){const a=i*Math.PI/5,s=i%2?size*.32:size;c.lineTo(Math.cos(a)*s,Math.sin(a)*s);}c.closePath();}
 else if(type==="Stone"){for(let i=0;i<6;i++){const a=i*TAU/6;c.lineTo(Math.cos(a)*size,Math.sin(a)*size*(i%2?.8:1.2));}c.closePath();}
 else if(type==="Metal"){c.moveTo(-size,-size*.2);c.lineTo(size,-size*.6);c.lineTo(size*.5,size*.2);c.lineTo(-size,size*.6);c.closePath();}
 else if(type==="Gale"){c.arc(0,0,size,.2+t,Math.PI*1.4+t);c.stroke();return;}
 else if(type==="Tide"){c.moveTo(0,-size*1.5);c.bezierCurveTo(size*1.5,0,size,size,-size*.2,size);c.bezierCurveTo(-size,size,-size*.8,0,0,-size*1.5);}
 else {c.arc(0,0,size,0,TAU);}
 c.fill();
}
export function MoveAnimation({moveId,animationKey}:{moveId:string;animationKey:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current!,c=canvas.getContext("2d")!,move=MOVE_BY_ID[moveId];if(!move)return;
  const w=canvas.width=1000,h=canvas.height=450,color=TYPE_COLORS[move.type],reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const supportive=move.power===0&&["heal","guard"].includes(move.effect??""),targetX=supportive?245:755,targetY=supportive?310:165;
  let raf=0,start=0;
  const ring=(x:number,y:number,r:number,alpha:number)=>{c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.ellipse(x,y,r,r*.6,-.25,0,TAU);c.stroke();};
  const draw=(time:number)=>{
   if(!start)start=time;const p=(time-start)/(reduced?500:1100);c.clearRect(0,0,w,h);if(p>1)return;
   c.save();c.globalCompositeOperation="source-over";
   if(reduced){ring(targetX,targetY,55,p<.5?p*1.4:(1-p)*1.4);c.restore();raf=requestAnimationFrame(draw);return;}
   const charge=Math.min(1,p/.24),flight=Math.max(0,Math.min(1,(p-.22)/.36)),impact=Math.max(0,(p-.56)/.44);
   c.shadowColor=color;c.shadowBlur=13;c.fillStyle=color;c.strokeStyle=color;
   if(p<.42){ring(245,310,12+charge*44,(1-p/.42)*.7);for(let i=0;i<12;i++){const a=i*TAU/12+p*5,r=65*(1-charge)+10;c.globalAlpha=.5;c.save();c.translate(245+Math.cos(a)*r,310+Math.sin(a)*r*.6);glyph(c,move.type,3+i%3,p);c.restore();}}
   if(p>=.18&&p<.65){
    const count=18+move.animation%9;
    for(let i=0;i<count;i++){const q=Math.max(0,flight-i*.025),wave=Math.sin(q*Math.PI*(2+move.animation%4)+i)*12;
     const x=245+(targetX-245)*q,y=310+(targetY-310)*q-Math.sin(q*Math.PI)*(35+move.animation%5*12)+wave;
     c.globalAlpha=(1-i/count)*.85;c.save();c.translate(x,y);c.rotate(q*6+i);glyph(c,move.type,(7+(move.animation%7))*(1-i/count)+2,p*5);c.restore();
    }
   }
   if(impact>0){
    ring(targetX,targetY,18+impact*135,(1-impact)*.65);
    ring(targetX,targetY,8+impact*90,(1-impact)*.4);
    const glow=c.createRadialGradient(targetX,targetY,0,targetX,targetY,90);glow.addColorStop(0,color+"80");glow.addColorStop(1,color+"00");c.fillStyle=glow;c.globalAlpha=(1-impact)*.5;c.fillRect(targetX-90,targetY-90,180,180);c.fillStyle=color;
    for(let i=0;i<28;i++){const a=i*2.39996+move.animation,r=(18+impact*145)*( .3+(i%7)/8);c.save();c.translate(targetX+Math.cos(a)*r,targetY+Math.sin(a)*r*.65+impact*impact*28);c.rotate(a+impact*3);c.globalAlpha=(1-impact)*(.45+i%3*.15);glyph(c,move.type,(4+i%6)*(1-impact*.7),p*3);c.restore();}
    if(move.type==="Volt"){c.globalAlpha=(1-impact)*.7;c.lineWidth=2;for(let i=0;i<5;i++){const a=i*TAU/5;c.beginPath();c.moveTo(targetX,targetY);for(let j=1;j<6;j++)c.lineTo(targetX+Math.cos(a)*j*21+(j%2?10:-10),targetY+Math.sin(a)*j*17);c.stroke();}}
    if(move.type==="Shade"){c.globalAlpha=(1-impact)*.4;c.fillStyle="#253052";c.beginPath();c.arc(targetX,targetY,impact*60,0,TAU);c.fill();}
   }
   c.restore();raf=requestAnimationFrame(draw);
  };
  raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
 },[moveId,animationKey]);
 return <canvas ref={ref} className="move-animation" aria-hidden="true"/>;
}
