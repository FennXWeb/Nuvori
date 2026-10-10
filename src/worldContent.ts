import published from './content/world.json';
import type {TerrainTile,TrailFeature} from './terrain';
import type {Interior} from './adventure';

export type Interaction = 'story'|'nursery'|'breeder'|'professor'|'heal'|'shop'|'landmark'|'sign'|'nurse'|'merchant'|'exit'|'tailor'|'barber'|'stylist'|'clothier'|'league'|`trainer:${string}`|`resident:${string}`;
export interface WorldObject {id?:string;x:number;y:number;kind:number;size:number;solid:boolean;interact?:Interaction;label?:string}
export interface SpawnEntry {species:string;weight:number;minLevel:number;maxLevel:number}
export interface SpawnZone {id:string;name:string;x:number;y:number;width:number;height:number;entries:SpawnEntry[];rate:number}
export interface AuthoredCell {
 tiles:TerrainTile[][];
 features:TrailFeature[];
 objects:WorldObject[];
 interiors?:Partial<Record<Interior,WorldObject[]>>;
 encounters:{enabled:boolean;rate:number;entries:SpawnEntry[];zones:SpawnZone[]};
}
export interface WorldDocument {schema:1;cells:Record<string,AuthoredCell>}
let current=(typeof process!=='undefined'&&process.env.NUVORI_TEST_BASE_WORLD==='1'?{schema:1,cells:{}}:published) as WorldDocument,revision=0;
export const worldDocument=()=>current;
export const worldRevision=()=>revision;
export const authoredCell=(id:string)=>Object.hasOwn(current.cells,id)?current.cells[id]:undefined;
/** Used only by the private editor's isolated preview. Normal builds use the checked-in document. */
export function installWorldDocument(document:WorldDocument){current=document;revision++;}
export function spawnTableAt(region:string,x:number,y:number){
 const cell=authoredCell(region);if(!cell)return undefined;
 const zone=[...cell.encounters.zones].reverse().find(z=>x>=z.x&&y>=z.y&&x<z.x+z.width&&y<z.y+z.height);
 return {enabled:cell.encounters.enabled,rate:zone?.rate??cell.encounters.rate,entries:zone?.entries??cell.encounters.entries};
}
export function weightedSpawn(entries:SpawnEntry[],roll:number):SpawnEntry|undefined {
 const total=entries.reduce((sum,e)=>sum+e.weight,0);if(total<=0)return undefined;
 let at=Math.max(0,Math.min(.999999999,roll))*total;
 for(const entry of entries){at-=entry.weight;if(at<0)return entry;}
 return entries.at(-1);
}
