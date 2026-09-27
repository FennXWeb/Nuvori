import { writeFileSync, mkdirSync } from "node:fs";
import { BASE_SPECIES, SPECIES, MOVES, REGIONS } from "../src/data";
mkdirSync("public/data", { recursive: true });
writeFileSync(
  "public/data/nuvori-catalog.json",
  JSON.stringify(
    {
      families: BASE_SPECIES.length,
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
  `Exported ${BASE_SPECIES.length} families, ${SPECIES.length} forms, ${MOVES.length} moves and ${REGIONS.length} regions.`,
);
