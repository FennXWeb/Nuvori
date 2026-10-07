import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_SPECIES,
  SPECIES,
  SPECIES_BY_ID,
  MOVES,
  MOVE_BY_ID,
  REGIONS,
  REGION_BY_ID,
  createNuvo,
  evolve,
  maxHp,
  learnedMoves,
  gainXp,
  effectiveness,
} from "../src/data";
import {
  newSave,
  validateSave,
  battleTurn,
  useMove,
  healParty,
  catchChance,
  type Battle,
} from "../src/game";
import { canWalk, getMap, findPath } from "../src/World";
const fresh = () =>
  newSave(
    { name: "Test Keeper", palette: 0, pronouns: "They / them" },
    "spriglet",
  );
const fight = (id = "bubbfin", level = 4): Battle => ({
  wild: createNuvo(id, level, false),
  active: 0,
  log: [],
  turn: 0,
  reward: 0,
});
test("all original families and expanded forms have unique names and valid move tables", () => {
  assert.equal(BASE_SPECIES.length, 25);
  assert.equal(SPECIES.length, 311);
  assert.equal(new Set(SPECIES.map((s) => s.name)).size, 311);
  assert.equal(MOVES.length, 100);
  assert.equal(new Set(MOVES.map((m) => m.name)).size, 100);
  assert.equal(new Set(MOVES.map((m) => m.animation)).size, 100);
  for (const s of SPECIES) {
    assert.ok(s.types.length >= 1 && s.types.length <= 2);
    assert.ok(s.startMoves.length);
    assert.ok(s.learnset.length);
    assert.ok(s.teachable.length);
    for (const id of [
      ...s.startMoves,
      ...s.learnset.map((x) => x.move),
      ...s.teachable,
    ])
      assert.ok(MOVE_BY_ID[id], `${s.name} references ${id}`);
  }
});
test("all 25 base species can be caught in a wild area", () => {
  const obtainable = new Set(
    REGIONS.filter((r) => r.kind !== "Town").flatMap((r) => r.pool),
  );
  assert.equal(obtainable.size, 25);
});
test("world graph is connected and spawn/exit paths are walkable", () => {
  const seen = new Set<string>(),
    queue = ["mossbell"];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(
      ...Object.values(REGION_BY_ID[id].links).filter((x): x is string => !!x),
    );
  }
  assert.equal(seen.size, REGIONS.filter(r=>!r.hidden).length);
  for (const r of REGIONS) {
    const props = getMap(r);
    assert.ok(canWalk(560, 496, r, props), r.id);
    for (const dir of Object.keys(r.links)) {
      const x = dir === "east" ? 1080 : dir === "west" ? 72 : 576,
        y = dir === "north" ? 72 : dir === "south" ? 760 : 416;
      assert.ok(canWalk(x, y, r, props), `${r.id} ${dir} entry`);
    }
  }
});
test("tap-to-walk finds traversable paths around landmarks to every exit", () => {
  for (const r of REGIONS) {
    for (const direction of Object.keys(r.links)) {
      const x = direction === "east" ? 1104 : direction === "west" ? 48 : 576,
        y = direction === "north" ? 48 : direction === "south" ? 784 : 416;
      const path = findPath(560, 496, x, y, r);
      assert.ok(path.length, `${r.id} ${direction}`);
      for (const [px, py] of path) assert.ok(canWalk(px, py, r));
    }
  }
});
test("save validation rejects corrupt or unknown content without discarding valid saves", () => {
  const s = fresh();
  assert.ok(validateSave(s));
  assert.equal(validateSave({ ...s, party: [] }), false);
  assert.equal(validateSave({ ...s, x: NaN }), false);
  assert.equal(
    validateSave({ ...s, party: [{ ...s.party[0], speciesId: "missing" }] }),
    false,
  );
  assert.equal(validateSave({ ...s, coins: -1 }), false);
  assert.equal(
    validateSave({ ...s, party: [{ ...s.party[0], level: Infinity }] }),
    false,
  );
});
test("evolution gates and preserves identity, variant and health deficit", () => {
  const n = createNuvo("spriglet", 12, true);
  n.hp -= 15;
  const e = evolve(n, "spriglet-1");
  assert.equal(e.uid, n.uid);
  assert.equal(e.prismatic, true);
  assert.equal(maxHp(e) - e.hp, 15);
  assert.throws(() => evolve(n, "spriglet-6"));
  assert.throws(() => evolve(createNuvo("spriglet", 11), "spriglet-1"));
  e.level = 26;
  assert.equal(evolve(e, "spriglet-3").speciesId, "spriglet-3");
});
test("battle honors PP, effectiveness, guard and damage", () => {
  const p = createNuvo("spriglet", 7, false),
    wild = createNuvo("bubbfin", 7, false);
  const move = p.moves.find((x) => MOVE_BY_ID[x].power > 0)!;
  const first = useMove(p, wild, move, () => 0.1);
  assert.equal(first.attacker.pp[move], p.pp[move] - 1);
  assert.ok(first.defender.hp < wild.hp);
  assert.ok(effectiveness("Bloom", ["Tide"]) > 1);
  const guarded = useMove(p, { ...wild, guard: true }, move, () => 0.1);
  assert.ok(guarded.defender.hp > first.defender.hp);
  assert.equal(guarded.defender.guard, false);
});
test("healing, draining and status moves have actual gameplay effects", () => {
  let n = createNuvo("cindlet", 32, false);
  n.moves = ["flame-8", "flame-5", "flame-2"];
  n.pp = { "flame-8": 10, "flame-5": 15, "flame-2": 20 };
  n.hp = 5;
  const foe = createNuvo("spriglet", 30, false);
  assert.ok(useMove(n, foe, "flame-8", () => 0).attacker.hp > 5);
  assert.ok(useMove(n, foe, "flame-5", () => 0).attacker.hp > 5);
  assert.equal(useMove(n, foe, "flame-2", () => 0).defender.status, "burn");
});
test("capture consumes an orb and keeps a rare variant in a full-team reserve", () => {
  const s = fresh();
  s.party = Array.from({ length: 6 }, () => createNuvo("spriglet", 5, false));
  const b = fight();
  b.wild.prismatic = true;
  const result = battleTurn(s, b, { type: "catch" }, () => 0);
  assert.equal(result.battle.over, "caught");
  assert.equal(result.save.orbs, s.orbs - 1);
  assert.equal(result.save.party.length, 6);
  assert.equal(result.save.box.length, 1);
  assert.ok(result.save.box[0].prismatic);
  assert.ok(result.save.caught.includes("bubbfin"));
  assert.equal(b.wild.hp, maxHp(b.wild));
  assert.ok(catchChance({ ...b.wild, hp: 1 }) > catchChance(b.wild));
});
test("invalid actions do not spend items or turns", () => {
  const s = fresh(),
    b = fight();
  const r = battleTurn(s, b, { type: "move", id: "bogus" });
  assert.ok(r.error);
  assert.deepEqual(r.save, s);
  assert.equal(r.battle.turn, 0);
  assert.ok(battleTurn({ ...s, orbs: 0 }, b, { type: "catch" }).error);
  assert.ok(battleTurn(s, b, { type: "potion" }).error);
});
test("victory awards XP/coins and knockout offers a last stand or lodge rescue", () => {
  const s = fresh(),
    b = fight();
  b.wild.hp = 1;
  const res = battleTurn(
    s,
    b,
    { type: "move", id: s.party[0].moves[0] },
    () => 0,
  );
  assert.equal(res.battle.over, "won");
  assert.ok(res.save.coins > s.coins);
  assert.ok(res.save.party[0].xp > 0 || res.save.party[0].level > 5);
  const weak = fresh();
  weak.region = "emberfall";
  weak.party[0].hp = 1;
  const loss = battleTurn(
    weak,
    fight("cindlet", 40),
    { type: "move", id: weak.party[0].moves[0] },
    () => 0,
  );
  assert.equal(loss.battle.lastStand, "choice");
  assert.equal(loss.battle.over, undefined);
  const rescued=battleTurn(loss.save,loss.battle,{type:"retreat"});
  assert.equal(rescued.save.region, "mossbell");
  assert.equal(rescued.save.interior, "lodge");
  assert.equal(rescued.save.party[0].hp, maxHp(rescued.save.party[0]));
  assert.ok(validateSave(rescued.save));
});
test("healing restores health, PP and status without mutating original save", () => {
  const s = fresh();
  s.party[0].hp = 1;
  s.party[0].status = "burn";
  s.party[0].pp[s.party[0].moves[0]] = 0;
  const healed = healParty(s);
  assert.equal(healed.party[0].hp, maxHp(s.party[0]));
  assert.equal(healed.party[0].status, undefined);
  assert.ok(healed.party[0].pp[healed.party[0].moves[0]] > 0);
  assert.equal(s.party[0].hp, 1);
});
test("leveling preserves equipped moves and makes skipped moves available to the tutor", () => {
  const n = createNuvo("spriglet", 5, false);
  const result = gainXp(n, 4000).nuvo;
  assert.ok(result.level > 12);
  assert.ok(result.moves.length <= 4);
  assert.ok(
    learnedMoves(SPECIES_BY_ID[result.speciesId], result.level).length > 4,
  );
  assert.ok(validateSave({ ...fresh(), party: [result] }));
});
