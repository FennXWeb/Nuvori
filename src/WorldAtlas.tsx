import {useMemo,useState,type CSSProperties} from "react";
import {REGIONS,REGION_BY_ID,BASE_SPECIES,type Region} from "./data";
import {getTerrain,terrainColor,isUnderground,WORLD_COLUMNS,WORLD_ROWS} from "./terrain";
import type {Save} from "./game";
import {NuvoArt} from "./components";
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

export function WorldAtlas({save}:{save:Save|null}){
 const [selected,setSelected]=useState(save?.region||"mossbell"),[mode,setMode]=useState<"area"|"world">("area");
 const regions=REGIONS.filter(r=>!r.hidden||save?.visited.includes(r.id)),r=REGION_BY_ID[selected],terrain=getTerrain(r);
 return <div className="trail-atlas">
  <div className="atlas-toolbar"><div role="group" aria-label="Map view"><button className={mode==="area"?"active":""} onClick={()=>setMode("area")}>Area map</button><button className={mode==="world"?"active":""} onClick={()=>setMode("world")}>Archipelago</button></div><label>Explore <select aria-label="Map region" value={selected} onChange={e=>{setSelected(e.target.value);setMode("area");}}>{regions.map(r=><option value={r.id} key={r.id}>{r.name}{r.id===save?.region?" · You are here":""}</option>)}</select></label></div>
  {mode==="world"?<div className="atlas-scroll"><div className="archipelago-map">
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{regions.flatMap(r=>Object.values(r.links).filter(id=>id&&r.id<id).map(id=>{const to=REGION_BY_ID[id!];return <line key={`${r.id}-${id}`} x1={r.pos[0]} y1={r.pos[1]} x2={to.pos[0]} y2={to.pos[1]} stroke={isUnderground(r)||isUnderground(to)?"#9292a6":"#a5b69b"} strokeWidth=".35" strokeDasharray={isUnderground(r)||isUnderground(to)?".6 .7":"1.2 1"}/>;}))}</svg>
   <span className="atlas-sea">THE LUMINOUS SEA</span>
   {regions.map(r=><button key={r.id} className={`atlas-node ${save?.region===r.id?"current":""}`} style={{left:`${r.pos[0]}%`,top:`${r.pos[1]}%`,"--region":r.color} as CSSProperties} onClick={()=>{setSelected(r.id);setMode("area");}}><span>{r.kind==="Town"?"⌂":isUnderground(r)?"◈":"❧"}</span><strong>{r.name}</strong>{r.id===save?.region&&<small>You are here</small>}</button>)}
  </div></div>:<div className="atlas-area"><div><TerrainMap region={r} detail x={save?.region===r.id&&!save.interior?save.x:undefined} y={save?.region===r.id&&!save.interior?save.y:undefined}/><div className="terrain-legend"><span><i style={{background:"#5b9259"}}/>Tall grass</span><span><i style={{background:"#82858c"}}/>Cave gravel</span><span><i style={{background:"#428b9b"}}/>Water</span><span><i style={{background:"#bfa371"}}/>Bridge</span><span>● You · ◆ Exits</span></div></div><div className="atlas-copy"><span className="eyebrow">{r.kind==="Town"?"SAFE HAVEN":isUnderground(r)?"UNDERGROUND ROUTE":"WILD HABITAT"}</span><h3>{r.name}</h3><p>{r.description}</p>{terrain.features.length>0&&<ol>{terrain.features.map(f=><li key={f.name}>{f.name}</li>)}</ol>}<div className="atlas-connections">{Object.entries(r.links).map(([side,id])=><button key={side} onClick={()=>setSelected(id!)}>{({north:"↑",south:"↓",east:"→",west:"←"})[side]} {REGION_BY_ID[id!].name}</button>)}</div></div></div>}
  <section className="atlas-habitats"><div><h4>{r.kind==="Town"?"A place to rest":"Nuvo found here"}</h4><p>{r.kind==="Town"?"No wild encounters in town. Follow a connecting route to find Nuvo.":`Levels ${r.level[0]}–${r.level[1]} · ${isUnderground(r)?"Search the loose gravel beds; lit paths are safe.":"Search the tall grass; trails and bridges are safe."}`}</p></div>{r.kind!=="Town"&&<div className="atlas-nuvo-list">{r.pool.map(i=>{const n=BASE_SPECIES[i];return <span key={n.id}><NuvoArt id={n.id} size={46}/><small>{save?.caught.includes(n.id)?"✓ ":""}{n.name}</small></span>;})}{r.hidden&&<span><small>Dream Land also shelters its two elusive mythical families.</small></span>}</div>}</section>
  <div className="map-legend"><span>{save?.visited.filter(id=>!REGION_BY_ID[id]?.hidden).length||0} / {REGIONS.filter(r=>!r.hidden).length} places discovered</span><span>Select a region to inspect its routes and habitats.</span></div>
 </div>;
}
