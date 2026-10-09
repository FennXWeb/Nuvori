import {Modal} from "./components";
import type {Save} from "./game";
import {REGION_BY_ID} from "./data";
export {MainMenu} from './MainMenu';
export function AdventureMenu({pause,save,online,onOpen,onClose,onSave,onHome}:{pause:boolean;save:Save;online:boolean;onOpen:(id:string)=>void;onClose:()=>void;onSave:()=>void;onHome:()=>void}){
 const entries=[['team','◉','Your crew','Moves, evolutions & reserve'],['bag','◈','Satchel','Orbs & supplies'],['map','⌖','World map','Towns, trails & landmarks'],['journal','✧','Nuvo journal','Every discovery, remembered'],['season','✦','Season 1 pass','First Light · 100 free tiers'],['nursery','❀','Nursery','Your growing Nuvo family'],['wheel','☀','Daily wheel','A little luck, every day'],[online?'friends':'online','♡','Friends','Your fellow keepers'],['league','♜','Champions League','Face a champion together'],['guide','?','Field guide','Learn the keeper’s way'],['online','☁','Account & online','Cloud saves and connections'],['settings','⚙','Settings','Audio, display & save tools']];
 return <Modal title={pause?"Take a breath.":"Your adventure"} eyebrow={pause?"PAUSED · YOUR WORLD CAN WAIT":"KEEPER’S FIELD JOURNAL"} onClose={onClose} wide>
 <div className="pause-summary"><strong>{save.player.name}</strong><span>{REGION_BY_ID[save.region].name} · {save.coins.toLocaleString()} coins</span><button className="primary-button" onClick={onClose}>Resume adventure →</button></div>
 <div className="adventure-menu-grid">{entries.map(([id,icon,title,desc])=><button key={id+title} onClick={()=>onOpen(id)}><span>{icon}</span><strong>{title}</strong><small>{desc}</small></button>)}</div>
 <div className="menu-footer"><button className="secondary-button" onClick={onSave}>Save adventure</button><button className="secondary-button" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});}}>Toggle full screen</button><button className="text-button" onClick={onHome}>Return to main menu</button></div>
 <p className="pass-note">Local movement is paused. Other online keepers, chat, nursery timers and real-time boosts continue.</p></Modal>;
}
