import type {Region} from './data';
import type {Interior} from './adventure';
import {TRAINERS} from './expansion';
import {WORLD_COLUMNS,WORLD_ROWS,roadAt,getTerrain,terrainAt,terrainBlocked,terrainPath,isUnderground} from './terrain';
import {authoredCell,worldRevision,type WorldObject as Prop,type Interaction} from './worldContent';
export const TILE=32,WORLD_W=WORLD_COLUMNS,WORLD_H=WORLD_ROWS;
const noise = (x: number, y: number, seed = 1) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const mapCache = new Map<string,Prop[]>();
let cacheRevision=-1;
export function getMap(region: Region, interior?: Interior): Prop[] {
  const override=authoredCell(region.id);
  if(interior&&override?.interiors?.[interior])return override.interiors[interior]!;
  if(!interior&&override)return override.objects;
  if(cacheRevision!==worldRevision()){mapCache.clear();cacheRevision=worldRevision();}
  const cached=mapCache.get(`${region.id}:${interior??"outside"}`);if(cached)return cached;
  const props: Prop[] = [];
  if (interior) return [
    { x: 18, y: 9, kind: -1, size: 62, solid: false, label: {lodge:"Nurse Liora",shop:"Shopkeeper Finch",tailor:"Tailor Lark",barber:"Stylist Rue",nursery:"Nurserist Clover"}[interior] },
    ...[16,18,20].map(x => ({ x, y: 10, kind: 21, size: 65, solid: true, interact: ({lodge:"nurse",shop:"merchant",tailor:"clothier",barber:"stylist",nursery:"breeder"}[interior]) as Interaction, label: {lodge:"Restore your team",shop:"Browse supplies",tailor:"Browse clothing",barber:"Change your hairstyle",nursery:"Care for a new generation"}[interior] })),
    ...[11,15,18].map(y => ({ x: 11, y, kind: interior === "nursery" ? 26 : interior === "lodge" ? 20 : interior === "tailor" ? 24 : interior === "barber" ? 25 : 22, size: 76, solid: true })),
    { x: 25, y: 11, kind: 22, size: 76, solid: true },
    { x: 25, y: 16, kind: interior === "lodge" ? 23 : 22, size: 76, solid: true },
    { x: 24, y: 20, kind: 13, size: 44, solid: true },
    { x: 18, y: 21, kind: -2, size: 28, solid: false, interact: "exit" as Interaction, label: "Return outside" },
  ];
  const town = region.kind === "Town";
  if (town) {
    props.push(
      {
        x: 9,
        y: 9,
        kind: 5,
        size: 142,
        solid: true,
        interact: "heal",
        label: "Healing lodge",
      },
      {
        x: 27,
        y: 17,
        kind: 6,
        size: 132,
        solid: true,
        interact: "shop",
        label: "Supply shop",
      },
      { x: 7, y: 23, kind: 4, size: 125, solid: true, interact: "nursery", label: "Nuvo Nursery" },
      { x: 9, y: 18, kind: 4, size: 128, solid: true, interact: "tailor", label: "Thread & Thistle · Clothing" },
      { x: 26, y: 7, kind: 4, size: 126, solid: true, interact: "barber", label: "The Tidy Tangle · Barber" },
      { x: 28, y: 22, kind: 7, size: 140, solid: true, interact: "league", label: "Champions Hall" },
      {
        x: 18,
        y: 7,
        kind: region.prop,
        size: 110,
        solid: true,
        interact: "landmark",
        label: region.landmark,
      },
      {
        x: 18,
        y: 12,
        kind: -1,
        size: 48,
        solid: false,
        interact: "professor",
        label: "Ranger Elowen",
      },
    );
  } else {
    props.push(
      {
        x: region.landmarkPosition?.[0]??18,
        y: region.landmarkPosition?.[1]??7,
        kind: region.prop,
        size: 150,
        solid: true,
        interact: "landmark",
        label: region.landmark,
      },
      {
        x: 11,
        y: 15,
        kind: 14,
        size: 45,
        solid: false,
        interact: "sign",
        label: "Trail guide",
      },
    );
  }
  if(town) for(const [i,[xx,yy]] of [[3,9],[3,18],[14,23],[32,7],[32,23]].entries()) props.push({x:xx,y:yy,kind:30+i%4,size:132,solid:true});
  if(town) for(const [row,yy] of [9,26,39,47].entries()) for(const [col,xx] of [36,50,65].entries()) props.push({x:xx,y:yy,kind:row<3?50+(col+row*3)%8:30+(col+row)%4,size:146,solid:true});
  if(town){
    for(const [i,[xx,yy]] of [[12,10],[22,10],[31,11],[14,17],[30,20],[24,24],[40,16],[54,17],[47,37],[61,35],[40,44],[59,46]].entries())props.push({x:xx,y:yy,kind:60+i,size:i===7?108:72,solid:true});
    for(const [i,[xx,yy]] of [[6,14],[15,10],[24,10],[31,16],[41,29],[56,29],[41,35],[59,35],[34,43],[64,44]].entries())props.push({x:xx,y:yy,kind:64,size:48,solid:false});
    props.push({x:51,y:33,kind:11,size:175,solid:true});
    for(const xx of [9,18,27,43,59])for(const yy of [13,31,43])props.push({x:xx+1.9,y:yy+1.8,kind:41,size:56,solid:false});
    for(const xx of [47,55]){props.push({x:xx,y:34,kind:40,size:60,solid:true});props.push({x:xx,y:29,kind:2,size:100,solid:true});props.push({x:xx,y:35.5,kind:13,size:62,solid:false});}
  }
  const trainer=TRAINERS.find(t => t.region===region.id);
  if(trainer) props.push({x:trainer.x,y:trainer.y,kind:-1,size:64,solid:false,interact:`trainer:${trainer.id}`,label:trainer.name});
  if(isUnderground(region))for(const [xx,yy] of [[16,6],[29,13],[50,18],[52,30],[26,38],[17,48]])props.push({x:xx,y:yy,kind:41,size:56,solid:false});
  for (let y = 1; y < WORLD_H-1; y += 2)
    for (let x = 1; x < WORLD_W-1; x += 2) {
      if (terrainPath(terrainAt(x,y,region)) || terrainBlocked(terrainAt(x,y,region)) || Math.abs(x - 18) < 3 || Math.abs(y - 13) < 2 || (town && x>32 && y>5 && y<49) || getTerrain(region).features.some(f=>Math.hypot(f.x-x,f.y-y)<3)) continue;
      if ([[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy])=>terrainPath(terrainAt(x+dx,y+dy,region)))) continue;
      if (props.some((p) => Math.hypot(p.x - x, p.y - y) < 4)) continue;
      if (
        (x < 4 ||
          x > WORLD_W-4 ||
          y < 4 ||
          y > WORLD_H-3 ||
          noise(x, y, region.name.length) > 0.62) &&
        !(x > 25 && y > 4 && y < 11 && !town)
      ) {
        props.push({
          x: x + noise(x, y) * 0.6,
          y: y + noise(y, x) * 0.6,
          kind:
            isUnderground(region) ? (noise(x,y)>.5?8:12) : region.id === "hollow"
              ? 3
              : region.id === "frostmere" || region.biome === "storm"
                ? 1
                : region.id === "starfall" || region.biome === "dream" || region.biome === "desert"
                  ? 2
                  : noise(x, y) > 0.85
                    ? 2
                    : 0,
          size: isUnderground(region)?45+noise(x,y)*25:78 + noise(x, y) * 35,
          solid: true,
        });
      }
    }
  for (let i = 0; i < 50; i++) {
    const x = 4 + noise(i, 3) * (WORLD_W-8),
      y = 4 + noise(i, 8) * (WORLD_H-8);
    if (
      terrainPath(terrainAt(x,y,region)) || terrainBlocked(terrainAt(x,y,region)) || isUnderground(region) || Math.abs(x - 18) < 3 ||
      Math.abs(y - 13) < 2 ||
      props.some((p) => Math.hypot(p.x - x, p.y - y) < 2)
    )
      continue;
    props.push({
      x,
      y,
      kind: i % 3 === 0 ? 12 : 13,
      size: i % 3 === 0 ? 45 : 38,
      solid: i % 3 === 0,
    });
  }
  mapCache.set(`${region.id}:outside`,props);
  return props;
}
export function isWater(x: number, y: number, r: Region) {
  return terrainAt(x,y,r)==="water";
}
export function isPath(x: number, y: number, town=false) {
  return roadAt(x,y,town);
}
export function canWalk(
  x: number,
  y: number,
  region: Region,
  props = getMap(region),
  interior?: Interior,
) {
  if (interior && (x < 280 || x > 872 || y < 240 || y > 678)) return false;
  if (x < 24 || x > WORLD_W * TILE - 24 || y < 24 || y > WORLD_H * TILE - 24)
    return false;
  const tx = x / TILE,
    ty = y / TILE;
  if (!interior && [[0,0],[-.16,-.16],[.16,-.16],[-.16,.16],[.16,.16]].some(([dx,dy])=>terrainBlocked(terrainAt(tx+dx,ty+dy,region)))) return false;
  return !props.some(
    (p) =>
      p.solid &&
      Math.abs(p.x * TILE - x) < (p.kind>=30?56:(p.kind >= 4 && p.kind <= 7) || p.kind >= 20 ? 38 : 18) &&
      y > p.y * TILE - (p.kind >= 20 ? 65 : 24) &&
      y < p.y * TILE + 9,
  );
}
/** Rescue legacy positions covered by new terrain without resetting an adventure. */
export function safeWorldPosition(x:number,y:number,region:Region,interior?:Interior):[number,number] {
 const props=getMap(region,interior);if(canWalk(x,y,region,props,interior))return [x,y];
 const sx=Math.floor(x/32),sy=Math.floor(y/32);
 for(let radius=1;radius<Math.max(WORLD_W,WORLD_H);radius++)for(let yy=sy-radius;yy<=sy+radius;yy++)for(let xx=sx-radius;xx<=sx+radius;xx++){
  if(Math.max(Math.abs(xx-sx),Math.abs(yy-sy))!==radius)continue;
  const px=xx*32+16,py=yy*32+16;if(canWalk(px,py,region,props,interior)&&findPath(560,496,px,py,region,interior).length)return [px,py];
 }
 return [560,496];
}
export function findPath(
  x: number,
  y: number,
  goalX: number,
  goalY: number,
  region: Region,
  interior?: Interior,
): [number, number][] {
  const props = getMap(region, interior),
    start = [Math.floor(x / 32), Math.floor(y / 32)],
    goal = [Math.floor(goalX / 32), Math.floor(goalY / 32)],
    key = (a: number, b: number) => `${a},${b}`;
  if (!canWalk(goal[0] * 32 + 16, goal[1] * 32 + 16, region, props, interior)) return [];
  const queue = [start],
    parents = new Map<string, number[] | null>([
      [key(...(start as [number, number])), null],
    ]);
  let found = false;
  let head=0;
  while (head<queue.length) {
    const point = queue[head++];
    if (point[0] === goal[0] && point[1] === goal[1]) {
      found = true;
      break;
    }
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const nx = point[0] + dx,
        ny = point[1] + dy,
        k = key(nx, ny);
      if (parents.has(k) || !canWalk(nx * 32 + 16, ny * 32 + 16, region, props, interior))
        continue;
      parents.set(k, point);
      queue.push([nx, ny]);
    }
  }
  if (!found) return [];
  const route: [number, number][] = [];
  let point: number[] | null = goal;
  while (point && !(point[0] === start[0] && point[1] === start[1])) {
    route.unshift([point[0] * 32 + 16, point[1] * 32 + 16]);
    point = parents.get(key(point[0], point[1])) || null;
  }
  return route;
}
