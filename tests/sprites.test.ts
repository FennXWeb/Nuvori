import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { measureAtlas, NUVO_SHEETS } from "../scripts/measure-sprites";
import { SPECIES } from "../src/data";
import { SPRITE_ATLASES, nuvoSprite, spriteFill, fitSprite } from "../src/sprites";
import { drawRig, gaitFor } from "../src/nuvoAnimation";

test('the original crowded evolution sheet is rejected instead of silently clipping it', () => {
  const original = readFileSync(new URL('../public/assets/evolution-1.png', import.meta.url));
  assert.throws(() => measureAtlas(original, 5, 5), /gutter|boundary/);
});

test('published crop bounds match actual PNGs and isolate every complete Nuvo form', () => {
  let count = 0;
  for (const [file, cols, rows] of NUVO_SHEETS) {
    const actual = measureAtlas(readFileSync(new URL(`../public/assets/${file}`, import.meta.url)), cols, rows);
    assert.deepEqual(SPRITE_ATLASES[file], actual, `${file}: regenerate crop bounds after editing artwork`);
    count += actual.frames.length;
    for (const [i, a] of actual.frames.entries()) {
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= actual.width && a.y + a.height <= actual.height);
      for (const b of actual.frames.slice(i + 1)) {
        assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${file}: adjacent portraits must not share source pixels`);
      }
    }
  }
  assert.equal(count, SPECIES.length + 1); // The Dreamweaver sheet also contains one nursery egg.
});

test('every portrait preserves aspect ratio and has space around the full silhouette', () => {
  for (const species of SPECIES) {
    const { frame } = nuvoSprite(species);
    for (const size of [32, 48, 96, 240]) {
      const box = fitSprite(frame, size, spriteFill(species));
      assert.ok(box.x > 0 && box.y > 0);
      assert.ok(box.x + box.width < size && box.y + box.height < size);
      assert.ok(Math.abs(box.width / box.height - frame.width / frame.height) < 1e-10);
    }
  }
});

test('articulated followers never sample pixels outside their measured silhouette', () => {
  for (const species of SPECIES) {
    const { frame, atlas } = nuvoSprite(species);
    const image = { complete: true, naturalWidth: atlas.width, width: atlas.width, height: atlas.height } as HTMLImageElement;
    const calls: number[][] = [];
    const noop = () => {};
    const ctx = { beginPath: noop, moveTo:noop,lineTo:noop,closePath:noop,clip:noop,transform:noop,save: noop, restore: noop,
      drawImage: (_image: unknown, ...args: number[]) => calls.push(args) } as unknown as CanvasRenderingContext2D;
    drawRig(ctx,image,frame,100,100,gaitFor(species.id),.7,.15);
    assert.equal(calls.length,72,species.id);
    for(const call of calls)assert.deepEqual(call.slice(0,4),[frame.x,frame.y,frame.width,frame.height],species.id);
  }
});

test('keeper animations and world props have clear equal-grid crop boundaries', () => {
  for (const file of ['explorer-atlas.png', 'world-atlas.png']) {
    const png = PNG.sync.read(readFileSync(new URL(`../public/assets/${file}`, import.meta.url)));
    for (let seam = 1; seam < 4; seam++) {
      const x = Math.round(png.width * seam / 4), y = Math.round(png.height * seam / 4);
      for (let py = 0; py < png.height; py++) assert.ok(png.data[(py * png.width + x) * 4 + 3] <= 100, `${file}: column ${seam}`);
      for (let px = 0; px < png.width; px++) assert.ok(png.data[(y * png.width + px) * 4 + 3] <= 100, `${file}: row ${seam}`);
    }
  }
});
