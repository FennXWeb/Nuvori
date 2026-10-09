import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {REGIONS,REGION_BY_ID,BASE_SPECIES,type Region} from "./data";
import {getTerrain,terrainColor,isUnderground,WORLD_COLUMNS,WORLD_ROWS} from "./terrain";
import type {Save} from "./game";
import {NuvoArt} from "./components";
import {travelFare,travelReason} from './travel';
import "./atlas.css";

export function TerrainMap({region,x,y,detail=false}:{region:Region;x?:number;y?:number;detail?:boolean}){
 const terrain=getTerrain(region);
 const paths=useMemo(()=>{
  const grouped=new Map<string,string>();
  for(let y=0;y<WORLD_ROWS;y++)for(let x=0;x<WORLD_COLUMNS;){const kind=terrain.tiles[y][x],start=x;while(x<WORLD_COLUMNS&&terrain.tiles[y][x]===kind)x++;const color=terrainColor(kind,terrain.underground);grouped.set(color,(grouped.get(color)||"")+`M${start} ${y}h${x-start}v1h-${x-start}z`);}
  return [...grouped];
 },[terrain]);
 return <svg className="terrain-map" viewBox={`0 0 ${WORLD_COLUMNS} ${WORLD_ROWS}`} role="img" aria-label={`${region.name} terrain map${x!==undefined?", showing your position":""}`}>
  {paths.map(([fill,d])=><path key={fill} d={d} fill={fill}/>)}
  {region.kind==="Town"&&[[9,9],[27,17],[7,23],[9,18],[26,7],[28,22]].map(([xx,yy])=><rect key={`${xx}:${yy}`} x={xx-1.5} y={yy-2} width="3" height="3" fill="#ece0b7" stroke="#745f4d" strokeWidth=".3"/>)}
  {Object.keys(region.links).map(side=>{const [xx,yy]=side==="north"?[18,1]:side==="south"?[18,51]:side==="west"?[1,13]:[71,13];return <circle key={side} cx={xx} cy={yy} r="1.2" fill="#f2d791" stroke="#645a45" strokeWidth=".4"/>;})}
  {detail&&terrain.features.map((f,i)=><g key={f.name}><circle cx={f.x} cy={f.y} r="1.7" fill="#f4e9c9" stroke="#344f4c" strokeWidth=".25"/><text x={f.x} y={f.y+.65} fontSize="2" textAnchor="middle" fill="#203b34" fontWeight="bold">{i+1}</text></g>)}
  <text x={region.landmarkPosition?.[0]??18} y={(region.landmarkPosition?.[1]??7)+.7} textAnchor="middle" fontSize="3" fill="#fae4a7" stroke="#745d45" strokeWidth=".15">★</text>
  {x!==undefined&&y!==undefined&&<circle cx={x/32} cy={y/32} r={detail?1.1:1.5} fill="#f9f5d5" stroke="#244a40" strokeWidth=".65"/>}
 </svg>;
}

export function WorldAtlas({save,onTravel}:{save:Save|null;onTravel?:(id:string)=>void}){
 const [selected,setSelected]=useState(save?.region||'mossbell'),[mode,setMode]=useState<'area'|'world'>('world'),[zoom,setZoom]=useState(1),[confirm,setConfirm]=useState(false);
 const viewport=useRef<HTMLDivElement>(null),[mapWidth,setMapWidth]=useState(740);
 useEffect(()=>{const el=viewport.current;if(!el)return;const resize=()=>setMapWidth(window.innerWidth<=700?740:Math.max(400,Math.min(el.clientWidth,el.clientHeight*1.5)));const observer=new ResizeObserver(resize);observer.observe(el);resize();return()=>observer.disconnect();},[mode]);
 const regions=REGIONS.filter(r=>!r.hidden||save?.visited.includes(r.id)),r=REGION_BY_ID[selected],terrain=getTerrain(r),known=Boolean(save?.visited.includes(r.id));
 const fare=save?travelFare(save.region,r.id):null,reason=save?travelReason(save,r.id):'Begin your adventure to discover the skyways.';
 const select=(id:string)=>{setSelected(id);setConfirm(false);};
 return <div className="trail-atlas illustrated-atlas">
  <div className="atlas-toolbar"><div role="group" aria-label="Map view"><button className={mode==='world'?'active':''} onClick={()=>setMode('world')}>✦ World atlas</button><button className={mode==='area'?'active':''} onClick={()=>setMode('area')}>⌖ Local trails</button></div><span className="atlas-progress">{save?.visited.filter(id=>!REGION_BY_ID[id]?.hidden).length||0} / {REGIONS.filter(r=>!r.hidden).length} discovered</span><label>Find a place<select aria-label="Map region" value={selected} onChange={e=>select(e.target.value)}>{regions.map(r=><option key={r.id} value={r.id}>{r.name}{save?.region===r.id?' · You are here':''}</option>)}</select></label></div>
  <div className="atlas-layout"><div className="atlas-viewport">
   {mode==='world'?<><div ref={viewport} className="painted-map-scroll" tabIndex={0} aria-label="World map. Scroll to explore at increased zoom."><div className="painted-map" style={{width:mapWidth*zoom}}>
    <img src={`${import.meta.env.BASE_URL}assets/auralis-atlas.png`} alt="Illustrated Auralis: western forests, northern snowy peaks, central crystal caverns, eastern desert and marshes, and southern coastal towns."/>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="atlas-routes" aria-hidden="true">{regions.flatMap(r=>Object.values(r.links).filter(id=>id&&r.id<id).map(id=>{const to=REGION_BY_ID[id!],active=r.id===selected||id===selected;return <line key={r.id+id} x1={r.pos[0]} y1={r.pos[1]} x2={to.pos[0]} y2={to.pos[1]} className={active?'selected':''} strokeDasharray={isUnderground(r)||isUnderground(to)?'.5 .7':'1 .6'}/>;}))}</svg>
    <span className="atlas-compass" aria-hidden="true">N<br/>✥<small>AURALIS</small></span>
    {regions.map(area=><button key={area.id} aria-pressed={selected===area.id} aria-label={`${area.name}${area.id===save?.region?', current location':save?.visited.includes(area.id)?', discovered':', undiscovered'}`} className={`painted-pin ${save?.visited.includes(area.id)?'discovered':''} ${area.id===save?.region?'current':''} ${selected===area.id?'selected':''}`} style={{left:`${area.hidden?91:area.pos[0]}%`,top:`${area.hidden?7:area.pos[1]}%`,'--region':area.color} as CSSProperties} onClick={()=>select(area.id)}><i>{area.hidden?'✧':area.kind==='Town'?'⌂':isUnderground(area)?'◈':'❧'}</i><strong>{area.name}</strong>{area.id===save?.region&&<small>YOU ARE HERE</small>}</button>)}
   </div></div><div className="atlas-zoom"><span>THE KEEPER’S ATLAS</span><button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}>−</button><button aria-label="Reset map zoom" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button aria-label="Zoom in" disabled={zoom>=2} onClick={()=>setZoom(z=>Math.min(2,z+.25))}>+</button></div></>
   :<div className="local-trail-view"><TerrainMap region={r} detail x={save?.region===r.id&&!save.interior?save.x:undefined} y={save?.region===r.id&&!save.interior?save.y:undefined}/><div className="terrain-legend"><span>● Your position</span><span>◆ Trail exits</span><span>★ Landmark</span><span>Green · wild grass</span><span>Grey · cave gravel</span></div><ol>{terrain.features.map(f=><li key={f.name}>{f.name}</li>)}</ol></div>}
  </div><aside className="atlas-destination"><span className="nu-kicker">{r.hidden?'BEYOND THE WAKING WORLD':r.kind==='Town'?'A PLACE TO CALL HOME':isUnderground(r)?'BENEATH THE SURFACE':'THE WILD CALLS'}</span><h3>{r.name}</h3><p className="atlas-subtitle">{r.subtitle}</p><span className={`discovery-tag ${known?'known':''}`}>{r.id===save?.region?'⌖ Current location':known?'✓ Discovered':'◇ Yet to discover'}</span><p>{r.description}</p><div className="atlas-landmark"><small>LANDMARK</small><strong>✧ {r.landmark}</strong></div>
   <section className="skyway-ticket"><span className="nu-kicker">AURALIS SKYWAYS</span><h4>{fare!==null?`${fare} coins`:'Your next horizon'}</h4><p>{reason||'Travel directly to this discovered area. Your crew’s health stays unchanged.'}</p>{!reason&&!onTravel&&<p>Finish your current battle before travelling.</p>}{confirm&&<p className="travel-confirm" role="status">Spend {fare} coins to visit {r.name}? You’ll have {save!.coins-fare!} coins left.</p>}<button className="nu-button primary" disabled={Boolean(reason)||!onTravel} onClick={()=>{if(confirm){onTravel?.(r.id);setConfirm(false);}else setConfirm(true);}}>{confirm?`Confirm · ${fare} coins`:'✦ Fast travel'}</button>{confirm&&<button className="text-button" onClick={()=>setConfirm(false)}>Cancel</button>}<small>Your purse · {save?.coins.toLocaleString()??0} coins</small></section>
   <div className="atlas-connections"><span className="nu-kicker">CONNECTING TRAILS</span>{Object.entries(r.links).map(([side,id])=><button key={side} onClick={()=>select(id!)}>{({north:'↑',south:'↓',east:'→',west:'←'})[side]} {REGION_BY_ID[id!].name}</button>)}</div>
   <section className="atlas-habitats"><h4>{r.kind==='Town'?'Rest, prepare, explore.':'Nuvo found here'}</h4><p>{r.kind==='Town'?'A safe haven. Follow the connecting trails for wild encounters.':`Lv. ${r.level[0]}–${r.level[1]} · ${isUnderground(r)?'Search the loose gravel.':'Search the tall grass.'}`}</p>{r.kind!=='Town'&&<div className="atlas-nuvo-list">{r.pool.map(i=>{const n=BASE_SPECIES[i];return <span key={n.id}><NuvoArt id={n.id} size={45}/><small>{save?.caught.includes(n.id)?'✓ ':''}{n.name}</small></span>;})}</div>}</section>
  </aside></div>
 </div>;
}
