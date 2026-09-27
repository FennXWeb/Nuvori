import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { OnlineWorld, validRemote, type RemoteKeeper } from "../src/online";

const keeper = (id = "local"): RemoteKeeper => ({
  id, name: "Keeper", region: "mossbell", x: 100, y: 100,
  palette: 0, direction: 0, moving: false, speciesId: "spriglet",
  prismatic: false, seenAt: 1,
});

function fixture() {
  const listeners = new Map<string, (message?: any) => void>();
  let status: (value: string) => void = () => {};
  let state: Record<string, RemoteKeeper[]> = {};
  const tracks: RemoteKeeper[] = [];
  const messages: any[] = [];
  const channel = {
    on(type: string, options: { event: string }, cb: (message?: any) => void) {
      listeners.set(`${type}:${options.event}`, cb);
      return this;
    },
    subscribe(cb: typeof status) { status = cb; return this; },
    presenceState() { return state; },
    async track(value: RemoteKeeper) { tracks.push(value); return "ok"; },
    async send(value: unknown) { messages.push(value); return "ok"; },
  };
  let created = 0;
  const client = {
    auth: { async getSession() { return { data: { session: { access_token: "test-session" } }, error: null }; } },
    realtime: { async setAuth() {} },
    channel(_topic: string, config: any) {
      assert.equal(config.config.private, true);
      created++;
      return channel;
    },
    async removeChannel() { status("CLOSED"); },
  };
  const world = new OnlineWorld(client as unknown as SupabaseClient);
  let players: RemoteKeeper[] = [];
  const statuses: string[] = [];
  return {
    world, client, channel, tracks, messages, statuses,
    async join() {
      await world.join({ id: "local" } as User, value => { players = value; }, value => statuses.push(value));
      status("SUBSCRIBED");
    },
    status: (value: string) => status(value),
    sync(value: typeof state) { state = value; listeners.get("presence:sync")?.(); },
    receive(payload: unknown) { listeners.get("broadcast:keeper")?.({ payload }); },
    players: () => players,
    created: () => created,
  };
}

test("rapid movement broadcasts without exceeding the presence budget", async () => {
  const f = fixture();
  await f.join();
  for (let i = 0; i < 100; i++) await f.world.update({ ...keeper(), x: i });
  assert.equal(f.tracks.length, 1);
  assert.equal(f.messages.length, 100);
  assert.ok(f.messages.every(m => m.type === "broadcast" && m.event === "keeper"));
  assert.equal(f.messages.at(-1).payload.x, 99);
  f.world.close();
});

test("idle players send a bounded heartbeat and refresh position for new arrivals", async t => {
  t.mock.timers.enable({ apis: ["Date"] });
  const f = fixture();
  await f.join();
  await f.world.update(keeper());
  for (let i = 0; i < 10; i++) {
    t.mock.timers.tick(450);
    await f.world.update({ ...keeper(), seenAt: Date.now() });
  }
  assert.equal(f.messages.length, 1);
  t.mock.timers.tick(501);
  await f.world.update(keeper());
  assert.equal(f.messages.length, 2);
  f.sync({ remote: [keeper("remote")] });
  await f.world.update(keeper());
  assert.equal(f.messages.length, 3);
  assert.equal(f.tracks.length, 1);
  f.world.close();
});

test("movement stays current through membership sync and departed players disappear", async () => {
  const f = fixture();
  await f.join();
  f.sync({ local: [keeper()], remote: [keeper("remote")] });
  assert.equal(f.players().length, 1);
  f.receive({ ...keeper("remote"), x: 200 });
  f.sync({ remote: [keeper("remote")], newcomer: [keeper("newcomer")] });
  assert.equal(f.players().find(p => p.id === "remote")?.x, 200);
  f.receive({ ...keeper("stranger"), x: 300 });
  f.receive({ ...keeper("remote"), x: Infinity });
  assert.equal(f.players().length, 2);
  assert.equal(f.players().find(p => p.id === "remote")?.x, 200);
  f.sync({ newcomer: [keeper("newcomer")] });
  assert.deepEqual(f.players().map(p => p.id), ["newcomer"]);
  f.world.close();
  assert.deepEqual(f.players(), []);
  f.receive(keeper("newcomer"));
  assert.deepEqual(f.players(), []);
});

test("close cancels a pending join before it opens a channel", async () => {
  const f = fixture();
  let resolve!: (value: any) => void;
  f.client.auth.getSession = () => new Promise(done => { resolve = done; });
  const pending = f.world.join({ id: "local" } as User, () => {}, () => {});
  f.world.close();
  resolve({ data: { session: { access_token: "test-session" } }, error: null });
  await pending;
  assert.equal(f.created(), 0);
  assert.equal(f.world.connected, false);
});

test("failed presence registration is throttled instead of retried with each movement", async t => {
  t.mock.timers.enable({ apis: ["Date"] });
  const f = fixture();
  f.channel.track = async value => { f.tracks.push(value); return "timed out"; };
  await f.join();
  for (let i = 0; i < 60; i++) {
    await f.world.update({ ...keeper(), x: i });
    t.mock.timers.tick(450);
  }
  assert.equal(f.tracks.length, 1);
  assert.equal(f.messages.length, 0);
  t.mock.timers.tick(3000);
  await f.world.update(keeper());
  assert.equal(f.tracks.length, 2);
  f.world.close();
});

test("server closure reconnects, but intentional close cancels reconnect", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  await f.join();
  f.status("CLOSED");
  assert.equal(f.world.connected, false);
  t.mock.timers.tick(30000);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(f.created(), 2);
  f.status("CLOSED");
  f.world.close();
  t.mock.timers.tick(30000);
  await Promise.resolve();
  assert.equal(f.created(), 2);
});

test("remote players require valid IDs and timestamps", () => {
  assert.ok(validRemote(keeper()));
  assert.equal(validRemote({ ...keeper(), id: "" }), false);
  assert.equal(validRemote({ ...keeper(), seenAt: NaN }), false);
});
