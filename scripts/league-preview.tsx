// Development-only, disposable multiplayer snapshots. No accounts, saves or RPC calls.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LeagueArena} from '../src/LeagueArena';
import {BattleView} from '../src/BattleScreen';
import type {Raid} from '../src/League';
import {LEAGUE_GUARDIANS} from '../src/expansion';
import type {LeagueGuardian} from '../src/leagueArenaModel';
import {createNuvo,maxHp,MOVE_BY_ID} from '../src/data';
import {newSave,battleTurn,type Battle} from '../src/game';
import {STORY_STEPS} from '../src/storyContent';
import {freshStory,prepareStoryBattle} from '../src/story';
import '../src/styles.css';
import '../src/nuvoriUI.css';
import '../src/firstLight.css';

let serial=0;
function fixture(guardian:LeagueGuardian=LEAGUE_GUARDIANS[1],status:Raid['status']='active'):Raid{return {id:`preview-${++serial}`,code:'AURALIS4',host:'you',guardian:guardian.id,status,hp:guardian.hp,max_hp:guardian.hp,revision:1,expires_at:'2099-01-01',log:['Four keepers answer the call.','The guardian steps into the arena.'],members:['you','pip','tess','mira'].map((id,i)=>({user_id:id,name:['Rowan','Pip','Tess','Mira'][i],player:{palette:i},party:[createNuvo(['spriglet-3','cindlet-3','jadeling-6','solunelle'][i],guardian.level,false),createNuvo('chillip-3',guardian.level,false)],active:0,phase:'crew',keeper_hp:0,keeper_max:0,damage:0,claimed:false}))};}
function Preview(){
 const [raid,setRaid]=useState(()=>fixture()),[pending,setPending]=useState(false),[error,setError]=useState(''),[tools,setTools]=useState(false),[notice,setNotice]=useState(''),[solo,setSolo]=useState<{save:ReturnType<typeof newSave>;battle:Battle}|null>(null);
 const guardian=LEAGUE_GUARDIANS.find(g=>g.id===raid.guardian)!;
 const update=(work:(r:Raid)=>void)=>setRaid(old=>{const next=structuredClone(old);next.revision++;work(next);return next;});
 const reset=(status:Raid['status']='active',g=guardian)=>{setRaid(fixture(g,status));setSolo(null);setError('');setTools(false);setNotice('');};
 return <><details open={tools} style={{position:'fixed',left:8,top:5,zIndex:300,fontSize:11,color:'#f5e5ae',background:'#0b1a24ed',border:'1px solid #c6b07077',borderRadius:5,maxWidth:'calc(100vw - 16px)'}} onToggle={e=>setTools(e.currentTarget.open)}><summary style={{padding:'5px 10px',cursor:'pointer'}}>Arena preview · disposable fixtures</summary><div style={{display:'flex',flexWrap:'wrap',gap:8,padding:10,maxWidth:700}}>{LEAGUE_GUARDIANS.map(g=><button key={g.id} onClick={()=>reset('active',g)}>{g.name}</button>)}<a href="?viewport=phone">Phone layout</a><a href="?viewport=desktop">Desktop layout</a><button onClick={()=>reset('lobby')}>Waiting room</button><button onClick={()=>{update(r=>{r.members.pop();r.status='lobby';});setTools(false);}}>Open station</button><button onClick={()=>{update(r=>{r.members[0].party.forEach(n=>n.hp=0);r.members[0].phase='choice';});setTools(false);}}>Last stand choice</button><button onClick={()=>{update(r=>{r.members[0].party.forEach(n=>n.hp=0);r.members[0].phase='keeper';r.members[0].keeper_hp=154;r.members[0].keeper_max=154;});setTools(false);}}>Keeper fight</button><button onClick={()=>{update(r=>{r.hp=0;r.status='won';r.log.push('Guardian defeated!');});setTools(false);}}>Victory</button><button onClick={()=>{update(r=>{r.status='lost';r.members.forEach(m=>{m.phase='out';m.party.forEach(n=>n.hp=0);});});setTools(false);}}>Rescue</button><button onClick={()=>{setError('The connection was interrupted. Your trial is preserved. Try your action again.');setTools(false);}}>Connection error</button><button onClick={()=>{update(r=>{r.members[0].party[0].hp=1;});setTools(false);}}>Next hit faints</button><button onClick={()=>{update(r=>{const m=r.members[1],n=m.party[m.active],id=n.moves.find(id=>MOVE_BY_ID[id].power>0)!;n.pp[id]--;n.hp=Math.max(0,n.hp-28);m.damage+=80;r.hp=Math.max(1,r.hp-80);r.log.push(`${m.name} · ${MOVE_BY_ID[id].name} · 80 damage`);});setTools(false);}}>Teammate acts</button><button onClick={()=>{const step=STORY_STEPS.find(s=>s.league===guardian.id)!;const save={...newSave({name:'Rowan',palette:0,pronouns:'They'},'spriglet'),region:guardian.region,story:{...freshStory(),chapter:STORY_STEPS.indexOf(step)}};save.party=[createNuvo('spriglet-3',guardian.level,false),createNuvo('cindlet-3',guardian.level,false)];setSolo(prepareStoryBattle(save,step.id));setTools(false);}}>Solo story trial</button></div></details>
 {notice&&<p role="status" style={{position:'fixed',top:35,left:10,zIndex:300,background:'#102b2a',color:'#e9dda8',padding:15}}>{notice}</p>}
 {solo?<BattleView battle={solo.battle} save={solo.save} busy={pending} onAction={action=>{const result=battleTurn(solo.save,solo.battle,action);setSolo({save:result.save,battle:result.battle});setPending(true);setTimeout(()=>setPending(false),3500);}} onFinish={()=>reset()}/>:<LeagueArena key={raid.id} raid={raid} userId="you" guardian={guardian} pending={pending} error={error} onStart={()=>update(r=>{r.status='active';r.log.push('The trial begins.');})} onLeave={()=>{reset();setNotice('Leave callback verified. No real room was changed.');}} onClaim={()=>{reset();setNotice('Claim callback verified. No real rewards were created.');}} onAct={async(action,choice='')=>{
  setPending(true);await new Promise(resolve=>setTimeout(resolve,250));setError('');
  update(r=>{const me=r.members[0];if(action==='withdraw'){me.phase='out';r.log.push('Rowan calls for rescue.');return;}if(action==='stand'){me.phase='keeper';me.keeper_hp=me.keeper_max=154;return;}if(action==='switch')me.active=Number(choice);
   const n=me.party[me.active],m=MOVE_BY_ID[choice],damage=action==='strike'?57:action==='move'&&m.power>0?125:0;
   if(action==='move'){n.pp[choice]--;if(m.effect==='heal')n.hp=Math.min(maxHp(n),n.hp+60);}
   me.damage+=damage;r.hp=Math.max(0,r.hp-damage);r.log.push(`Rowan · ${m?.name??action} · ${damage} damage`);
   if(r.hp<=0){r.status='won';return;}if(me.phase==='keeper'){me.keeper_hp=Math.max(0,me.keeper_hp-(action==='brace'?9:30));if(!me.keeper_hp)me.phase='out';}else{n.hp=Math.max(0,n.hp-40);if(!n.hp){const next=me.party.findIndex(n=>n.hp>0);if(next<0)me.phase='choice';else me.active=next;}}r.log.push('The guardian retaliates against Rowan.');
  });setPending(false);return true;
 }}/>}</>;
}
function DevicePreview(){
 const [device,setDevice]=useState(new URLSearchParams(location.search).get('viewport')??'phone');
 const [width,height]=device==='phone'?[390,844]:device==='landscape'?[844,390]:[1440,900];
 return <div style={{position:'fixed',inset:0,overflow:'auto',background:'#20272d',padding:18,color:'#e8e5ca'}}><div style={{display:'flex',gap:12,alignItems:'center',marginBottom:18}}><strong>Disposable arena · {width} × {height}</strong>{['phone','desktop','landscape'].map(name=><button key={name} onClick={()=>setDevice(name)}>{name}</button>)}<a href="/scripts/league-preview.html">Fill window</a></div><iframe title="Champions arena responsive preview" src="/scripts/league-preview.html" style={{display:'block',width,height,border:'1px solid #6b796a',maxWidth:'none'}}/></div>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('viewport')?<DevicePreview/>:<Preview/>);
