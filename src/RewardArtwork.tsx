import {memo,useMemo} from 'react';
import type {SeasonReward} from './season';
import type {Save} from './game';
import {keeperAppearance} from './keeperArt';
import {PlayerArt} from './components';
import {NuvoActor} from './NuvoActor';
import atlas from './menuRewardFrames.json';
export const RewardArtwork=memo(function RewardArtwork({reward,size=90,save}:{reward:SeasonReward;size?:number;save?:Save|null}){
 const appearance=useMemo(()=>{
  const base={...keeperAppearance(save?.player.palette??0,save?.player)};
  if(reward.cosmetic){const [,kind,id]=reward.cosmetic.split('-');if(kind==='hat')base.hat=Number(id);if(kind==='top'){base.top=Number(id);base.topTint=7;}}
  return {appearance:base};
 },[save?.player,reward.cosmetic]);
 if(reward.kind==='nuvo')return <span className="reward-art reward-mythical"><NuvoActor id="solunelle" size={size} direction={1}/></span>;
 if(reward.kind==='cosmetic')return <span className="reward-art reward-cosmetic"><PlayerArt look={appearance} size={size}/></span>;
 const index=reward.kind==='coins'?0:reward.kind==='potions'?1:reward.kind==='boost'?8:({binding:2,verdant:3,tide:4,dusk:5,swift:6,prism:7}[reward.orb??'binding']);
 const f=atlas.frames[index],scale=size*.78/Math.max(f.width,f.height),w=f.width*scale,h=f.height*scale;
 return <span className={`reward-art reward-${reward.kind}`} style={{width:size,height:size}}><svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true"><svg x={(size-w)/2} y={(size-h)/2} width={w} height={h} viewBox={`${f.x} ${f.y} ${f.width} ${f.height}`} overflow="hidden"><image href={`${import.meta.env.BASE_URL}assets/menu-rewards.png`} width={atlas.width} height={atlas.height}/></svg></svg></span>;
});
