import {useEffect,useRef,useState} from 'react';
import type {Raid} from './League';
import {raidCues,type RaidCue} from './raidPresentation';
import {ACTION_SECONDS} from './nuvoAnimation';
import {gameAudio} from './audio';

/** Queue confirmed snapshots so polling cannot interrupt a faint/replacement sequence. */
export function useRaidPresentation(raid:Raid|null){
 const previous=useRef<Raid|undefined>(undefined),tail=useRef(0),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const [cues,setCues]=useState<Record<string,RaidCue&{key:number}>>({}),[animating,setAnimating]=useState(false);
 useEffect(()=>{
  previous.current=undefined;tail.current=0;setCues({});setAnimating(false);
  return()=>{timers.current.forEach(clearTimeout);timers.current.clear();previous.current=undefined;tail.current=0;};
 },[raid?.id]);
 useEffect(()=>{
  if(!raid)return;
  const actions=raidCues(previous.current,raid);previous.current=raid;if(!actions.length)return;
  const now=performance.now(),delay=Math.max(0,tail.current-now),length=Math.max(...actions.map(a=>a.at+ACTION_SECONDS[a.action]*1000))+30;
  tail.current=now+delay+length;setAnimating(true);
  const schedule=(work:()=>void,ms:number)=>{const timer=setTimeout(()=>{timers.current.delete(timer);work();},ms);timers.current.add(timer);};
  actions.forEach((cue,i)=>schedule(()=>{
   setCues(old=>({...old,[cue.actor]:{...cue,key:raid.revision*100+i}}));
   if(cue.move)gameAudio.move(cue.move);
   if(cue.action==='faint')gameAudio.play('faint');
   if(cue.action==='summon'&&cue.nuvo)gameAudio.cry(cue.nuvo.speciesId);
  },delay+cue.at));
  schedule(()=>{
   setCues(old=>({...old,guardian:{at:0,actor:'guardian',action:raid.hp<=0?'faint':'idle',key:old.guardian?.key??0},...Object.fromEntries(raid.members.map(m=>[m.user_id,{at:0,actor:m.user_id,action:m.party[m.active].hp<=0?'faint':'idle',nuvo:m.party[m.active],key:old[m.user_id]?.key??0}]))}));
   if(performance.now()>=tail.current-20)setAnimating(false);
  },delay+length);
 },[raid?.id,raid?.revision]);
 return {cues,animating};
}
