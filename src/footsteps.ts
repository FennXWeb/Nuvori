import { REGION_BY_ID } from "./data";
import type { Interior } from "./adventure";

export const FOOTSTEP_SURFACES = ["grass", "stone", "sand", "snow", "dirt", "wood"] as const;
export type FootstepSurface = typeof FOOTSTEP_SURFACES[number];

export function footstepSurface(region: string, interior?: Interior, onPath = false): FootstepSurface {
  if (interior) return "wood";
  if (region === "frostmere" || region === "tempest") return "snow";
  if (["saffron", "tideglass", "sunwake"].includes(region)) return "sand";
  if (region === "crystal" || region === "crownspire") return "stone";
  if (onPath) return REGION_BY_ID[region]?.kind === "Town" ? "stone" : "dirt";
  return "grass";
}

/** Travel distance drives cadence, including collision sliding and click-to-walk. */
export class FootstepStride {
  private progress = 0;
  advance(distance: number, sprinting: boolean) {
    if (!Number.isFinite(distance) || distance <= 0) { this.reset(); return false; }
    this.progress += distance / (sprinting ? 44 : 36);
    if (this.progress < 1) return false;
    this.progress %= 1;
    return true;
  }
  reset() { this.progress = 0; }
}

/** Each surface cycles through shuffled takes, with no repeat across bag boundaries. */
export class FootstepSequence {
  private bags = new Map<FootstepSurface, number[]>();
  private previous = new Map<FootstepSurface, number>();
  private left = false;
  constructor(private random: () => number = Math.random) {}

  next(surface: FootstepSurface, sprinting: boolean) {
    let bag = this.bags.get(surface);
    if (!bag?.length) {
      bag = [1, 2, 3, 4];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[0] === this.previous.get(surface)) [bag[0], bag[1]] = [bag[1], bag[0]];
      this.bags.set(surface, bag);
    }
    const take = bag.shift()!;
    this.previous.set(surface, take);
    this.left = !this.left;
    return {
      id: `step-${surface}-${take}`,
      rate: (sprinting ? 1 : .94) + this.random() * .12,
      gain: (sprinting ? .25 : .19) + this.random() * .05,
      pan: (this.left ? -1 : 1) * (.06 + this.random() * .04),
    };
  }
}
