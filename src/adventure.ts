import { REGION_BY_ID, SPECIES_BY_ID, type Nuvo } from "./data";
import type { Save } from "./game";

export type Interior = "lodge" | "shop" | "tailor" | "barber" | "nursery";
export const interiorName = (room?: Interior) => room ? { lodge: "Healing Lodge", shop: "Supply Shop", tailor: "Thread & Thistle", barber: "The Tidy Tangle", nursery: "Nuvo Nursery" }[room] : "";
export const cellKey = (region: string, interior?: Interior) => `${region}${interior ? `:${interior}` : ""}`;
export const caughtBefore = (save: Save | null, species: string) => Boolean(save?.caught.includes(SPECIES_BY_ID[species]?.base));
export const evolutionKey = (nuvo: Nuvo) => `${nuvo.uid}:${nuvo.speciesId}`;
export const readyToEvolve = (nuvo: Nuvo) => {
  const species = SPECIES_BY_ID[nuvo.speciesId];
  return species.evolvesTo.length > 0 && nuvo.level >= species.evolveLevel;
};
export function enterInterior(save: Save, room: Interior, x: number, y: number): Save {
  if (REGION_BY_ID[save.region]?.kind === "Town" && !save.interior)
    return { ...save, interior: room, outside: { x, y }, x: 576, y: 608 };
  return save;
}
export function leaveInterior(save: Save): Save {
  const { interior, outside, ...rest } = save;
  return { ...rest, x: outside?.x ?? (interior === "shop" ? 864 : 288), y: outside?.y ?? (interior === "shop" ? 584 : 328) };
}

export const WHEEL_PRIZES = [
  { label: "100 coins", icon: "◈", coins: 100, orbs: 0, potions: 0, color: "#efd79e" },
  { label: "3 binding orbs", icon: "◉", coins: 0, orbs: 3, potions: 0, color: "#a8d7c1" },
  { label: "2 potions", icon: "✚", coins: 0, orbs: 0, potions: 2, color: "#c9b8e0" },
  { label: "200 coins", icon: "◈", coins: 200, orbs: 0, potions: 0, color: "#f2bc8b" },
  { label: "5 binding orbs", icon: "◉", coins: 0, orbs: 5, potions: 0, color: "#a4cdd9" },
  { label: "4 potions", icon: "✚", coins: 0, orbs: 0, potions: 4, color: "#dda6b5" },
  { label: "500 coins", icon: "✦", coins: 500, orbs: 0, potions: 0, color: "#edd181" },
  { label: "Trail bundle", icon: "❋", coins: 100, orbs: 2, potions: 2, color: "#b7d598" },
] as const;
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
export function applyDailyPrize(save: Save, prize: number, day: string): Save {
  if (save.dailySpinDay && save.dailySpinDay >= day) throw new Error("Today's spin has already been claimed.");
  const reward = WHEEL_PRIZES[prize];
  if (!reward || !Number.isInteger(prize)) throw new Error("Unknown wheel reward.");
  return { ...save, coins: save.coins + reward.coins, orbs: save.orbs + reward.orbs, potions: save.potions + reward.potions, dailySpinDay: day, dailySpinPrize: prize };
}

export function edgeMarker(px: number, py: number, width: number, height: number, margin = 48) {
  if (px >= 0 && px <= width && py >= 0 && py <= height) return null;
  const dx = px - width / 2, dy = py - height / 2;
  const scale = Math.min((width / 2 - margin) / Math.max(Math.abs(dx), 0.01), (height / 2 - margin) / Math.max(Math.abs(dy), 0.01));
  return { x: width / 2 + dx * scale, y: height / 2 + dy * scale, angle: Math.atan2(dy, dx) };
}
