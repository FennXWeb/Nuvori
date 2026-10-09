import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {measureWorldArt} from './measure-world-art';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export const MOTION_SHEETS:[string,number,number][]=[
 ['motion-base.png',12,5],
 ...Array.from({length:6},(_,i)=>['side','rear'].map((view):[string,number,number]=>[`motion-evolution-${i+1}-${view}.png`,5,5])).flat(),
 ...['spriglet','cindlet','bubbfin','wisplet','voltik'].map((id):[string,number,number]=>[`motion-${id}.png`,4,5]),
 ['motion-dreamweaver-beginnings.png',6,2],['motion-dreamweaver-ascendants.png',8,4],
 ...Array.from({length:4},(_,i):[string,number,number]=>[`motion-dreamweaver-crown-${i}.png`,8,4]),
 ['motion-oneirune.png',2,1],['motion-solunelle.png',2,1],
];
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out:Record<string,ReturnType<typeof measureWorldArt>>={},failures:string[]=[];
 for(const [file,cols,rows] of MOTION_SHEETS){const path=new URL('../public/assets/'+file,import.meta.url);if(!existsSync(path)){failures.push(file+': not generated yet');continue;}
  try{out[file]=measureWorldArt(readFileSync(path),cols,rows);console.log(file,out[file].frames.length);}catch(e){failures.push(file+': '+(e as Error).message);}
 }
 writeFileSync(new URL('../src/motionFrames.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
}
