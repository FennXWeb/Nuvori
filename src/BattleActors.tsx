import {useEffect,useRef,useState} from 'react';
import type {Battle} from './game';
import type {Nuvo} from './data';
import {NuvoActor} from './NuvoActor';
import {MoveAnimation} from './BattleEffects';
import {presentationAt,sceneDuration} from './battlePresentation';
import {gameAudio} from './audio';

export function BattleActors({battle,player,keeper,onPresentation}:{battle:Battle;player:Nuvo;keeper?:React.ReactNode;onPresentation?:(view:{player:Nuvo;wild:Nuvo})=>void}){
 const previous=useRef({player,wild:battle.wild}),[view,setView]=useState(()=>presentationAt({player,wild:battle.wild},[],0));
 useEffect(()=>{
  const initial=previous.current,scenes=battle.turn===0&&!battle.scenes?.length?[{kind:'summon' as const,side:'wild' as const,nuvo:battle.wild,duration:850},{kind:'summon' as const,side:'player' as const,nuvo:player,duration:850}]:battle.scenes??[];
  previous.current={player,wild:battle.wild};
  const timers:ReturnType<typeof setTimeout>[]=[];
  let elapsed=0;
  const apply=(at:number)=>{const next=presentationAt(initial,scenes,at);setView(next);onPresentation?.({player:next.player,wild:next.wild});if(next.scene?.kind==='attack'&&next.scene.move)gameAudio.move(next.scene.move);if(next.scene?.kind==='faint')gameAudio.play('faint');if(next.scene?.kind==='summon')gameAudio.cry(next.scene.nuvo.speciesId);};
  apply(0);
  for(const scene of scenes){elapsed+=scene.duration;const at=elapsed;timers.push(setTimeout(()=>apply(at),at));}
  timers.push(setTimeout(()=>{setView(v=>({...v,player,wild:battle.wild,scene:undefined,playerAction:player.hp>0?'idle':v.playerAction,wildAction:battle.wild.hp>0?'idle':v.wildAction}));onPresentation?.({player,wild:battle.wild});},sceneDuration(scenes)+1));
  return()=>timers.forEach(clearTimeout);
 },[battle.turn,battle.wild.uid,player.uid,onPresentation]);
 // Terminal faint poses stay collapsed; a new turn never resurrects a defeated Nuvo.
 const wildAction=view.wild.hp<=0&&view.wildAction==='idle'?'faint':view.wildAction;
 const playerAction=view.player.hp<=0&&view.playerAction==='idle'?'faint':view.playerAction;
 return <><div className="wild-nuvo"><NuvoActor id={view.wild.speciesId} size={205} direction={1} action={wildAction} animationKey={`${battle.turn}:${view.wildKey}`} prismatic={view.wild.prismatic}/></div>
 <div className="player-nuvo">{keeper??<NuvoActor id={view.player.speciesId} size={240} direction={2} action={playerAction} animationKey={`${battle.turn}:${view.playerKey}`} prismatic={view.player.prismatic}/>}</div>
 {view.scene?.kind==='attack'&&view.scene.move&&<MoveAnimation moveId={view.scene.move} animationKey={battle.turn*30+view.index} side={view.scene.side} duration={800}/>}</>;
}
