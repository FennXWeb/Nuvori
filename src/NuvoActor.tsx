import {useEffect,useRef} from 'react';
import {SPECIES_BY_ID} from './data';
import {drawNuvoActor,ACTION_SECONDS,type NuvoAction} from './nuvoAnimation';

/** Shared renderer for battle actions, four-way followers and the animation viewer. */
export function NuvoActor({id,size=200,direction=0,action='idle',animationKey=0,prismatic=false,hold=false}:{id:string;size?:number;direction?:number;action?:NuvoAction;animationKey?:number|string;prismatic?:boolean;hold?:boolean}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current!,c=canvas.getContext('2d')!,ratio=Math.min(window.devicePixelRatio||1,2),extent=size*1.6;
  canvas.width=canvas.height=Math.ceil(extent*ratio);c.scale(ratio,ratio);
  let raf=0,first:number|undefined;const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const draw=(t:number)=>{if(first===undefined)first=t;const elapsed=(t-first)/1000,duration=ACTION_SECONDS[action],loop=action==='idle'||action==='walk',finished=!loop&&elapsed>duration;
   c.clearRect(0,0,extent,extent);drawNuvoActor(c,id,extent/2,extent*.72,size,direction,finished&&!hold&&action!=='faint'&&action!=='recall'?'idle':action,loop||!finished?elapsed:hold||action==='faint'||action==='recall'?duration:elapsed-duration,prismatic,media.matches);
   raf=requestAnimationFrame(draw);
  };raf=requestAnimationFrame(draw);return()=>cancelAnimationFrame(raf);
 },[id,size,direction,action,animationKey,prismatic,hold]);
 return <span className="nuvo-actor" role="img" aria-label={`${prismatic?'Prismatic ':''}${SPECIES_BY_ID[id]?.name} · ${action}`} data-action={action} data-facing={direction} style={{display:'inline-block',position:'relative',width:size,height:size}}><canvas ref={ref} aria-hidden="true" style={{position:'absolute',width:'160%',height:'160%',left:'-30%',top:'-23%',pointerEvents:'none'}}/></span>;
}
