// In-memory guide fixture only: never reads or writes an adventure or account.
import {createRoot} from 'react-dom/client';
import {Guide} from '../src/App';
import {newSave,battleTurn} from '../src/game';
import {createNuvo} from '../src/data';
import {evolveCompanion,recordForms} from '../src/collection';
import '../src/styles.css';
let save=newSave({name:'Guide fixture',palette:0,pronouns:'They / them'},'spriglet');
save.party[0].level=22;
save=evolveCompanion(save,save.party[0].uid,'spriglet-1').save;
save=evolveCompanion(save,save.party[0].uid,'spriglet-3').save;
save=battleTurn(save,{wild:createNuvo('cindlet-1',3,false),active:0,turn:0,log:[],reward:0},{type:'catch'},()=>0).save;
save=recordForms(save,[],['spriglet-2']);
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Guide save={save} onClose={()=>{location.href='/beta.html';}}/>);
