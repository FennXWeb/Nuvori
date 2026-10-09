import {SPECIES_BY_ID} from './data';
import {drawNuvoActor} from './nuvoAnimation';
export {nuvoAtlas} from './sprites';
export {gaitFor} from './nuvoAnimation';
export function drawCompanion(ctx:CanvasRenderingContext2D,_image:HTMLImageElement,id:string,x:number,y:number,time:number,moving:boolean,direction:number,prismatic:boolean){
 const s=SPECIES_BY_ID[id];if(!s)return;
 drawNuvoActor(ctx,id,x,y,58+s.stage*13,direction,moving?'walk':'idle',time,prismatic,typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
}
