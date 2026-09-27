import { MOVE_BY_ID, SPECIES_BY_ID, REGION_BY_ID } from "./data";
import type { Interior } from "./adventure";

export interface AudioMix { music: number; sfx: number; ambience: number }
export const DEFAULT_MIX: AudioMix = { music: .5, sfx: .7, ambience: .3 };
export function validMix(value: unknown): AudioMix {
  const input = (value && typeof value === "object" ? value : {}) as Partial<AudioMix>;
  return Object.fromEntries(Object.entries(DEFAULT_MIX).map(([key, fallback]) => {
    const n = input[key as keyof AudioMix];
    return [key, typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback];
  })) as unknown as AudioMix;
}
export function soundscape(region?: string, interior?: Interior, battle?: "wild" | "trainer" | "league" | "keeper") {
  if (battle) return { music: battle === "keeper" ? "last-stand" : `battle-${battle}`, ambience: null };
  if (!region) return { music: "title", ambience: null };
  if (interior) return { music: interior === "lodge" ? "lodge" : "shops", ambience: null };
  return { music: REGION_BY_ID[region] ? region : "mossbell", ambience: region === "dreamland" ? "ambience-dream" : ["tideglass", "sunwake"].includes(region) ? "ambience-coast" : ["tempest", "crownspire"].includes(region) ? "ambience-storm" : "ambience-forest" };
}
export function moveSound(id: string) {
  const move = MOVE_BY_ID[id];
  if (!move) return { id: "keeper-strike", rate: 1 };
  const cue = move.effect === "heal" ? "heal" : move.effect === "guard" ? "guard" : move.power === 0 ? "status" : `${move.power >= 80 ? "ultimate" : "move"}-${move.type.toLowerCase()}`;
  return { id: cue, rate: .88 + (move.animation % 10) * .026 };
}
export function creatureSound(id: string) {
  const nuvo = SPECIES_BY_ID[id];
  return nuvo ? { id: `cry-${nuvo.base}`, rate: 1 - nuvo.stage * .14 } : null;
}
export function footstepSound(region: string, interior?: Interior) {
  if (interior || REGION_BY_ID[region]?.kind === "Town" || region === "crystal") return "step-stone";
  if (["saffron", "tideglass"].includes(region)) return "step-sand";
  if (region === "frostmere" || region === "tempest") return "step-snow";
  return "step-grass";
}
