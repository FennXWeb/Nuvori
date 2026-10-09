import type {BattleScene} from './game';
import type {Nuvo} from './data';
import type {NuvoAction} from './nuvoAnimation';

export function sceneDuration(scenes:BattleScene[]=[]){return scenes.reduce((n,s)=>n+s.duration,0);}
/** Keep the old creature on screen until its replacement's summon actually starts. */
export function presentationAt(initial:{player:Nuvo;wild:Nuvo},scenes:BattleScene[],elapsed:number){
 const result={player:initial.player,wild:initial.wild,playerAction:'idle' as NuvoAction,wildAction:'idle' as NuvoAction,playerKey:-1,wildKey:-1,scene:undefined as BattleScene|undefined,index:-1};
 let start=0;
 for(const [index,scene] of scenes.entries()){
  if(elapsed<start)break;
  result[scene.side]=scene.nuvo;
  result[`${scene.side}Key`]=index;
  if(elapsed<start+scene.duration){result[`${scene.side}Action`]=scene.kind;result.scene=scene;result.index=index;break;}
  if(scene.kind==='faint'||scene.kind==='recall')result[`${scene.side}Action`]=scene.kind;
  else if(scene.kind==='summon')result[`${scene.side}Action`]='idle';
  start+=scene.duration;
 }
 return result;
}
