import frames from "./spriteFrames.json";
import type { Species } from "./data";

export interface SpriteRect { x: number; y: number; width: number; height: number }
export interface SpriteAtlas { width: number; height: number; sha256: string; frames: SpriteRect[] }
export const SPRITE_ATLASES = frames as Record<string, SpriteAtlas>;

export function nuvoAtlas(s: Species) {
  return s.id === "oneirune" ? "oneirune.png" : s.stage ? `evolution-${s.branch}-v2.png` : "nuvo-atlas.png";
}
export function nuvoSprite(s: Species) {
  const file = nuvoAtlas(s), atlas = SPRITE_ATLASES[file];
  return { file, atlas, frame: atlas.frames[s.id === "oneirune" ? 0 : s.sprite] };
}
export function spriteFill(s: Species) { return s.id === "oneirune" || s.stage === 2 ? .88 : s.stage === 1 ? .8 : .64; }

/** Contain the complete silhouette without stretching wide wings or tall antlers. */
export function fitSprite(frame: SpriteRect, size: number, fill: number): SpriteRect {
  const scale = size * fill / Math.max(frame.width, frame.height);
  const width = frame.width * scale, height = frame.height * scale;
  return { x: (size - width) / 2, y: (size - height) / 2, width, height };
}
