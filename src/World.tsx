import { useEffect, useRef } from "react";
import { REGION_BY_ID, SPECIES_BY_ID, type Region } from "./data";
import type { Save } from "./game";
import type { RemoteKeeper } from "./online";
import { cellKey, edgeMarker, type Interior } from "./adventure";
import { drawInterior, drawFurniture } from "./interiors";
import { TRAINERS } from "./expansion";
import { nuvoAtlas, drawCompanion } from "./spriteMotion";
import { drawFrontierLandmark } from "./frontierScenery";
import { gameAudio } from "./audio";
import { footstepSurface } from "./footsteps";
import {WORLD_COLUMNS,WORLD_ROWS,roadAt,tallGrassAt,drawTallGrass,drawTownDetail} from "./worldScenery";
import {drawDressedKeeper,DEFAULT_APPEARANCE} from "./appearance";
import {keeperAppearance} from "./keeperArt";
import {drawArt,preloadIllustratedArt} from "./illustratedArt";
import {getTerrain,terrainAt,terrainBlocked,terrainPath,encounterTile,isUnderground} from "./terrain";
import {drawTerrainTile,drawCaveMouth} from "./terrainArt";
export const TILE = 32,
  WORLD_W = WORLD_COLUMNS,
  WORLD_H = WORLD_ROWS;
export type Interaction = "nursery" | "breeder" | "professor" | "heal" | "shop" | "landmark" | "sign" | "nurse" | "merchant" | "exit" | "tailor" | "barber" | "stylist" | "clothier" | "league" | `trainer:${string}`;
export interface WorldProps {
  save: Save | null;
  paused: boolean;
  remote: RemoteKeeper[];
  friendIds?: string[];
  onMove: (
    x: number,
    y: number,
    dir: number,
    moving: boolean,
    steps: number,
  ) => void;
  onTravel: (region: string, x: number, y: number) => void;
  onEncounter: () => void;
  onInteract: (kind: Interaction) => void;
  onNearby: (text: string) => void;
  keys: React.RefObject<Set<string>>;
  onReady: () => void;
}
type Prop = {
  x: number;
  y: number;
  kind: number;
  size: number;
  solid: boolean;
  interact?: Interaction;
  label?: string;
};
const noise = (x: number, y: number, seed = 1) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const mapCache = new Map<string,Prop[]>();
export function getMap(region: Region, interior?: Interior): Prop[] {
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
  if(town) for(const [row,yy] of [9,26,39,47].entries()) for(const [col,xx] of [36,50,65].entries()) props.push({x:xx,y:yy,kind:30+(col+row)%4,size:132,solid:true});
  if(town){
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
function makeImage(path: string) {
  const im = new Image();
  im.src = import.meta.env.BASE_URL + path;
  return im;
}
export function World({
  save,
  paused,
  remote,
  friendIds = [],
  onMove,
  onTravel,
  onEncounter,
  onInteract,
  onNearby,
  keys,
  onReady,
}: WorldProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef({
      save,
      paused,
      remote,
      friendIds,
      onMove,
      onTravel,
      onEncounter,
      onInteract,
      onNearby,
      onReady,
    });
  latest.current = {
    save,
    paused,
    remote,
    friendIds,
    onMove,
    onTravel,
    onEncounter,
    onInteract,
    onNearby,
    onReady,
  };
  useEffect(() => {
    const el = canvas.current!,
      ctx = el.getContext("2d")!;
    let running = true,
      raf = 0,
      last = 0,
      w = 960,
      h = 600,
      x = save?.x || 560,
      y = save?.y || 496,
      fx = x - 30,
      fy = y + 24,
      dir = 0,
      steps = 0,
      distance = 0,
      elapsed = 0,
      lastEmit = 0,
      lastEncounter = 0,
      lastRegion = "",
      lastKeeper = "",
      moving = false,
      lastNearby = "",
      pressed = false;
    const art = makeImage("assets/world-atlas.png"),
      creatures = makeImage("assets/nuvo-atlas.png");
    const nuvoImages:Record<string,HTMLImageElement>={"nuvo-atlas.png":creatures};
    const imageForNuvo=(id:string)=>{const path=nuvoAtlas(SPECIES_BY_ID[id]);return nuvoImages[path]??(nuvoImages[path]=makeImage(`assets/${path}`));};
    let route: [number, number][] = [],
      camera = { x: 0, y: 0, zoom: 1 };
    const tap = (event: PointerEvent) => {
      if (latest.current.paused || !latest.current.save) return;
      const rect = el.getBoundingClientRect();
      route = findPath(
        x,
        y,
        (event.clientX - rect.left) / camera.zoom + camera.x,
        (event.clientY - rect.top) / camera.zoom + camera.y,
        REGION_BY_ID[latest.current.save.region],
        latest.current.save.interior,
      );
    };
    el.addEventListener("pointerdown", tap);
    Promise.all([art.decode(), preloadIllustratedArt(), creatures.decode()])
      .then(() => latest.current.onReady())
      .catch(() => latest.current.onReady());
    const ro = new ResizeObserver((entries) => {
      const b = entries[0].contentRect;
      w = Math.round(b.width);
      h = Math.round(b.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = w * dpr;
      el.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(el);
    void preloadIllustratedArt();
    const drawCell = (
      image: HTMLImageElement | HTMLCanvasElement,
      idx: number,
      cols: number,
      px: number,
      py: number,
      size: number,
    ) => {
      if (image instanceof HTMLImageElement && (!image.complete || !image.naturalWidth)) return;
      const cw = image.width / cols,
        ch = image.height / cols;
      ctx.drawImage(
        image,
        (idx % cols) * cw,
        Math.floor(idx / cols) * ch,
        cw,
        ch,
        Math.round(px - size / 2),
        Math.round(py - size * 0.83),
        size,
        size,
      );
    };
    const text = (message: string, px: number, py: number, color = "#fff") => {
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "center";
      const width = ctx.measureText(message).width + 16;
      ctx.fillStyle = "#193731d9";
      ctx.beginPath();
      ctx.roundRect(px - width / 2, py - 13, width, 21, 7);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(message, px, py + 1);
    };
    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05);
      last = now;
      elapsed += dt;
      const state = latest.current;
      const s = state.save,
        r = REGION_BY_ID[s?.region || "mossbell"];
      const cell = cellKey(r.id, s?.interior);
      if (lastRegion !== cell || lastKeeper !== (s?.started || "")) {
        lastRegion = cell;
        lastKeeper = s?.started || "";
        [x,y] = safeWorldPosition(s?.x || 560,s?.y || 496,r,s?.interior);
        fx = x - 30 - (s ? SPECIES_BY_ID[s.party[0].speciesId].stage * 16 : 0);
        fy = y + 20;
        lastEncounter = elapsed;
        keys.current.clear();
        route = [];
        gameAudio.updateFootsteps(0, null);
      }
      const props = getMap(r, s?.interior);
      let dx = 0,
        dy = 0;
      let travelled = 0;
      const sprinting = keys.current.has("shift");
      moving = false;
      if (state.paused) route = [];
      if (!state.paused && s) {
        dx =
          (keys.current.has("d") || keys.current.has("arrowright") ? 1 : 0) -
          (keys.current.has("a") || keys.current.has("arrowleft") ? 1 : 0);
        dy =
          (keys.current.has("s") || keys.current.has("arrowdown") ? 1 : 0) -
          (keys.current.has("w") || keys.current.has("arrowup") ? 1 : 0);
        if (dx || dy) route = [];
        else if (route.length) {
          if (Math.hypot(route[0][0] - x, route[0][1] - y) < 5) route.shift();
          if (route.length) {
            dx = route[0][0] - x;
            dy = route[0][1] - y;
          }
        }
        const length = Math.hypot(dx, dy);
        if (length) {
          dx /= length;
          dy /= length;
          const speed = sprinting ? 175 : 103;
          const ox = x,
            oy = y;
          if (canWalk(x + dx * speed * dt, y, r, props, s.interior)) x += dx * speed * dt;
          if (canWalk(x, y + dy * speed * dt, r, props, s.interior)) y += dy * speed * dt;
          moving = Math.abs(x - ox) + Math.abs(y - oy) > 0.05;
          travelled = Math.hypot(x - ox, y - oy);
          distance += travelled;
          if (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 1 : 2;
          else dir = dy < 0 ? 3 : 0;
          if (distance > 32) {
            steps++;
            distance = 0;
            if (
              !s.interior && encounterTile(terrainAt(x/32,y/32,r)) &&
              r.kind !== "Town" &&
              elapsed - lastEncounter > 5 &&
              Math.random() < 0.22
            ) {
              lastEncounter = elapsed;
              state.onEncounter();
              travelled = 0;
            }
          }
        }
        const nearby = props.find(
          (p) =>
            p.interact &&
            Math.hypot(p.x * TILE - x, p.y * TILE - y) < (p.solid ? 84 : 62),
        );
        const label = nearby?.label ? `E · ${nearby.label}` : "";
        if (label !== lastNearby) {
          lastNearby = label;
          state.onNearby(label);
        }
        const interact = keys.current.has("e") || keys.current.has(" ");
        if (interact && !pressed && nearby?.interact) {
          pressed = true;
          state.onInteract(nearby.interact);
          gameAudio.updateFootsteps(0, null);
          raf = requestAnimationFrame(frame);
          return;
        }
        pressed = interact;
        let next: string | undefined,
          tx = x,
          ty = y;
        if (y < 58 && Math.abs(x - 576) < 80 && r.links.north) {
          next = r.links.north;
          ty = WORLD_H*TILE-72;
        } else if (y > WORLD_H*TILE-58 && Math.abs(x - 576) < 80 && r.links.south) {
          next = r.links.south;
          ty = 72;
        } else if (x < 58 && Math.abs(y - 416) < 75 && r.links.west) {
          next = r.links.west;
          tx = WORLD_W*TILE-72;
        } else if (x > WORLD_W*TILE-58 && Math.abs(y - 416) < 75 && r.links.east) {
          next = r.links.east;
          tx = 72;
        }
        if (next && !s.interior) {
          keys.current.clear();
          state.onTravel(next, tx, ty);
          travelled = 0;
        }
      }
      // Match the rendered ground tile, rather than treating an entire town as paving.
      gameAudio.updateFootsteps(travelled, s && !state.paused
        ? (!s.interior&&terrainAt(x/TILE,y/TILE,r)==="bridge"?(isUnderground(r)?"stone":"wood"):footstepSurface(r.id, s.interior, terrainPath(terrainAt(x/TILE,y/TILE,r))))
        : null, sprinting);
      const followDistance = Math.hypot(x - fx, y - fy);
      const companionGap = 30 + (s ? SPECIES_BY_ID[s.party[0].speciesId].stage * 16 : 0);
      if (followDistance > companionGap + 7) {
        fx +=
          ((x - fx) * Math.min(1, dt * 6) * (followDistance - companionGap)) /
          followDistance;
        fy +=
          ((y - fy) * Math.min(1, dt * 6) * (followDistance - companionGap)) /
          followDistance;
      }
      if (now - lastEmit > 300) {
        lastEmit = now;
        state.onMove(x, y, dir, moving, steps);
        steps = 0;
      }
      const zoom = w < 600 ? 1.05 : w > 1500 ? 1.6 : 1.32,
        vw = w / zoom,
        vh = h / zoom;
      const worldWidth=s?.interior?1152:WORLD_W*TILE,worldHeight=s?.interior?832:WORLD_H*TILE;
      const targetX=worldWidth<vw?(worldWidth-vw)/2:Math.max(0,Math.min(worldWidth-vw,x-vw/2)),targetY=worldHeight<vh?(worldHeight-vh)/2:Math.max(0,Math.min(worldHeight-vh,y-vh*.52));
      const snap=Math.hypot(camera.x-targetX,camera.y-targetY)>450||camera.zoom!==zoom;
      const cx=snap?targetX:camera.x+(targetX-camera.x)*Math.min(1,dt*8),cy=snap?targetY:camera.y+(targetY-camera.y)*Math.min(1,dt*8);
      camera = { x: cx, y: cy, zoom };
      ctx.fillStyle="#162c2c";ctx.fillRect(0,0,w,h);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      ctx.imageSmoothingEnabled = false;
      const night = ['starfall','hollow'].includes(r.id)||['marsh','dream','storm'].includes(r.biome||'');
      if (s?.interior) drawInterior(ctx,s.interior,elapsed);
      else {for(let gy=Math.max(0,Math.floor(cy/32));gy<Math.min(WORLD_H,Math.ceil((cy+vh)/32));gy++)
        for(let gx=Math.max(0,Math.floor(cx/32));gx<Math.min(WORLD_W,Math.ceil((cx+vw)/32));gx++){
          const tile=terrainAt(gx+.5,gy+.5,r);drawTerrainTile(ctx,gx,gy,r,elapsed,tile);
        }
        // Foliage is a separate pass: the next ground tile must not cut off its leaves.
        for(let gy=Math.max(0,Math.floor(cy/32)-1);gy<Math.min(WORLD_H,Math.ceil((cy+vh)/32)+1);gy++)
          for(let gx=Math.max(0,Math.floor(cx/32)-1);gx<Math.min(WORLD_W,Math.ceil((cx+vw)/32)+1);gx++)
            if(tallGrassAt(gx,gy,r))drawTallGrass(ctx,gx,gy,elapsed,r,x,y);
      }
      // Functional trail exits are signed directly on the walkable route.
      if(!s?.interior)for(const f of getTerrain(r).features)if(Math.hypot(x-f.x*32,y-f.y*32)<190)text(f.name,f.x*32,f.y*32-46,"#e6ecc6");
      for (const [side, id] of Object.entries(s?.interior ? {} : r.links)) {
        const px = side === "west" ? 85 : side === "east" ? WORLD_W*TILE-86 : 576,
          py = side === "north" ? 56 : side === "south" ? WORLD_H*TILE-47 : 417;
        if(isUnderground(REGION_BY_ID[id!])&&!isUnderground(r))drawCaveMouth(ctx,px,py,REGION_BY_ID[id!].name);
        text(
          `${side === "north" ? "↑ " : side === "south" ? "↓ " : side === "west" ? "← " : "→ "}${REGION_BY_ID[id!].name}`,
          px,
          py,
          "#f1e7c5",
        );
      }
      type Renderable = { y: number; draw: () => void };
      const sorted: Renderable[] = props.filter(p=>p.x*32>cx-180&&p.x*32<cx+vw+180&&p.y*32>cy-80&&p.y*32<cy+vh+180).map((p) => ({
        y: p.y * TILE,
        draw: () => {
          ctx.fillStyle = "#264b3820";
          ctx.beginPath();
          ctx.ellipse(
            p.x * TILE,
            p.y * TILE - 1,
            p.size * 0.23,
            p.size * 0.09,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          if (p.interact === "landmark" && drawFrontierLandmark(ctx,r.id,p.x*TILE,p.y*TILE,elapsed)) { /* Unique frontier monument. */ }
          else if (p.kind === -1) {
            const seed=Array.from(p.label??'Elowen').reduce((n,ch)=>n+ch.charCodeAt(0),0);
            drawDressedKeeper(ctx,p.x*TILE,p.y*TILE,58,{...DEFAULT_APPEARANCE,skin:seed%6,hairStyle:seed%12,hairTint:seed%5,top:s?.interior==='lodge'?5:s?.interior==='barber'?7:seed%8,topTint:s?.interior==='lodge'?4:seed%12,bottomTint:seed%4},0,elapsed*2);
            text(`${p.interact?.startsWith("trainer:") ? (s?.defeatedTrainers?.includes(p.interact.slice(8)) ? "✓ " : "⚔ ") : ""}${p.label || "Elowen"}`, p.x * TILE, p.y * TILE - 68, "#f4deb0");
          } else if (p.kind>=40) drawTownDetail(ctx,p.x*TILE,p.y*TILE,p.kind,elapsed);
          else if (p.kind>=30){drawArt(ctx,'illustrated-buildings.png',4+p.kind-30,p.x*TILE,p.y*TILE+8,150,150);drawTownDetail(ctx,p.x*TILE,p.y*TILE,42,elapsed);}
          else if (p.kind >= 20) drawFurniture(ctx, p.kind, p.x*TILE, p.y*TILE, s?.interior === "lodge", elapsed);
          else if(['nursery','tailor','barber','league'].includes(p.interact??''))drawArt(ctx,'illustrated-buildings.png',['nursery','tailor','barber','league'].indexOf(p.interact!),p.x*TILE,p.y*TILE+7,p.size,p.size);
          else if(s?.interior&&p.kind===13)drawArt(ctx,'illustrated-decor.png',7,p.x*TILE,p.y*TILE+6,44,52);
          else if (p.kind >= 0) drawCell(art, p.kind, 4, p.x * TILE, p.y * TILE, p.size);
          if (["tailor","barber","league","nursery"].includes(p.interact || "")) text(p.label!,p.x*TILE,p.y*TILE-p.size-6,"#ffe3b0");
          if (
            p.interact &&
            Math.hypot(p.x * TILE - x, p.y * TILE - y) < 85 &&
            !state.paused
          ) {
            text("E", p.x * TILE, p.y * TILE - p.size * 0.66, "#bff4cb");
          }
        },
      }));
      const drawNuvo = (
        id: string,
        px: number,
        py: number,
        prismatic: boolean,
        walk: boolean,
        direction = dir,
      ) => {
        const species = SPECIES_BY_ID[id];
        if (!species) return;
        drawCompanion(ctx,imageForNuvo(id),id,px,py,elapsed,walk,direction,prismatic);
      };
      const drawKeeper = (
        px: number,
        py: number,
        direction: number,
        isMoving: boolean,
        palette: number,
        name?: string,
        look: Pick<Save["player"],"outfit"|"hair"|"hairColor"|"appearance"> = {},
      ) => {
        ctx.save();
        ctx.fillStyle = "#1e443533";
        ctx.beginPath();
        ctx.ellipse(px, py, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        const sprint = keys.current.has("shift");
        drawDressedKeeper(ctx,px,py,58,keeperAppearance(palette,look),direction,elapsed*(sprint?14:8),isMoving);
        ctx.restore();if(name)text(name,px,py-70,'#fff7d9');
      };
      if (s) {
        sorted.push(
          {
            y: fy,
            draw: () =>
              drawNuvo(
                s.party[0].speciesId,
                fx,
                fy,
                s.party[0].prismatic,
                moving,
              ),
          },
          { y, draw: () => drawKeeper(x, y, dir, moving, s.player.palette,undefined,s.player) },
        );
      } else {
        sorted.push({ y, draw: () => drawKeeper(x, y, 0, false, 0) });
      }
      const neighbors = state.remote.filter(p => cellKey(p.region, p.interior) === cell);
      for (const other of neighbors) {
        sorted.push({
          y: other.y,
          draw: () => {
            drawKeeper(
              other.x,
              other.y,
              other.direction,
              other.moving,
              other.palette,
              `${state.friendIds.includes(other.id) ? "★ " : ""}${other.name}`,
              other,
            );
            drawNuvo(
              other.speciesId,
              other.x - 30 - SPECIES_BY_ID[other.speciesId].stage * 16,
              other.y + 20,
              other.prismatic,
              other.moving,
              other.direction,
            );
            if (other.emote)
              text(other.emote, other.x, other.y - 80, "#ffe08b");
          },
        });
      }
      sorted.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
      if(s&&!s.interior){ctx.save();ctx.beginPath();ctx.rect(x-24,y-8,48,24);ctx.clip();for(let yy=Math.floor(y/32)-1;yy<=Math.floor(y/32);yy++)for(let xx=Math.floor(x/32)-1;xx<=Math.floor(x/32)+1;xx++)if(tallGrassAt(xx+.5,yy+.5,r))drawTallGrass(ctx,xx,yy,elapsed,r,x,y,true);ctx.restore();}
      for (let i = 0; i < 16; i++) {
        const px =
            (noise(i, 8) * WORLD_W * 32 + elapsed * (night ? 3 : 9)) %
            (WORLD_W * 32),
          py = noise(i, 9) * WORLD_H * 32 + Math.sin(elapsed + i) * 12;
        ctx.fillStyle = night ? "#ffe6ac88" : "#f8ffe05c";
        ctx.fillRect(px, py, i % 2 ? 2 : 3, i % 2 ? 2 : 3);
      }
      ctx.restore();
      const shade = ctx.createRadialGradient(
        w * 0.5,
        h * 0.48,
        w * 0.2,
        w * 0.5,
        h * 0.5,
        w * 0.72,
      );
      shade.addColorStop(0, "#14382d00");
      shade.addColorStop(1, "#183d3840");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
      for (const friend of neighbors.filter(p => state.friendIds.includes(p.id))) {
        const marker = edgeMarker((friend.x-cx)*zoom, (friend.y-cy)*zoom, w, h);
        if (!marker) continue;
        ctx.save(); ctx.translate(marker.x,marker.y); ctx.rotate(marker.angle);
        ctx.fillStyle="#ecd392";ctx.strokeStyle="#233d35";ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(-9,-10);ctx.lineTo(-5,0);ctx.lineTo(-9,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
        const distance = Math.round(Math.hypot(friend.x-x,friend.y-y)/32);
        text(`★ ${friend.name} · ${distance}m`, Math.max(85,Math.min(w-85,marker.x)), marker.y+25, "#f8e5a8");
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      gameAudio.updateFootsteps(0, null);
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", tap);
    };
  }, []);
  return (
    <canvas
      ref={canvas}
      className="world-canvas"
      aria-label="Nuvori world. Move with WASD or arrow keys, hold Shift to sprint, press E to interact."
      tabIndex={0}
    />
  );
}
