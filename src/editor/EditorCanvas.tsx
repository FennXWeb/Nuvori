import {useEffect,useRef,useState} from 'react';
import {Maximize,Minus,Plus} from 'lucide-react';
import {REGION_BY_ID} from '../data';
import {preloadIllustratedArt,artImage,paintSurface} from '../illustratedArt';
import {drawTerrainTile,terrainSurface} from '../terrainArt';
import {terrainColor,terrainBlocked,type TerrainTile} from '../terrain';
import {drawWorldObject} from '../worldObjectArt';
import {drawInterior} from '../interiors';
import {drawTallGrass} from '../worldScenery';
import type {AuthoredCell,WorldObject} from '../worldContent';
import type {Interior} from '../adventure';
import {paintLine,flood,objectBounds} from './model';
import {type Asset} from './catalog';

export type Tool='select'|'brush'|'fill'|'rectangle'|'erase'|'habitat'|'pan'|'place';
interface Props {
 region:string;room:Interior|undefined;cell:AuthoredCell;tool:Tool;material:TerrainTile;brush:number;asset:Asset;
 selected:number;zone:number;grid:boolean;collision:boolean;habitats:boolean;objectsVisible:boolean;rendered:boolean;snap:boolean;
 onSelect:(index:number)=>void;onZone:(index:number)=>void;onCommit:(cell:AuthoredCell)=>void;onPointer:(point:[number,number])=>void;
}
export function EditorCanvas(props:Props){
 const canvas=useRef<HTMLCanvasElement>(null),mini=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 const camera=useRef({x:0,y:0,z:.4}),fit=useRef(()=>{}),[zoom,setZoom]=useState(40);
 const gesture=useRef<{start:[number,number];last:[number,number];draft:AuthoredCell;tool:Tool;index:number;offset:[number,number];client:[number,number];changed:boolean}|null>(null);
 const background=useRef<{cell:AuthoredCell;room?:Interior;rendered:boolean;image:HTMLCanvasElement}|null>(null);
 useEffect(()=>{background.current=null;fit.current();},[props.region,props.room]);
 useEffect(()=>{let alive=true;void preloadIllustratedArt().then(()=>{if(alive)background.current=null;});artImage('world-atlas.png');return()=>{alive=false;};},[]);
 useEffect(()=>{
  const el=canvas.current!,c=el.getContext('2d')!;let w=0,h=0,raf=0,last=0,space=false,hover:[number,number]|undefined;
  const dimensions=()=>latest.current.room?[1152,832]:[2304,1664];
  fit.current=()=>{const [width,height]=dimensions();camera.current={z:Math.max(.15,Math.min((w-88)/width,(h-88)/height)),x:0,y:0};const v=camera.current;v.x=(w-width*v.z)/2;v.y=(h-height*v.z)/2;setZoom(Math.round(v.z*100));};
  const ro=new ResizeObserver(([entry])=>{w=entry.contentRect.width;h=entry.contentRect.height;el.width=w*devicePixelRatio;el.height=h*devicePixelRatio;fit.current();});ro.observe(el);
  const point=(e:PointerEvent):[number,number]=>{const b=el.getBoundingClientRect(),v=camera.current;return [(e.clientX-b.left-v.x)/v.z/32,(e.clientY-b.top-v.y)/v.z/32];};
  const objects=(cell:AuthoredCell)=>latest.current.room?(cell.interiors?.[latest.current.room!]??[]):cell.objects;
  const down=(e:PointerEvent)=>{
   if(e.button!==0&&e.button!==1)return;e.preventDefault();el.focus();el.setPointerCapture(e.pointerId);
   const p=latest.current,at=point(e),tool=e.button===1||space?'pan':p.tool,draft=structuredClone(p.cell);
   if(tool!=='pan'&&(at[0]<0||at[0]>=72||at[1]<0||at[1]>=52))return;
   const g={start:at,last:at,draft,tool,index:-1,offset:[0,0] as [number,number],client:[e.clientX,e.clientY] as [number,number],changed:false};gesture.current=g;
   if(tool==='select'||tool==='erase'){
    const hit=objects(draft).map((o,i)=>({o,i})).sort((a,b)=>b.o.y-a.o.y).find(({o})=>{const b=objectBounds(o);return at[0]*32>=b.left&&at[0]*32<=b.right&&at[1]*32>=b.top&&at[1]*32<=b.bottom;});
    g.index=hit?.i??-1;p.onSelect(g.index);
    if(hit){g.offset=[hit.o.x-at[0],hit.o.y-at[1]];if(tool==='erase'){objects(draft).splice(hit.i,1);p.onSelect(-1);g.changed=true;}}
   }else if(tool==='place'){
    const x=Math.max(0,Math.min(71,p.snap?Math.round(at[0]):at[0])),y=Math.max(0,Math.min(51,p.snap?Math.round(at[1]):at[1]));
    objects(draft).push({...p.asset.prop,x,y,id:crypto.randomUUID()});p.onSelect(objects(draft).length-1);g.changed=true;
   }else if(!p.room&&tool==='brush'){paintLine(draft.tiles,[Math.floor(at[0]),Math.floor(at[1])],[Math.floor(at[0]),Math.floor(at[1])],p.brush,p.material);g.changed=true;}
   else if(!p.room&&tool==='fill'){flood(draft.tiles,Math.floor(at[0]),Math.floor(at[1]),p.material);g.changed=true;}
  };
  const move=(e:PointerEvent)=>{
   const at=point(e);hover=at;latest.current.onPointer([Math.floor(at[0]),Math.floor(at[1])]);const g=gesture.current;if(!g)return;
   const p=latest.current;
   if(g.tool==='pan'){camera.current.x+=e.clientX-g.client[0];camera.current.y+=e.clientY-g.client[1];g.client=[e.clientX,e.clientY];}
   else if(g.tool==='select'&&g.index>=0){const obj=objects(g.draft)[g.index];obj.x=Math.max(0,Math.min(71,p.snap?Math.round(at[0]+g.offset[0]):at[0]+g.offset[0]));obj.y=Math.max(0,Math.min(51,p.snap?Math.round(at[1]+g.offset[1]):at[1]+g.offset[1]));g.changed=true;}
   else if(g.tool==='brush'&&!p.room){paintLine(g.draft.tiles,[Math.floor(g.last[0]),Math.floor(g.last[1])],[Math.floor(at[0]),Math.floor(at[1])],p.brush,p.material);g.changed=true;}
   g.last=at;
  };
  const up=()=>{
   const g=gesture.current;if(!g)return;const p=latest.current;
   if((g.tool==='rectangle'||g.tool==='habitat')&&!p.room){
    const x=Math.max(0,Math.min(71,Math.floor(Math.min(g.start[0],g.last[0])))),y=Math.max(0,Math.min(51,Math.floor(Math.min(g.start[1],g.last[1])))),right=Math.max(x,Math.min(71,Math.floor(Math.max(g.start[0],g.last[0])))),bottom=Math.max(y,Math.min(51,Math.floor(Math.max(g.start[1],g.last[1]))));
    if(g.tool==='rectangle')for(let yy=y;yy<=bottom;yy++)for(let xx=x;xx<=right;xx++)g.draft.tiles[yy][xx]=p.material;
    else{g.draft.encounters.zones.push({id:crypto.randomUUID(),name:`Habitat ${g.draft.encounters.zones.length+1}`,x,y,width:right-x+1,height:bottom-y+1,rate:.22,entries:structuredClone(g.draft.encounters.entries)});p.onZone(g.draft.encounters.zones.length-1);}
    g.changed=true;
   }
   gesture.current=null;if(g.changed){background.current=null;p.onCommit(g.draft);}
  };
  const cancel=()=>{gesture.current=null;};
  const wheel=(e:WheelEvent)=>{e.preventDefault();const b=el.getBoundingClientRect(),v=camera.current,old=v.z;v.z=Math.max(.15,Math.min(2.5,v.z*Math.exp(-e.deltaY*.0015)));v.x=e.clientX-b.left-(e.clientX-b.left-v.x)*v.z/old;v.y=e.clientY-b.top-(e.clientY-b.top-v.y)*v.z/old;setZoom(Math.round(v.z*100));};
  const keydown=(e:KeyboardEvent)=>{if(e.code==='Space'&&e.target===el){e.preventDefault();space=true;}if(e.key==='Escape')cancel();};
  const keyup=(e:KeyboardEvent)=>{if(e.code==='Space')space=false;};
  const blur=()=>{space=false;cancel();};
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);el.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  const draw=(time:number)=>{
   raf=requestAnimationFrame(draw);if(time-last<40)return;last=time;
   const p=latest.current,g=gesture.current,cell=g?.draft??p.cell,v=camera.current,r=REGION_BY_ID[p.region],painting=!!g&&['brush','fill','rectangle'].includes(g.tool),rendered=p.rendered&&!painting;
   c.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);c.fillStyle='#0c191c';c.fillRect(0,0,w,h);
   c.save();c.translate(v.x,v.y);c.scale(v.z,v.z);c.imageSmoothingEnabled=true;
   const [worldW,worldH]=dimensions();c.shadowColor='#0008';c.shadowBlur=50;c.fillStyle='#254534';c.fillRect(0,0,worldW,worldH);c.shadowBlur=0;
   if(p.room)drawInterior(c,p.room,time/1000);
   else {
    if(!painting&&(!background.current||background.current.cell!==p.cell||background.current.room!==p.room||background.current.rendered!==rendered)){
     const image=document.createElement('canvas');image.width=worldW;image.height=worldH;const bc=image.getContext('2d')!;
     for(let y=0;y<52;y++)for(let x=0;x<72;x++){const tile=cell.tiles[y][x];if(rendered)drawTerrainTile(bc,x,y,r,0,tile);else{bc.fillStyle=terrainColor(tile);bc.fillRect(x*32,y*32,32,32);paintSurface(bc,terrainSurface(r,tile),x*32,y*32,32,32);}}
     if(rendered)for(let y=0;y<52;y++)for(let x=0;x<72;x++)if(cell.tiles[y][x]==='grass')drawTallGrass(bc,x,y,0,r,-100,-100);
     background.current={cell:p.cell,room:p.room,rendered,image};
    }
    if(!painting&&background.current)c.drawImage(background.current.image,0,0);
    else for(let y=0;y<52;y++)for(let x=0;x<72;x++){c.fillStyle=terrainColor(cell.tiles[y][x]);c.fillRect(x*32,y*32,32,32);}
   }
   if(p.objectsVisible)objects(cell).map((o,i)=>({o,i})).sort((a,b)=>a.o.y-b.o.y).forEach(({o,i})=>{drawWorldObject(c,o,r,time/1000,p.room);if(p.collision&&o.solid){c.fillStyle='#ef888440';c.fillRect(o.x*32-20,o.y*32-24,40,33);}if(p.selected===i){const b=objectBounds(o);c.strokeStyle='#f5d88c';c.lineWidth=2/v.z;c.setLineDash([6/v.z,4/v.z]);c.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);c.setLineDash([]);c.fillStyle='#ffe4a4';c.beginPath();c.arc(o.x*32,o.y*32,5/v.z,0,7);c.fill();}});
   if(p.collision&&!p.room)for(let y=0;y<52;y++)for(let x=0;x<72;x++)if(terrainBlocked(cell.tiles[y][x])){c.fillStyle='#f271694a';c.fillRect(x*32,y*32,32,32);}
   if(p.habitats&&!p.room)cell.encounters.zones.forEach((z,i)=>{c.fillStyle=i===p.zone?'#d8b77835':'#64e8c21a';c.fillRect(z.x*32,z.y*32,z.width*32,z.height*32);c.strokeStyle=i===p.zone?'#efcc86':'#70dfc2';c.lineWidth=2/v.z;c.strokeRect(z.x*32,z.y*32,z.width*32,z.height*32);c.font=`600 ${11/v.z}px sans-serif`;c.fillStyle='#dff9ea';c.fillText(z.name,z.x*32+5/v.z,z.y*32+16/v.z);});
   if(p.grid){c.beginPath();for(let x=0;x<=worldW;x+=32){c.moveTo(x,0);c.lineTo(x,worldH);}for(let y=0;y<=worldH;y+=32){c.moveTo(0,y);c.lineTo(worldW,y);}c.strokeStyle='#dceac322';c.lineWidth=.5/v.z;c.stroke();}
   if(!p.room){c.strokeStyle='#f1da91';c.lineWidth=2/v.z;c.strokeRect(17*32,15*32,32,32);}
   if(g&&['rectangle','habitat'].includes(g.tool)){c.fillStyle='#fff2a830';c.strokeStyle='#fff2a8';c.lineWidth=2/v.z;const x=g.start[0]*32,y=g.start[1]*32,ww=(g.last[0]-g.start[0])*32,hh=(g.last[1]-g.start[1])*32;c.fillRect(x,y,ww,hh);c.strokeRect(x,y,ww,hh);}
   if(hover&&p.tool==='brush'&&!p.room){c.strokeStyle='#fff3cb';c.lineWidth=1.5/v.z;c.beginPath();c.arc((Math.floor(hover[0])+.5)*32,(Math.floor(hover[1])+.5)*32,p.brush*16,0,7);c.stroke();}
   c.restore();
   const mc=mini.current?.getContext('2d');if(mc){mc.clearRect(0,0,180,130);for(let y=0;y<52;y++)for(let x=0;x<72;x++){mc.fillStyle=terrainColor(cell.tiles[y][x]);mc.fillRect(x*2.5,y*2.5,2.5,2.5);}mc.strokeStyle='#ffedb8';mc.lineWidth=1.5;mc.strokeRect(-v.x/v.z/worldW*180,-v.y/v.z/worldH*130,w/v.z/worldW*180,h/v.z/worldH*130);}
  };raf=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(raf);ro.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);el.removeEventListener('wheel',wheel);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);};
 },[]);
 const scale=(factor:number)=>{const v=camera.current,el=canvas.current!,cx=el.clientWidth/2,cy=el.clientHeight/2,old=v.z;v.z=Math.max(.15,Math.min(2.5,old*factor));v.x=cx-(cx-v.x)*v.z/old;v.y=cy-(cy-v.y)*v.z/old;setZoom(Math.round(v.z*100));};
 return <div className={`studio-viewport tool-${props.tool}`}><canvas ref={canvas} tabIndex={0} aria-label="World editing canvas. Scroll to zoom, hold Space and drag to pan."/><div className="studio-minimap"><span>REGION OVERVIEW</span><canvas width={180} height={130} ref={mini} onClick={e=>{const b=e.currentTarget.getBoundingClientRect(),v=camera.current,el=canvas.current!;v.x=el.clientWidth/2-(e.clientX-b.left)/b.width*2304*v.z;v.y=el.clientHeight/2-(e.clientY-b.top)/b.height*1664*v.z;}}/></div><div className="studio-zoom"><button title="Zoom out" onClick={()=>scale(.8)}><Minus size={15}/></button><span>{zoom}%</span><button title="Zoom in" onClick={()=>scale(1.25)}><Plus size={15}/></button><button title="Fit cell" onClick={()=>fit.current()}><Maximize size={15}/></button></div><div className="studio-canvas-hint">SCROLL TO ZOOM <i/> SPACE + DRAG TO PAN <i/> YELLOW SQUARE = ARRIVAL</div></div>;
}

export function AssetPreview({asset,region}:{asset:Asset;region:string}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let active=true;const paint=()=>{if(!active||!ref.current)return;const c=ref.current.getContext('2d')!;c.clearRect(0,0,96,82);c.save();c.translate(48,74);c.scale(.48,.48);drawWorldObject(c,{...asset.prop,x:0,y:0},REGION_BY_ID[region],0);c.restore();};paint();void preloadIllustratedArt().then(paint);const timer=setTimeout(paint,1200);return()=>{active=false;clearTimeout(timer);};},[asset,region]);
 return <canvas ref={ref} width={96} height={82} aria-hidden="true"/>;
}
