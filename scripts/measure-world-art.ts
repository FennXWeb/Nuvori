import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const WORLD_ART_SHEETS: [string,number,number][] = [
 ['illustrated-grass.png',4,2],['illustrated-decor.png',4,4],['illustrated-landmarks.png',4,3],['illustrated-buildings.png',4,2],
 ['keeper-heads-a.png',4,6],['keeper-heads-b.png',4,6],['keeper-tops-a.png',4,5],['keeper-tops-b.png',4,5],
 ['keeper-bottoms.png',4,4],['keeper-hats.png',4,5],['keeper-accessories.png',4,4],
];

/** Measure intact connected silhouettes, never assume an AI sheet has exact gutters.
 * Source pixels are read only; disconnected details belong to their nearest cell. */
export function measureWorldArt(bytes:Buffer,columns:number,rows:number) {
 const p=PNG.sync.read(bytes),{width,height,data}=p;
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
 const groups=Array.from({length:columns*rows},()=>({x:width,y:height,right:0,bottom:0,pixels:0}));
 for(let i=0;i<seen.length;i++){
  if(seen[i]||data[i*4+3]<=32)continue;
  let head=0,tail=1,x0=width,x1=0,y0=height,y1=0;queue[0]=i;seen[i]=1;
  while(head<tail){const n=queue[head++],x=n%width,y=Math.floor(n/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const j of [x>0?n-1:-1,x+1<width?n+1:-1,y>0?n-width:-1,y+1<height?n+width:-1])if(j>=0&&!seen[j]&&data[j*4+3]>32){seen[j]=1;queue[tail++]=j;}
  }
  if(tail<24)continue;
  const col=Math.min(columns-1,Math.floor((x0+x1)/2/width*columns)),row=Math.min(rows-1,Math.floor((y0+y1)/2/height*rows));
  const g=groups[row*columns+col];g.x=Math.min(g.x,x0);g.y=Math.min(g.y,y0);g.right=Math.max(g.right,x1+1);g.bottom=Math.max(g.bottom,y1+1);g.pixels+=tail;
 }
 const frames=groups.map((g,i)=>{
  if(g.pixels<200)throw new Error(`Missing frame ${i}`);
  if(g.right-g.x>width/columns*1.12||g.bottom-g.y>height/rows*1.35)throw new Error(`Connected or misassigned sprites in frame ${i}`);
  const x=Math.max(0,g.x-2),y=Math.max(0,g.y-2);
  return {x,y,width:Math.min(width,g.right+2)-x,height:Math.min(height,g.bottom+2)-y};
 });
 // No rectangle may contain a neighbor's silhouette.
 for(let a=0;a<frames.length;a++)for(let b=a+1;b<frames.length;b++){
  const r=frames[a],s=frames[b];
  const l=Math.max(r.x,s.x),t=Math.max(r.y,s.y),rr=Math.min(r.x+r.width,s.x+s.width),bb=Math.min(r.y+r.height,s.y+s.height);
  for(let y=t;y<bb;y++)for(let x=l;x<rr;x++)if(data[(y*width+x)*4+3]>32)throw new Error(`Frames ${a} and ${b} overlap visible pixels`);
 }
 return {width,height,sha256:createHash('sha256').update(bytes).digest('hex'),frames};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out:Record<string,ReturnType<typeof measureWorldArt>>={};
 for(const [file,cols,rows] of WORLD_ART_SHEETS){out[file]=measureWorldArt(readFileSync(new URL('../public/assets/'+file,import.meta.url)),cols,rows);console.log(file,out[file].frames.length);}
 writeFileSync(new URL('../src/worldArtFrames.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
}
