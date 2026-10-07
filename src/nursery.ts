import { createNuvo, SPECIES_BY_ID, type Nuvo } from "./data";
import type { Save } from "./game";

export type Sex = Nuvo["sex"];
export interface NurseryJob {
  id: string;
  parents: [Nuvo, Nuvo];
  child: Nuvo;
  startedAt: number;
  readyAt: number;
}
export const SEXES: Sex[] = ["male", "female"];
export const sexLabel = (n: Nuvo) => sexOf(n) === "male" ? "♂ Male" : "♀ Female";
/** Existing companions receive a stable assignment on every device, without rerolls. */
export function sexOf(n: Pick<Nuvo,"uid"> & { sex?: Sex }): Sex {
  if (SEXES.includes(n.sex!)) return n.sex!;
  let hash = 2166136261;
  for (const char of n.uid) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2 ? "female" : "male";
}
export function normalizeSave(save: Save): Save {
  const migrate = (n: Nuvo) => ({ ...n, sex: sexOf(n) });
  return { ...save, party: save.party.map(migrate), box: save.box.map(migrate),
    ...(save.nursery ? { nursery: {...save.nursery, parents: save.nursery.parents.map(migrate) as [Nuvo,Nuvo], child: migrate(save.nursery.child)} } : {}) };
}
export const RARITY_MINUTES = { Common: 5, Uncommon: 15, Rare: 45, Mythical: 120 };
export function breedingDetails(a: Nuvo, b: Nuvo) {
  const family = SPECIES_BY_ID[a.speciesId], other = SPECIES_BY_ID[b.speciesId];
  const rarityMinutes = RARITY_MINUTES[family.rarity];
  const levelFactor = 1 + (a.level+b.level-2)/100;
  const stageFactor = 1 + (family.stage+other.stage)/2;
  return { rarity: family.rarity, rarityMinutes, levelFactor, stageFactor,
    seconds: Math.ceil(rarityMinutes*60*(98+a.level+b.level)*(2+family.stage+other.stage)/200) };
}
export function pairingError(a?: Nuvo, b?: Nuvo): string | null {
  if (!a || !b) return "Choose two parents.";
  if (a.uid === b.uid) return "Choose two different Nuvo.";
  if (sexOf(a) === sexOf(b)) return "The nursery needs one male and one female.";
  if (SPECIES_BY_ID[a.speciesId].base !== SPECIES_BY_ID[b.speciesId].base) return "Both parents must belong to the same Nuvo family. Different evolution branches are welcome.";
  return null;
}
export function startBreeding(save: Save, first: string, second: string, now = Date.now()): Save {
  if (save.nursery) throw new Error("The nursery is already caring for a pair.");
  const owned = [...save.party,...save.box], a = owned.find(n=>n.uid===first), b = owned.find(n=>n.uid===second);
  const error = pairingError(a,b); if (error) throw new Error(error);
  const party = save.party.filter(n=>n.uid!==first && n.uid!==second);
  if (!party.some(n=>n.hp>0)) throw new Error("Keep at least one healthy Nuvo in your crew before leaving the parents here.");
  if (owned.length >= 506) throw new Error("Make room for a new Nuvo before starting a nursery visit.");
  const parents: [Nuvo,Nuvo] = [{...a!,sex:sexOf(a!)},{...b!,sex:sexOf(b!)}];
  const child = {...createNuvo(SPECIES_BY_ID[a!.speciesId].base,1),origin:"nursery" as const};
  return {...save, party, box: save.box.filter(n=>n.uid!==first && n.uid!==second),
    nursery: {id:crypto.randomUUID(), parents,child,startedAt:now,readyAt:now+breedingDetails(a!,b!).seconds*1000}};
}
export function finishBreeding(save: Save, jobId: string, action: "collect"|"cancel", now = Date.now()): Save {
  const job = save.nursery;
  if (!job || job.id !== jobId || save.nurseryReceipts?.includes(jobId)) throw new Error("This nursery visit has already ended.");
  if (action === "collect" && now < job.readyAt) throw new Error("Your new Nuvo is not ready yet.");
  const arriving = action === "collect" ? [...job.parents,job.child] : [...job.parents];
  if (save.party.length+save.box.length+arriving.length > 506) throw new Error("Make room in your crew or reserve, then return to collect your Nuvo.");
  const party = [...save.party], box = [...save.box];
  for (const nuvo of arriving) (party.length < 6 ? party : box).push(nuvo);
  const {nursery: _job, ...rest} = save;
  return {...rest,party,box,nurseryReceipts:[...(save.nurseryReceipts||[]),job.id],
    caught:action==="collect"?[...new Set([...save.caught,SPECIES_BY_ID[job.child.speciesId].base])]:save.caught,
    seen:action==="collect"?[...new Set([...save.seen,job.child.speciesId])]:save.seen};
}
export function canCatchDreamweaver(save: Save, nuvo: Nuvo) {
  if (SPECIES_BY_ID[nuvo.speciesId]?.base !== "dreamweaver") return true;
  const sex = sexOf(nuvo);
  return !save.dreamweaverCaptures?.[sex] && ![...save.party,...save.box,...(save.nursery?.parents||[])].some(n=>SPECIES_BY_ID[n.speciesId].base==="dreamweaver" && n.origin!=="nursery" && sexOf(n)===sex);
}
export function durationLabel(ms: number): string {
  const seconds = Math.max(0,Math.ceil(ms/1000)), hours = Math.floor(seconds/3600), minutes = Math.floor(seconds%3600/60);
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${seconds%60}s` : `${seconds}s`;
}
