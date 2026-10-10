// Development-only, in-memory QA. Never reads or writes an adventure/account.
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {StoryJournal,StoryHud} from '../src/StoryJournal';
import {newSave,battleTurn,type Battle} from '../src/game';
import {finishStoryConversation,prepareStoryBattle,equipStoryCosmetic,freshStory,tutorialEncounter} from '../src/story';
import {STORY_STEPS,STORY_COSMETICS} from '../src/storyContent';
import {LEAGUE_GUARDIANS} from '../src/expansion';
import {BattleView} from '../src/BattleScreen';
import {WorldAtlas} from '../src/WorldAtlas';
import {World} from '../src/World';
import {useRef} from 'react';
import '../src/styles.css';
import '../src/nuvoriUI.css';
import '../src/firstLight.css';
function Preview(){
 const [save,setSave]=useState(()=>newSave({name:'Rowan',palette:0,pronouns:'They / them'},'spriglet')),[show,setShow]=useState<'journal'|'map'|'world'>('journal'),[battle,setBattle]=useState<Battle|null>(null),keys=useRef(new Set<string>());
 const pick=(id:string)=>{const chapter=STORY_STEPS.findIndex(s=>s.id===id);setSave(s=>({...s,region:STORY_STEPS[chapter].region,x:560,y:496,story:{...freshStory(),chapter},leagueBadges:LEAGUE_GUARDIANS.map(g=>g.id),cosmetics:STORY_COSMETICS.map(c=>c.id)}));setBattle(null);setShow('journal');};
 return <div className="fullscreen-game" style={{background:'#11282a',minHeight:'100vh'}}><div style={{position:'fixed',zIndex:200,left:15,bottom:8,display:'flex',gap:8,background:'#fff',padding:8}}><button onClick={()=>pick('register')}>Registration</button><button onClick={()=>pick('ari-first')}>Rival</button><button onClick={()=>pick('hall-endurance')}>Hall finale</button><button onClick={()=>{const s={...save,story:{...freshStory(),chapter:2},region:'verdant'};setSave(s);setBattle(tutorialEncounter(s)!);}}>Catching lesson</button><button onClick={()=>{setShow('world');setBattle(null);}}>World</button><button onClick={()=>setShow('journal')}>Story</button><button onClick={()=>setShow('map')}>Atlas</button></div>
 {show==='journal'&&!battle&&<StoryJournal save={save} onClose={()=>setShow('world')} onMap={()=>setShow('map')} onEquip={i=>setSave(equipStoryCosmetic(save,i))} onAction={id=>{const next=finishStoryConversation(save,id);if(next!==save)setSave(next);else{const c=prepareStoryBattle(save,id);setSave(c.save);setBattle(c.battle);}}}/>}
 {show==='world'&&!battle&&<><div style={{height:'100vh'}}><World save={save} paused={false} remote={[]} onMove={(x,y)=>{save.x=x;save.y=y;}} onTravel={id=>setSave(s=>({...s,region:id,x:560,y:496}))} onEncounter={()=>{}} onInteract={()=>setShow('journal')} onNearby={()=>{}} keys={keys} onReady={()=>{}}/></div><StoryHud save={save} onOpen={()=>setShow('journal')}/></>}
 {show==='map'&&!battle&&<WorldAtlas save={save}/>}
 {battle&&<BattleView battle={battle} save={save} busy={false} onAction={action=>{const r=battleTurn(save,battle,action);setSave(r.save);setBattle(r.battle);}} onFinish={()=>{setBattle(null);setShow('journal');}}/>}
 </div>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Preview/>);
