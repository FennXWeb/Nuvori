# Nursery and evolution update

Every companion is male or female. Newly created Nuvo have equal odds; legacy companions receive a stable sex derived from their existing identity when the save is loaded. Evolving preserves sex, identity and Prismatic status. Existing species IDs and owned companions remain valid.

Visit Clover at the Nuvo Nursery in any of the five towns. Choose one male and one female of the same base family, from your crew or reserves. Different evolution branches can pair. Parents stay at the nursery, so at least one healthy crew member must accompany you. One visit can run at a time. Collect both parents and one level-1 base-form child when ready, or cancel to retrieve only the parents. Parents retain their level, moves, health and identity. Offspring independently roll sex and the usual 1/512 Prismatic chance.

Breeding time, rounded up to the next second:

`rarity minutes × 60 × (1 + (male level + female level − 2) / 100) × (1 + (male stage + female stage) / 2)`

Stages are zero-based in this formula. Base rarity times are Common 5 minutes, Uncommon 15, Rare 45 and Mythical 120. Higher levels and more evolved parents take longer. The UI shows the calculation before a visit starts.

Guest visits persist with the local adventure and use the device clock. Signed-in visits use a PostgreSQL transaction and the server clock, and follow the account across devices. A completed visit cannot be claimed twice; stale saves cannot erase an active visit or a collection receipt. Parents and the pending offspring reserve inventory capacity. Account ownership, early collection, cancellation, stale writes and duplicate claims are covered by database tests.

## Evolution families

The game contains 28 families and 312 forms. Spriglet, Cindlet, Bubbfin, Wisplet and Voltik each have five stages: 1 → 2 → 2 → 4 → 8 forms per stage. Evolve at levels 12, 22, 34 and 44; choose between two branches at the first, third and fourth evolution. Other ordinary families use different tree shapes, with three to five stages, unequal branch lengths, or three choices at a later stage. Oneirune does not evolve. The Nuvopedia lets players browse every path and its move tables.

Dreamweaver has four stages including the base: 1 → 4 → 16 → 64, for 85 forms. Its three evolution thresholds are 16, 30 and 44, each with four choices. Every chosen thread contributes to its battle stats, and the newest thread determines its secondary element.

Dreamweaver appears only in Dream Land. Each adventure can capture exactly one wild male and one wild female over its lifetime. The ledger survives evolution, nursery visits and cloud saving. After one sex is caught, future Dreamweaver encounters use the remaining eligible sex; after both are caught, no more appear. Offspring may still be bred, including between different Dreamweaver branches, and are always level-1 base Dreamweaver. Nursery descendants do not consume or reset the wild-capture allowance.

## Artwork and compatibility

Eleven new sprite atlases contain 135 new forms and one nursery egg illustration. All 312 forms use verified alpha bounds and the same aspect-preserving crops in portraits and followers. Source art and prompts are committed in `public/assets` and `docs/nursery-art-prompts.json`.

The two October migrations update the authoritative League catalog and add the nursery RPC, save guards and interior chat channel. Apply them before publishing the client. The save format remains version 1 with optional nursery and capture-ledger fields, so existing adventures migrate without a reset. Ordinary inventory remains client-controlled; this is a cooperative game rather than an anti-cheat economy.
