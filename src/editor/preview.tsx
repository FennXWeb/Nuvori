import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {World} from '../World';
import {newSave,encounter,type Save,type Battle} from '../game';
import {REGION_BY_ID,SPECIES_BY_ID} from '../data';
import {installWorldDocument,type WorldDocument} from '../worldContent';
import {inspectWorld} from './model';
import {NuvoArt} from '../components';
import {safeWorldPosition} from '../worldLayout';
import type {Interior} from '../adventure';
import '../styles.css';
import './preview.css';
function Preview(){
 const [save,setSave]=useState<Save|null>(null),[battle,setBattle]=useState<Battle|null>(null),[message,setMessage]=useState(''),[nearby,setNearby]=useState(''),keys=useRef(new Set<string>());
 useEffect(()=>{
  const receive=(e:MessageEvent)=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='nuvori-world-preview'||inspectWorld(e.data.document).length)return;
   const {document,region,room}=e.data as {document:WorldDocument;region:string;room?:Interior};if(!REGION_BY_ID[region])return;
   installWorldDocument(document);const [x,y]=safeWorldPosition(560,496,REGION_BY_ID[region],room);setSave({...newSave({name:'World designer',palette:0,pronouns:'They'},'spriglet'),region,interior:room,x,y});
  };
  const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();keys.current.add(e.key.toLowerCase());};
  const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase()),blur=()=>keys.current.clear();
  window.addEventListener('message',receive);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  parent.postMessage({type:'nuvori-world-preview-ready'},location.origin);
  return()=>{window.removeEventListener('message',receive);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
 },[]);
 if(!save)return <div className="editor-preview-wait">Preparing your isolated world…</div>;
 return <div className="editor-preview"><World save={save} paused={!!battle||!!message} keys={keys} remote={[]} onReady={()=>{}} onNearby={setNearby} onMove={(x,y)=>setSave(s=>s?{...s,x,y}:s)} onTravel={(region,x,y)=>setSave(s=>s?{...s,region,x,y}:s)} onEncounter={(x,y)=>{try{setBattle(encounter({...save,x,y}));keys.current.clear();}catch(e){setMessage((e as Error).message);}}} onInteract={kind=>{
   const rooms:Record<string,Interior>={heal:'lodge',shop:'shop',nursery:'nursery',tailor:'tailor',barber:'barber'};
   if(rooms[kind])setSave(s=>s?{...s,outside:{x:s.x,y:s.y},interior:rooms[kind],x:576,y:624}:s);
   else if(kind==='exit')setSave(s=>s?{...s,interior:undefined,x:s.outside?.x??560,y:s.outside?.y??496}:s);
   else {setMessage(`Interaction works: ${kind}. This isolated preview does not change progression or access online accounts.`);keys.current.clear();}
  }}/><div className="editor-preview-hud"><span>ISOLATED PLAYTEST · {REGION_BY_ID[save.region].name}</span><span>{nearby||'WASD · Shift to sprint · Click to walk'}</span></div>{(battle||message)&&<div className="editor-preview-overlay"><section>{battle?<><NuvoArt id={battle.wild.speciesId} size={150}/><h2>{SPECIES_BY_ID[battle.wild.speciesId].name}</h2><p>Level {battle.wild.level} · {battle.wild.sex} · {SPECIES_BY_ID[battle.wild.speciesId].rarity}</p><p>Encounter sampled from your habitat at this position.</p></>:<p>{message}</p>}<button className="primary" onClick={()=>{setBattle(null);setMessage('');}}>Continue exploring</button></section></div>}</div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
