import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SPECIES,createNuvo} from '../src/data';
import {NuvoActor} from '../src/NuvoActor';
import {ACTION_SECONDS,type NuvoAction} from '../src/nuvoAnimation';
import {BattleView} from '../src/App';
import {newSave,battleTurn,type Battle} from '../src/game';
import {sceneDuration} from '../src/battlePresentation';
import '../src/styles.css';
import '../src/firstLight.css';
function Workshop(){
 const [id,setId]=useState('spriglet'),[action,setAction]=useState<NuvoAction>('walk'),[replay,setReplay]=useState(0),[prism,setPrism]=useState(false);
 useEffect(()=>{if(action==='walk'||action==='idle')return;const timer=setInterval(()=>setReplay(v=>v+1),ACTION_SECONDS[action]*1000+800);return()=>clearInterval(timer);},[action]);
 const [save,setSave]=useState(()=>newSave({name:'Motion QA',palette:0,pronouns:'They / them'},'spriglet')),[battle,setBattle]=useState<Battle|null>(null),[busy,setBusy]=useState(false);
 function fight(mode:string){const s=newSave({name:'Motion QA',palette:0,pronouns:'They / them'},'spriglet');s.region='verdant';s.party=[createNuvo('spriglet',12,false),createNuvo('cindlet',12,false),createNuvo('wisplet-3',22,true)];const b:Battle={wild:createNuvo('cindlet',12,false),active:0,log:['Motion workshop encounter'],turn:0,reward:0};
  if(mode==='Trainer replacement'){b.wild.hp=1;b.trainerId='qa';b.trainerName='Workshop Keeper';b.opponentQueue=[createNuvo('bubbfin-3',15,false)];}
  if(mode==='Forced faint'){s.party[0].hp=1;b.wild=createNuvo('voltik-6',50,false);}
  setSave(s);setBattle(b);
 }
 return <main style={{background:'#dce8df',minHeight:'100vh',padding:24,fontFamily:'sans-serif',color:'#183f39'}}><h1>Nuvori motion workshop</h1><p>Local development preview · all 312 forms · seven action states · four directions</p>
 <label>Nuvo form <select aria-label="Nuvo form" value={id} onChange={e=>{setId(e.target.value);setReplay(v=>v+1);}}>{SPECIES.map(s=><option key={s.id} value={s.id}>{s.name} · Stage {s.stage+1}</option>)}</select></label>
 <nav style={{display:'flex',gap:8,margin:'20px 0',flexWrap:'wrap'}}>{(Object.keys(ACTION_SECONDS) as NuvoAction[]).map(a=><button key={a} onClick={()=>{setAction(a);setReplay(v=>v+1);}}>{a}</button>)}<button onClick={()=>setReplay(v=>v+1)}>Replay action</button><label><input type="checkbox" checked={prism} onChange={e=>setPrism(e.target.checked)}/>Prismatic</label></nav>
 <div style={{display:'flex',justifyContent:'space-around',padding:'40px 0',background:'radial-gradient(#eff6df,#bed8c9)',borderRadius:22}}>{['Down','Left','Right','Up'].map((label,d)=><div key={d} style={{textAlign:'center'}}><NuvoActor id={id} size={200} direction={d} action={action} animationKey={replay} prismatic={prism}/><h3>{label}</h3></div>)}</div>
 <nav style={{display:'flex',gap:12,marginTop:28}}>{['Battle','Trainer replacement','Forced faint'].map(label=><button key={label} onClick={()=>fight(label)}>{label}</button>)}<a href="/scripts/art-preview.html">Keeper walking</a><a href="/qa.html">World fixtures</a></nav>
 {battle&&<BattleView save={save} battle={battle} busy={busy} onFinish={()=>setBattle(null)} onAction={a=>{const result=battleTurn(save,battle,a,()=>.3);if(result.error)return;setSave(result.save);setBattle(result.battle);setBusy(true);setTimeout(()=>setBusy(false),Math.max(1000,sceneDuration(result.battle.scenes)+80));}}/>}</main>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Workshop/>);
