import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { PNG } from "pngjs";

export interface Rect { x: number; y: number; width: number; height: number }
export interface MeasuredAtlas { width: number; height: number; sha256: string; frames: Rect[] }

// Read pixels only. The generated PNG and its original transparency are never changed.
export function measureAtlas(bytes: Buffer, columns: number, rows: number): MeasuredAtlas {
  const image = PNG.sync.read(bytes), { width, height, data } = image;
  const ink = (x: number, y: number) => data[(y * width + x) * 4 + 3] > 32;
  function split(axis: "x" | "y", nominal: number, radius: number, from: number, to: number) {
    let best = -1, nearest = Infinity;
    const length = axis === "x" ? width : height;
    for (let at = Math.max(9, Math.floor(nominal - radius)); at <= Math.min(length - 9, nominal + radius); at++) {
      if (Math.abs(at - nominal) >= nearest) continue;
      let clear = true;
      for (let cross = from; cross < to && clear; cross++) for (let guard = -8; guard <= 8; guard++) {
        if (axis === "x" ? ink(at + guard, cross) : ink(cross, at + guard)) { clear = false; break; }
      }
      if (clear) { best = at; nearest = Math.abs(at - nominal); }
    }
    if (best < 0) throw new Error(`No transparent ${axis} gutter near ${nominal}; repair the sheet before publishing.`);
    return best;
  }
  const ys = [0, ...Array.from({ length: rows - 1 }, (_, i) => split("y", height * (i + 1) / rows, height / rows * .32, 0, width)), height];
  const frames: Rect[] = [];
  for (let row = 0; row < rows; row++) {
    const top = ys[row], bottom = ys[row + 1];
    const xs = [0, ...Array.from({ length: columns - 1 }, (_, i) => split("x", width * (i + 1) / columns, width / columns * .32, top, bottom)), width];
    for (let col = 0; col < columns; col++) {
      const left = xs[col], right = xs[col + 1], w = right - left, h = bottom - top;
      const visited = new Uint8Array(w * h), queue = new Int32Array(w * h);
      let minX = right, minY = bottom, maxX = left, maxY = top, pixels = 0;
      // Ignore detached generation dust (<16 pixels), but retain disconnected visible effects.
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const origin = (y - top) * w + x - left;
        if (visited[origin] || !ink(x, y)) continue;
        let head = 0, tail = 1, x0 = x, x1 = x, y0 = y, y1 = y;
        queue[0] = origin; visited[origin] = 1;
        while (head < tail) {
          const index = queue[head++], px = index % w, py = Math.floor(index / w);
          x0 = Math.min(x0, px + left); x1 = Math.max(x1, px + left);
          y0 = Math.min(y0, py + top); y1 = Math.max(y1, py + top);
          for (const next of [px > 0 ? index - 1 : -1, px + 1 < w ? index + 1 : -1, py > 0 ? index - w : -1, py + 1 < h ? index + w : -1]) {
            if (next >= 0 && !visited[next] && ink(next % w + left, Math.floor(next / w) + top)) {
              visited[next] = 1; queue[tail++] = next;
            }
          }
        }
        if (tail >= 16) {
          pixels += tail; minX = Math.min(minX, x0); minY = Math.min(minY, y0);
          maxX = Math.max(maxX, x1); maxY = Math.max(maxY, y1);
        }
      }
      if (pixels < w * h * .025) throw new Error(`Empty or incomplete sprite at row ${row}, column ${col}`);
      if (minX - left < 3 || minY - top < 3 || right - maxX <= 3 || bottom - maxY <= 3)
        throw new Error(`Sprite touches its crop boundary at row ${row}, column ${col}; restore the missing margin.`);
      // Six source pixels protect antialiasing and soft outlines outside the measured ink.
      const x = Math.max(left, minX - 6), y = Math.max(top, minY - 6);
      frames.push({ x, y, width: Math.min(right, maxX + 7) - x, height: Math.min(bottom, maxY + 7) - y });
    }
  }
  return { width, height, sha256: createHash("sha256").update(bytes).digest("hex"), frames };
}

export const NUVO_SHEETS: [string, number, number][] = [
  ["nuvo-atlas.png", 5, 5],
  ...Array.from({ length: 6 }, (_, i): [string, number, number] => [`evolution-${i + 1}-v2.png`, 5, 5]),
  ["oneirune.png", 1, 1],
  ...["spriglet","cindlet","bubbfin","wisplet","voltik"].map((id): [string,number,number]=>[`${id}-evolutions.png`,2,5]),
  ["dreamweaver-beginnings.png",3,2],
  ["dreamweaver-ascendants.png",4,4],
  ...Array.from({length:4},(_,i):[string,number,number]=>[`dreamweaver-crown-${i}.png`,4,4]),
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog: Record<string, MeasuredAtlas> = {};
  for (const [file, cols, rows] of NUVO_SHEETS) {
    catalog[file] = measureAtlas(readFileSync(new URL(`../public/assets/${file}`, import.meta.url)), cols, rows);
    console.log(`${file}: ${catalog[file].frames.length} isolated sprite bounds`);
  }
  writeFileSync(new URL("../src/spriteFrames.json", import.meta.url), JSON.stringify(catalog, null, 2) + "\n");
}
