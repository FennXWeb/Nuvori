import { BASE_SPECIES, SPECIES_BY_ID, REGION_BY_ID, REGIONS, createNuvo, gainXp, maxHp, MOVE_BY_ID, type Nuvo } from "./data";
import type { Save, Battle } from "./game";

export const CREW_XP_SHARE = .2;
export const DREAM_CHANCE = 1 / 10000;
export const ORBS = [
  { id: "binding", name: "Binding orb", cost: 35, color: "#8dc9ad", description: "A dependable orb for every wild Nuvo." },
  { id: "verdant", name: "Verdant orb", cost: 65, color: "#b1d884", description: "1.7× affinity for Bloom and Stone Nuvo." },
  { id: "tide", name: "Tide orb", cost: 65, color: "#86d9ee", description: "1.7× affinity for Tide and Frost Nuvo." },
  { id: "dusk", name: "Dusk orb", cost: 85, color: "#c1a0e5", description: "1.8× affinity for Shade and Astral Nuvo." },
  { id: "swift", name: "Swift orb", cost: 100, color: "#f0d27b", description: "2× affinity on the very first turn; ordinary afterward." },
  { id: "prism", name: "Prism orb", cost: 180, color: "#edaccf", description: "2.5× affinity for rare Prismatic variants; 1.25× otherwise." },
] as const;
export type OrbKind = typeof ORBS[number]["id"];
export const orbCount = (s: Save, orb: OrbKind) => orb === "binding" ? s.orbs : s.specialOrbs?.[orb] || 0;
export function orbAffinity(n: Nuvo, orb: OrbKind, turn: number) {
  const types = SPECIES_BY_ID[n.speciesId].types;
  if (orb === "verdant" && types.some(t => t === "Bloom" || t === "Stone")) return 1.7;
  if (orb === "tide" && types.some(t => t === "Tide" || t === "Frost")) return 1.7;
  if (orb === "dusk" && types.some(t => t === "Shade" || t === "Astral")) return 1.8;
  if (orb === "swift" && turn === 0) return 2;
  return orb === "prism" ? n.prismatic ? 2.5 : 1.25 : 1;
}
export function awardCrewXp(party: Nuvo[], active: number, amount: number) {
  return party.map((n, i) => {
    const result = gainXp(n, i === active ? amount : Math.max(1, Math.floor(amount * CREW_XP_SHARE))).nuvo;
    // Experience is shared with exhausted crew, but it cannot revive them.
    return n.hp <= 0 ? { ...result, hp: 0 } : result;
  });
}
export function reorderCrew(save: Save, from: number, to: number): Save {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= save.party.length || to >= save.party.length || from === to) return save;
  const party = [...save.party]; const [nuvo] = party.splice(from, 1); party.splice(to, 0, nuvo);
  return { ...save, party };
}
export const OUTFITS = [
  { name: "Trail jacket", color: "#539b79", price: 0 },
  { name: "Sunset cloak", color: "#b66548", price: 120 },
  { name: "Starlace coat", color: "#8266ad", price: 180 },
  { name: "Tide sailor", color: "#3d96b4", price: 140 },
  { name: "Champion armor", color: "#d2ab54", price: 250 },
  { name: "Rose overalls", color: "#bc7085", price: 140 },
] as const;
export const HAIRSTYLES = ["Trail tousle", "Cropped", "Swept fringe", "Long braid", "Twin buns", "Wild spikes"] as const;
export const HAIR_COLORS = ["#503c36", "#e2bc6f", "#a75a40", "#322d43", "#b2c5d1", "#b878b2"];
export interface Trainer { id: string; name: string; region: string; x: number; y: number; species: string[]; level: number; quote: string }
const names = ["Scout Rowan", "Keeper Sable", "Sailor Marin", "Courier Wren", "Botanist Juniper", "Miner Flint", "Ranger Ash", "Skater Lumi", "Astronomer Vega", "Nomad Sol", "Tailor Lark", "Lanternkeeper Moss", "Stormchaser Rune", "Champion Iris"];
export const TRAINERS: Trainer[] = REGIONS.filter(r => !r.hidden).map((r, i) => ({
  id: `${r.id}-keeper`, name: names[i], region: r.id, x: 22, y: 14.8,
  species: r.pool.slice(0, r.kind === "Town" ? 1 : 2).map(index => BASE_SPECIES[index].id),
  level: Math.max(5, r.level[0] + 2), quote: ["Let’s see how our companions have grown.", "Every battle teaches us something.", "Show me the bond you share!"][i % 3],
}));
export function trainerBattle(save: Save, trainer: Trainer): Battle {
  const team = trainer.species.map((id, i) => createNuvo(trainer.level >= 26 ? `${id}-${3+i}` : trainer.level >= 12 ? `${id}-${1+i}` : id, trainer.level, false));
  return { wild: team[0], active: Math.max(0, save.party.findIndex(n => n.hp > 0)), log: [`${trainer.name}: “${trainer.quote}”`], turn: 0, reward: 0, trainerId: trainer.id, trainerName: trainer.name, opponentQueue: team.slice(1), lastStand: save.party.every(n => n.hp <= 0) ? "choice" : undefined };
}
export function restoreAtLodge(save: Save): Save {
  const region = REGION_BY_ID[save.lastLodge || ""]?.kind === "Town" ? save.lastLodge! : "mossbell";
  return { ...save, region, interior: "lodge", outside: { x: 288, y: 336 }, x: 576, y: 608,
    visited: [...new Set([...save.visited, region])],
    party: save.party.map(n => ({ ...n, hp: maxHp(n), status: undefined, boost: false, guard: false, pp: Object.fromEntries(n.moves.map(m => [m, MOVE_BY_ID[m].pp])) })),
  };
}
export function keeperDefeat(save: Save, random = Math.random): { save: Save; dream: boolean } {
  const restored = restoreAtLodge(save);
  if (save.region !== "dreamland" && random() < DREAM_CHANCE) return { dream: true, save: { ...restored, region: "dreamland", interior: undefined, outside: undefined, x: 576, y: 608, visited: [...new Set([...restored.visited, "dreamland"])] } };
  return { save: restored, dream: false };
}
export const LEAGUE_GUARDIANS = [
  { id: "heartwood", name: "The Heartwood Trial", region: "mossbell", species: "spriglet-3", level: 18, hp: 900, badge: "Heartwood crest", color: "#9cce97", blurb: "Thornwarden has guarded the oldest roots for centuries. Bring Flame or Frost." },
  { id: "sunwake", name: "The Tidal Trial", region: "sunwake", species: "bubbfin-5", level: 25, hp: 1400, badge: "Tidal crest", color: "#86c9dc", blurb: "Reefkeeper calls the ocean into the arena. Bloom and Volt can break the tide." },
  { id: "aurora", name: "The Aurora Trial", region: "frostmere", species: "chillip-3", level: 32, hp: 1900, badge: "Aurora crest", color: "#bfdde8", blurb: "A frozen sovereign waits beneath the aurora. Prepare your strongest crew." },
  { id: "golden", name: "The Golden Trial", region: "threadhaven", species: "solcub-3", level: 38, hp: 2500, badge: "Golden crest", color: "#e4bd73", blurb: "The sun lion turns courage into a scorching storm. Bring Tide companions." },
  { id: "crown", name: "The Crown Trial", region: "crownspire", species: "jadeling-6", level: 45, hp: 3400, badge: "Crown of Auralis", color: "#c9a5e7", blurb: "The final guardian towers above the clouds. Four keepers, one impossible challenge." },
] as const;
