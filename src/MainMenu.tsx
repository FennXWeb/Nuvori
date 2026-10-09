import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronRight,Compass,Gift,Maximize,MessageCircle,Settings,Sparkles,Users,Volume2,VolumeX,X} from 'lucide-react';
import type {Save} from './game';
import type {SocialState} from './social';
import type {RemoteKeeper} from './online';
import {REGION_BY_ID} from './data';
import {PlayerArt,NuvoArt} from './components';
import {MenuScene} from './MenuScene';
import {menuProgress} from './menuModel';
import {gameAudio} from './audio';
import './mainMenu.css';

export type MenuDestination='season'|'wheel'|'friends'|'updates'|'settings'|'online'|'team'|'map'|'journal'|'guide';
export function MainMenu({save,onPlay,onOpen,online,status,social,remote,audio,onAudio,chat,obscured=false}:{save:Save|null;onPlay:()=>void;onOpen:(id:MenuDestination)=>void;online:boolean;status:string;social:SocialState;remote:RemoteKeeper[];audio:boolean;onAudio:()=>void;chat:ReactNode;obscured?:boolean}){
 const [now,setNow]=useState(Date.now()),[chatOpen,setChatOpen]=useState(false),[notice,setNotice]=useState('');
 const play=useRef<HTMLButtonElement>(null),m=menuProgress(save,now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const friends=social.friends.filter(f=>f.status==='accepted'),connected=friends.filter(f=>remote.some(p=>p.id===f.profile.user_id)),requests=social.friends.filter(f=>f.status==='pending'&&f.incoming).length;
 const open=(id:MenuDestination)=>{gameAudio.play('ui-click');onOpen(id);};
 const fullScreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();setNotice('');}catch{setNotice('Fullscreen is unavailable here. Use F11 in the desktop game.');}};
 return <div className={`lobby ${obscured?'lobby-obscured':''}`} role="main" aria-label="Nuvori main menu" inert={obscured} aria-hidden={obscured||undefined} onKeyDown={e=>{if(e.key==='Escape'&&chatOpen){e.stopPropagation();setChatOpen(false);play.current?.focus();}}}>
  <MenuScene quiet={obscured}/>
  <header className="lobby-header">
   <div className="lobby-logo" style={{'--logo-mask':`url("${import.meta.env.BASE_URL}assets/nuvori-logo.png")`} as CSSProperties}><img src={`${import.meta.env.BASE_URL}assets/nuvori-logo.png`} alt="Nuvori"/><span className="logo-sheen"/><i/><i/></div>
   <nav className="lobby-navigation" aria-label="Main navigation"><span aria-current="page">Lobby</span><button onClick={()=>open('season')}>Season pass {m.available>0&&<b>{m.available}</b>}</button><button onClick={()=>open('updates')}>What’s new <span className="nav-new"/></button></nav>
   <div className="lobby-utilities"><button aria-label={audio?'Mute game audio':'Enable game audio'} title={audio?'Mute audio':'Enable audio'} onClick={onAudio}>{audio?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button aria-label="Toggle full screen" title="Full screen" onClick={()=>void fullScreen()}><Maximize size={18}/></button><button aria-label="Settings" title="Settings" onClick={()=>open('settings')}><Settings size={19}/></button><button className="lobby-account" onClick={()=>open('online')} aria-label="Account & online"><span className={`lobby-status ${online?'connected':''}`}/><Users className="account-mobile-icon" size={18}/><span>{save?.player.name??(online?'Create your keeper':'Guest keeper')}<small>{online?'Account connected':'Local adventure'}</small></span>{save?<PlayerArt palette={save.player.palette} look={save.player} size={42}/>:<Users size={22}/>}</button></div>
  </header>
  <section className="lobby-intro">
   <div className="lobby-season-tag"><i/><span>SEASON 01</span><span className="season-tag-line"/><span>{m.active?'FIRST LIGHT':'THE STARLACE EXPEDITION'}</span></div>
   <h1>Your next<br/>legend <em>awaits.</em></h1>
   <p>A world to wander.<br/>A companion for every possibility.</p>
   <button ref={play} autoFocus className="lobby-play" onClick={onPlay}><Compass size={24}/><span>{save?'Continue adventure':'Begin your adventure'}<small>{save?REGION_BY_ID[save.region].name:'Create your keeper · choose your first Nuvo'}</small></span><ArrowRight size={23}/></button>
   <div className="lobby-shortcuts"><button onClick={()=>open(save?'team':'guide')}><Sparkles size={15}/>{save?'Your crew':'Keeper’s guide'}</button><span/><button onClick={()=>open('map')}><Compass size={15}/>World atlas</button>{save&&<><span/><button onClick={()=>open('journal')}><BookOpen size={15}/>Journal</button></>}</div>
   {save&&<div className="lobby-crew"><div>{save.party.map(n=><span key={n.uid} title={`Level ${n.level}`}><NuvoArt id={n.speciesId} prismatic={n.prismatic} size={39}/></span>)}</div><small>{save.caught.length} discovered <i>·</i> {save.coins.toLocaleString()} coins</small></div>}
  </section>
  <section className="lobby-feature" aria-label="Featured season reward"><span className="feature-mythic"><Sparkles size={13}/> MYTHICAL · ASTRAL / BLOOM</span><h2>Solunelle</h2><p>The first-light companion</p><button onClick={()=>open('season')}>Yours at tier 100 <ArrowUpRight size={14}/></button></section>
  <div className="lobby-dock">
   <button className="lobby-card lobby-pass-card" onClick={()=>open('season')}><span className="lobby-card-art pass-card-art"><span className="pass-sigil">✧</span></span><span className="lobby-card-copy"><small>100 TIERS · ALL FREE</small><strong>Follow the first light <ChevronRight size={17}/></strong><span>{save?`Tier ${m.tier} / 100${m.available?` · ${m.available} reward${m.available===1?'':'s'} to claim`:''}`:'Exclusive styles. A mythical companion.'}</span><span className="lobby-progress" role="progressbar" aria-label="Season progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={m.tier}><i style={{width:`${m.tier}%`}}/></span></span><span className="card-corner">{m.active?`${m.daysLeft} DAYS LEFT`:'SEASON ARCHIVE'}</span></button>
   <button className="lobby-card lobby-wheel-card" onClick={()=>open('wheel')}><span className="mini-wheel"><i/><Gift size={23}/></span><span className="lobby-card-copy"><small>DAILY WISHING WHEEL</small><strong>{m.wheelClaimed?'A gift well earned':'Make a little luck'} <ChevronRight size={17}/></strong><span>{!save?'Create a keeper for your daily gift':m.wheelClaimed?`Next spin in ${m.resetLabel}`:'Your free spin is ready'}</span><b className={m.wheelClaimed?'muted-pill':'ready-pill'}>{m.wheelClaimed?<Check size={11}/>:<Sparkles size={11}/>} {m.wheelClaimed?'CLAIMED':'EVERY SPIN WINS'}</b></span></button>
   <button className="lobby-card lobby-friends-card" onClick={()=>open('friends')}><span className="friends-card-icon"><Users size={28}/><i/></span><span className="lobby-card-copy"><small>BETTER TOGETHER</small><strong>Your trail companions <ChevronRight size={17}/></strong><span>{online?`${connected.length} friends online · ${friends.length} friends`:'Find friends. Share the adventure.'}</span><b className="friends-pill">{requests?`${requests} NEW REQUEST${requests===1?'':'S'}`:online?'MANAGE FRIENDS':'CONNECT YOUR ACCOUNT'}</b></span></button>
  </div>
  {chatOpen&&<aside className="lobby-chat-window" aria-label="Lobby community"><div className="lobby-chat-heading"><span><MessageCircle size={17}/> Keeper community</span><button aria-label="Close community chat" onClick={()=>setChatOpen(false)}><X size={18}/></button></div>{chat}<button className="lobby-chat-friends" onClick={()=>open('friends')}><Users size={14}/> Manage friends & requests <ArrowRight size={14}/></button></aside>}
  <footer className="lobby-footer"><span><i className={online?'online-dot':''}/>{online?status:'SOLO ADVENTURE'}<span className="footer-separator">/</span> v1.3.0</span><p>{notice||'Your path. Their evolution.'}</p><button aria-expanded={chatOpen} onClick={()=>{setChatOpen(v=>!v);gameAudio.play('ui-click');}}><MessageCircle size={15}/> Trail chat <span>GLOBAL + LOCAL</span></button></footer>
 </div>;
}
