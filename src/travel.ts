import {REGION_BY_ID} from './data';
import type {Save} from './game';

export function travelFare(from:string,to:string):number|null {
 if(!REGION_BY_ID[from]||!REGION_BY_ID[to]||REGION_BY_ID[from].hidden||REGION_BY_ID[to].hidden||from===to)return null;
 const seen=new Set([from]),queue:[string,number][]=[[from,0]];
 for(const [id,hops] of queue)for(const next of Object.values(REGION_BY_ID[id].links)){
  if(!next||seen.has(next)||REGION_BY_ID[next].hidden)continue;
  if(next===to)return 35+(hops+1)*20;
  seen.add(next);queue.push([next,hops+1]);
 }
 return null;
}
export function travelReason(save:Save,to:string){
 if(to===save.region)return 'You are already here.';
 if(!save.visited.includes(to))return 'Discover this area on foot to unlock travel.';
 const fare=travelFare(save.region,to);
 if(fare===null)return 'The skyways cannot reach Dream Land.';
 if(save.coins<fare)return `You need ${fare-save.coins} more coins.`;
 return '';
}
/** Shared, verified clear arrival tile. Travel never heals or changes the crew. */
export function fastTravel(save:Save,to:string):Save {
 const reason=travelReason(save,to);if(reason)throw new Error(reason);
 return {...save,region:to,x:560,y:496,interior:undefined,outside:undefined,coins:save.coins-travelFare(save.region,to)!,updated:new Date().toISOString()};
}
