import {
  BASE_SPECIES,
  MOVE_BY_ID,
  SPECIES_BY_ID,
  REGION_BY_ID,
  createNuvo,
  maxHp,
  effectiveness,
  gainXp,
  type Nuvo,
  type Move,
} from "./data";
export interface Player {
  name: string;
  palette: number;
  pronouns: string;
}
export interface Save {
  version: 1;
  player: Player;
  party: Nuvo[];
  box: Nuvo[];
  region: string;
  x: number;
  y: number;
  orbs: number;
  potions: number;
  coins: number;
  seen: string[];
  caught: string[];
  visited: string[];
  landmarks: string[];
  claimed?: string[];
  steps: number;
  battles: number;
  started: string;
  updated: string;
  interior?: "lodge" | "shop";
  outside?: { x: number; y: number };
  evolutionNotices?: string[];
  dailySpinDay?: string;
  dailySpinPrize?: number;
}
export function newSave(player: Player, starter: string): Save {
  return {
    version: 1,
    player,
    party: [createNuvo(starter, 5, false)],
    box: [],
    region: "mossbell",
    x: 17.5 * 32,
    y: 15.5 * 32,
    orbs: 12,
    potions: 5,
    coins: 300,
    seen: [starter],
    caught: [starter],
    visited: ["mossbell"],
    landmarks: [],
    steps: 0,
    battles: 0,
    started: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
}
const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
export function validateSave(value: unknown): value is Save {
  if (!value || typeof value !== "object") return false;
  const s = value as Save;
  const validNuvo = (n: Nuvo) =>
    n &&
    typeof n.uid === "string" &&
    Boolean(SPECIES_BY_ID[n.speciesId]) &&
    finite(n.level) &&
    n.level >= 1 &&
    n.level <= 50 &&
    finite(n.xp) &&
    n.xp >= 0 &&
    finite(n.hp) &&
    n.hp >= 0 &&
    n.hp <= maxHp(n) &&
    typeof n.prismatic === "boolean" &&
    Array.isArray(n.moves) &&
    n.moves.length >= 1 &&
    n.moves.length <= 4 &&
    new Set(n.moves).size === n.moves.length &&
    n.moves.every(
      (m) =>
        !!MOVE_BY_ID[m] &&
        finite(n.pp?.[m]) &&
        n.pp[m] >= 0 &&
        n.pp[m] <= MOVE_BY_ID[m].pp,
    );
  return (
    s.version === 1 &&
    typeof s.player?.name === "string" &&
    s.player.name.length > 0 &&
    s.player.name.length <= 18 &&
    finite(s.player.palette) &&
    s.player.palette >= 0 &&
    s.player.palette < 4 &&
    Boolean(REGION_BY_ID[s.region]) &&
    (s.interior === undefined || ((s.interior === "lodge" || s.interior === "shop") && REGION_BY_ID[s.region].kind === "Town")) &&
    (s.outside === undefined || (finite(s.outside.x) && finite(s.outside.y) && s.outside.x >= 24 && s.outside.x <= 1128 && s.outside.y >= 24 && s.outside.y <= 808)) &&
    (s.evolutionNotices === undefined || (Array.isArray(s.evolutionNotices) && s.evolutionNotices.length <= 2000 && s.evolutionNotices.every(v => typeof v === "string"))) &&
    (s.dailySpinDay === undefined || /^\d{4}-\d{2}-\d{2}$/.test(s.dailySpinDay)) &&
    (s.dailySpinPrize === undefined || (Number.isInteger(s.dailySpinPrize) && s.dailySpinPrize >= 0 && s.dailySpinPrize < 8)) &&
    finite(s.x) &&
    s.x >= 32 &&
    s.x <= 1120 &&
    finite(s.y) &&
    s.y >= 32 &&
    s.y <= 800 &&
    Array.isArray(s.party) &&
    s.party.length > 0 &&
    s.party.length <= 6 &&
    s.party.every(validNuvo) &&
    Array.isArray(s.box) &&
    s.box.length <= 500 &&
    s.box.every(validNuvo) &&
    ["coins", "potions", "orbs", "steps", "battles"].every(
      (k) => finite(s[k as keyof Save]) && Number(s[k as keyof Save]) >= 0,
    ) &&
    ["seen", "caught", "visited", "landmarks"].every(
      (k) =>
        Array.isArray(s[k as keyof Save]) &&
        (s[k as keyof Save] as unknown[]).every((v) => typeof v === "string"),
    )
  );
}
export function readSave(key = "guest"): Save | null {
  try {
    const s = JSON.parse(localStorage.getItem(`nuvori-save:${key}`) || "null");
    return validateSave(s) ? s : null;
  } catch {
    return null;
  }
}
export function writeSave(s: Save, key = "guest") {
  localStorage.setItem(
    `nuvori-save:${key}`,
    JSON.stringify({ ...s, updated: new Date().toISOString() }),
  );
}
export function healParty(save: Save): Save {
  return {
    ...save,
    party: save.party.map((n) => ({
      ...n,
      hp: maxHp(n),
      status: undefined,
      guard: false,
      boost: false,
      pp: Object.fromEntries(n.moves.map((m) => [m, MOVE_BY_ID[m].pp])),
    })),
  };
}
export interface Battle {
  wild: Nuvo;
  active: number;
  log: string[];
  turn: number;
  over?: "won" | "caught" | "lost" | "fled";
  reward: number;
  animation?: { move: string; side: "player" | "wild"; key: number };
}
export function encounter(save: Save): Battle {
  const r = REGION_BY_ID[save.region];
  const index = r.pool[Math.floor(Math.random() * r.pool.length)];
  const level =
    r.level[0] + Math.floor(Math.random() * (r.level[1] - r.level[0] + 1));
  const wild = createNuvo(BASE_SPECIES[index].id, level);
  return {
    wild,
    active: Math.max(
      0,
      save.party.findIndex((n) => n.hp > 0),
    ),
    log: [
      `${wild.prismatic ? "A rare Prismatic" : "A wild"} ${SPECIES_BY_ID[wild.speciesId].name} appeared!`,
    ],
    turn: 0,
    reward: 0,
  };
}
export function damageFor(
  attacker: Nuvo,
  defender: Nuvo,
  move: Move,
  random = Math.random,
): number {
  if (!move.power) return 0;
  const a = SPECIES_BY_ID[attacker.speciesId],
    d = SPECIES_BY_ID[defender.speciesId];
  const stab = a.types.includes(move.type) ? 1.25 : 1;
  return Math.max(
    1,
    Math.floor(
      ((((2 * attacker.level) / 5 + 2) *
        move.power *
        (a.stats.attack + attacker.level * 2)) /
        (d.stats.defense + defender.level * 2) /
        12 +
        2) *
        stab *
        effectiveness(move.type, d.types) *
        (defender.guard ? 0.4 : 1) *
        (attacker.boost ? 1.25 : 1) *
        (0.9 + random() * 0.1),
    ),
  );
}
export function useMove(
  attacker: Nuvo,
  defender: Nuvo,
  moveId: string,
  random = Math.random,
): { attacker: Nuvo; defender: Nuvo; log: string[] } {
  const a = structuredClone(attacker),
    d = structuredClone(defender),
    m = MOVE_BY_ID[moveId];
  const an = SPECIES_BY_ID[a.speciesId].name,
    dn = SPECIES_BY_ID[d.speciesId].name;
  if (!m || !a.moves.includes(moveId) || !(a.pp[moveId] > 0))
    return { attacker: a, defender: d, log: ["That move has no energy left."] };
  a.pp[moveId]--;
  const log = [`${an} used ${m.name}!`];
  if (random() * 100 > m.accuracy)
    return { attacker: a, defender: d, log: [...log, "It missed!"] };
  if (m.effect === "heal") {
    const recovery = Math.min(maxHp(a) - a.hp, Math.ceil(maxHp(a) * 0.4));
    a.hp += recovery;
    log.push(`Recovered ${recovery} HP.`);
  } else if (m.effect === "guard") {
    a.guard = true;
    log.push(`${an} braced for a hit.`);
  } else {
    const damage = damageFor(a, d, m, random);
    d.hp = Math.max(0, d.hp - damage);
    d.guard = false;
    log.push(
      `${dn} took ${damage} damage.${effectiveness(m.type, SPECIES_BY_ID[d.speciesId].types) > 1 ? " Super effective!" : ""}`,
    );
    if (m.effect === "drain")
      a.hp = Math.min(maxHp(a), a.hp + Math.ceil(damage / 2));
    if (m.effect === "boost") a.boost = true;
    if (
      (m.effect === "burn" || m.effect === "slow" || m.effect === "poison") &&
      random() < 0.4 &&
      !d.status &&
      d.hp > 0
    ) {
      d.status = m.effect;
      log.push(`${dn} is affected by ${m.effect}!`);
    }
  }
  return { attacker: a, defender: d, log };
}
export function catchChance(n: Nuvo) {
  return Math.min(
    0.93,
    0.24 + (1 - n.hp / maxHp(n)) * 0.58 + (n.status ? 0.1 : 0),
  );
}
export type BattleAction =
  | { type: "move"; id: string }
  | { type: "catch" }
  | { type: "potion" }
  | { type: "run" }
  | { type: "switch"; index: number };
export function battleTurn(
  save: Save,
  battle: Battle,
  action: BattleAction,
  random = Math.random,
): { save: Save; battle: Battle; error?: string } {
  let s = structuredClone(save),
    b = structuredClone(battle);
  if (b.over) return { save, battle };
  let p = s.party[b.active];
  const logs: string[] = [];
  let wildActs = true;
  let playerActs = false;
  let playerMove = "";
  const fail = (error: string) => ({ save, battle, error });
  if (action.type === "move") {
    if (
      !p.moves.includes(action.id) ||
      !MOVE_BY_ID[action.id] ||
      p.pp[action.id] <= 0
    )
      return fail(
        "This move is out of energy. Switch Nuvo or return to a healing lodge.",
      );
    playerActs = true;
    playerMove = action.id;
  }
  if (action.type === "catch") {
    if (s.orbs < 1)
      return fail("You need a binding orb. Buy more at a town shop.");
    s.orbs--;
    logs.push("You tossed a binding orb…");
    if (random() < catchChance(b.wild)) {
      b.over = "caught";
      wildActs = false;
      const caught = { ...b.wild, guard: false, boost: false };
      if (s.party.length < 6) s.party.push(caught);
      else s.box.push(caught);
      s.caught = [
        ...new Set([...s.caught, SPECIES_BY_ID[caught.speciesId].base]),
      ];
      logs.push(
        `${SPECIES_BY_ID[caught.speciesId].name} joined ${s.party.length > 5 && s.box.some((n) => n.uid === caught.uid) ? "your reserve" : "your team"}!`,
      );
    } else logs.push("It broke free!");
  }
  if (action.type === "potion") {
    if (s.potions < 1) return fail("No healing tonics left.");
    if (p.hp === maxHp(p)) return fail("Your Nuvo is already at full health.");
    s.potions--;
    p.hp = Math.min(maxHp(p), p.hp + 50);
    p.status = undefined;
    logs.push(`${SPECIES_BY_ID[p.speciesId].name} recovered 50 HP.`);
  }
  if (action.type === "run") {
    if (random() < 0.82 || p.level >= b.wild.level) {
      b.over = "fled";
      wildActs = false;
      logs.push("You slipped back into the wilds.");
    } else logs.push("Couldn’t get away!");
  }
  if (action.type === "switch") {
    if (
      !s.party[action.index] ||
      s.party[action.index].hp <= 0 ||
      action.index === b.active
    )
      return fail("Choose another healthy Nuvo.");
    b.active = action.index;
    p = s.party[b.active];
    logs.push(`Go, ${SPECIES_BY_ID[p.speciesId].name}!`);
  }
  const wildOptions = b.wild.moves.filter((m) => b.wild.pp[m] > 0);
  const wildMove = wildOptions[Math.floor(random() * wildOptions.length)];
  const speed = (n: Nuvo) =>
    SPECIES_BY_ID[n.speciesId].stats.speed * (n.status === "slow" ? 0.5 : 1) +
    n.level;
  const wildFirst =
    playerActs &&
    wildMove &&
    (MOVE_BY_ID[wildMove].priority > MOVE_BY_ID[playerMove].priority ||
      (MOVE_BY_ID[wildMove].priority === MOVE_BY_ID[playerMove].priority &&
        speed(b.wild) > speed(p)));
  const attackPlayer = () => {
    if (!wildActs || p.hp <= 0 || b.wild.hp <= 0) return;
    if (wildMove) {
      const res = useMove(b.wild, p, wildMove, random);
      b.wild = res.attacker;
      p = res.defender;
      logs.push(...res.log);
    } else {
      p.hp = Math.max(0, p.hp - 5);
      b.wild.hp = Math.max(0, b.wild.hp - 2);
      logs.push("The wild Nuvo struggled!");
    }
  };
  if (wildFirst) attackPlayer();
  if (playerActs && p.hp > 0 && b.wild.hp > 0) {
    const res = useMove(p, b.wild, playerMove, random);
    p = res.attacker;
    b.wild = res.defender;
    logs.push(...res.log);
    b.animation = { move: playerMove, side: "player", key: b.turn + 1 };
  }
  if (!wildFirst) attackPlayer();
  if (!b.over) {
    for (const n of [p, b.wild]) {
      if (n.hp > 0 && (n.status === "burn" || n.status === "poison")) {
        const hurt = Math.max(1, Math.floor(maxHp(n) / 12));
        n.hp = Math.max(0, n.hp - hurt);
        logs.push(
          `${SPECIES_BY_ID[n.speciesId].name} lost ${hurt} HP to ${n.status}.`,
        );
      }
    }
  }
  s.party[b.active] = p;
  if (!b.over && b.wild.hp <= 0) {
    b.over = "won";
    const reward = 45 + b.wild.level * 12;
    b.reward = reward;
    const res = gainXp(p, reward);
    s.party[b.active] = res.nuvo;
    s.coins += 20 + b.wild.level * 5;
    s.battles++;
    logs.push(
      `Victory! +${reward} XP · +${20 + b.wild.level * 5} coins${res.levels ? ` · Level ${res.nuvo.level}!` : ""}`,
    );
  }
  if (!b.over && p.hp <= 0) {
    const next = s.party.findIndex((n) => n.hp > 0);
    if (next < 0) {
      b.over = "lost";
      logs.push("Your team needs a rest. You return safely to Mossbell.");
      s = healParty({ ...s, region: "mossbell", x: 560, y: 496 });
    } else {
      b.active = next;
      logs.push(`Go, ${SPECIES_BY_ID[s.party[next].speciesId].name}!`);
    }
  }
  s.seen = [...new Set([...s.seen, SPECIES_BY_ID[b.wild.speciesId].base])];
  b.turn++;
  b.log = [...b.log, ...logs].slice(-40);
  return { save: s, battle: b };
}
