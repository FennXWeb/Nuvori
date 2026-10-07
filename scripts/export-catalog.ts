import { writeFileSync, mkdirSync } from "node:fs";
import { ALL_FAMILIES, SPECIES, MOVES, REGIONS } from "../src/data";
mkdirSync("public/data", { recursive: true });
writeFileSync(
  "public/data/nuvori-catalog.json",
  JSON.stringify(
    {
      families: ALL_FAMILIES.length,
      forms: SPECIES.length,
      rarity: { name: "Prismatic", wildOdds: "1/512" },
      species: SPECIES,
      moves: MOVES,
      regions: REGIONS,
    },
    null,
    2,
  ),
);
console.log(
  `Exported ${ALL_FAMILIES.length} families, ${SPECIES.length} forms, ${MOVES.length} moves and ${REGIONS.length} regions.`,
);
