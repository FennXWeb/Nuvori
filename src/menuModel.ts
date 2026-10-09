import type {Save} from './game';
import {PASS_REWARDS,SEASON,passProgress,passTier} from './season';
import {utcDay} from './adventure';

export function menuProgress(save:Save|null,now=Date.now()){
 const progress=save?passProgress(save):{xp:0,claimed:[],boosts:0,boostUntil:0},tier=save?passTier(save):0;
 const active=now>=SEASON.starts&&now<SEASON.ends;
 const available=save?PASS_REWARDS.filter(r=>r.tier<=tier&&!progress.claimed.includes(r.tier)).length:0;
 const wheelClaimed=Boolean(save?.dailySpinDay&&save.dailySpinDay>=utcDay(new Date(now)));
 const nextMidnight=new Date(now);nextMidnight.setUTCHours(24,0,0,0);
 const seconds=Math.max(0,Math.ceil((nextMidnight.getTime()-now)/1000));
 return {progress,tier,active,available,wheelClaimed,daysLeft:Math.max(0,Math.ceil((SEASON.ends-now)/86400000)),resetLabel:`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`};
}

export const RELEASES=[
 {version:'1.3.1',title:'Softer steps, wilder trails',tag:'Soft Trails',date:'2026-10-09',highlights:['Eight newly recorded ElevenLabs grass footsteps, shuffled without immediate repeats.','Remade menu, confirmation, back, notification, reorder, purchase and customization sounds with a gentle consistent mix.','Seamless repeating terrain materials and organic blended borders between paths, grass, paving and shorelines.','Rounded terrain corners, clearer bridge decks and cached terrain rendering.'],detail:'Existing routes, collisions, wild encounters and adventure saves are preserved.'},
 {version:'1.3.0',title:'The world comes alive',tag:'Living Auralis',date:'2026-10-09',highlights:['A cinematic Solunelle main menu with season rewards, daily gifts and your keeper community.','Four facings and idle, movement, attack, damage, faint, summon and recall animations for all 312 Nuvo forms.','Expressive keeper walking and sprinting, plus animated battle transitions for both sides.','Eight new town building styles, twelve decorative props, flowing fountains and wandering residents.'],detail:'Your current adventure, companions, customization and season progress carry forward.'},
 {version:'1.2.2',title:'Illustrated Auralis',tag:'Art update',date:'2026-10-09',highlights:['Illustrated keeper customization and town characters.','Detailed terrain, interiors, landmark art and new town buildings.','Measured sprite crops preserve complete silhouettes.'],detail:'Existing clothing and appearance choices were retained.'},
 {version:'1.2.1',title:'Take the wild paths',tag:'World expansion',date:'2026-10-09',highlights:['Six connected regions: Brookbend, Bramble, Echohollow, Glassvein, Lantern Lake and Rimewind.','Rivers, bridges, caves, lake islands, mazes and mountain routes.','Every original Nuvo family appears in multiple genuine wild habitats.'],detail:'Roads and bridges are safe; look for wild Nuvo in tall grass and cave gravel.'},
 {version:'1.2.0',title:'First Light',tag:'Season 01',date:'2026-10-09',highlights:['The first free 100-tier season pass, with exclusive mythical Solunelle at tier 100.','Larger regions, tall grass, a follow camera and fullscreen exploration.','Expanded character customization and an evolution cinematic.'],detail:'Explore, battle and discover to earn pass XP. All 100 tiers are free.'},
];
