import test from "node:test";
import assert from "node:assert/strict";
import { newSave, validateSave } from "../src/game";
import { REGIONS, REGION_BY_ID, createNuvo, evolve } from "../src/data";
import { canWalk, findPath, getMap } from "../src/World";
import { applyDailyPrize, cellKey, caughtBefore, edgeMarker, enterInterior, evolutionKey, leaveInterior, readyToEvolve, utcDay, WHEEL_PRIZES } from "../src/adventure";

const fresh = () => newSave({ name: "Test", palette: 0, pronouns: "They / them" }, "spriglet");
test("old saves remain valid; interiors preserve the exact outdoor return point", () => {
  assert.ok(validateSave(fresh()));
  for (const r of REGIONS.filter(r => r.kind === "Town")) for (const room of ["lodge", "shop", "tailor", "barber", "nursery"] as const) {
    const outside = { ...fresh(), region: r.id };
    const inside = enterInterior(outside, room, 290, 331);
    assert.equal(inside.interior, room);
    assert.ok(validateSave(inside));
    const returned = leaveInterior(inside);
    assert.equal(returned.x, 290); assert.equal(returned.y, 331);
    assert.equal(returned.interior, undefined); assert.equal(returned.outside, undefined);
    assert.ok(validateSave(returned));
  }
  assert.equal(enterInterior({ ...fresh(), region: "verdant" }, "lodge", 50, 50).interior, undefined);
});
test("both interiors have walkable paths to their service counter and exit, with solid walls and furniture", () => {
  for (const room of ["lodge", "shop", "tailor", "barber", "nursery"] as const) {
    const r = REGION_BY_ID.mossbell, props = getMap(r, room);
    assert.ok(findPath(576,608,576,368,r,room).length);
    assert.ok(findPath(576,368,576,656,r,room).length);
    assert.equal(canWalk(260,400,r,props,room),false);
    assert.equal(canWalk(900,400,r,props,room),false);
    assert.equal(canWalk(576,160,r,props,room),false);
    assert.equal(canWalk(576,730,r,props,room),false);
    assert.equal(canWalk(576,300,r,props,room),false);
    assert.equal(canWalk(352,470,r,props,room),false);
  }
});
test("local cells separate towns, wild areas, and each building", () => {
  assert.equal(new Set([cellKey("mossbell"),cellKey("verdant"),cellKey("mossbell","shop"),cellKey("mossbell","lodge"),cellKey("sunwake","shop")]).size,5);
});
test("caught indicators recognize the family and don't label uncaught Nuvo", () => {
  assert.equal(caughtBefore(fresh(), "spriglet"),true);
  assert.equal(caughtBefore(fresh(), "spriglet-1"),true);
  assert.equal(caughtBefore(fresh(), "bubbfin"),false);
  assert.equal(caughtBefore(null,"spriglet"),false);
});
test("each evolution threshold yields a new notice key while final forms stop prompting", () => {
  const n = createNuvo("spriglet", 11, false);
  assert.equal(readyToEvolve(n), false);
  n.level=12; assert.equal(readyToEvolve(n),true);
  const next=evolve(n,"spriglet-1");
  assert.notEqual(evolutionKey(n),evolutionKey(next));
  assert.equal(readyToEvolve(next),false);
  next.level=26; assert.equal(readyToEvolve(next),true);
  const third=evolve(next,"spriglet-3");
  third.level=34;assert.equal(readyToEvolve(third),true);
  const fourth=evolve(third,"spriglet-4");fourth.level=44;
  const final=evolve(fourth,"spriglet-9");
  assert.equal(readyToEvolve(final),false);
});
test("every wheel prize awards the advertised items, persists, and refuses duplicate or older days", () => {
  WHEEL_PRIZES.forEach((prize,i) => {
    const s=fresh(), result=applyDailyPrize(s,i,"2026-09-27");
    assert.equal(result.coins-s.coins,prize.coins);
    assert.equal(result.orbs-s.orbs,prize.orbs);
    assert.equal(result.potions-s.potions,prize.potions);
    assert.equal(result.dailySpinPrize,i); assert.ok(validateSave(result));
    assert.throws(() => applyDailyPrize(result,i,"2026-09-27"));
    assert.throws(() => applyDailyPrize(result,i,"2026-09-26"));
    assert.ok(applyDailyPrize(result,i,"2026-09-28"));
  });
  assert.throws(() => applyDailyPrize(fresh(),8,"2026-09-27"));
  assert.equal(utcDay(new Date("2026-09-27T23:59:59Z")),"2026-09-27");
  assert.equal(utcDay(new Date("2026-09-28T00:00:00Z")),"2026-09-28");
});
test("friend arrows clamp to screen edges and preserve direction", () => {
  assert.equal(edgeMarker(200,200,800,600),null);
  for (const [x,y] of [[-500,300],[1200,300],[400,-500],[400,1200],[-100,-100]]) {
    const p=edgeMarker(x,y,800,600)!;
    assert.ok(p.x>=48&&p.x<=752&&p.y>=48&&p.y<=552);
    assert.ok(Math.abs(p.angle-Math.atan2(y-300,x-400))<.0001);
  }
});
