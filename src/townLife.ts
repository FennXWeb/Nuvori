import {DEFAULT_APPEARANCE,type Appearance} from './appearance';
import type {Region} from './data';

export const RESIDENTS=[
 {name:'Baker Maren',line:'The ovens are warm before sunrise. My Cindlet insists on supervising every loaf.'},
 {name:'Courier Pip',line:'I take the long way past the fountain. Even a busy day deserves a little wandering.'},
 {name:'Gardener Oren',line:'Flowers, fresh water, and somewhere shady: a good town welcomes Nuvo, too.'},
 {name:'Archivist Vale',line:'An evolution tree is a family history. Two siblings may follow very different paths.'},
 {name:'Angler Wren',line:'Follow the bridges beyond town. The quiet banks are where I spot the most unusual companions.'},
 {name:'Apprentice Nia',line:'Watch your companion on the trail. Some hop, some float, and some look like they own the entire road.'},
 {name:'Traveler Moss',line:'I came for supplies and stayed for the market. Next stop: the wild trails!'},
 {name:'Florist Ansel',line:'A bouquet for a friend, or a leafy treat for a Nuvo? I can usually help with both.'},
 {name:'Weaver Bea',line:'The nicest clothes are the ones you can run an adventure in. Visit Thread & Thistle for a new look.'},
 {name:'Keeper Jun',line:'I stop at the Healing Lodge before every long trip. Better to leave with a rested crew.'},
 {name:'Musician Lumi',line:'Hear that rhythm? Footsteps, falling water, and a town full of little stories.'},
 {name:'Elder Ash',line:'Champions are remembered for their courage, but kind keepers are remembered everywhere.'},
] as const;
export interface ResidentRoute {name:string;line:string;look:Appearance;segments:{from:[number,number];to:[number,number];start:number;duration:number;moving:boolean}[];duration:number;clock:number}
const ROUTES=[[[14,13],[23,13],[23,20],[18,20]],[[18,16],[18,26],[27,26],[27,20]],[[8,13],[14,13],[14,20],[8,20]],[[34,13],[44,13],[44,20],[34,20]],[[44,31],[57,31],[57,37],[44,37]],[[57,13],[66,13],[66,21],[57,21]],[[36,32],[42,32],[42,43],[36,43]],[[45,43],[59,43],[59,47],[45,47]],[[27,31],[34,31],[34,40],[27,40]],[[17,26],[23,26],[23,31],[17,31]],[[45,28],[57,28],[57,35],[45,35]],[[58,40],[65,40],[65,46],[58,46]]];
export function buildResidents(region:Region,path:(x:number,y:number,tx:number,ty:number)=>[number,number][],walkable:(x:number,y:number)=>boolean):ResidentRoute[]{
 if(region.kind!=='Town')return [];
 return RESIDENTS.flatMap((person,index)=>{
  const stops=ROUTES[index].map(([x,y]):[number,number]=>[x*32+16,y*32+16]).filter(([x,y])=>walkable(x,y));
  if(stops.length<2)return [];
  const segments:ResidentRoute['segments']=[];let at=stops[0],time=0;
  for(const goal of [...stops.slice(1),stops[0]]){
   const route=path(...at,...goal);if(!route.length)return [];
   for(const next of route){const duration=Math.hypot(next[0]-at[0],next[1]-at[1])/(36+index%4*6);segments.push({from:at,to:next,start:time,duration,moving:true});time+=duration;at=next;}
   const duration=2+index%4;segments.push({from:at,to:at,start:time,duration,moving:false});time+=duration;
  }
  const seed=index+region.name.length;
  return [{...person,segments,duration:time,clock:(index*.117*time)%time,look:{...DEFAULT_APPEARANCE,skin:index%6,hairStyle:seed%12,hairTint:seed%12,top:index%8,topTint:(index*3+2)%12,bottom:index%4,bottomTint:index%5,hat:index%4===0?2:0,accessory:index%3===0?3:0}}];
 });
}
export function residentAt(route:ResidentRoute,time=route.clock){
 const clock=((time%route.duration)+route.duration)%route.duration,segment=route.segments.find(s=>clock<s.start+s.duration)??route.segments.at(-1)!;
 const p=segment.duration?Math.min(1,(clock-segment.start)/segment.duration):0,dx=segment.to[0]-segment.from[0],dy=segment.to[1]-segment.from[1];
 return {x:segment.from[0]+dx*p,y:segment.from[1]+dy*p,direction:segment.moving?(Math.abs(dx)>Math.abs(dy)?dx<0?1:2:dy<0?3:0):0,moving:segment.moving};
}

export function drawFountainWater(c:CanvasRenderingContext2D,x:number,y:number,size:number,time:number){
 c.save();c.translate(x,y);c.scale(size/110,size/110);
 // Water leaves the upper bowl, falls in arcs, then makes rings in the lower basin.
 c.lineWidth=1.4;c.strokeStyle='#c6f8ffe0';
 for(let jet=0;jet<5;jet++){
  const side=(jet-2)/2,phase=(time*.8+jet*.21)%1;
  for(let drop=0;drop<5;drop++){const p=(phase+drop/5)%1,xx=side*(8+18*p),yy=-58+37*p*p;
   c.globalAlpha=.45+(1-p)*.4;c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+side*.6,yy+2.5);c.stroke();}
 }
 for(let i=0;i<3;i++){const p=(time*.6+i/3)%1;c.globalAlpha=(1-p)*.5;c.beginPath();c.ellipse(0,-19,7+p*29,2+p*8,0,0,Math.PI*2);c.stroke();}
 c.globalAlpha=.8;for(let i=0;i<6;i++){const p=(time*1.4+i*.17)%1;c.fillStyle='#e5ffff';c.fillRect(Math.sin(i*2.4)*23,-21-Math.sin(p*Math.PI)*5,1.4,1.4);}
 c.restore();
}
