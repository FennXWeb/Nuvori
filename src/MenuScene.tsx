import {useEffect,useRef} from 'react';
import {drawRig} from './nuvoAnimation';

/** A layered illustration with an articulated foreground, parallax and drifting starlight. */
export function MenuScene({quiet=false}:{quiet?:boolean}){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const el=canvas.current!,c=el.getContext('2d')!,host=root.current!,media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const art=new Image();art.src=import.meta.env.BASE_URL+'assets/menu-solunelle.png';
  let alive=true,raf=0,last=0,start=0,w=0,h=0,px=0,py=0,targetX=0,targetY=0;
  const resize=()=>{w=host.clientWidth;h=host.clientHeight;const dpr=Math.min(devicePixelRatio||1,1.5);el.width=Math.ceil(w*dpr);el.height=Math.ceil(h*dpr);c.setTransform(dpr,0,0,dpr,0,0);};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const pointer=(e:PointerEvent)=>{targetX=(e.clientX/innerWidth-.5)*14;targetY=(e.clientY/innerHeight-.5)*8;};
  window.addEventListener('pointermove',pointer,{passive:true});
  const draw=(now:number)=>{
   if(!alive)return;raf=requestAnimationFrame(draw);if(now-last<32||document.hidden)return;last=now;if(!start)start=now;
   const reduced=media.matches||quiet,t=reduced?0:(now-start)/1000;
   px+=(targetX-px)*.08;py+=(targetY-py)*.08;
   host.style.setProperty('--scene-x',`${reduced?0:px*.45}px`);host.style.setProperty('--scene-y',`${reduced?0:py*.45}px`);
   c.clearRect(0,0,w,h);
   if(art.complete&&art.naturalWidth){
    const mobile=w<760,size=Math.min(w*(mobile?1.05:.53),h*(mobile?.63:.90)),ratio=art.naturalHeight/art.naturalWidth,aw=size,ah=size*ratio;
    const x=w*(mobile?.68:.70)+(reduced?0:px),y=h*(mobile?.55:.71)+(reduced?0:Math.sin(t*.8)*8+py);
    c.save();c.translate(x,y);c.globalAlpha=quiet?.7:1;
    drawRig(c,art,{x:0,y:0,width:art.naturalWidth,height:art.naturalHeight},aw,ah,'float',Math.sin(t*.75)*.22,Math.sin(t*.9)*.06);c.restore();
   }
   if(!reduced)for(let i=0;i<40;i++){
    const x=((i*79.7+Math.sin(t*.2+i)*24)%1000)/1000*w,y=(h-((t*(5+i%4)+i*37)%(h+60)));
    const alpha=(.15+.4*(.5+.5*Math.sin(t*.7+i)))*(quiet?.35:1);c.fillStyle=`rgba(255,230,168,${alpha})`;c.beginPath();c.arc(x,y,i%6===0?2:1,0,Math.PI*2);c.fill();
   }
  };
  raf=requestAnimationFrame(draw);return()=>{alive=false;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('pointermove',pointer);};
 },[quiet]);
 return <div className="lobby-scene" ref={root} aria-hidden="true"><div className="lobby-backplate"/><div className="lobby-aurora"/><div className="lobby-orbit orbit-one"/><div className="lobby-orbit orbit-two"/><canvas ref={canvas}/><div className="lobby-vignette"/></div>;
}
