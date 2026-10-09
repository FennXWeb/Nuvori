import {drawWorldObject} from './worldObjectArt';
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
import {getTerrain,terrainAt,terrainBlocked,terrainPath,encounterTile,isUnderground,terrainNoise as noise} from "./terrain";
import {drawTerrainTile,drawCaveMouth} from "./terrainArt";
import {buildResidents,residentAt,drawFountainWater,type ResidentRoute} from './townLife';
import {drawNuvoActor} from './nuvoAnimation';
import {TILE,WORLD_W,WORLD_H,getMap,canWalk,findPath,safeWorldPosition} from './worldLayout';
import {spawnTableAt,type Interaction} from './worldContent';
export {TILE,WORLD_W,WORLD_H,getMap,canWalk,findPath,safeWorldPosition,isWater,isPath} from './worldLayout';
export type {Interaction} from './worldContent';
export interface WorldProps {
  save: Save | null;
  paused: boolean;
  covered?: boolean;
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
  onEncounter: (x:number,y:number) => void;
  onInteract: (kind: Interaction) => void;
  onNearby: (text: string) => void;
  keys: React.RefObject<Set<string>>;
  onReady: () => void;
}
function makeImage(path: string) {
  const im = new Image();
  im.src = import.meta.env.BASE_URL + path;
  return im;
}
export function World({
  save,
  paused,
  covered=false,
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
      covered,
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
    covered,
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
    const residents=new Map<string,ResidentRoute[]>(),motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    let keeperPhase=0,followDir=0,followMoving=false,companionUid='',summonedAt=-10;
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
      if(r.kind==='Town'&&!residents.has(r.id))residents.set(r.id,buildResidents(r,(a,b,c,d)=>findPath(a,b,c,d,r),(a,b)=>canWalk(a,b,r)));
      const townsfolk=s?.interior?[]:(residents.get(r.id)??[]).map(person=>{
        const previous=residentAt(person),near=Math.hypot(previous.x-x,previous.y-y)<48;
        if(!state.paused&&!near)person.clock+=dt;
        const position=residentAt(person);
        return {person,...position,moving:position.moving&&!state.paused&&!near,direction:near?(Math.abs(x-position.x)>Math.abs(y-position.y)?x<position.x?1:2:y<position.y?3:0):position.direction};
      });
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
              (spawnTableAt(r.id,x/32,y/32)?.enabled ?? r.kind !== "Town") &&
              elapsed - lastEncounter > 5 &&
              Math.random() < (spawnTableAt(r.id,x/32,y/32)?.rate ?? .22)
            ) {
              lastEncounter = elapsed;
              state.onEncounter(x,y);
              travelled = 0;
            }
          }
        }
        const nearby = [...props,...townsfolk.map(n=>({x:n.x/TILE,y:n.y/TILE,solid:false,interact:`resident:${n.person.name}` as Interaction,label:n.person.name}))].find(
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
      keeperPhase+=travelled*(sprinting?.1:.085);
      const oldFx=fx,oldFy=fy;
      const companionGap = 30 + (s ? SPECIES_BY_ID[s.party[0].speciesId].stage * 16 : 0);
      if (followDistance > companionGap + 7) {
        fx +=
          ((x - fx) * Math.min(1, dt * 6) * (followDistance - companionGap)) /
          followDistance;
        fy +=
          ((y - fy) * Math.min(1, dt * 6) * (followDistance - companionGap)) /
          followDistance;
      }
      followMoving=Math.hypot(fx-oldFx,fy-oldFy)>.025;
      if(followMoving)followDir=Math.abs(fx-oldFx)>Math.abs(fy-oldFy)?fx<oldFx?1:2:fy<oldFy?3:0;
      if(s&&companionUid!==s.party[0].uid){companionUid=s.party[0].uid;summonedAt=elapsed;}
      if (now - lastEmit > 300) {
        lastEmit = now;
        state.onMove(x, y, dir, moving, steps);
        steps = 0;
      }
      // Keep position/presence current without drawing a second animated scene behind the lobby.
      if(state.covered){raf=requestAnimationFrame(frame);return;}
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
          drawWorldObject(ctx,p,r,elapsed,s?.interior);
          if(p.kind===-1)text(`${p.interact?.startsWith('trainer:') ? (s?.defeatedTrainers?.includes(p.interact.slice(8))?'✓ ':'⚔ '):''}${p.label||'Elowen'}`,p.x*TILE,p.y*TILE-68,'#f4deb0');
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
        const local=look===s?.player;
        drawDressedKeeper(ctx,px,py,58,keeperAppearance(palette,look),direction,local?keeperPhase:elapsed*8,isMoving,local&&sprint);
        ctx.restore();if(name)text(name,px,py-70,'#fff7d9');
      };
      if (s) {
        sorted.push(
          {
            y: fy,
            draw: () => {const n=s.party[0];drawNuvoActor(ctx,n.speciesId,fx,fy,58+SPECIES_BY_ID[n.speciesId].stage*13,followDir,n.hp<=0?'faint':elapsed-summonedAt<.85?'summon':followMoving?'walk':'idle',n.hp<=0?.85:elapsed-summonedAt<.85?elapsed-summonedAt:elapsed,n.prismatic,motionPreference.matches);},
          },
          { y, draw: () => drawKeeper(x, y, dir, moving, s.player.palette,undefined,s.player) },
        );
      } else {
        sorted.push({ y, draw: () => drawKeeper(x, y, 0, false, 0) });
      }
      const neighbors = state.remote.filter(p => cellKey(p.region, p.interior) === cell);
      for(const resident of townsfolk)sorted.push({y:resident.y,draw:()=>{
        drawDressedKeeper(ctx,resident.x,resident.y,58,resident.person.look,resident.direction,resident.person.clock*7,resident.moving);
        if(Math.hypot(resident.x-x,resident.y-y)<95)text(resident.person.name,resident.x,resident.y-69,'#f7e4bb');
      }});
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
