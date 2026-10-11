import type {CSSProperties} from 'react';
import {Crown} from 'lucide-react';
import type {LeagueGuardian} from './leagueArenaModel';
import {SPECIES_BY_ID} from './data';
import './leagueArena.css';

export function ChampionsBackdrop(){return <div className="champions-backdrop" aria-hidden="true"><div className="champions-landscape"/><div className="champions-atmosphere"/><div className="champions-rays"/>{Array.from({length:18},(_,i)=><i key={i} className="champions-mote" style={{'--x':`${(i*37)%100}%`,'--drift':`${i%2?18:-24}px`,'--duration':`${9+i%7}s`,'--delay':`${-i*1.7}s`,'--size':`${2+i%3}px`} as CSSProperties}/>)}</div>;}
export function ChampionSigil({className=''}:{className?:string}){return <svg className={`champion-sigil ${className}`} viewBox="0 0 200 200" fill="none" aria-hidden="true"><circle cx="100" cy="100" r="91"/><circle cx="100" cy="100" r="82" strokeDasharray="2 9"/><path d="M100 8 111 29 100 24 89 29ZM192 100 171 111 176 100 171 89ZM100 192 89 171 100 176 111 171ZM8 100 29 89 24 100 29 111Z"/><g className="sigil-inner"><path d="M100 35 156 67 156 133 100 165 44 133 44 67Z"/><path d="m100 35 56 98H44Zm0 130L44 67h112Z"/><circle cx="100" cy="100" r="41"/></g><path d="m100 58 8 33 34 9-34 8-8 34-9-34-33-8 33-9Z"/></svg>;}
export function ChampionCrest({className=''}:{className?:string}){return <span className={`champion-crest ${className}`} aria-hidden="true"><ChampionSigil/><Crown/></span>;}
export function ChampionEntrance({guardian,onSkip}:{guardian:LeagueGuardian;onSkip:()=>void}){return <div className="champion-entrance"><div className="entrance-rule"/><ChampionCrest/><span className="league-kicker">THE GUARDIAN AWAKENS</span><h2>{SPECIES_BY_ID[guardian.species].name}</h2><p>{guardian.name} <span>·</span> Level {guardian.level}</p><div className="entrance-rule"/><button onClick={onSkip}>Enter the arena <span>→</span></button></div>;}
