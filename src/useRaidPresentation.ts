import {useEffect,useRef,useState} from 'react';
import type {Raid} from './League';
import {raidCues,type RaidCue} from './raidPresentation';
import {ACTION_SECONDS} from './nuvoAnimation';
import {gameAudio} from './audio';
import {isKeeperOnField} from './leagueArenaModel';

/** Queue confirmed snapshots so polling cannot interrupt a faint/replacement sequence. */
export function useRaidPresentation(raid:Raid|null){
 const previous=useRef<Raid|undefined>(undefined),tail=useRef(0),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const [cues,setCues]=useState<Record<string,RaidCue&{key:number}>>({}),[animating,setAnimating]=useState(false),[presented,setPresented]=useState<Raid|null>(raid);
 useEffect(()=>{
  previous.current=undefined;tail.current=0;setCues({});setAnimating(false);setPresented(raid);
  return()=>{timers.current.forEach(clearTimeout);timers.current.clear();previous.current=undefined;tail.current=0;};
 },[raid?.id]);
 useEffect(()=>{
  if(!raid)return;
  const before=previous.current,actions=raidCues(before,raid);previous.current=raid;
  const now=performance.now(),delay=Math.max(0,tail.current-now),length=actions.length?Math.max(...actions.map(a=>a.at+ACTION_SECONDS[a.action]*1000))+30:0;
  tail.current=now+delay+length;setAnimating(true);
  const schedule=(work:()=>void,ms:number)=>{const timer=setTimeout(()=>{timers.current.delete(timer);work();},ms);timers.current.add(timer);};
  schedule(()=>setCues({}),delay);
  actions.forEach((cue,i)=>schedule(()=>{
   setCues(old=>({...old,[cue.actor]:{...cue,key:raid.revision*100+i}}));
   // Health bars follow the confirmed impact, rather than revealing the hit before it lands.
   if(cue.action==='damaged'||cue.action==='faint'||cue.action==='summon')setPresented(old=>{
    if(!old||old.id!==raid.id)return raid;
    if(cue.actor==='guardian')return {...old,hp:raid.hp,max_hp:raid.max_hp};
    const member=raid.members.find(m=>m.user_id===cue.actor);
    return member?{...old,members:old.members.some(m=>m.user_id===member.user_id)?old.members.map(m=>m.user_id===member.user_id?member:m):[...old.members,member]}:old;
   });
   if(cue.move)gameAudio.move(cue.move);
   if(cue.action==='faint')gameAudio.play('faint');
   if(cue.action==='summon'&&cue.nuvo)gameAudio.cry(cue.nuvo.speciesId);
  },delay+cue.at));
  schedule(()=>{
   setPresented(raid);
   setCues(old=>({...old,guardian:{at:0,actor:'guardian',action:raid.hp<=0?'faint':'idle',key:old.guardian?.key??0},...Object.fromEntries(raid.members.map(m=>[m.user_id,{at:0,actor:m.user_id,action:m.phase==='out'||(isKeeperOnField(m)?m.keeper_hp:m.party[m.active].hp)<=0?'faint':'idle',nuvo:m.party[m.active],keeper:isKeeperOnField(m),key:old[m.user_id]?.key??0}]))}));
   if(performance.now()>=tail.current-20)setAnimating(false);
  },delay+length);
 },[raid?.id,raid?.revision]);
 return {cues,animating,presented:presented?.id===raid?.id?presented:raid};
}
