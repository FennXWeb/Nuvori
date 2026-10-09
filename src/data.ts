export const TYPES = [
  "Bloom",
  "Flame",
  "Tide",
  "Gale",
  "Volt",
  "Stone",
  "Frost",
  "Shade",
  "Astral",
  "Metal",
] as const;
export type Element = (typeof TYPES)[number];
export const TYPE_COLORS: Record<Element, string> = {
  Bloom: "#72bf72",
  Flame: "#ec885a",
  Tide: "#5faac6",
  Gale: "#92beba",
  Volt: "#d9b657",
  Stone: "#b59475",
  Frost: "#8bcbd8",
  Shade: "#aa88c6",
  Astral: "#c592cb",
  Metal: "#8fa3b0",
};
export const TYPE_SYMBOLS: Record<Element, string> = {
  Bloom: "✿",
  Flame: "♨",
  Tide: "◉",
  Gale: "≋",
  Volt: "ϟ",
  Stone: "◆",
  Frost: "❄",
  Shade: "☾",
  Astral: "✦",
  Metal: "⬡",
};
export type MoveEffect =
  "none" | "heal" | "burn" | "slow" | "guard" | "drain" | "poison" | "boost";
export interface Move {
  id: string;
  name: string;
  type: Element;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  effect: MoveEffect;
  category: "Physical" | "Special" | "Status";
  animation: number;
  description: string;
}
const moveNames: Record<Element, string[]> = {
  Bloom: [
    "Leaf Flick",
    "Vine Snap",
    "Spore Cloud",
    "Petal Guard",
    "Root Rush",
    "Sap Sip",
    "Thorn Volley",
    "Canopy Crash",
    "Wildflower",
    "Verdant Eclipse",
  ],
  Flame: [
    "Ember Pop",
    "Cinder Claw",
    "Kindle",
    "Heat Veil",
    "Firewheel",
    "Flare Siphon",
    "Magma Burst",
    "Blazing Comet",
    "Phoenix Rest",
    "Solar Inferno",
  ],
  Tide: [
    "Bubble Dart",
    "Foam Fang",
    "Riptide",
    "Tidal Shield",
    "Surf Strike",
    "Dew Drain",
    "Geyser Lance",
    "Maelstrom",
    "Healing Rain",
    "Ocean Anthem",
  ],
  Gale: [
    "Gust Puff",
    "Wing Clip",
    "Tailwind",
    "Zephyr Veil",
    "Cyclone Dash",
    "Breath Steal",
    "Feather Storm",
    "Skybreaker",
    "Second Wind",
    "Tempest Waltz",
  ],
  Volt: [
    "Static Spark",
    "Arc Bite",
    "Thunder Jolt",
    "Ion Guard",
    "Flash Step",
    "Battery Tap",
    "Bolt Barrage",
    "Thunderclap",
    "Recharge",
    "Storm Circuit",
  ],
  Stone: [
    "Pebble Toss",
    "Flint Fang",
    "Sand Snare",
    "Granite Guard",
    "Boulder Roll",
    "Mineral Leech",
    "Shardfall",
    "Fault Line",
    "Earthen Rest",
    "Worldshaker",
  ],
  Frost: [
    "Snow Flurry",
    "Icicle Claw",
    "Cold Snap",
    "Glacier Guard",
    "Frost Slide",
    "Winter Siphon",
    "Hail Volley",
    "Avalanche",
    "Snowmelt",
    "Absolute Winter",
  ],
  Shade: [
    "Dusk Wisp",
    "Shadow Scratch",
    "Night Venom",
    "Umbral Guard",
    "Phantom Rush",
    "Dream Eater",
    "Midnight Daggers",
    "Eclipse Fall",
    "Moonless Rest",
    "Endless Night",
  ],
  Astral: [
    "Star Mote",
    "Comet Claw",
    "Gravity Well",
    "Celestial Guard",
    "Orbit Dash",
    "Starlight Siphon",
    "Meteor Shower",
    "Supernova",
    "Aurora Wish",
    "Cosmic Bloom",
  ],
  Metal: [
    "Gear Toss",
    "Steel Claw",
    "Magnetic Bind",
    "Alloy Guard",
    "Iron Charge",
    "Rust Leech",
    "Rivet Volley",
    "Titan Hammer",
    "Reforge",
    "Chrome Cataclysm",
  ],
};
export const MOVES: Move[] = TYPES.flatMap((type, ti) =>
  moveNames[type].map((name, i) => ({
    id: `${type.toLowerCase()}-${i}`,
    name,
    type,
    power: [35, 45, 25, 0, 55, 40, 65, 80, 0, 100][i],
    accuracy: [100, 100, 95, 100, 95, 100, 90, 90, 100, 85][i],
    pp: [30, 25, 20, 15, 20, 15, 15, 10, 10, 5][i],
    priority: i === 4 ? 1 : 0,
    effect: (i === 2
      ? type === "Flame"
        ? "burn"
        : type === "Bloom" || type === "Shade"
          ? "poison"
          : type === "Gale"
            ? "boost"
            : "slow"
      : i === 3
        ? "guard"
        : i === 5
          ? "drain"
          : i === 8
            ? "heal"
            : "none") as MoveEffect,
    category:
      i === 3 || i === 8
        ? "Status"
        : i === 1 || i === 4 || i === 7
          ? "Physical"
          : "Special",
    animation: ti * 10 + i,
    description:
      i === 3
        ? "Brace for the next hit, reducing damage by 60%."
        : i === 8
          ? "Restore 40% of maximum health."
          : i === 5
            ? "Restore half the damage dealt."
            : i === 2
              ? type === "Flame"
                ? "May burn the target."
                : type === "Bloom" || type === "Shade"
                  ? "May poison the target."
                  : type === "Gale"
                    ? "Raise your attack."
                    : "May lower the target’s speed."
              : `A ${["swift", "focused", "tricky", "defensive", "priority", "restorative", "scattering", "heavy", "soothing", "ultimate"][i]} ${type.toLowerCase()} technique.`,
  })),
);
export const MOVE_BY_ID = Object.fromEntries(
  MOVES.map((m) => [m.id, m]),
) as Record<string, Move>;
interface BaseSpec {
  name: string;
  types: Element[];
  title: string;
  lore: string;
  habitat: string;
  stats: [number, number, number, number];
  paths: [string, string, string, string, string, string];
}
const baseSpecs: BaseSpec[] = [
  {
    name: "Spriglet",
    types: ["Bloom"],
    title: "The little wildheart",
    lore: "A curious forest fox. The leaf on its head turns toward anyone it trusts.",
    habitat: "Verdant Wilds",
    stats: [48, 48, 44, 58],
    paths: [
      "Briarfox",
      "Fernwhisp",
      "Thornwarden",
      "Briarwraith",
      "Canopytail",
      "Sylvaura",
    ],
  },
  {
    name: "Cindlet",
    types: ["Flame"],
    title: "A pocketful of courage",
    lore: "This tiny red panda keeps a warm coal in its tail. It glows brighter when friends are near.",
    habitat: "Emberfall",
    stats: [46, 59, 43, 50],
    paths: [
      "Pyropaw",
      "Ashveil",
      "Volcaruff",
      "Solpanda",
      "Cindergeist",
      "Obsidianox",
    ],
  },
  {
    name: "Bubbfin",
    types: ["Tide"],
    title: "Go with your own flow",
    lore: "It collects tiny treasures in floating bubbles and gives its favorite to its keeper.",
    habitat: "Tideglass Coast",
    stats: [55, 46, 53, 44],
    paths: [
      "Rivertuft",
      "Coralune",
      "Torrential",
      "Frostflume",
      "Reefkeeper",
      "Pearlora",
    ],
  },
  {
    name: "Wisplet",
    types: ["Gale", "Astral"],
    title: "A dream with wings",
    lore: "A cloud-soft owlet that navigates by constellations visible only to Nuvo.",
    habitat: "Starfall Reach",
    stats: [44, 54, 42, 62],
    paths: [
      "Zephyra",
      "Moonplume",
      "Stormsoar",
      "Skyseraph",
      "Noctilune",
      "Astralith",
    ],
  },
  {
    name: "Voltik",
    types: ["Volt"],
    title: "Small spark. Big spirit.",
    lore: "Its ears hum before thunderstorms. One happy hop can light a whole room.",
    habitat: "Verdant Wilds",
    stats: [43, 55, 42, 65],
    paths: [
      "Amphare",
      "Fluxbun",
      "Thundraze",
      "Goldwhisk",
      "Mecharabbit",
      "Pulsephant",
    ],
  },
  {
    name: "Mushbur",
    types: ["Bloom", "Stone"],
    title: "The patient forager",
    lore: "Mushrooms grow along its back. It shares them with lost travelers.",
    habitat: "Hollow Grove",
    stats: [60, 42, 58, 30],
    paths: [
      "Mycobur",
      "Trufflekin",
      "Sporewarden",
      "Fungolem",
      "Mossbadger",
      "Trufflune",
    ],
  },
  {
    name: "Axolily",
    types: ["Tide", "Bloom"],
    title: "The reef gardener",
    lore: "A shy axolotl that tends coral gardens in warm pools.",
    habitat: "Tideglass Coast",
    stats: [52, 48, 48, 47],
    paths: [
      "Coralotl",
      "Lotolotl",
      "Reefbloom",
      "Tidaloam",
      "Lotusoul",
      "Petalotl",
    ],
  },
  {
    name: "Dunillo",
    types: ["Stone"],
    title: "The wandering dune",
    lore: "It curls into a ball and rolls across sand, leaving perfect spirals.",
    habitat: "Emberfall",
    stats: [52, 51, 64, 32],
    paths: [
      "Sandillo",
      "Flintillo",
      "Dunegard",
      "Quakeback",
      "Ironillo",
      "Glassillo",
    ],
  },
  {
    name: "Chillip",
    types: ["Frost", "Tide"],
    title: "The snowdrop swimmer",
    lore: "Slides down glaciers on its belly. Its laughter sounds like tiny bells.",
    habitat: "Frostmere",
    stats: [51, 43, 49, 52],
    paths: [
      "Glacip",
      "Snowkip",
      "Icebergon",
      "Polarip",
      "Blizzardip",
      "Aurorip",
    ],
  },
  {
    name: "Duskbat",
    types: ["Shade", "Gale"],
    title: "The twilight whisper",
    lore: "Sleeps inside folded leaves and guides wandering keepers home after dark.",
    habitat: "Hollow Grove",
    stats: [40, 55, 36, 67],
    paths: [
      "Echowing",
      "Gloombat",
      "Sonarion",
      "Stormecho",
      "Nightveil",
      "Eclipsabat",
    ],
  },
  {
    name: "Humbear",
    types: ["Bloom", "Volt"],
    title: "The honey hummer",
    lore: "A fuzzy bee-bear whose wingbeats make flowers release extra nectar.",
    habitat: "Verdant Wilds",
    stats: [60, 52, 45, 38],
    paths: [
      "Nectarbear",
      "Buzzursa",
      "Honeyguard",
      "Bloomursa",
      "Thunderursa",
      "Goldenursa",
    ],
  },
  {
    name: "Crystail",
    types: ["Stone", "Astral"],
    title: "The wandering geode",
    lore: "Its crystal shell stores memories of every place it has ever visited.",
    habitat: "Crystal Steps",
    stats: [55, 38, 70, 22],
    paths: [
      "Geosnail",
      "Opalune",
      "Prismolith",
      "Quartzion",
      "Lunaspire",
      "Astralshell",
    ],
  },
  {
    name: "Lunamoth",
    types: ["Astral", "Gale"],
    title: "The moon messenger",
    lore: "Its delicate wings trace silver constellations in the evening air.",
    habitat: "Starfall Reach",
    stats: [42, 60, 40, 59],
    paths: [
      "Silkmora",
      "Moondust",
      "Astramoth",
      "Velvetempest",
      "Lunaseraph",
      "Eclipsemoth",
    ],
  },
  {
    name: "Ferrunt",
    types: ["Metal"],
    title: "The little ironwill",
    lore: "This stubborn rhino polishes its little horn on boulders every morning.",
    habitat: "Crystal Steps",
    stats: [57, 56, 62, 25],
    paths: [
      "Steelunt",
      "Magnetusk",
      "Ferradon",
      "Chromehorn",
      "Polarhino",
      "Voltusk",
    ],
  },
  {
    name: "Kelpie",
    types: ["Tide", "Shade"],
    title: "The drifting tide",
    lore: "It braids kelp into little crowns and leaves them along the shore.",
    habitat: "Tideglass Coast",
    stats: [48, 57, 42, 54],
    paths: [
      "Kelpora",
      "Seawraith",
      "Tidalsteed",
      "Reefdragon",
      "Abyssmare",
      "Moonkelp",
    ],
  },
  {
    name: "Orchik",
    types: ["Bloom", "Gale"],
    title: "The petal dancer",
    lore: "This tiny mantis disguises itself as an orchid and dances in warm rain.",
    habitat: "Hollow Grove",
    stats: [40, 64, 36, 60],
    paths: [
      "Petalisk",
      "Thornantis",
      "Floramantis",
      "Zephorchid",
      "Briarblade",
      "Venorchid",
    ],
  },
  {
    name: "Scorcko",
    types: ["Flame", "Stone"],
    title: "The lava skitter",
    lore: "Its little feet never burn, even on the hottest obsidian.",
    habitat: "Emberfall",
    stats: [47, 56, 49, 47],
    paths: [
      "Magmcko",
      "Obsidcko",
      "Volcadrake",
      "Pyroclast",
      "Glasswyrm",
      "Nightscorch",
    ],
  },
  {
    name: "Stellawn",
    types: ["Astral"],
    title: "The wishing fawn",
    lore: "Stars gather around its antlers when it finds a kind-hearted keeper.",
    habitat: "Starfall Reach",
    stats: [49, 54, 47, 55],
    paths: [
      "Astradeer",
      "Dawnfawn",
      "Constellion",
      "Lunacrown",
      "Solstice",
      "Aurorant",
    ],
  },
  {
    name: "Mosshell",
    types: ["Bloom", "Stone"],
    title: "The living garden",
    lore: "Every mossy shell is a tiny ecosystem. Some carry century-old flowers.",
    habitat: "Verdant Wilds",
    stats: [65, 43, 70, 20],
    paths: [
      "Groveshell",
      "Rockmoss",
      "Forestitan",
      "Bloomback",
      "Terrawarden",
      "Jadeshell",
    ],
  },
  {
    name: "Veiljell",
    types: ["Shade", "Tide"],
    title: "The lantern drifter",
    lore: "Its gentle glow reveals hidden paths over misty marshes.",
    habitat: "Hollow Grove",
    stats: [52, 58, 35, 49],
    paths: [
      "Mistveil",
      "Spectrill",
      "Phantomtide",
      "Auroraveil",
      "Abyssjell",
      "Ectolume",
    ],
  },
  {
    name: "Whiflet",
    types: ["Gale"],
    title: "The wandering breeze",
    lore: "A playful weasel that rides wind currents between the islands.",
    habitat: "Verdant Wilds",
    stats: [40, 49, 39, 75],
    paths: [
      "Gustel",
      "Cirroweasel",
      "Tempestail",
      "Jetwhisk",
      "Cloudribbon",
      "Stratospry",
    ],
  },
  {
    name: "Venopip",
    types: ["Shade", "Bloom"],
    title: "The dusk croaker",
    lore: "It sings low notes beside moonlit ponds. Its spots glow when it is nervous.",
    habitat: "Hollow Grove",
    stats: [48, 55, 46, 49],
    paths: [
      "Toxitoad",
      "Nightpip",
      "Venoracle",
      "Miasmancer",
      "Mooncroak",
      "Bogwraith",
    ],
  },
  {
    name: "Solcub",
    types: ["Flame", "Astral"],
    title: "The little sunrise",
    lore: "A lion cub born at daybreak. Its mane brightens with every brave act.",
    habitat: "Emberfall",
    stats: [50, 60, 42, 55],
    paths: [
      "Dawnmane",
      "Flareleo",
      "Solregent",
      "Starpride",
      "Infernalion",
      "Coronaleo",
    ],
  },
  {
    name: "Rumblewool",
    types: ["Volt", "Stone"],
    title: "The storm grazer",
    lore: "Rainclouds cling to its fleece, rumbling softly when it falls asleep.",
    habitat: "Crystal Steps",
    stats: [59, 56, 52, 34],
    paths: [
      "Thunderam",
      "Stormfleece",
      "Bolthorn",
      "Graniteram",
      "Tempestwool",
      "Nimbusram",
    ],
  },
  {
    name: "Jadeling",
    types: ["Stone", "Astral"],
    title: "The ancient promise",
    lore: "A rare dragon hatchling said to remember the islands before they rose from the sea.",
    habitat: "Crystal Steps",
    stats: [55, 57, 55, 43],
    paths: [
      "Jadewyrm",
      "Opaldrake",
      "Jadeimperion",
      "Terrajade",
      "Prismadragon",
      "Celestijade",
    ],
  },
];
import { STARTER_TREE, FAMILY_TREES, FAMILY_SHAPES, RARITIES, STARTER_NAMES, STARTER_AFFINITIES, BRANCH_BUILDS, treeStages } from "./evolutionBlueprints";
export interface Species {
  id: string;
  dex: number;
  name: string;
  types: Element[];
  title: string;
  lore: string;
  habitat: string;
  stats: { hp: number; attack: number; defense: number; speed: number };
  sprite: number;
  stage: number;
  branch: number;
  rarity: "Common" | "Uncommon" | "Rare" | "Mythical";
  art?: { file: string; frame: number };
  base: string;
  evolvesTo: string[];
  evolveLevel: number;
  startMoves: string[];
  learnset: { level: number; move: string }[];
  teachable: string[];
}
function learnTable(types: Element[], stage: number) {
  const primary = types[0].toLowerCase(),
    secondary = (types[1] || types[0]).toLowerCase();
  return {
    startMoves: [`${primary}-0`, `${secondary}-1`],
    learnset: [
      { level: 4, move: `${primary}-2` },
      { level: 7, move: `${secondary}-3` },
      { level: 10, move: `${primary}-4` },
      { level: 13, move: `${secondary}-5` },
      { level: 17, move: `${primary}-6` },
      { level: 22, move: `${secondary}-7` },
      { level: 26, move: `${primary}-8` },
      { level: 32, move: `${primary}-9` },
    ],
    teachable: MOVES.filter(
      (m) =>
        types.includes(m.type) &&
        (m.power <= 65 + stage * 20 || m.category === "Status"),
    ).map((m) => m.id),
  };
}
export const SPECIES: Species[] = baseSpecs.flatMap((b, i) => {
  const id = b.name.toLowerCase();
  const tree = i < 5 ? STARTER_TREE : FAMILY_TREES[FAMILY_SHAPES[i]];
  const stages = treeStages(tree);
  const stageTypes: Element[] = [
    TYPES[(TYPES.indexOf(b.types[0]) + 5) % 10],
    TYPES[(TYPES.indexOf(b.types[0]) + 8) % 10],
  ];
  return [b.name, ...b.paths, ...(i < 5 ? STARTER_NAMES[i] : [])].map((name, n) => {
    const stage = stages[n];
    const statStage = Math.max(stage, n === 0 ? 0 : n < 3 ? 1 : 2);
    const build = n >= 7 ? BRANCH_BUILDS[(n-7)%4] : [0,0,0,0];
    const secondary = n >= 7 ? STARTER_AFFINITIES[i][n-7] :
      n === 4
        ? TYPES[(TYPES.indexOf(b.types[0]) + 3) % 10]
        : n === 6
          ? TYPES[(TYPES.indexOf(b.types[0]) + 7) % 10]
          : n === 1 || n === 3
            ? stageTypes[0]
            : stageTypes[1];
    const types = n === 0 ? b.types : [b.types[0], secondary];
    const evolve = tree[n];
    return {
      id: n === 0 ? id : `${id}-${n}`,
      dex: i + 1,
      name,
      types: [...new Set(types)],
      title:
        n === 0
          ? b.title
          : stage === 1
            ? "An unfolding possibility"
            : "A fully realized bond",
      lore:
        n === 0
          ? b.lore
          : `An evolution of ${b.name}. ${n % 2 === 0 ? "Its patient spirit awakens a mysterious elemental affinity." : "Its adventurous spirit draws out a powerful new form."}`,
      habitat: b.habitat,
      stats: {
        hp: b.stats[0] + statStage * 22 + build[0],
        attack: b.stats[1] + statStage * 20 + (n % 2) * 5 + build[1],
        defense: b.stats[2] + statStage * 18 + build[2],
        speed: b.stats[3] + statStage * 13 + build[3],
      },
      sprite: i,
      stage,
      branch: n,
      rarity: RARITIES[i],
      ...(n >= 7 ? { art: { file: `${id}-evolutions.png`, frame: n-7 } } : {}),
      base: id,
      evolvesTo: evolve.map((e) => `${id}-${e}`),
      evolveLevel: [12,22,34,44,50][stage],
      ...learnTable([...new Set(types)], stage),
    };
  });
});
export const BASE_SPECIES = SPECIES.filter((s) => s.stage === 0);
export const DREAM_SPECIES: Species = {
  id: "oneirune", dex: 26, name: "Oneirune", types: ["Astral", "Shade"],
  title: "The dream between heartbeats", habitat: "Dream Land", sprite: 25, stage: 0, branch: 0,
  rarity: "Mythical",
  lore: "A mythical dream dragon that stitches fallen stars into sleeping skies. Only keepers who awaken beyond the veil can meet it.",
  stats: { hp: 98, attack: 94, defense: 88, speed: 96 }, base: "oneirune", evolvesTo: [], evolveLevel: 50,
  ...learnTable(["Astral", "Shade"], 2),
};
SPECIES.push(DREAM_SPECIES);
const dreamTitles = ["Moon", "Sun", "Night", "Dawn"], dreamRoots = ["Luna", "Sol", "Umbra", "Aurora"];
const dreamAffinities: Element[] = ["Frost", "Flame", "Shade", "Bloom"];
export const DREAMWEAVER_FORMS: Species[] = Array.from({ length: 85 }, (_, n) => {
  const stage = n === 0 ? 0 : n <= 4 ? 1 : n <= 20 ? 2 : 3;
  const path: number[] = []; let cursor = n;
  while (cursor) { path.unshift((cursor-1)%4); cursor = Math.floor((cursor-1)/4); }
  const theme = path[0] ?? 2, affinity = path.at(-1) ?? 2;
  const types: Element[] = ["Astral", dreamAffinities[affinity]];
  const ancestry = path.reduce((stats, choice, step) => stats.map((value, stat) => value + BRANCH_BUILDS[choice][stat] * (step+1)), [0,0,0,0]);
  const name = !n ? "Dreamweaver" : stage === 1 ? `${dreamTitles[theme]}weaver` : stage === 2 ? `${dreamRoots[theme]}${["seer","warden","oracle","singer"][path[1]]}` : `${dreamRoots[theme]}${["veil","crest","shroud","bloom"][path[1]]} ${["Sovereign","Titan","Seraph","Eidolon"][path[2]]}`;
  return {
    id: !n ? "dreamweaver" : `dreamweaver-${n}`, dex: 27, name, types,
    title: !n ? "The keeper of unwritten dreams" : `The ${dreamTitles[theme].toLowerCase()} thread · stage ${stage+1}`,
    lore: !n ? "A mythical thread-tailed spirit that weaves possible futures into the sleeping sky. Each keeper can capture only one wild male and one wild female. Their descendants begin a new tapestry at the nursery." : `A grown Dreamweaver of the ${dreamTitles[theme].toLowerCase()} tapestry. ${stage < 3 ? "Four threads still wait to be woven into its next form." : "Its chosen threads have become a unique guardian of the dreaming sky."}`,
    habitat: "Dream Land", stats: { hp: 68+stage*24+Math.round(ancestry[0]/3), attack: 68+stage*23+affinity*2+Math.round(ancestry[1]/3), defense: 64+stage*21+(3-affinity)*2+Math.round(ancestry[2]/3), speed: 70+stage*16+Math.round(ancestry[3]/3) },
    sprite: 26, stage, branch: n, rarity: "Mythical", base: "dreamweaver",
    evolvesTo: stage < 3 ? Array.from({length:4}, (_, c) => `dreamweaver-${n*4+c+1}`) : [],
    evolveLevel: [16,30,44,50][stage],
    art: n <= 4 ? {file:"dreamweaver-beginnings.png",frame:n} : n <= 20 ? {file:"dreamweaver-ascendants.png",frame:n-5} : {file:`dreamweaver-crown-${Math.floor((n-21)/16)}.png`,frame:(n-21)%16},
    ...learnTable(types,stage),
  };
});
export const DREAMWEAVER = DREAMWEAVER_FORMS[0];
SPECIES.push(...DREAMWEAVER_FORMS);
export const SOLUNELLE: Species = {id:"solunelle",dex:28,name:"Solunelle",types:["Astral","Bloom"],title:"The first-light companion",lore:"A celestial fox-dragon whose leaf-woven tail carries the first stars of a new season. A companion earned through the Season 1 pass, never encountered in the wild.",habitat:"Season 1 · Tier 100",stats:{hp:76,attack:73,defense:69,speed:82},sprite:27,stage:0,branch:0,rarity:"Mythical",base:"solunelle",evolvesTo:[],evolveLevel:50,art:{file:"solunelle.png",frame:0},...learnTable(["Astral","Bloom"],0)};
SPECIES.push(SOLUNELLE);
export const ALL_FAMILIES = [...BASE_SPECIES, DREAM_SPECIES, DREAMWEAVER, SOLUNELLE];
export const SPECIES_BY_ID = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<string, Species>;
export const STARTERS = BASE_SPECIES.slice(0, 5);
const strong: Record<Element, Element[]> = {
  Bloom: ["Tide", "Stone"],
  Flame: ["Bloom", "Frost", "Metal"],
  Tide: ["Flame", "Stone"],
  Gale: ["Bloom", "Shade"],
  Volt: ["Tide", "Gale"],
  Stone: ["Volt", "Flame"],
  Frost: ["Bloom", "Gale"],
  Shade: ["Astral"],
  Astral: ["Shade", "Stone"],
  Metal: ["Frost", "Astral"],
};
export function effectiveness(type: Element, targets: Element[]) {
  return targets.reduce(
    (m, t) =>
      m *
      (strong[type].includes(t)
        ? 2
        : strong[t].includes(type) || t === type
          ? 0.5
          : 1),
    1,
  );
}
export interface Nuvo {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  hp: number;
  prismatic: boolean;
  sex: "male" | "female";
  origin?: "wild" | "nursery" | "starter";
  moves: string[];
  pp: Record<string, number>;
  status?: "burn" | "poison" | "slow";
  guard?: boolean;
  boost?: boolean;
}
export function maxHp(n: Nuvo) {
  return (
    20 + Math.floor(SPECIES_BY_ID[n.speciesId].stats.hp * 0.6) + n.level * 4
  );
}
export function learnedMoves(s: Species, level: number) {
  return [
    ...new Set([
      ...s.startMoves,
      ...s.learnset.filter((m) => m.level <= level).map((m) => m.move),
    ]),
  ];
}
export function createNuvo(
  speciesId: string,
  level = 5,
  prismatic = Math.random() < 1 / 512,
  sex: Nuvo["sex"] = Math.random() < .5 ? "male" : "female",
): Nuvo {
  const moves = learnedMoves(SPECIES_BY_ID[speciesId], level).slice(-4);
  const n: Nuvo = {
    uid: crypto.randomUUID(),
    speciesId,
    level,
    xp: 0,
    hp: 1,
    prismatic,
    sex,
    moves,
    pp: Object.fromEntries(moves.map((id) => [id, MOVE_BY_ID[id].pp])),
  };
  n.hp = maxHp(n);
  return n;
}
export function xpToNext(level: number) {
  return 25 + level * 12;
}
export function gainXp(n: Nuvo, amount: number) {
  const copy = structuredClone(n);
  copy.xp += amount;
  let levels = 0;
  while (copy.level < 50 && copy.xp >= xpToNext(copy.level)) {
    copy.xp -= xpToNext(copy.level);
    copy.level++;
    levels++;
    copy.hp = Math.min(maxHp(copy), copy.hp + 4);
    const learned = SPECIES_BY_ID[copy.speciesId].learnset.filter(
      (m) => m.level === copy.level,
    );
    for (const l of learned) {
      if (copy.moves.length < 4) {
        copy.moves.push(l.move);
        copy.pp[l.move] = MOVE_BY_ID[l.move].pp;
      }
    }
  }
  return { nuvo: copy, levels };
}
export function evolve(n: Nuvo, target: string): Nuvo {
  const s = SPECIES_BY_ID[n.speciesId];
  if (n.level < s.evolveLevel || !s.evolvesTo.includes(target))
    throw new Error("This evolution is not available yet.");
  const copy = { ...n, speciesId: target };
  copy.hp = Math.min(maxHp(copy), n.hp + maxHp(copy) - maxHp(n));
  return copy;
}
export interface Region {
  id: string;
  name: string;
  kind: "Town" | "Wild zone" | "Landmark";
  subtitle: string;
  description: string;
  color: string;
  level: [number, number];
  pool: number[];
  links: { north?: string; south?: string; east?: string; west?: string };
  landmark: string;
  prop: number;
  pos: [number, number];
  biome?: "meadow" | "desert" | "marsh" | "storm" | "dream";
  hidden?: boolean;
}
export const REGIONS: Region[] = [
  {
    id: "mossbell",
    name: "Mossbell Village",
    kind: "Town",
    subtitle: "Where every path begins",
    description:
      "Warm roofs, wildflower gardens, and the first page of your story. Visit the blue-roof lodge to heal.",
    color: "#74b986",
    level: [2, 4],
    pool: [0, 4, 10, 18, 20],
    links: { north: "verdant", east: "tideglass" },
    landmark: "The Wishing Fountain",
    prop: 11,
    pos: [20, 72],
  },
  {
    id: "verdant",
    name: "Verdant Wilds",
    kind: "Wild zone",
    subtitle: "Follow the rustling leaves",
    description:
      "Sunlight spills through old-growth canopies. Small Nuvo hide in the deep green grass.",
    color: "#5a9c71",
    level: [3, 7],
    pool: [0, 4, 10, 18, 20],
    links: { south: "mossbell", north: "hollow", east: "crystal" },
    landmark: "The Heartwood Arch",
    prop: 9,
    pos: [20, 48],
  },
  {
    id: "tideglass",
    name: "Tideglass Coast",
    kind: "Wild zone",
    subtitle: "Treasures between the tides",
    description:
      "Sea-glass pools shimmer beneath coral cliffs. Follow the coast to Sunwake Harbor.",
    color: "#68b8b8",
    level: [4, 9],
    pool: [2, 6, 14, 19],
    links: { west: "mossbell", east: "sunwake" },
    landmark: "The Tidebell",
    prop: 10,
    pos: [48, 86],
  },
  {
    id: "sunwake",
    name: "Sunwake Harbor",
    kind: "Town",
    subtitle: "The sea always brings a story",
    description:
      "Keepers gather beside the lighthouse. Rest, stock up, and head north to the ember fields.",
    color: "#d6aa6a",
    level: [5, 9],
    pool: [2, 6, 14],
    links: { west: "tideglass", north: "emberfall" },
    landmark: "The Sunwake Beacon",
    prop: 10,
    pos: [80, 72],
  },
  {
    id: "hollow",
    name: "Hollow Grove",
    kind: "Wild zone",
    subtitle: "A little strange. A little magical.",
    description:
      "Giant mushrooms light the woodland. Listen carefully: even the shadows have a song.",
    color: "#8d8ab0",
    level: [7, 12],
    pool: [5, 9, 15, 19, 21],
    links: { south: "verdant", east: "starfall" },
    landmark: "The Whispering Ring",
    prop: 3,
    pos: [15, 23],
  },
  {
    id: "crystal",
    name: "Crystal Steps",
    kind: "Landmark",
    subtitle: "Walk through a memory of light",
    description:
      "A staircase of ancient crystals hums beneath your feet. Rare Nuvo gather in its glow.",
    color: "#91bdc9",
    level: [8, 14],
    pool: [8, 11, 13, 23, 24],
    links: { west: "verdant", north: "frostmere", east: "emberfall" },
    landmark: "The Resonance Spire",
    prop: 8,
    pos: [50, 48],
  },
  {
    id: "emberfall",
    name: "Emberfall",
    kind: "Wild zone",
    subtitle: "Wild hearts, warm earth",
    description:
      "Black stone and golden grass surround the sleeping volcano. Watch for tiny sparks in the brush.",
    color: "#c68765",
    level: [9, 15],
    pool: [1, 7, 16, 22],
    links: { south: "sunwake", west: "crystal", east: "saffron" },
    landmark: "The Cinder Gate",
    prop: 9,
    pos: [83, 43],
  },
  {
    id: "frostmere",
    name: "Frostmere",
    kind: "Town",
    subtitle: "A village under the aurora",
    description:
      "Snow settles on blue rooftops. The warm healing lodge is a welcome stop before Starfall.",
    color: "#a1c7d1",
    level: [10, 17],
    pool: [8, 11, 23],
    links: { south: "crystal", west: "starfall", east: "tempest" },
    landmark: "The Frozen Mirror",
    prop: 11,
    pos: [78, 20],
  },
  {
    id: "starfall",
    name: "Starfall Reach",
    kind: "Landmark",
    subtitle: "Closer to the impossible",
    description:
      "Floating motes of light rise from ancient ruins. Some say the first Nuvo awoke here.",
    color: "#a796cb",
    level: [12, 20],
    pool: [3, 12, 17, 24],
    links: { west: "hollow", east: "frostmere" },
    landmark: "The Observatory of Echoes",
    prop: 10,
    pos: [44, 13],
  },
];
// Five connected frontier regions; Dream Land has no normal entrance.
REGIONS.push(
  { id: "saffron", name: "Saffron Expanse", kind: "Wild zone", subtitle: "Where the dunes remember", description: "Amber dunes circle a colossal half-buried sun dial. The east road leads to a caravan haven.", color: "#d9af66", level: [16,23], pool: [7,13,16,22], links: { west: "emberfall", east: "threadhaven", north: "tempest" }, landmark: "The Hourglass Colossus", prop: 8, pos: [78,57], biome: "desert" },
  { id: "threadhaven", name: "Threadhaven", kind: "Town", subtitle: "Wear the story you want to tell", description: "Tailors and barbers gather beneath windmill sails. Its Champions Hall welcomes courageous crews.", color: "#d5a7b5", level: [18,24], pool: [4,10,20], links: { west: "saffron", north: "mirelight" }, landmark: "The Weaver’s Windmill", prop: 10, pos: [88,79], biome: "meadow" },
  { id: "mirelight", name: "Mirelight Fen", kind: "Wild zone", subtitle: "A thousand lanterns beneath the reeds", description: "Luminous lilies and ancient lanterns float over violet water. The causeway winds west toward the storm-carved cliffs.", color: "#8dada0", level: [21,29], pool: [5,6,9,15,19,21], links: { south: "threadhaven", west: "tempest" }, landmark: "The Lantern Leviathan", prop: 9, pos: [88,39], biome: "marsh" },
  { id: "tempest", name: "Tempest Shelf", kind: "Wild zone", subtitle: "Run where the thunder lands", description: "Wind-carved cliffs catch violet lightning. The Thunder Harp turns every storm into a song.", color: "#9b9bc4", level: [24,33], pool: [3,4,8,12,20,23], links: { west: "frostmere", south: "saffron", east: "mirelight", north: "crownspire" }, landmark: "The Thunder Harp", prop: 8, pos: [65,29], biome: "storm" },
  { id: "crownspire", name: "Crownspire", kind: "Town", subtitle: "The summit of possibility", description: "A marble town above the clouds, home to the final Champions League guardian. Its bells ring for every victorious keeper.", color: "#c7b8df", level: [28,38], pool: [12,17,23,24], links: { south: "tempest" }, landmark: "The Crown of Auralis", prop: 10, pos: [86,12], biome: "storm" },
  { id: "dreamland", name: "Dream Land", kind: "Landmark", subtitle: "Somewhere between a wish and waking", description: "Floating islands drift through a lavender sky. Seek Oneirune and Dreamweaver beyond the path; touch the Dreaming Gate to return to the Healing Lodge.", color: "#d0a5ec", level: [30,35], pool: [3,12,17], links: {}, landmark: "The Dreaming Gate", prop: 9, pos: [45,48], biome: "dream", hidden: true },
);
// Spread map labels across the expanded archipelago.
const mapPositions: Record<string,[number,number]> = { mossbell:[13,77],verdant:[13,53],hollow:[12,29],tideglass:[38,87],sunwake:[59,78],crystal:[39,57],emberfall:[58,57],frostmere:[45,29],starfall:[29,13] };
for (const r of REGIONS) if (mapPositions[r.id]) r.pos = mapPositions[r.id];
export const REGION_BY_ID = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
) as Record<string, Region>;
