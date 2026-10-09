import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DEFAULT_APPEARANCE,HAIR_STYLES,TOP_STYLES,drawDressedKeeper} from '../src/appearance';
import {preloadIllustratedArt,drawArt,WORLD_ART} from '../src/illustratedArt';
import {drawCompanion} from '../src/spriteMotion';

function Review(){
 const canvas=useRef<HTMLCanvasElement>(null),[mode,setMode]=useState('Hair & facings'),[moving,setMoving]=useState(true);
 useEffect(()=>{let alive=true,raf=0;const c=canvas.current!.getContext('2d')!,nuvo=new Image();nuvo.src='/assets/nuvo-atlas.png';
  void preloadIllustratedArt().then(()=>{function draw(t:number){if(!alive)return;c.fillStyle='#d8dfcf';c.fillRect(0,0,1500,1500);c.textAlign='center';c.font='14px sans-serif';c.fillStyle='#273d37';
   if(mode==='Hair & facings'||mode==='Outfits & colors'||mode==='Hats & accessories'){
    const count=mode==='Outfits & colors'?10:12;
    for(let i=0;i<count;i++)for(let d=0;d<4;d++){
     const x=90+d*150+(i%2)*750,y=170+Math.floor(i/2)*235;
     const a={...DEFAULT_APPEARANCE,...(mode==='Hair & facings'?{hairStyle:i,hairTint:6}:mode==='Outfits & colors'?{top:i,topTint:(i+4)%12,bottom:i%4,skin:i%6,hairTint:i%12}:{hat:i%6,accessory:Math.floor(i/2),hairStyle:i})};
     drawDressedKeeper(c,x,y,125,a,d,t/1000*8,moving);c.fillStyle='#273d37';c.fillText(mode==='Hair & facings'?HAIR_STYLES[i]:mode==='Outfits & colors'?TOP_STYLES[i]:`Hat ${a.hat} · extra ${a.accessory}`,x,y+25);
    }
   }else{
    const file=mode==='Decor'?'illustrated-decor.png':mode==='Buildings'?'illustrated-buildings.png':'illustrated-landmarks.png';
    WORLD_ART[file].frames.forEach((_,i)=>{const x=180+(i%4)*350,y=280+Math.floor(i/4)*290;drawArt(c,file,i,x,y,245,240);c.fillStyle='#273d37';c.fillText(String(i),x,y+20);});
   }
   drawCompanion(c,nuvo,'spriglet',1390,1430,t/1000,true,0,false);raf=requestAnimationFrame(draw);
  }raf=requestAnimationFrame(draw);});return()=>{alive=false;cancelAnimationFrame(raf);};
 },[mode,moving]);
 return <main><nav style={{padding:20,fontFamily:'sans-serif',display:'flex',gap:12}}>{['Hair & facings','Outfits & colors','Hats & accessories','Decor','Buildings','Landmarks'].map(m=><button onClick={()=>setMode(m)} key={m}>{m}</button>)}<button onClick={()=>setMoving(v=>!v)}>{moving?'Pause animation':'Animate'}</button><a href='/qa.html'>World fixtures</a></nav><canvas ref={canvas} width={1500} height={1500} style={{width:'100%',maxWidth:1500}}/></main>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Review/>);
