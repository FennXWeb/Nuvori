import metadata from './worldArtFrames.json';
import type {SpriteAtlas} from './sprites';
import {periodicPixels} from './terrainBlend';

export const WORLD_ART=metadata as Record<string,SpriteAtlas>;
const images=new Map<string,HTMLImageElement>();
const loads=new Map<string,Promise<void>>();
export function artImage(file:string){
 if(typeof Image==='undefined')return undefined;
 let image=images.get(file);
 if(!image){image=new Image();image.src=import.meta.env.BASE_URL+'assets/'+file;images.set(file,image);loads.set(file,image.decode().catch(()=>{}));}
 return image.complete&&image.naturalWidth?image:undefined;
}
export async function preloadIllustratedArt(){
 for(const file of [...Object.keys(WORLD_ART),'illustrated-terrain.png','illustrated-ground.png'])artImage(file);
 await Promise.all(loads.values());
}
/** Measured bounds contain the full silhouette and keep its original aspect ratio. */
export function drawArt(c:CanvasRenderingContext2D,file:string,index:number,x:number,y:number,width:number,height=width){
 const image=artImage(file),f=WORLD_ART[file]?.frames[index];if(!image||!f)return false;
 const scale=Math.min(width/f.width,height/f.height),w=f.width*scale,h=f.height*scale;
 c.drawImage(image,f.x,f.y,f.width,f.height,x-w/2,y-h,w,h);return true;
}

const surfaces=new Map<string,HTMLCanvasElement>();
/** Quilt natural materials with feathered patches; align manufactured boards and paving. */
export function surfaceTile(index:number,period=128){
 const key=`${index}:${period}`;if(surfaces.has(key))return surfaces.get(key)!;
 const quiet:Record<number,number>={0:0,1:1,2:2,3:3,6:4,7:5,8:6,14:7};
 const isQuiet=index in quiet,image=artImage(isQuiet?'illustrated-ground.png':'illustrated-terrain.png');if(!image)return undefined;
 // The generated surface atlas uses exact column quarters and measured row boundaries.
 const xs=[0,.25,.5,.75,1],ys=[0,.246,.493,.740,1];
 const source=isQuiet?quiet[index]:index,col=source%4,row=Math.floor(source/4),x=xs[col]*image.width+3;
 const w=image.width/4-6,h=isQuiet?w:(ys[row+1]-ys[row])*image.height-6;
 const y=isQuiet?row*image.height/2+(image.height/2-h)/2:ys[row]*image.height+3;
 const base=document.createElement('canvas');base.width=base.height=period;const bc=base.getContext('2d')!;
 bc.drawImage(image,x,y,w,h,0,0,period,period);
 const pixels=bc.getImageData(0,0,period,period);pixels.data.set(periodicPixels(pixels.data,period,period,Math.ceil(period*.18)));bc.putImageData(pixels,0,0);
 const out=document.createElement('canvas'),natural=![2,3,12,13].includes(index);
 out.width=out.height=period*(natural?4:2);const c=out.getContext('2d')!;
 for(let yy=0;yy<out.height/period;yy++)for(let xx=0;xx<out.width/period;xx++)c.drawImage(base,xx*period,yy*period);
 if(natural){
  // Overlapping, wrapped stamps remove repeated mirror rosettes and conceal source seams.
  const stamp=document.createElement('canvas');stamp.width=stamp.height=period;const sc=stamp.getContext('2d')!;
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
   const seed=((xx*73+yy*137+index*19)%97)/97,seed2=((xx*41+yy*67+index*11)%89)/89;
   sc.clearRect(0,0,period,period);sc.globalCompositeOperation='source-over';
   sc.drawImage(image,x+w*.22*seed,y+h*.22*seed2,w*.78,h*.78,0,0,period,period);
   sc.globalCompositeOperation='destination-in';const mask=sc.createRadialGradient(period/2,period/2,period*.24,period/2,period/2,period*.5);mask.addColorStop(0,'#000');mask.addColorStop(1,'#0000');sc.fillStyle=mask;sc.fillRect(0,0,period,period);
   for(const dx of [-out.width,0,out.width])for(const dy of [-out.height,0,out.height]){
    const px=xx*period/2-period/2+dx,py=yy*period/2-period/2+dy;
    if(px+period>0&&px<out.width&&py+period>0&&py<out.height)c.drawImage(stamp,px,py);
   }
  }
 }
 const quilt=c.getImageData(0,0,out.width,out.height);quilt.data.set(periodicPixels(quilt.data,out.width,out.height,8));c.putImageData(quilt,0,0);
 surfaces.set(key,out);return out;
}
const patterns=new WeakMap<CanvasRenderingContext2D,Map<HTMLCanvasElement,CanvasPattern>>();
export function paintSurface(c:CanvasRenderingContext2D,index:number,x:number,y:number,w:number,h:number,period=128){
 const tile=surfaceTile(index,period);if(!tile)return false;
 let map=patterns.get(c);if(!map){map=new Map();patterns.set(c,map);}
 let pattern=map.get(tile);if(!pattern){pattern=c.createPattern(tile,'repeat')??undefined;if(!pattern)return false;map.set(tile,pattern);}
 c.fillStyle=pattern;c.fillRect(x,y,w,h);return true;
}
