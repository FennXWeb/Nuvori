import { gameAudio } from "./audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Crown, Users, ArrowRight } from "lucide-react";
import { supabase } from "./online";
import { LEAGUE_GUARDIANS } from "./expansion";
import { REGION_BY_ID, type Nuvo } from "./data";
import { Modal, NuvoArt } from "./components";
import { validateSave, type Save, type Player } from "./game";
import {LeagueArena} from './LeagueArena';
import type {LeagueAction} from './leagueArenaModel';

export interface LeagueMember { user_id:string;name:string;player:Pick<Player,"palette"|"outfit"|"hair"|"hairColor"|"appearance">;party:Nuvo[];active:number;phase:"crew"|"choice"|"keeper"|"out";keeper_hp:number;keeper_max:number;damage:number;claimed:boolean }
export interface Raid {id:string;code:string;host:string;guardian:string;status:"lobby"|"active"|"won"|"lost"|"closed";hp:number;max_hp:number;revision:number;log:string[];members:LeagueMember[];expires_at:string}
interface Room {code:string;guardian:string;host_name:string;players:number}
async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T> {if(!supabase)throw new Error("Connect your account to enter the Champions League.");const {data,error}=await supabase.rpc(name,args);if(error)throw new Error(error.message);return data as T;}

export function useLeague(userId?:string,ready=false) {
  const [raid,setRaid]=useState<Raid|null>(null),[error,setError]=useState(""),[loaded,setLoaded]=useState(false);const request=useRef(0);
  useEffect(()=>{const generation=++request.current;setRaid(null);setLoaded(!userId);if(!userId||!ready)return;
    void rpc<Raid|null>("nuvori_league_current").then(r=>{if(request.current===generation){setRaid(r);setError("");}}).catch(e=>{if(request.current===generation)setError(e.message);}).finally(()=>{if(request.current===generation)setLoaded(true);});
    return()=>{request.current++;};
  },[userId,ready]);
  const apply=useCallback((r:Raid|null)=>{setRaid(prev=>r&&prev?.id===r.id&&prev.revision>r.revision?prev:r);},[]);
  useEffect(()=>{if(!raid)return;let alive=true,checking=false;const id=raid.id;
    const poll=async()=>{if(checking||document.visibilityState!=="visible")return;checking=true;try{const r=await rpc<Raid>("nuvori_league_view",{raid:id});if(alive){apply(r);setError("");}}catch(e){if(alive)setError((e as Error).message);}finally{checking=false;}};
    const timer=setInterval(()=>void poll(),1500);return()=>{alive=false;clearInterval(timer);};
  },[raid?.id,apply]);
  return {raid,setRaid:apply,error,loaded};
}

export function LeaguePanel({save,userId,raid,onRaid,onBeforeJoin,onResult,onClose,onStory,notify,error}:{save:Save;userId?:string;raid:Raid|null;onRaid:(r:Raid|null)=>void;onBeforeJoin:()=>Promise<void>;onResult:(s:Save)=>void;onClose:()=>void;onStory?:()=>void;notify:(s:string)=>void;error:string}) {
  const [rooms,setRooms]=useState<Room[]>([]),[code,setCode]=useState(""),[pending,setBusy]=useState(false),[localError,setError]=useState("");
  const busy=pending;
  const lastStatus=useRef(raid?.status);
  useEffect(()=>{if(lastStatus.current!==raid?.status){if(raid?.status==="active")gameAudio.play("battle-start");if(raid?.status==="won")gameAudio.play("victory");if(raid?.status==="lost")gameAudio.play("defeat");}lastStatus.current=raid?.status;},[raid?.status]);
  const lock=useRef(false);const selected=LEAGUE_GUARDIANS.find(g=>g.id===raid?.guardian);
  const me=raid?.members.find(m=>m.user_id===userId);const leader=me?.party[me.active];
  useEffect(()=>{if(!userId||raid)return;let alive=true;const load=()=>rpc<Room[]>("nuvori_league_rooms",{area:save.region}).then(r=>{if(alive)setRooms(r);}).catch(e=>{if(alive)setError(e.message);});void load();const timer=setInterval(()=>void load(),6000);return()=>{alive=false;clearInterval(timer);};},[userId,save.region,raid?.id]);
  const run=async(work:()=>Promise<void>)=>{if(lock.current)return false;lock.current=true;setBusy(true);setError("");try{await work();return true;}catch(e){setError((e as Error).message);return false;}finally{lock.current=false;setBusy(false);}};
  const join=(trial?:string,room?:string)=>void run(async()=>{await onBeforeJoin();onRaid(await rpc<Raid>("nuvori_league_open",{trial:trial||null,room_code:room||null}));});
  const act=(action:LeagueAction,choice="")=>run(async()=>{const result=await rpc<Raid>("nuvori_league_action",{raid:raid!.id,action,choice,nonce:crypto.randomUUID()});onRaid(result);if(action==="strike")gameAudio.play("keeper-strike");if(action==="brace")gameAudio.play("guard");});
  const close=()=>{if(raid){notify("Leave the lobby or finish your Champions trial before exploring.");return;}onClose();};
  if(raid&&selected&&me&&leader)return <LeagueArena key={raid.id} raid={raid} userId={userId!} guardian={selected} pending={pending} error={localError||error} onAct={act}
    onLeave={()=>void run(async()=>{await rpc("nuvori_league_leave",{raid:raid.id});onRaid(null);})}
    onStart={()=>void run(async()=>onRaid(await rpc<Raid>("nuvori_league_start",{raid:raid.id})))}
    onClaim={()=>void run(async()=>{const result=await rpc<Save>("nuvori_league_claim",{raid:raid.id});if(!validateSave(result))throw new Error("The saved result could not be read. Please keep this room open and retry.");onResult(result);onRaid(null);onClose();})}/>;
  return <Modal title="Champions League" eyebrow="ONE GUARDIAN. FOUR KEEPERS. A SHARED LEGEND." onClose={close} wide>
    {(localError||error)&&<p className="league-error" role="alert">{localError||error}</p>}
    {!raid?<><div className="league-intro"><Crown size={35}/><div><h3>Challenge the guardians of Auralis</h3><p>Battle alone or alongside up to three other players. Visit a guardian’s town, build your crew, then open a room. Your entire crew participates; only wild Nuvo can be caught.</p></div></div>
      {!userId&&<div className="tip-box"><Users/><p>Sign in with Google or Discord from Online to enter shared trials.</p></div>}
      {onStory&&<div className="tip-banner"><p>Follow The First Dawn campaign for solo guardian trials. Earn the same five crests with your own crew, or challenge these shared rooms with friends.</p><button className="primary-button" onClick={onStory}>Open story trials →</button></div>}
      <div className="guardian-grid">{LEAGUE_GUARDIANS.map(g=><article key={g.id} className={save.region===g.region?"nearby":""} style={{borderColor:g.color}}><div className="guardian-portrait"><NuvoArt id={g.species} size={156}/><span>Lv. {g.level} · {g.hp.toLocaleString()} HP</span></div><span className="eyebrow">{REGION_BY_ID[g.region].name}</span><h3>{g.name}</h3><p>{g.blurb}</p><small>{save.leagueBadges?.includes(g.id)?`✓ ${g.badge} earned`:`Reward: ${g.badge}`}</small><button className="primary-button" disabled={busy||!userId||save.region!==g.region} onClick={()=>join(g.id)}>{save.region===g.region?"Create challenge room":"Travel here to challenge"}<ArrowRight size={14}/></button></article>)}</div>
      {userId&&<section className="league-rooms"><h3>Gather your crew</h3><div className="room-code-entry"><input aria-label="Champions room code" placeholder="Enter 8-character room code" maxLength={8} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/><button className="secondary-button" disabled={busy||code.length!==8} onClick={()=>join(undefined,code)}>Join room</button></div><p className="muted">Everyone must be in the guardian’s town. Rooms remain available for 90 minutes.</p>{rooms.length?rooms.map(r=><button className="room-list-item" key={r.code} disabled={busy||r.players>=4} onClick={()=>join(undefined,r.code)}><Users size={18}/><span>{r.host_name} · {LEAGUE_GUARDIANS.find(g=>g.id===r.guardian)?.name}</span><strong>{r.players}/4 · Join</strong></button>):<p className="muted">No open rooms in this town. Create one and share its code with friends.</p>}</section>}
    </>:<p>Restoring this Champions room…</p>}
  </Modal>;
}
