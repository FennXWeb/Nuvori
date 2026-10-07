// Indices 0–6 retain every previously released species ID.
export const STARTER_TREE: number[][] = [[1,2],[3],[5],[4,7],[9,10],[6,8],[13,14],[11,12],[15,16],[],[],[],[],[],[],[],[]];
export const FAMILY_TREES: Record<string, number[][]> = {
  fork: [[1,2],[3,4],[5,6],[],[],[],[]],
  parallel: [[1,2],[3],[5],[4],[],[6],[]],
  uneven: [[1,2],[3,4],[5],[],[],[6],[]],
  long: [[1,2],[3],[5],[4],[6],[],[]],
  crown: [[1],[2,3,4],[5],[6],[],[],[]],
};
export const FAMILY_SHAPES = ["fork","fork","fork","fork","fork","crown","parallel","uneven","parallel","long","uneven","long","parallel","crown","parallel","uneven","fork","long","crown","parallel","uneven","fork","long","crown","long"];
export const RARITIES = ["Uncommon","Uncommon","Uncommon","Uncommon","Uncommon","Common","Uncommon","Common","Common","Common","Uncommon","Rare","Rare","Uncommon","Rare","Uncommon","Common","Rare","Common","Rare","Common","Common","Rare","Uncommon","Rare"] as const;
export const STARTER_NAMES = [
  ["Rosethane","Willowveil","Briarspectre","Thornsovereign","Roseregalia","Antlerose","Celestivy","Orchidora","Willowelder","Cedarcrown"],
  ["Emberthane","Ashmantle","Solimperion","Sunforge","Pyrocrown","Magmaraud","Obsidirex","Cindereclipse","Ashoracle","Phoenixpelt"],
  ["Tsunamane","Coraloracle","Glaciarch","Winterwake","Tiderex","Maelstrider","Pearlimperial","Moonlagoon","Reefsovereign","Abyssalune"],
  ["Tempestseer","Nebulowl","Seraphorizon","Sunfeather","Stormregent","Thunderhalo","Astrarch","Cosmovane","Noctimperial","Dreamplume"],
  ["Arcthare","Dynamantle","Goldimperion","Voltregent","Stormstride","Thunderjack","Pulsetitan","Magnetitan","Dynamosage","Circuitcrown"],
];
// New branches retain the family's primary element and develop their own affinity.
export const STARTER_AFFINITIES = [
  ["Metal","Shade","Shade","Stone","Astral","Metal","Astral","Gale","Shade","Stone"],
  ["Metal","Shade","Astral","Metal","Gale","Stone","Stone","Shade","Astral","Gale"],
  ["Gale","Bloom","Frost","Gale","Stone","Volt","Astral","Shade","Bloom","Shade"],
  ["Volt","Shade","Astral","Flame","Volt","Metal","Astral","Tide","Shade","Bloom"],
  ["Metal","Shade","Astral","Flame","Gale","Stone","Stone","Metal","Astral","Metal"],
] as const;
// HP, attack, defense, speed: guardians, strikers, runners, and balanced mystics.
export const BRANCH_BUILDS = [[12,-8,12,-14],[-5,15,-10,8],[-8,3,-7,20],[4,4,4,-10]] as const;
export function treeStages(tree: number[][]): number[] {
  const stages = Array(tree.length).fill(-1); stages[0] = 0;
  const visit = (index: number) => { for (const child of tree[index]) { if (stages[child] !== -1) throw new Error("Evolution trees must not merge or cycle."); stages[child] = stages[index]+1; visit(child); } };
  visit(0); if (stages.includes(-1)) throw new Error("Unreachable evolution form."); return stages;
}
