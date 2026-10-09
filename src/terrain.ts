import type { Region } from "./data";

export const WORLD_COLUMNS=72, WORLD_ROWS=52, WORLD_PIXEL_WIDTH=2304, WORLD_PIXEL_HEIGHT=1664;
export type TerrainTile="ground"|"path"|"grass"|"water"|"bridge"|"cliff"|"hedge"|"cave"|"rubble"|"steps";
type Point=[number,number];
export interface TrailFeature {name:string;x:number;y:number;kind:"bridge"|"maze"|"lake"|"cave"|"steps"}
export interface Terrain {tiles:TerrainTile[][];features:TrailFeature[];underground:boolean;bridgeAxes:Map<string,boolean>}
export const terrainNoise=(x:number,y:number,seed=1)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
export function roadAt(x:number,y:number,town=false){
 return Math.abs(x-18)<1.7||Math.abs(y-13)<1.5|| (town && ((y>5&&y<46&&[9,27,43,59].some(v=>Math.abs(x-v)<1.3))|| (x>5&&x<64&&[20,31,43].some(v=>Math.abs(y-v)<1.2)) || (x>38&&x<64&&y>27&&y<35)));
}
export const isUnderground=(r:Region)=>r.id==="echohollow"||r.id==="glassvein";
const cache=new Map<string,Terrain>();

/** Authored tile geometry is shared by rendering, collisions, encounters and the map. */
export function getTerrain(r:Region):Terrain {
 const cached=cache.get(r.id);if(cached)return cached;
 const underground=isUnderground(r),town=r.kind==="Town";
 const tiles:TerrainTile[][]=Array.from({length:WORLD_ROWS},()=>Array<TerrainTile>(WORLD_COLUMNS).fill(underground?"cliff":"ground"));
 const features:TrailFeature[]=[];
 const put=(x:number,y:number,t:TerrainTile)=>{if(x>=0&&y>=0&&x<WORLD_COLUMNS&&y<WORLD_ROWS)tiles[y][x]=t;};
 const rect=(x:number,y:number,w:number,h:number,t:TerrainTile)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t);};
 const ellipse=(x:number,y:number,rx:number,ry:number,t:TerrainTile)=>{for(let yy=Math.floor(y-ry);yy<=y+ry;yy++)for(let xx=Math.floor(x-rx);xx<=x+rx;xx++)if(((xx-x)/rx)**2+((yy-y)/ry)**2<=1)put(xx,yy,t);};
 const stroke=(points:Point[],width:number,t:TerrainTile|"trail")=>{
  for(let i=1;i<points.length;i++){
   const [ax,ay]=points[i-1],[bx,by]=points[i],length=Math.hypot(bx-ax,by-ay),count=Math.ceil(length*3);
   for(let n=0;n<=count;n++){const xx=ax+(bx-ax)*n/Math.max(count,1),yy=ay+(by-ay)*n/Math.max(count,1);
    for(let y=Math.floor(yy-width/2);y<=yy+width/2;y++)for(let x=Math.floor(xx-width/2);x<=xx+width/2;x++){
     if(x<0||y<0||x>=WORLD_COLUMNS||y>=WORLD_ROWS||Math.hypot(x-xx,y-yy)>width/2)continue;
     put(x,y,t==="trail"?(tiles[y][x]==="water"?"bridge":tiles[y][x]==="cliff"&&!underground?"steps":tiles[y][x]==="bridge"?"bridge":"path"):t);
    }
   }
  }
 };
 const path=(points:Point[],width=3)=>stroke(points,width,"trail");
 const river=(points:Point[],width=5)=>stroke(points,width,"water");
 const feature=(name:string,x:number,y:number,kind:TrailFeature["kind"])=>features.push({name,x,y,kind});
 const maze=(hedge:boolean)=>{
  // Alternating openings force real switchbacks; the outside path remains an optional bypass.
  rect(32,21,35,26,hedge?"hedge":"cliff");rect(34,23,31,22,"ground");
  for(let i=0;i<4;i++)rect(39+i*6,i%2?23:28,2,17,hedge?"hedge":"cliff");
  rect(32,24,4,4,"ground");rect(63,40,4,4,"ground");
  path([[18,25],[30,25],[36,25]],3);
  // Do not paint a shortcut through any of the internal walls.
  path([[36,25],[36,26],[42,26],[42,42],[48,42],[48,26],[54,26],[54,42],[60,42],[65,42],[69,42],[69,13]],2);
  feature(hedge?"Roseheart switchbacks":"The fallen galleries",35,26,"maze");
 };

 if(underground){
  for(const [x,y,rx,ry] of [[18,14,11,11],[44,13,13,8],[54,34,12,10],[24,39,11,9]])ellipse(x,y,rx,ry,"cave");
  stroke([[18,13],[44,13],[54,25],[54,34],[24,39],[18,28],[18,13]],5,"cave");
  if(r.id==="glassvein"){
   ellipse(53,34,9,6,"water");path([[43,34],[64,34]],3);path([[54,13],[64,23],[64,34],[60,43],[24,43],[18,39]]);
   feature("Flooded mine crossing",54,34,"bridge");
  }else{
   ellipse(43,13,7,5,"water");path([[32,13],[56,13]],3);feature("The crystal bridge",43,13,"bridge");
  }
  path([[18,0],[18,22],[25,29],[25,39],[18,44],[18,51]]);
  path([[18,13],[32,13],[44,13],[54,24],[54,34],[34,39],[25,39]]);
  // Broad gravel beds are cave encounter areas; lantern-lined paths stay safe.
  for(let y=1;y<51;y++)for(let x=1;x<71;x++)if(tiles[y][x]==="cave"&&(Math.sin(x*.28)*Math.cos(y*.36)>-.3))tiles[y][x]="rubble";
  feature(r.id==="echohollow"?"Echo chamber":"Miner’s gallery",49,31,"cave");
 } else if(town){
  for(let y=0;y<52;y++)for(let x=0;x<72;x++)if(roadAt(x+.5,y+.5,true))put(x,y,tiles[y][x]==="water"?"bridge":"path");
 } else {
  switch(r.id){
   case "brookbend":
    river([[32,0],[32,9],[42,20],[38,32],[48,44],[48,52]],6);
    path([[18,13],[18,34],[38,34],[55,34],[55,13],[71,13]]);
    path([[18,34],[18,44],[35,44],[40,39]],3);
    feature("Waterwheel bridge",35,13,"bridge");feature("Reedbank crossing",39,34,"bridge");break;
   case "verdant":
    river([[39,0],[39,17],[45,26],[45,36],[39,52]],5);
    path([[18,25],[30,25],[30,36],[55,36],[55,13]]);
    ellipse(57,42,8,5,"water");feature("Fernwater bridge",39,13,"bridge");feature("Willow pool",57,42,"lake");break;
   case "bramble": maze(true);ellipse(49,7,8,4,"water");feature("Stillwater clearing",49,7,"lake");break;
   case "hollow":
    maze(true);ellipse(8,34,5,8,"water");feature("Mushroom mere",8,34,"lake");break;
   case "tideglass":
    rect(46,0,26,52,"water");ellipse(48,26,13,18,"water");
    ellipse(58,13,7,7,"ground");ellipse(60,35,8,8,"ground");ellipse(37,39,8,6,"water");
    path([[18,13],[33,13],[58,13],[71,13]]);path([[58,13],[58,35],[29,35],[29,13]]);
    feature("Seaglass causeway",48,13,"bridge");feature("Coral island",60,35,"lake");break;
   case "crystal":
    rect(33,20,32,4,"cliff");rect(39,31,31,4,"cliff");rect(31,41,30,4,"cliff");
    ellipse(58,7,8,4,"water");path([[18,25],[35,25],[35,28],[66,28],[66,38],[35,38],[35,47],[57,47]]);
    path([[49,13],[49,27],[57,27],[57,38],[35,38]]);feature("Prism stairways",49,22,"steps");break;
   case "emberfall":
    rect(33,20,5,28,"cliff");rect(47,19,5,25,"cliff");rect(61,26,5,24,"cliff");
    path([[18,27],[30,27],[30,44],[42,44],[42,24],[57,24],[57,46],[69,46],[69,13]]);
    feature("Cinder switchbacks",41,43,"steps");break;
   case "starfall": maze(false);ellipse(50,8,8,3,"water");break;
   case "saffron":
    rect(29,20,5,28,"cliff");rect(42,22,5,25,"cliff");rect(57,18,5,29,"cliff");
    ellipse(51,35,5,8,"water");path([[18,25],[25,25],[25,44],[38,44],[38,25],[51,25],[51,45],[66,45],[66,13]]);
    feature("Sunken oasis",51,35,"lake");feature("Sandstone narrows",38,43,"steps");break;
   case "mirelight":
   case "lanternlake":
    rect(28,0,44,52,"water");
    for(const [x,y,rx,ry] of [[39,13,8,7],[58,13,8,6],[54,33,9,8],[32,40,7,7],[66,45,5,5]])ellipse(x,y,rx,ry,"ground");
    path([[18,13],[39,13],[58,13],[71,13]]);path([[18,40],[32,40],[54,40],[54,13]]);path([[54,33],[66,33],[66,45]]);
    if(r.id==="lanternlake"){ellipse(7,34,5,10,"water");path([[18,13],[18,40]]);}
    feature("Lantern boardwalk",46,13,"bridge");feature("Lily islands",54,33,"lake");break;
   case "tempest":
   case "rimewind":
    river([[33,0],[33,17],[43,27],[43,52]],6);rect(49,19,20,4,"cliff");rect(49,35,20,4,"cliff");
    ellipse(59,43,6,4,"water");path([[18,30],[30,30],[30,42],[47,42],[47,28],[58,28],[58,13]]);
    path([[47,28],[67,28],[67,46],[57,46]]);feature("Highwind suspension bridge",43,42,"bridge");feature("Glacier steps",58,21,"steps");break;
   case "dreamland":
    ellipse(46,30,16,10,"water");ellipse(46,30,6,5,"ground");path([[18,30],[46,30],[65,30],[65,13]]);feature("The sleeping isle",46,30,"lake");break;
  }
  // Preserve familiar junctions and boundary arrival coordinates in existing adventures.
  path([[0,13],[71,13]],3);path([[18,0],[18,51]],3);
  for(let y=3;y<49;y++)for(let x=3;x<69;x++)if(tiles[y][x]==="ground"&&Math.sin((x+.5)*.27+r.name.length)*Math.cos((y+.5)*.31)+Math.sin((x+y+1)*.13)>.04)tiles[y][x]="grass";
 }
 // A crossing has a continuous deck even where the river bank is diagonal.
 const bridgeAxes=new Map<string,boolean>(),seen=new Set<string>();
 for(let y=0;y<WORLD_ROWS;y++)for(let x=0;x<WORLD_COLUMNS;x++)if(tiles[y][x]==="bridge"&&!seen.has(`${x},${y}`)){
  const group:Point[]=[[x,y]];seen.add(`${x},${y}`);
  for(let head=0;head<group.length;head++){const [xx,yy]=group[head];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=xx+dx,ny=yy+dy,key=`${nx},${ny}`;if(tiles[ny]?.[nx]==="bridge"&&!seen.has(key)){group.push([nx,ny]);seen.add(key);}}}
  const minX=Math.min(...group.map(p=>p[0])),maxX=Math.max(...group.map(p=>p[0])),minY=Math.min(...group.map(p=>p[1])),maxY=Math.max(...group.map(p=>p[1]));
  // Only straighten narrow crossings, never fill the lake inside an L-shaped boardwalk.
  if(Math.min(maxX-minX,maxY-minY)<=3)for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++){put(xx,yy,"bridge");seen.add(`${xx},${yy}`);}
 }
 for(let y=0;y<WORLD_ROWS;y++)for(let x=0;x<WORLD_COLUMNS;x++)if(tiles[y][x]==="bridge"){
  const span=(dx:number,dy:number)=>{let length=0;for(const direction of [-1,1])for(let n=1;tiles[y+dy*n*direction]?.[x+dx*n*direction]==="bridge";n++)length++;return length;};
  bridgeAxes.set(`${x},${y}`,span(1,0)>=span(0,1));
 }
 const terrain={tiles,features,underground,bridgeAxes};cache.set(r.id,terrain);return terrain;
}
export function terrainAt(x:number,y:number,r:Region):TerrainTile {return getTerrain(r).tiles[Math.floor(y)]?.[Math.floor(x)]??"cliff";}
export const terrainBlocked=(tile:TerrainTile)=>tile==="water"||tile==="cliff"||tile==="hedge";
export const terrainPath=(tile:TerrainTile)=>tile==="path"||tile==="bridge"||tile==="steps";
export const encounterTile=(tile:TerrainTile)=>tile==="grass"||tile==="rubble";
export const terrainColor=(tile:TerrainTile,underground=false)=>({ground:"#85b779",grass:"#5b9259",path:underground?"#a9a49b":"#dccd9d",water:"#428b9b",bridge:"#bfa371",cliff:"#546476",hedge:"#356e4d",cave:"#656978",rubble:"#82858c",steps:"#b4b7b1"}[tile]);
