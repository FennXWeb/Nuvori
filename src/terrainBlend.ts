import type {TerrainTile} from './terrain';

const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

/** Couple opposite edge bands with a smooth falloff. Central material detail is unchanged.
 * Applied before repetition, and once to the wrapped quilt, to remove both kinds of seam. */
export function periodicPixels(data:Uint8ClampedArray,width:number,height:number,band:number){
 const out=new Uint8ClampedArray(data),bx=Math.min(Math.floor(width/2),Math.max(1,band)),by=Math.min(Math.floor(height/2),Math.max(1,band));
 for(let y=0;y<height;y++)for(let x=0;x<bx;x++){
  const mix=(1-smooth(0,bx,x))*.5,a=(y*width+x)*4,b=(y*width+width-1-x)*4;
  for(let k=0;k<4;k++){const left=out[a+k],right=out[b+k];out[a+k]=left*(1-mix)+right*mix;out[b+k]=right*(1-mix)+left*mix;}
 }
 for(let y=0;y<by;y++)for(let x=0;x<width;x++){
  const mix=(1-smooth(0,by,y))*.5,a=(y*width+x)*4,b=((height-1-y)*width+x)*4;
  for(let k=0;k<4;k++){const top=out[a+k],bottom=out[b+k];out[a+k]=top*(1-mix)+bottom*mix;out[b+k]=bottom*(1-mix)+top*mix;}
 }
 return out;
}

export interface BlendCell {surface:number;tile:TerrainTile;horizontal?:boolean}
export interface BlendSample {cell:BlendCell;weight:number}
export type TerrainSampler=(x:number,y:number)=>BlendCell;
const solid=(tile:TerrainTile)=>tile==='water'||tile==='cliff'||tile==='hedge';

/** A continuous four-corner material field. World-space noise makes dirt edges organic,
 * rounded corners and junctions come from the same field, and structural decks stay crisp. */
export function terrainBlendAt(x:number,y:number,at:TerrainSampler):BlendSample[]{
 const center=at(Math.floor(x/32),Math.floor(y/32));
 if(center.tile==='bridge'||center.tile==='steps')return [{cell:center,weight:1}];
 const warpX=Math.sin(x*.073+y*.091)*3.2+Math.sin(y*.29-x*.11)*1.1;
 const warpY=Math.sin(y*.081-x*.067)*3.2+Math.sin(x*.27+y*.13)*1.1;
 const tx=(x+warpX)/32-.5,ty=(y+warpY)/32-.5,gx=Math.floor(tx),gy=Math.floor(ty);
 const raw=[at(gx,gy),at(gx+1,gy),at(gx,gy+1),at(gx+1,gy+1)];
 // A deck covers its underlying river; no wooden pixels are smeared into the water.
 const cells=raw.map(c=>c.tile==='bridge'||c.tile==='steps'?center:c);
 // Build a broad curved contour first, then tighten its feather. Applying a narrow
 // fade directly to each axis would leave square steps at every river bend.
 const u=smooth(.15,.85,tx-gx),v=smooth(.15,.85,ty-gy),samples:BlendSample[]=[];
 cells.forEach((cell,i)=>{const weight=(i%2?u:1-u)*(i>1?v:1-v),same=samples.find(s=>s.cell.surface===cell.surface);if(same)same.weight+=weight;else samples.push({cell,weight});});
 const hardness=samples.reduce((n,s)=>n+s.weight*(solid(s.cell.tile)?.8:s.cell.surface===2?.6:0),0);
 let total=0;for(const sample of samples){sample.weight=Math.pow(sample.weight,1.7+hardness);total+=sample.weight;}
 return samples.map(s=>({cell:s.cell,weight:s.weight/total})).filter(s=>s.weight>.000001);
}
