import { useEffect, useRef } from "react";
import { REGION_BY_ID, SPECIES_BY_ID, type Region } from "./data";
import type { Save } from "./game";
import type { RemoteKeeper } from "./online";
export const TILE = 32,
  WORLD_W = 36,
  WORLD_H = 26;
export type Interaction = "professor" | "heal" | "shop" | "landmark" | "sign";
export interface WorldProps {
  save: Save | null;
  paused: boolean;
  remote: RemoteKeeper[];
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
export function getMap(region: Region) {
  const props: Prop[] = [];
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
      { x: 9, y: 18, kind: 4, size: 128, solid: true },
      { x: 26, y: 7, kind: 4, size: 126, solid: true },
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
        x: 18,
        y: 7,
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
  for (let y = 1; y < 25; y += 2)
    for (let x = 1; x < 35; x += 2) {
      if (Math.abs(x - 18) < 3 || Math.abs(y - 13) < 2) continue;
      if (props.some((p) => Math.hypot(p.x - x, p.y - y) < 4)) continue;
      if (
        (x < 4 ||
          x > 32 ||
          y < 4 ||
          y > 23 ||
          noise(x, y, region.name.length) > 0.62) &&
        !(x > 25 && y > 4 && y < 11 && !town)
      ) {
        props.push({
          x: x + noise(x, y) * 0.6,
          y: y + noise(y, x) * 0.6,
          kind:
            region.id === "hollow"
              ? 3
              : region.id === "frostmere"
                ? 1
                : region.id === "starfall"
                  ? 2
                  : noise(x, y) > 0.85
                    ? 2
                    : 0,
          size: 78 + noise(x, y) * 35,
          solid: true,
        });
      }
    }
  for (let i = 0; i < 12; i++) {
    const x = 4 + noise(i, 3) * 28,
      y = 4 + noise(i, 8) * 18;
    if (
      Math.abs(x - 18) < 3 ||
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
  return props;
}
export function isWater(x: number, y: number, r: Region) {
  return (
    r.kind !== "Town" &&
    x > 25 &&
    x < 34 &&
    y > 4 &&
    y < 10 &&
    Math.hypot((x - 29) / 1.5, y - 7) < 4
  );
}
export function isPath(x: number, y: number) {
  return Math.abs(x - 18) < 1.7 || Math.abs(y - 13) < 1.5;
}
export function canWalk(
  x: number,
  y: number,
  region: Region,
  props = getMap(region),
) {
  if (x < 24 || x > WORLD_W * TILE - 24 || y < 24 || y > WORLD_H * TILE - 24)
    return false;
  const tx = x / TILE,
    ty = y / TILE;
  if (isWater(tx, ty, region)) return false;
  return !props.some(
    (p) =>
      p.solid &&
      Math.abs(p.x * TILE - x) < (p.kind >= 4 && p.kind <= 7 ? 38 : 18) &&
      y > p.y * TILE - 24 &&
      y < p.y * TILE + 9,
  );
}
export function findPath(
  x: number,
  y: number,
  goalX: number,
  goalY: number,
  region: Region,
): [number, number][] {
  const props = getMap(region),
    start = [Math.floor(x / 32), Math.floor(y / 32)],
    goal = [Math.floor(goalX / 32), Math.floor(goalY / 32)],
    key = (a: number, b: number) => `${a},${b}`;
  if (!canWalk(goal[0] * 32 + 16, goal[1] * 32 + 16, region, props)) return [];
  const queue = [start],
    parents = new Map<string, number[] | null>([
      [key(...(start as [number, number])), null],
    ]);
  let found = false;
  while (queue.length) {
    const point = queue.shift()!;
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
      if (parents.has(k) || !canWalk(nx * 32 + 16, ny * 32 + 16, region, props))
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
      explorer = makeImage("assets/explorer-atlas.png"),
      creatures = makeImage("assets/nuvo-atlas.png");
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
      );
    };
    el.addEventListener("pointerdown", tap);
    Promise.all([art.decode(), explorer.decode(), creatures.decode()])
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
    const drawCell = (
      image: HTMLImageElement,
      idx: number,
      cols: number,
      px: number,
      py: number,
      size: number,
    ) => {
      if (!image.complete || !image.naturalWidth) return;
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
      if (lastRegion !== r.id || lastKeeper !== (s?.started || "")) {
        lastRegion = r.id;
        lastKeeper = s?.started || "";
        x = s?.x || 560;
        y = s?.y || 496;
        fx = x - 25;
        fy = y + 20;
        lastEncounter = elapsed;
        keys.current.clear();
        route = [];
      }
      const props = getMap(r);
      let dx = 0,
        dy = 0;
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
          const speed = keys.current.has("shift") ? 175 : 103;
          const ox = x,
            oy = y;
          if (canWalk(x + dx * speed * dt, y, r, props)) x += dx * speed * dt;
          if (canWalk(x, y + dy * speed * dt, r, props)) y += dy * speed * dt;
          moving = Math.abs(x - ox) + Math.abs(y - oy) > 0.05;
          distance += Math.hypot(x - ox, y - oy);
          if (Math.abs(dx) > Math.abs(dy)) dir = dx < 0 ? 1 : 2;
          else dir = dy < 0 ? 3 : 0;
          if (distance > 32) {
            steps++;
            distance = 0;
            if (
              !isPath(x / 32, y / 32) &&
              r.kind !== "Town" &&
              elapsed - lastEncounter > 5 &&
              Math.random() < 0.22
            ) {
              lastEncounter = elapsed;
              state.onEncounter();
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
        if (interact && !pressed && nearby?.interact)
          state.onInteract(nearby.interact);
        pressed = interact;
        let next: string | undefined,
          tx = x,
          ty = y;
        if (y < 58 && Math.abs(x - 576) < 80 && r.links.north) {
          next = r.links.north;
          ty = 760;
        } else if (y > 774 && Math.abs(x - 576) < 80 && r.links.south) {
          next = r.links.south;
          ty = 72;
        } else if (x < 58 && Math.abs(y - 416) < 75 && r.links.west) {
          next = r.links.west;
          tx = 1080;
        } else if (x > 1094 && Math.abs(y - 416) < 75 && r.links.east) {
          next = r.links.east;
          tx = 72;
        }
        if (next) {
          keys.current.clear();
          state.onTravel(next, tx, ty);
        }
      }
      const followDistance = Math.hypot(x - fx, y - fy);
      if (followDistance > 34) {
        fx +=
          ((x - fx) * Math.min(1, dt * 6) * (followDistance - 25)) /
          followDistance;
        fy +=
          ((y - fy) * Math.min(1, dt * 6) * (followDistance - 25)) /
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
      const cx = Math.max(0, Math.min(WORLD_W * TILE - vw, x - vw / 2)),
        cy = Math.max(0, Math.min(WORLD_H * TILE - vh, y - vh * 0.56));
      camera = { x: cx, y: cy, zoom };
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);
      ctx.imageSmoothingEnabled = false;
      const frost = r.id === "frostmere",
        night = r.id === "starfall" || r.id === "hollow",
        volcano = r.id === "emberfall",
        beach = r.id === "tideglass" || r.id === "sunwake";
      const grass = frost
        ? "#c0d9d4"
        : night
          ? "#607f82"
          : volcano
            ? "#aaa66a"
            : beach
              ? "#a5c58b"
              : "#8fc786";
      const grass2 = frost
        ? "#b6d1cd"
        : night
          ? "#59797c"
          : volcano
            ? "#a3a167"
            : beach
              ? "#9fc186"
              : "#88c180";
      for (let gy = 0; gy < WORLD_H; gy++)
        for (let gx = 0; gx < WORLD_W; gx++) {
          const n = noise(gx, gy, r.name.length);
          ctx.fillStyle = n > 0.5 ? grass : grass2;
          ctx.fillRect(gx * 32, gy * 32, 32, 32);
          const path = isPath(gx + 0.5, gy + 0.5);
          if (path) {
            ctx.fillStyle = night ? "#b6b3a0" : frost ? "#d8e1d5" : "#ded2a4";
            ctx.fillRect(gx * 32, gy * 32, 32, 32);
            if (n > 0.6) {
              ctx.fillStyle = night ? "#a4a392" : "#cabc90";
              ctx.fillRect(gx * 32 + n * 20, gy * 32 + 8, 4, 2);
              ctx.fillRect(gx * 32 + 6, gy * 32 + 23, 2, 2);
            }
          } else if (isWater(gx + 0.5, gy + 0.5, r)) {
            ctx.fillStyle = "#59a7ad";
            ctx.fillRect(gx * 32, gy * 32, 32, 32);
            ctx.fillStyle = "#a0d4cb";
            ctx.globalAlpha = 0.5 + 0.3 * Math.sin(elapsed + gx);
            ctx.fillRect(
              gx * 32 + 4 + Math.sin(elapsed + gy) * 4,
              gy * 32 + 12,
              14,
              2,
            );
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = frost
              ? "#dfede8"
              : night
                ? "#78978e"
                : volcano
                  ? "#bebb78"
                  : "#a1d393";
            ctx.fillRect(gx * 32 + 6 + n * 8, gy * 32 + 7, 2, 4);
            ctx.fillRect(gx * 32 + 9 + n * 8, gy * 32 + 6, 2, 4);
            if (n > 0.66) {
              ctx.fillStyle = frost ? "#eaf4ee" : night ? "#b7a4d1" : "#e9e4a9";
              ctx.fillRect(gx * 32 + 22, gy * 32 + 22, 3, 3);
            }
          }
        }
      // Functional trail exits are signed directly on the walkable route.
      for (const [side, id] of Object.entries(r.links)) {
        const px = side === "west" ? 85 : side === "east" ? 1066 : 576,
          py = side === "north" ? 56 : side === "south" ? 785 : 417;
        text(
          `${side === "north" ? "↑ " : side === "south" ? "↓ " : side === "west" ? "← " : "→ "}${REGION_BY_ID[id!].name}`,
          px,
          py,
          "#f1e7c5",
        );
      }
      type Renderable = { y: number; draw: () => void };
      const sorted: Renderable[] = props.map((p) => ({
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
          if (p.kind === -1) {
            drawCell(explorer, 0, 4, p.x * TILE, p.y * TILE, 64);
            text("Elowen", p.x * TILE, p.y * TILE - 52, "#f4deb0");
          } else drawCell(art, p.kind, 4, p.x * TILE, p.y * TILE, p.size);
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
      ) => {
        const species = SPECIES_BY_ID[id];
        if (!species) return;
        ctx.save();
        ctx.filter = `hue-rotate(${prismatic ? 130 : species.stage ? species.branch * 22 : 0}deg)`;
        ctx.fillStyle = "#1a493733";
        ctx.beginPath();
        ctx.ellipse(px, py, 13, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        drawCell(
          creatures,
          species.sprite,
          5,
          px,
          py + (walk ? Math.sin(elapsed * 14) * 2 : Math.sin(elapsed * 3)),
          54 + species.stage * 5,
        );
        ctx.restore();
        if (prismatic) {
          ctx.fillStyle = "#ffffcd";
          ctx.fillRect(
            px + Math.cos(elapsed * 3) * 20,
            py - 25 + Math.sin(elapsed * 3) * 10,
            3,
            3,
          );
        }
      };
      const drawKeeper = (
        px: number,
        py: number,
        direction: number,
        isMoving: boolean,
        palette: number,
        name?: string,
      ) => {
        ctx.save();
        ctx.fillStyle = "#1e443533";
        ctx.beginPath();
        ctx.ellipse(px, py, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = `hue-rotate(${[0, 140, 240, 60][palette] || 0}deg)`;
        const sprint = keys.current.has("shift");
        const frame = isMoving
          ? 1 + (Math.floor(elapsed * (sprint ? 14 : 8)) % 3)
          : 0;
        drawCell(
          explorer,
          direction * 4 + frame,
          4,
          px,
          py +
            (isMoving
              ? Math.sin(elapsed * (sprint ? 28 : 16))
              : Math.sin(elapsed * 2) * 0.6),
          68,
        );
        ctx.restore();
        if (name) text(name, px, py - 55, "#fff7d9");
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
          { y, draw: () => drawKeeper(x, y, dir, moving, s.player.palette) },
        );
      } else {
        sorted.push({ y, draw: () => drawKeeper(x, y, 0, false, 0) });
      }
      for (const other of state.remote.filter((p) => p.region === r.id)) {
        sorted.push({
          y: other.y,
          draw: () => {
            drawKeeper(
              other.x,
              other.y,
              other.direction,
              other.moving,
              other.palette,
              other.name,
            );
            drawNuvo(
              other.speciesId,
              other.x - 24,
              other.y + 20,
              other.prismatic,
              other.moving,
            );
            if (other.emote)
              text(other.emote, other.x, other.y - 80, "#ffe08b");
          },
        });
      }
      sorted.sort((a, b) => a.y - b.y).forEach((o) => o.draw());
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
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
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
