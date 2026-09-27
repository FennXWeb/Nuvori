import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
} from "react";
import {
  Compass,
  BookOpen,
  Map,
  Backpack,
  Users,
  Settings,
  ChevronRight,
  ArrowRight,
  Sun,
  Leaf,
  Sparkles,
  Check,
  Footprints,
  Heart,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  LogOut,
  Cloud,
  CloudOff,
  Flag,
  Coins,
  GitBranch,
  NotebookPen,
  Shield,
  RotateCcw,
  ArrowUpRight,
  Hand,
  Download,
  ChevronLeft,
  LoaderCircle,
  Gift,
  Crown,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  BASE_SPECIES,
  DREAM_SPECIES,
  SPECIES_BY_ID,
  STARTERS,
  MOVES,
  MOVE_BY_ID,
  REGIONS,
  REGION_BY_ID,
  TYPES,
  TYPE_COLORS,
  TYPE_SYMBOLS,
  maxHp,
  xpToNext,
  evolve,
  learnedMoves,
  type Nuvo,
  type Species,
  type Element,
} from "./data";
import {
  newSave,
  readSave,
  writeSave,
  healParty,
  encounter,
  battleTurn,
  type Save,
  type Battle,
  type BattleAction,
} from "./game";
import { World, type Interaction } from "./World";
import {
  NuvoArt,
  PlayerArt,
  TypeBadge,
  Health,
  Modal,
  MoveAnimation,
  SoundButton,
  sound,
} from "./components";
import {
  supabase,
  backendConfigured,
  signIn,
  fetchCloudSave,
  saveCloud,
  OnlineWorld,
  type RemoteKeeper,
} from "./online";
import { caughtBefore, cellKey, interiorName, enterInterior, leaveInterior, readyToEvolve, evolutionKey, applyDailyPrize, utcDay } from "./adventure";
import { useSocial, claimWheel } from "./social";
import { FriendsPanel, ChatDock } from "./Community";
import { EvolutionReady, DailyWheel } from "./Celebrations";
import "./community.css";
import { CrewStrip, SpecialtyOrbs, StyleShop, UpdateNotice } from "./ExpansionUI";
import { useLeague, LeaguePanel } from "./League";
import { TRAINERS, trainerBattle, ORBS, orbCount, restoreAtLodge, type OrbKind } from "./expansion";
import "./expansion.css";
import { gameAudio } from "./audio";
import { footstepSound, soundscape } from "./audioCues";
import { AudioSettings, readAudioMix } from "./AudioSettings";
type Panel =
  | "guide"
  | "map"
  | "team"
  | "bag"
  | "journal"
  | "online"
  | "settings"
  | "shop"
  | "friends"
  | "wheel"
  | "tailor"
  | "barber"
  | "league"
  | null;
const objectives = [
  {
    id: "welcome",
    title: "A world beyond the village",
    text: "Explore Verdant Wilds",
    done: (s: Save) => s.visited.includes("verdant"),
    reward: 100,
  },
  {
    id: "friends",
    title: "Room for one more",
    text: "Befriend 3 different Nuvo",
    done: (s: Save) => s.caught.length >= 3,
    reward: 180,
  },
  {
    id: "path",
    title: "Choose a new possibility",
    text: "Evolve a Nuvo for the first time",
    done: (s: Save) =>
      [...s.party, ...s.box].some((n) => SPECIES_BY_ID[n.speciesId].stage > 0),
    reward: 250,
  },
  {
    id: "explorer",
    title: "Where the stars fell",
    text: "Discover Starfall Reach",
    done: (s: Save) => s.visited.includes("starfall"),
    reward: 300,
  },
  {
    id: "keeper",
    title: "A friend in every corner",
    text: "Befriend all 25 Nuvo families",
    done: (s: Save) => BASE_SPECIES.every(n=>s.caught.includes(n.id)),
    reward: 1200,
  },
];
export default function App() {
  const [save, setSave] = useState<Save | null>(() => readSave()),
    [panel, setPanel] = useState<Panel>(null),
    [battle, setBattle] = useState<Battle | null>(null),
    [toast, setToast] = useState(""),
    [nearby, setNearby] = useState(""),
    [assetsReady, setAssetsReady] = useState(false),
    [audio, setAudio] = useState(
      () => localStorage.getItem("nuvori-audio") === "true",
    ),
    [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!supabase),
    [otherTab, setOtherTab] = useState(false),
    [onlineStatus, setOnlineStatus] = useState("Solo adventure"),
    [remote, setRemote] = useState<RemoteKeeper[]>([]),
    [saveStatus, setSaveStatus] = useState("Saved on this device"),
    [dialog, setDialog] = useState<{ title: string; text: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false);
  const [evolutionNotice, setEvolutionNotice] = useState<Nuvo | null>(null);
  const league = useLeague(user?.id,authReady);
  const [audioMix, setAudioMix] = useState(readAudioMix);
  const enableAudio = (enabled: boolean) => {
    gameAudio.configure(enabled, audioMix);
    if (enabled) void gameAudio.unlock();
    setAudio(enabled);
  };
  useEffect(() => {
    gameAudio.configure(audio, audioMix);
    localStorage.setItem("nuvori-audio", String(audio));
    localStorage.setItem("nuvori-audio-mix", JSON.stringify(audioMix));
  }, [audio, audioMix]);
  useEffect(() => {
    const unlock = () => { void gameAudio.unlock(); };
    const visibility = () => gameAudio.setPaused(otherTab || document.visibilityState !== "visible");
    visibility();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); document.removeEventListener("visibilitychange", visibility); };
  }, [otherTab]);
  const raidPhase = league.raid?.members.find(m => m.user_id === user?.id)?.phase;
  const battleMusic = league.raid?.status === "active" ? (raidPhase === "keeper" ? "keeper" : "league") : battle && !battle.over ? (battle.lastStand === "fighting" ? "keeper" : battle.trainerId ? "trainer" : "wild") : undefined;
  useEffect(() => {
    const scene = soundscape(save?.region, save?.interior, battleMusic);
    gameAudio.setScene(scene.music, scene.ambience);
  }, [save?.region, save?.interior, battleMusic]);
  const [updateOpen,setUpdateOpen] = useState(false);
  const [trainerOffer,setTrainerOffer] = useState<string|null>(null);
  const { social, error: socialError, refresh: refreshSocial } = useSocial(user?.id, authReady ? save?.player.name : undefined, save?.player.palette);
  const friendIds = social.friends.filter(f => f.status === "accepted").map(f => f.profile.user_id);
  const blockedIds = social.blocked.map(p => p.user_id);
  const [creationName, setCreationName] = useState(""),
    [palette, setPalette] = useState(0),
    [pronouns, setPronouns] = useState("They / them"),
    [starter, setStarter] = useState("spriglet"),
    [creationStep, setCreationStep] = useState(0);
  const keys = useRef(new Set<string>()),
    position = useRef({ x: 560, y: 496, dir: 0, moving: false }),
    state = useRef(save),
    userRef = useRef(user),
    world = useRef<OnlineWorld | null>(null),
    cloudReady = useRef(false),
    lastCloud = useRef(""),
    activeAuth = useRef<string | undefined>(undefined),
    pausedByOtherTab = useRef(false),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    battleLock = useRef(false),
    dailyBusy = useRef(false),
    leagueBusy = useRef(false),
    pendingCloud = useRef<Promise<void> | null>(null),
    emoteUntil = useRef(0);
  state.current = save;
  userRef.current = user;
  leagueBusy.current = Boolean(league.raid);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }, []);
  const closePanel = useCallback(() => { gameAudio.play("ui-back"); setPanel(null); }, []);
  useEffect(()=>{if(league.raid){keys.current.clear();setPanel("league");}},[league.raid?.id]);
  // A newer tab owns this device save. Older tabs stop writing until reloaded.
  useEffect(() => {
    const changedElsewhere = (event: StorageEvent) => {
      if (event.key !== `nuvori-save:${userRef.current?.id || "guest"}` || !event.newValue) return;
      pausedByOtherTab.current = true;
      keys.current.clear();
      world.current?.close();
      setEvolutionNotice(null);
      setPanel(null);
      setDialog(null);
      setBattle(null);
      setOtherTab(true);
    };
    window.addEventListener("storage", changedElsewhere);
    return () => window.removeEventListener("storage", changedElsewhere);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let stopped = false;
    let revision = 0;
    const activate = async (next: User | null) => {
      if (activeAuth.current === (next?.id || "guest")) return;
      activeAuth.current = next?.id || "guest";
      const turn = ++revision;
      cloudReady.current = false;
      lastCloud.current = "";
      setAuthReady(false);
      world.current?.close();
      setRemote([]);
      setUser(next);
      setEvolutionNotice(null);
      if (!next) {
        setSave(readSave());
        setOnlineStatus("Solo adventure");
        setSaveStatus("Saved on this device");
        setAuthReady(true);
        return;
      }
      setSave(readSave(next.id));
      try {
        const cloud = await fetchCloudSave(next);
        if (stopped || turn !== revision) return;
        const local = readSave(next.id);
        const localIsNewer = local && (!cloud || Date.parse(local.updated) > Date.parse(cloud.updated));
        setSave(localIsNewer ? local : cloud || local);
        cloudReady.current = true;
        setSaveStatus(localIsNewer ? "Newer device save loaded" : cloud ? "Cloud save loaded" : "Ready to save to cloud");
        const connection = new OnlineWorld();
        world.current = connection;
        await connection.join(next, setRemote, setOnlineStatus);
      } catch (e) {
        if (!stopped) {
          notify(`Cloud unavailable: ${(e as Error).message}`);
          setSaveStatus("Local save only · cloud unavailable");
          setOnlineStatus("Connection unavailable");
        }
      } finally {
        if (!stopped && turn === revision) setAuthReady(true);
      }
    };
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) notify(error.message);
        if (!stopped) void activate(data.session?.user || null);
      })
      .catch(() => {
        setAuthReady(true);
        notify("Could not restore your account. Device play is available.");
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (!stopped) void activate(session?.user || null);
      });
    });
    return () => {
      stopped = true;
      subscription.unsubscribe();
      world.current?.close();
    };
  }, [notify]);
  useEffect(() => {
    if (!save || !authReady || pausedByOtherTab.current) return;
    try {
      writeSave(save, user?.id || "guest");
      if (!user) setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Storage full · export your save");
    }
  }, [save, authReady, user]);
  useEffect(() => {
    const timer = setInterval(() => {
      const s = state.current,
        u = userRef.current;
      if (!s || pausedByOtherTab.current) return;
      const merged = { ...s, x: position.current.x, y: position.current.y };
      try {
        writeSave(merged, u?.id || "guest");
      } catch {
        /* Status is set by the primary save effect. */
      }
      if (u && cloudReady.current && !dailyBusy.current && !leagueBusy.current) {
        const hash = JSON.stringify(merged);
        if (hash !== lastCloud.current) {
          pendingCloud.current = saveCloud(u, merged)
            .then(() => {
              lastCloud.current = hash;
              setSaveStatus("Saved to cloud");
            })
            .catch(() => setSaveStatus("Cloud sync failed · saved on device"));
        }
      }
    }, 12000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const s = state.current,
        u = userRef.current;
      if (s && u && !pausedByOtherTab.current) {
        const p = position.current;
        void world.current?.update({
          id: u.id,
          name: s.player.name,
          region: s.region,
          interior: s.interior,
          x: p.x,
          y: p.y,
          direction: p.dir,
          moving: p.moving,
          palette: s.player.palette,
          outfit: s.player.outfit,
          hair: s.player.hair,
          hairColor: s.player.hairColor,
          speciesId: s.party[0].speciesId,
          prismatic: s.party[0].prismatic,
          emote: Date.now() < emoteUntil.current ? "Hello! 👋" : undefined,
          seenAt: Date.now(),
        });
      }
    }, 450);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!save || !authReady || otherTab || battle || panel || dialog || evolutionNotice || trainerOffer || league.raid || updateOpen) return;
    const next = [...save.party, ...save.box].find(n => readyToEvolve(n) && !save.evolutionNotices?.includes(evolutionKey(n)));
    if (next) { keys.current.clear(); setEvolutionNotice(next); gameAudio.play("evolution-ready"); }
  }, [save, authReady, otherTab, battle, panel, dialog, evolutionNotice, audio,trainerOffer,league.raid,updateOpen]);
  const dismissEvolution = useCallback(() => {
    if (!evolutionNotice) return;
    const key = evolutionKey(evolutionNotice);
    setSave(s => s ? { ...s, evolutionNotices: [...new Set([...(s.evolutionNotices || []), key])] } : s);
    setEvolutionNotice(null);
  }, [evolutionNotice]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (pausedByOtherTab.current) return;
      if (leagueBusy.current || updateOpen) return;
      if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      const key = e.key.toLowerCase();
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
      )
        e.preventDefault();
      keys.current.add(key);
      if (e.repeat) return;
      if (!battle && save) {
        if (key === "m") setPanel((p) => (p === "map" ? null : "map"));
        if (key === "b") setPanel((p) => (p === "bag" ? null : "bag"));
        if (key === "j") setPanel((p) => (p === "journal" ? null : "journal"));
        if (key === "escape") {
          setPanel(null);
          setDialog(null);
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [battle, save,updateOpen]);
  useEffect(() => {
    if (panel || battle || dialog || !save) keys.current.clear();
  }, [panel, battle, dialog, save === null]);
  const begin = () => {
    const name = creationName.trim();
    if (!name) {
      notify("Give your keeper a name first.");
      return;
    }
    const s = newSave({ name, palette, pronouns }, starter);
    position.current = { x: s.x, y: s.y, dir: 0, moving: false };
    setSave(s);
    sound("catch", audio);
    gameAudio.cry(starter, .4);
    notify(`${SPECIES_BY_ID[starter].name} is ready. Your adventure begins!`);
  };
  const onMove = useCallback(
    (x: number, y: number, dir: number, moving: boolean, steps: number) => {
      if (pausedByOtherTab.current) return;
      position.current = { x, y, dir, moving };
      if (moving && state.current) gameAudio.play(footstepSound(state.current.region, state.current.interior), { gain: .22 });
      if (steps)
        setSave((s) => (s ? { ...s, x, y, steps: s.steps + steps } : s));
    },
    [],
  );
  const onTravel = useCallback((region: string, x: number, y: number) => {
    gameAudio.play("travel");
    position.current = { x, y, dir: 0, moving: false };
    setSave((s) =>
      s
        ? { ...s, interior: undefined, outside: undefined, region, x, y, visited: [...new Set([...s.visited, region])] }
        : s,
    );
    setNearby("");
  }, []);
  const onEncounter = useCallback(() => {
    if (battleLock.current) return;
    const s = state.current;
    if (!s || s.party.every((n) => n.hp <= 0)) return;
    battleLock.current = true;
    const b = encounter(s);
    setBattle(b);
    setSave((v) =>
      v
        ? {
            ...v,
            seen: [
              ...new Set([...v.seen, SPECIES_BY_ID[b.wild.speciesId].base]),
            ],
          }
        : v,
    );
    sound("battle", audio);
    gameAudio.cry(b.wild.speciesId, .4);
    if (b.wild.prismatic) gameAudio.play("prismatic", { delay: .6 });
  }, [audio]);
  const onInteract = useCallback(
    (kind: Interaction) => {
      const s = state.current;
      if (!s) return;
      if (kind === "heal" || kind === "shop" || kind === "tailor" || kind === "barber" || kind === "exit") {
        gameAudio.play("door");
        const next = kind === "exit" ? leaveInterior(s) : enterInterior(s, kind === "heal" ? "lodge" : kind, position.current.x, position.current.y);
        position.current = { x: next.x, y: next.y, dir: 0, moving: false };
        keys.current.clear(); setNearby(""); setSave(next);
      }
      if (kind === "nurse") {
        setSave({...healParty(s),lastLodge:s.region});
        sound("heal", audio);
        notify("Your whole team is rested. HP, energy, and status restored.");
      }
      if (kind === "merchant") setPanel("shop");
      if (kind === "clothier") setPanel("tailor");
      if (kind === "stylist") setPanel("barber");
      if (kind === "league") setPanel("league");
      if (kind.startsWith("trainer:")) setTrainerOffer(kind.slice(8));
      if (kind === "professor")
        setDialog({
          title: "Ranger Elowen",
          text: "“Every Nuvo holds more than one possibility. At levels 12 and 26, you choose what they become. Head north to Verdant Wilds, walk through the grass, and meet your first wild friend. Weaken it in battle, then toss a binding orb. And remember: your first teammate will always follow you.”",
        });
      if (kind === "sign")
        setDialog({
          title: REGION_BY_ID[s.region].name,
          text:
            REGION_BY_ID[s.region].description +
            " Use the signed paths at the edges of the area to travel. Wild Nuvo appear as you walk off the paths.",
        });
      if (kind === "landmark") {
        gameAudio.play("discovery");
        if(s.region==="dreamland") {const next=restoreAtLodge(s);position.current={x:next.x,y:next.y,dir:0,moving:false};setSave(next);notify("You wake beneath the warm lights of the Healing Lodge. Your dream companions are still with you.");return;}
        const r = REGION_BY_ID[s.region],
          first = !s.landmarks.includes(s.region);
        setSave({
          ...s,
          landmarks: [...new Set([...s.landmarks, s.region])],
          coins: s.coins + (first ? 100 : 0),
        });
        setDialog({
          title: r.landmark,
          text: `${r.description} ${first ? "You recorded this discovery in your journal. +100 coins." : "You pause for a moment and take it all in."}`,
        });
      }
    },
    [audio, notify],
  );
  const takeTurn = (action: BattleAction) => {
    if (!save || !battle || busy || pausedByOtherTab.current) return;
    const result = battleTurn(save, battle, action);
    if (result.error) {
      gameAudio.play("ui-error");
      notify(result.error);
      return;
    }
    setBusy(true);
    if(result.save.region!==save.region||result.save.interior!==save.interior)position.current={x:result.save.x,y:result.save.y,dir:0,moving:false};
    setSave(result.save);
    setBattle(result.battle);
    if (action.type === "move") gameAudio.move(action.id);
    if (action.type === "catch") {
      gameAudio.play("capture-throw");
      gameAudio.play("capture-shake", { delay: .25 });
      gameAudio.play(result.battle.over === "caught" ? "capture-success" : "capture-break", { delay: .65 });
    }
    if (action.type === "potion") gameAudio.play("heal");
    if (action.type === "switch") gameAudio.cry(result.save.party[result.battle.active].speciesId);
    if (action.type === "strike" || action.type === "struggle") gameAudio.play("keeper-strike");
    if (action.type === "brace") gameAudio.play("guard");
    if (result.save.party.some((n,i) => n.hp <= 0 && save.party[i]?.hp > 0)) gameAudio.play("faint", { delay: .35 });
    if (result.save.party.some((n,i) => n.level > (save.party[i]?.level ?? n.level))) gameAudio.play("level-up", { delay: .6 });
    if (result.battle.over === "won" || result.battle.over === "lost") gameAudio.play(result.battle.over === "won" ? "victory" : "defeat", { delay: .3 });
    if (result.battle.dreamAwakening) gameAudio.play("prismatic", { delay: .8 });
    setTimeout(() => setBusy(false), 1000);
  };
  const finishBattle = () => {
    if (busy) return;
    setBattle(null);
    battleLock.current = false;
  };
  const login = async (provider: "google" | "discord") => {
    if (pausedByOtherTab.current) return;
    try {
      if (save)
        writeSave(
          { ...save, x: position.current.x, y: position.current.y },
          user?.id || "guest",
        );
      await signIn(provider);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  const active = save?.party[0],
    region = REGION_BY_ID[save?.region || "mossbell"];
  const currentObjective = save
    ? objectives.find((o) => !save.claimed?.includes(o.id))
    : objectives[0];
  const open = (p: Panel) => {
    if(league.raid&&p!=="league"){notify("Finish or leave your Champions room first.");setPanel("league");return;}
    if (battle) {
      notify("Finish the encounter first.");
      return;
    }
    setPanel(p);
    sound("click", audio);
  };
  const saveNow = async () => {
    if (!save || pausedByOtherTab.current || dailyBusy.current || leagueBusy.current) return;
    const s = { ...save, x: position.current.x, y: position.current.y };
    try {
      writeSave(s, user?.id || "guest");
      if (user && cloudReady.current) {
        await saveCloud(user, s);
        setSaveStatus("Saved to cloud");
      }
      notify("Adventure saved.");
    } catch (e) {
      notify(`Could not save: ${(e as Error).message}`);
    }
  };
  const spinDaily = async () => {
    if (dailyBusy.current || pausedByOtherTab.current || !state.current) throw new Error("Please wait for your adventure to finish saving.");
    dailyBusy.current = true;
    try {
      let current = { ...state.current, x: position.current.x, y: position.current.y };
      const account = userRef.current;
      let prize: number, day: string;
      if (account) {
        if (!cloudReady.current) throw new Error("Reconnect your cloud save before spinning.");
        await pendingCloud.current;
        await saveCloud(account, current);
        const result = await claimWheel();
        if (account.id !== userRef.current?.id) throw new Error("Your account changed. The gift is saved to the original account.");
        current = result.save; prize = result.prize; day = result.day;
        lastCloud.current = JSON.stringify(current);
        setSaveStatus("Saved to cloud");
      } else {
        prize = Math.floor(Math.random()*8); day = utcDay();
        current = applyDailyPrize(current, prize, day);
      }
      writeSave(current, account?.id || "guest");
      state.current = current; setSave(current);
      return { prize, day };
    } finally { dailyBusy.current = false; }
  };
  const placeName = save?.interior ? interiorName(save.interior) : region.name;
  const flushForExpansion = async () => {
    if(pausedByOtherTab.current)throw new Error("Continue from your latest adventure tab first.");
    const current=state.current;if(!current)return;
    const merged={...current,x:position.current.x,y:position.current.y};
    writeSave(merged,userRef.current?.id||"guest");
    if(userRef.current){if(!cloudReady.current)throw new Error("Reconnect your cloud save before joining.");await pendingCloud.current;await saveCloud(userRef.current,merged);}
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPanel(null);
          }}
          aria-label="Nuvori home"
        >
          <img
            src={`${import.meta.env.BASE_URL}assets/nuvori-logo.png`}
            alt="Nuvori"
          />
        </a>
        <div className="sidebar-subtitle">THE AURALIS CHRONICLES</div>
        <nav aria-label="Game navigation">
          <span className="nav-label">YOUR ADVENTURE</span>
          {(
            [
              { id: null, label: "Explore", icon: Compass },
              { id: "team", label: "My team", icon: Heart },
              { id: "guide", label: "Nuvopedia", icon: BookOpen },
              { id: "map", label: "World map", icon: Map },
              { id: "bag", label: "Satchel", icon: Backpack },
              { id: "journal", label: "Field journal", icon: NotebookPen },
              { id: "friends", label: "Friends", icon: Users },
              { id: "wheel", label: "Daily wheel", icon: Gift },
              { id: "league", label: "Champions League", icon: Crown },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              disabled={!save}
              className={`nav-item ${panel === item.id ? "selected" : ""}`}
              onClick={() => open(item.id === "friends" && !user ? "online" : item.id)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "team" && save && <small>{save.party.length}</small>}
              {item.id === "friends" && social.friends.some(f => f.status === "pending" && f.incoming) && <small className="request-dot">!</small>}
              {item.id === "guide" && save && (
                <small>{save.caught.length}/26</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="online-invite">
            <div className="invite-icon">
              <Users size={22} />
            </div>
            <strong>Better, together.</strong>
            <p>Share the trail with other keepers.</p>
            <button onClick={() => open("online")}>
              {user ? "View online keepers" : "Connect your account"}
              <ArrowUpRight size={16} />
            </button>
          </div>
          <button className="keeper-profile" onClick={() => open("settings")}>
            <PlayerArt palette={save?.player.palette || 0} look={save?.player} size={44} />
            <span>
              <strong>{save?.player.name || "New keeper"}</strong>
              <small>{user ? "Online account" : "Guest adventurer"}</small>
            </span>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Auralis</span>
            <ChevronRight size={14} />
            <strong>{region.name}</strong>
            <span className="region-tag">{region.kind}</span>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Champions League" disabled={!save} onClick={()=>open("league")}><Crown size={20}/></button>
            <button className="icon-button top-gift" aria-label="Daily wheel" disabled={!save} onClick={() => open("wheel")}><Gift size={20}/></button>
            <button className="icon-button top-friends" aria-label="Friends" disabled={!save} onClick={() => open(user ? "friends" : "online")}><Users size={20}/></button>
            <span className="time-of-day">
              <Sun size={17} /> A little after sunrise
            </span>
            <SoundButton
              enabled={audio}
              toggle={() => {
                enableAudio(!audio);
              }}
            />
            <button className="online-pill" onClick={() => open("online")}>
              <span
                className={
                  user && onlineStatus === "Connected"
                    ? "status-light live"
                    : "status-light"
                }
              />
              {user && onlineStatus === "Connected"
                ? `${remote.length + 1} online`
                : "Playing solo"}
            </button>
          </div>
        </header>
        <div className="adventure-layout">
          <section className="game-column">
            <div className="location-heading">
              <div>
                <div className="eyebrow">
                  <Leaf size={13} /> CHAPTER ONE · A NEW POSSIBILITY
                </div>
                <h1>
                  {placeName}
                  <span>✦</span>
                </h1>
                <p>{save?.interior ? `${region.name} · ${save.interior === "lodge" ? "Warm lights. Rested companions." : "Everything for the road ahead."}` : region.subtitle}</p>
              </div>
              <button
                className="map-button"
                aria-label="Open world map"
                onClick={() => open("map")}
              >
                <Map size={18} />
                <span>View map</span>
                <kbd>M</kbd>
              </button>
            </div>
            <div className="game-viewport">
              <World
                save={save}
                paused={
                  otherTab ||
                  !save ||
                  Boolean(panel) ||
                  Boolean(battle) ||
                  Boolean(dialog) ||
                  Boolean(evolutionNotice) ||
                  Boolean(trainerOffer) || Boolean(league.raid) || updateOpen ||
                  !authReady
                }
                remote={remote.filter(p => !blockedIds.includes(p.id))}
                friendIds={friendIds}
                onMove={onMove}
                onTravel={onTravel}
                onEncounter={onEncounter}
                onInteract={onInteract}
                onNearby={setNearby}
                keys={keys}
                onReady={() => setAssetsReady(true)}
              />
              <div className="location-chip">
                <span className="location-mark">
                  <Compass size={20} />
                </span>
                <span>
                  <strong>{placeName}</strong>
                  <small>
                    {save?.interior ? "Walk to the counter · E to interact" : region.kind === "Town"
                      ? "A place to rest and reconnect"
                      : `Wild Nuvo · Lv. ${region.level[0]}–${region.level[1]}`}
                  </small>
                </span>
              </div>
              {!save?.interior && <button
                className="mini-map"
                aria-label="Open Auralis map"
                onClick={() => open("map")}
              >
                <span className="mini-river" />
                <span className="mini-path horizontal" />
                <span className="mini-path vertical" />
                <span className="mini-tree t1" />
                <span className="mini-tree t2" />
                <span className="mini-house" />
                <i
                  style={{
                    left: `${(position.current.x / 1152) * 100}%`,
                    top: `${(position.current.y / 832) * 100}%`,
                  }}
                />
                <span className="mini-label">N</span>
              </button>}
              {save?.interior && <button className="room-exit" onClick={() => onInteract("exit")}><LogOut size={15}/> Return outside</button>}
              {nearby && save && !panel && !battle && (
                <button
                  className="interact-prompt"
                  onClick={() => {
                    keys.current.add("e");
                    setTimeout(() => keys.current.delete("e"), 150);
                  }}
                >
                  {nearby}
                  <ChevronRight size={16} />
                </button>
              )}
              {!assetsReady && (
                <div className="loading-world">
                  <LoaderCircle className="spin" />
                  Packing your adventure…
                </div>
              )}
              <div className="canvas-caption">
                <span>
                  <span className="soft-dot" /> Auralis ·{" "}
                  {region.kind === "Town"
                    ? "Safe haven"
                    : "Wild encounter area"}
                </span>
                {save && (
                  <span>
                    {save.player.name} &{" "}
                    {SPECIES_BY_ID[save.party[0].speciesId].name}
                  </span>
                )}
              </div>
              <div
                className="touch-controls"
                aria-label="Touch movement controls"
              >
                {[
                  ["w", ArrowUp, "Move up"],
                  ["a", ArrowLeft, "Move left"],
                  ["s", ArrowDown, "Move down"],
                  ["d", ArrowRight, "Move right"],
                ].map(([key, Icon, label]) => {
                  const I = Icon as typeof ArrowUp;
                  return (
                    <button
                      key={key as string}
                      className={`touch-${key}`}
                      aria-label={label as string}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        keys.current.add(key as string);
                      }}
                      onPointerUp={() => keys.current.delete(key as string)}
                      onPointerCancel={() => keys.current.delete(key as string)}
                    >
                      <I size={20} />
                    </button>
                  );
                })}
                <button
                  className="touch-sprint"
                  aria-label="Sprint"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    keys.current.add("shift");
                  }}
                  onPointerUp={() => keys.current.delete("shift")}
                  onPointerCancel={() => keys.current.delete("shift")}
                >
                  <Footprints size={21} />
                </button>
              </div>
            </div>
            <div className="game-toolbar">
              <div>
                <span>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> Move
                </span>
                <span>
                  <kbd>SHIFT</kbd> Sprint
                </span>
                <span>
                  <kbd>E</kbd> Interact
                </span>
              </div>
              <button onClick={() => void saveNow()} disabled={!save}>
                <Check size={14} />
                {saveStatus}
              </button>
            </div>
            {save && <ChatDock userId={user?.id} cell={cellKey(save.region, save.interior)} cellName={placeName} blockedIds={blockedIds} ready={Boolean(social.profile)} onSignIn={() => open("online")} notify={notify} refresh={refreshSocial}/>}
            {save && <CrewStrip save={save} disabled={Boolean(battle)||Boolean(league.raid)||otherTab} onChange={next=>{setSave(next);gameAudio.play("ui-reorder");if(next.party[0].uid!==save.party[0].uid)gameAudio.cry(next.party[0].speciesId);}} onManage={()=>open("team")}/>}

          </section>
          <aside className="adventure-aside">
            <div className="chapter-card">
              <span className="eyebrow">
                <Flag size={13} /> YOUR NEXT CHAPTER
              </span>
              <div className="chapter-illustration">
                <span className="orbit o1" />
                <span className="orbit o2" />
                <NuvoArt id={active?.speciesId || "spriglet"} size={130} />
                <span className="small-star">✦</span>
              </div>
              <h2>{currentObjective?.title || "Make your own path"}</h2>
              <p>
                {currentObjective?.text ||
                  "There is always another friend to find."}
              </p>
              <div className="quest-progress">
                <i
                  style={{
                    width: save && currentObjective?.done(save) ? "100%" : "8%",
                  }}
                />
              </div>
              <button onClick={() => open("journal")} disabled={!save}>
                Open field journal <ArrowRight size={16} />
              </button>
            </div>
            <div className="nearby-card">
              <div className="section-title">
                <h3>In this area</h3>
                <span>{region.pool.length} species{region.hidden ? " + a myth" : ""}</span>
              </div>
              <p>A few faces you might meet.</p>
              <div className="nearby-creatures">
                {region.pool.slice(0, 3).map((index) => {
                  const n = BASE_SPECIES[index];
                  return (
                    <button
                      key={n.id}
                      onClick={() => open("guide")}
                      aria-label={`Learn about ${n.name}`}
                    >
                      <NuvoArt id={n.id} size={67} />
                      <small>{n.name}</small>
                    </button>
                  );
                })}
              </div>
              <div className="area-type">
                <Leaf size={15} />
                {region.kind === "Town"
                  ? "Find wild Nuvo on the nearby trails"
                  : "Step off the trail to find wild Nuvo"}
              </div>
            </div>
            <div className="field-note">
              <span className="eyebrow">
                <GitBranch size={15} /> A KEEPER’S NOTE
              </span>
              <h3>Growth has more than one path.</h3>
              <p>
                Every Nuvo can become something different. When the time comes,
                the choice is yours.
              </p>
              <button onClick={() => open("guide")}>
                Explore evolutions <ArrowRight size={15} />
              </button>
            </div>
            <div className="aside-footer">
              <span>Made for a little wonder.</span>
              <a href="./privacy.html" target="_blank" rel="noreferrer">Privacy &amp; data</a>
              <span>NUVORI · EARLY ACCESS</span>
            </div>
          </aside>
        </div>
        <nav className="mobile-nav" aria-label="Mobile game navigation">
          {[
            [null, Compass, "Explore"],
            ["team", Heart, "Team"],
            ["guide", BookOpen, "Nuvo"],
            ["map", Map, "Map"],
            ["bag", Backpack, "Bag"],
            ["online", Users, "Online"],
          ].map(([id, Icon, label]) => {
            const I = Icon as typeof Compass;
            return (
              <button
                key={label as string}
                disabled={!save && id !== "online"}
                className={panel === id ? "selected" : ""}
                onClick={() => open(id as Panel)}
              >
                <I size={20} />
                <span>{label as string}</span>
              </button>
            );
          })}
        </nav>
      </main>
      {otherTab && <div className="save-conflict-backdrop"><div className="account-loading" role="alertdialog" aria-modal="true" aria-label="Adventure continued in another tab"><BookOpen size={32}/><h2>Your adventure moved to another tab.</h2><p>This tab is paused to keep your latest progress safe.</p><button className="primary-button" onClick={()=>window.location.reload()}>Continue here with the latest save</button></div></div>}
      {!authReady && (
        <div className="modal-backdrop">
          <div className="account-loading">
            <LoaderCircle className="spin" />
            <h2>Finding your adventure…</h2>
            <p>Checking your account and cloud save.</p>
          </div>
        </div>
      )}
      {authReady && !save && panel !== "online" && panel !== "settings" && (
        <div className="creation-backdrop">
          <div
            className="creation-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Create your keeper"
          >
            <div className="creation-top">
              <span className="eyebrow">A NEW CHAPTER IN AURALIS</span>
              <span className="step-label">{creationStep + 1} / 2</span>
            </div>
            {creationStep === 0 ? (
              <>
                <div className="creation-body">
                  <div className="creation-copy">
                    <span className="tiny-label">HELLO, FUTURE KEEPER.</span>
                    <h2>
                      Every adventure
                      <br />
                      begins with you<span>.</span>
                    </h2>
                    <p>
                      A name, a little curiosity, and a world of possibilities.
                      Let’s meet your keeper.
                    </p>
                    <label htmlFor="keeper-name">
                      What should we call you?
                    </label>
                    <input
                      id="keeper-name"
                      maxLength={18}
                      placeholder="Your keeper’s name"
                      value={creationName}
                      onChange={(e) => setCreationName(e.target.value)}
                      autoComplete="nickname"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && creationName.trim())
                          setCreationStep(1);
                      }}
                    />
                    <div className="creation-options">
                      <label>
                        Your colors
                        <div className="palette-options">
                          {["Fern", "Ember", "Lilac", "Sky"].map((c, i) => (
                            <button
                              key={c}
                              aria-label={`${c} outfit`}
                              aria-pressed={palette === i}
                              className={palette === i ? "active" : ""}
                              onClick={() => setPalette(i)}
                              style={{
                                background: [
                                  "#70bd95",
                                  "#e9ae6e",
                                  "#bc9dcc",
                                  "#79b8c9",
                                ][i],
                              }}
                            >
                              {palette === i && <Check size={17} />}
                            </button>
                          ))}
                        </div>
                      </label>
                      <label htmlFor="pronouns">
                        Pronouns
                        <select
                          id="pronouns"
                          value={pronouns}
                          onChange={(e) => setPronouns(e.target.value)}
                        >
                          <option>They / them</option>
                          <option>She / her</option>
                          <option>He / him</option>
                          <option>Just my name</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="keeper-preview">
                    <div className="preview-orbit" />
                    <div className="preview-star ps1">✦</div>
                    <div className="preview-star ps2">✧</div>
                    <PlayerArt palette={palette} size={270} />
                    <span className="preview-name">
                      {creationName.trim() || "Your story awaits"}
                    </span>
                    <small>KEEPER OF POSSIBILITIES</small>
                  </div>
                </div>
                <footer className="creation-footer">
                  <button
                    className="text-button"
                    onClick={() => setPanel("online")}
                  >
                    <Users size={16} />{" "}
                    {user
                      ? "Signed in · cloud saves enabled"
                      : "Have an account? Sign in"}
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      if (creationName.trim()) setCreationStep(1);
                      else notify("Give your keeper a name first.");
                    }}
                    disabled={!creationName.trim() || !assetsReady}
                  >
                    Meet your first Nuvo <ArrowRight size={18} />
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className="starter-heading">
                  <span className="tiny-label">FIVE LITTLE BEGINNINGS.</span>
                  <h2>Who will you grow with?</h2>
                  <p>
                    Choose your first companion. There’s no wrong path from
                    here.
                  </p>
                </div>
                <div className="starter-grid">
                  {STARTERS.map((n) => (
                    <button
                      key={n.id}
                      className={`starter-card ${starter === n.id ? "chosen" : ""}`}
                      aria-pressed={starter === n.id}
                      onClick={() => {
                        setStarter(n.id);
                        sound("click", audio);
                      }}
                      style={
                        {
                          "--starter": TYPE_COLORS[n.types[0]],
                        } as CSSProperties
                      }
                    >
                      <span className="starter-check">
                        {starter === n.id ? <Check size={13} /> : null}
                      </span>
                      <NuvoArt id={n.id} size={138} />
                      <h3>{n.name}</h3>
                      <TypeBadge type={n.types[0]} />
                      <p>{n.title}</p>
                    </button>
                  ))}
                </div>
                <div className="starter-description">
                  <Sparkles size={20} />
                  <p>
                    {SPECIES_BY_ID[starter].lore}
                    <br />
                    <span>
                      Two evolution choices at Lv. 12. Two more at Lv. 26.
                    </span>
                  </p>
                </div>
                <footer className="creation-footer">
                  <button
                    className="text-button"
                    onClick={() => setCreationStep(0)}
                  >
                    <ChevronLeft size={17} />
                    Your keeper
                  </button>
                  <button className="primary-button" onClick={begin}>
                    Begin with {SPECIES_BY_ID[starter].name}
                    <ArrowRight size={18} />
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
      <UpdateNotice safe={authReady&&!otherTab&&!battle&&!panel&&!dialog&&!evolutionNotice&&!trainerOffer&&!league.raid&&!busy} onApply={flushForExpansion} onBlocking={setUpdateOpen}/>
      {(panel === "tailor" || panel === "barber") && save && <StyleShop save={save} kind={panel} onChange={setSave} onClose={closePanel} notify={notify}/>}
      {panel === "league" && save && <LeaguePanel save={save} userId={user?.id} raid={league.raid} onRaid={league.setRaid} error={league.error} onBeforeJoin={flushForExpansion} onResult={result=>{position.current={x:result.x,y:result.y,dir:0,moving:false};state.current=result;writeSave(result,user?.id||"guest");setSave(result);lastCloud.current=JSON.stringify(result);if(result.region==="dreamland")notify("You awaken in Dream Land… Seek Oneirune beyond the path.");}} onClose={closePanel} notify={notify}/>}
      {trainerOffer && save && (()=>{const trainer=TRAINERS.find(t=>t.id===trainerOffer)!;return <Modal title={trainer.name} eyebrow="KEEPER CHALLENGE" onClose={()=>setTrainerOffer(null)}><div className="trainer-offer"><PlayerArt palette={trainer.level%4} size={125}/><div><h3>“{trainer.quote}”</h3><p>{trainer.species.length} Nuvo · Lv. {trainer.level}{save.defeatedTrainers?.includes(trainer.id)?" · Rematch":""}</p><p>Trainer Nuvo cannot be caught. Your whole crew shares experience.</p></div></div><div className="expansion-footer"><button className="secondary-button" onClick={()=>setTrainerOffer(null)}>Maybe later</button><button className="primary-button" disabled={save.party.every(n=>n.hp<=0)} onClick={()=>{battleLock.current=true;setBattle(trainerBattle(save,trainer));setTrainerOffer(null);sound("battle",audio);}}>Let’s battle <ArrowRight size={16}/></button></div></Modal>;})()}
      {panel === "guide" && <Guide onClose={closePanel} save={save} />}
      {panel === "friends" && user && <FriendsPanel social={social} error={socialError} remote={remote} refresh={refreshSocial} notify={notify} onClose={closePanel}/>}
      {panel === "wheel" && save && <DailyWheel save={save} account={Boolean(user)} onSpin={spinDaily} onClose={closePanel}/>}
      {panel === "map" && (
        <Modal
          title="The Auralis archipelago"
          eyebrow="EVERY PATH HOLDS A POSSIBILITY"
          onClose={closePanel}
          wide
        >
          <div className="world-map">
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {REGIONS.filter(r=>!r.hidden||save?.visited.includes(r.id)).flatMap((r) =>
                Object.values(r.links)
                  .filter((id) => id && r.id < id)
                  .map((id) => {
                    const next = REGION_BY_ID[id!];
                    return (
                      <line
                        key={`${r.id}-${id}`}
                        x1={r.pos[0]}
                        y1={r.pos[1]}
                        x2={next.pos[0]}
                        y2={next.pos[1]}
                        stroke="#c9bfa1"
                        strokeWidth=".45"
                        strokeDasharray="1.2 1"
                      />
                    );
                  }),
              )}
            </svg>
            <span className="map-ocean-label">THE LUMINOUS SEA</span>
            {REGIONS.filter(r=>!r.hidden||save?.visited.includes(r.id)).map((r) => (
              <button
                key={r.id}
                className={`map-node ${save?.region === r.id ? "current" : ""} ${save?.visited.includes(r.id) ? "visited" : ""}`}
                style={
                  {
                    left: `${r.pos[0]}%`,
                    top: `${r.pos[1]}%`,
                    "--region": r.color,
                  } as CSSProperties
                }
                onClick={() =>
                  setDialog({
                    title: r.name,
                    text: `${r.description} ${save?.visited.includes(r.id) ? "You have discovered this place." : "Follow the connecting trails to discover this place."} Wild Nuvo: levels ${r.level[0]}–${r.level[1]}.`,
                  })
                }
              >
                <span>
                  {r.kind === "Town" ? (
                    <Flag size={18} />
                  ) : r.kind === "Landmark" ? (
                    <Sparkles size={18} />
                  ) : (
                    <Leaf size={18} />
                  )}
                </span>
                <strong>{r.name}</strong>
                <small>{save?.region === r.id ? "You are here" : r.kind}</small>
              </button>
            ))}
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-dot" /> {save?.visited.filter(id=>!REGION_BY_ID[id]?.hidden).length || 0} / 14
              places discovered
            </span>
            <span>Walk along signed trails to reach the next area.</span>
          </div>
        </Modal>
      )}
      {panel === "team" && save && (
        <Team
          save={save}
          setSave={setSave}
          notify={notify}
          onClose={closePanel}
        />
      )}
      {(panel === "bag" || panel === "shop") && save && (
        <Modal
          title={panel === "shop" ? "The little supply shop" : "Your satchel"}
          eyebrow={
            panel === "shop"
              ? "GOOD THINGS FOR THE ROAD"
              : "PACKED FOR POSSIBILITY"
          }
          onClose={closePanel}
        >
          <div className="wallet">
            <Coins size={20} />
            <strong>{save.coins}</strong>
            <span>keeper coins</span>
          </div>
          {[
            {
              id: "orbs",
              name: "Binding orb",
              desc: "Befriend a wild Nuvo. Weaken it first for a better chance.",
              cost: 35,
              icon: "◈",
              qty: save.orbs,
            },
            {
              id: "potions",
              name: "Healing tonic",
              desc: "Restore 50 HP and clear a status condition.",
              cost: 25,
              icon: "✚",
              qty: save.potions,
            },
          ].map((item) => (
            <div className="item-row" key={item.id}>
              <span className={`item-icon ${item.id}`}>{item.icon}</span>
              <div>
                <h3>
                  {item.name}
                  <small>×{item.qty}</small>
                </h3>
                <p>{item.desc}</p>
              </div>
              {panel === "shop" ? (
                <button
                  className="secondary-button"
                  disabled={save.coins < item.cost}
                  onClick={() => {
                    setSave({
                      ...save,
                      coins: save.coins - item.cost,
                      [item.id]: item.qty + 1,
                    });
                    notify(`${item.name} added to your satchel.`);
                    gameAudio.play("purchase");
                  }}
                >
                  Buy · {item.cost}
                </button>
              ) : item.id === "potions" ? (
                <button
                  className="secondary-button"
                  onClick={() => setPanel("team")}
                >
                  Use
                </button>
              ) : (
                <span className="muted">Use in battle</span>
              )}
            </div>
          ))}
          <SpecialtyOrbs save={save} shop={panel === "shop"} onChange={setSave}/>
          <div className="tip-box">
            <Backpack size={21} />
            <p>
              {panel === "shop"
                ? "Earn coins by winning battles, discovering landmarks, and completing your field journal."
                : "Visit a town’s yellow-roof shop to restock. Blue-roof healing lodges restore your entire team for free."}
            </p>
          </div>
        </Modal>
      )}
      {panel === "journal" && save && (
        <Modal
          title="Your field journal"
          eyebrow="SMALL STEPS. GREAT STORIES."
          onClose={closePanel}
        >
          <div className="journal-stats">
            <span>
              <strong>{save.caught.length}</strong>Nuvo families
            </span>
            <span>
              <strong>{save.visited.length}</strong>Places explored
            </span>
            <span>
              <strong>{save.battles}</strong>Battles won
            </span>
          </div>
          <div className="objective-list">
            {objectives.map((o) => (
              <div
                className={`objective ${o.done(save) ? "done" : ""}`}
                key={o.id}
              >
                <span className="objective-check">
                  {o.done(save) ? <Check size={18} /> : <Flag size={17} />}
                </span>
                <div>
                  <h3>{o.title}</h3>
                  <p>{o.text}</p>
                </div>
                <button
                  className="secondary-button"
                  disabled={!o.done(save) || save.claimed?.includes(o.id)}
                  onClick={() => {
                    setSave({
                      ...save,
                      claimed: [...(save.claimed || []), o.id],
                      coins: save.coins + o.reward,
                    });
                    notify(`Chapter complete! +${o.reward} coins.`);
                  }}
                >
                  {save.claimed?.includes(o.id) ? "Claimed" : `${o.reward} ◈`}
                </button>
              </div>
            ))}
          </div>
          <h3 className="section-heading">Landmark memories</h3>
          {save.landmarks.length ? (
            <div className="landmark-list">
              {save.landmarks.map((id) => (
                <span key={id}>
                  <Sparkles size={16} />
                  {REGION_BY_ID[id].landmark}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">
              Walk up to a landmark and press E to record your first discovery.
            </p>
          )}
        </Modal>
      )}
      {panel === "online" && (
        <Modal
          title={user ? "Keepers on the trail" : "A shared adventure awaits"}
          eyebrow="NUVORI TOGETHER"
          onClose={closePanel}
        >
          <div className="online-hero">
            <Users size={37} />
            <p>
              Explore the same world, meet other keepers, and keep your
              adventure saved across devices.
            </p>
          </div>
          {user ? (
            <>
              <div className="account-status">
                <span
                  className={
                    onlineStatus === "Connected"
                      ? "status-light live"
                      : "status-light"
                  }
                />
                <strong>{onlineStatus}</strong>
                <small>{saveStatus}</small>
              </div>
              <button className="secondary-button full-width" onClick={() => setPanel("friends")}><Users size={17}/> Friends & requests {social.friends.filter(f => f.status === "pending" && f.incoming).length || ""}</button>
              {remote.length ? (
                <div className="online-players">
                  {remote.filter(p => !blockedIds.includes(p.id)).map((p) => (
                    <div key={p.id}>
                      <PlayerArt palette={p.palette} size={54} />
                      <span>
                        <strong>{friendIds.includes(p.id) ? "★ " : ""}{p.name}</strong>
                        <small>
                          {REGION_BY_ID[p.region]?.name || "Exploring"}
                        </small>
                      </span>
                      <NuvoArt
                        id={
                          SPECIES_BY_ID[p.speciesId] ? p.speciesId : "spriglet"
                        }
                        size={52}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Leaf size={26} />
                  <h3>The trail is quiet for now.</h3>
                  <p>
                    Other signed-in keepers appear here and in your world when
                    they join.
                  </p>
                </div>
              )}
              <button
                className="primary-button full-width"
                disabled={onlineStatus !== "Connected" || !save}
                onClick={() => {
                  emoteUntil.current = Date.now() + 5000;
                  notify("You waved to nearby keepers.");
                  setPanel(null);
                }}
              >
                <Hand size={18} /> Wave hello
              </button>
              <button
                className="text-button centered"
                onClick={() =>
                  void supabase?.auth.signOut().then(({ error }) => {
                    if (error) notify(error.message);
                  })
                }
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="auth-buttons">
                <button
                  className="oauth-button"
                  disabled={!backendConfigured}
                  onClick={() => void login("google")}
                >
                  <span className="google-g">G</span>Continue with Google
                  <ArrowRight size={17} />
                </button>
                <button
                  className="oauth-button discord"
                  disabled={!backendConfigured}
                  onClick={() => void login("discord")}
                >
                  <Users size={21} />
                  Continue with Discord
                  <ArrowRight size={17} />
                </button>
              </div>
              {!backendConfigured && (
                <p className="setup-notice">
                  Online accounts are being prepared. Your solo adventure is
                  available now and saves on this device.
                </p>
              )}
              <p className="auth-note">
                Your guest adventure stays on this device. Account adventures
                save separately.
                {" "}<a href="./privacy.html" target="_blank" rel="noreferrer">Privacy &amp; data</a>
              </p>
              <button className="text-button centered" onClick={closePanel}>
                Continue as a guest
              </button>
            </>
          )}
        </Modal>
      )}
      {panel === "settings" && (
        <Modal
          title="Your keeper settings"
          eyebrow="MAKE YOURSELF AT HOME"
          onClose={closePanel}
        >
          <div className="settings-profile">
            <PlayerArt palette={save?.player.palette || 0} size={90} />
            <div>
              <h3>{save?.player.name || "New keeper"}</h3>
              <p>{save?.player.pronouns || "Your adventure is waiting."}</p>
            </div>
          </div>
          <AudioSettings enabled={audio} setEnabled={enableAudio} mix={audioMix} setMix={setAudioMix}/>
          <div className="setting-row">
            <span>
              <strong>{user ? "Account save" : "Device save"}</strong>
              <small>{saveStatus}</small>
            </span>
            <button
              className="secondary-button"
              disabled={!save}
              onClick={() => void saveNow()}
            >
              Save now
            </button>
          </div>
          <div className="setting-row">
            <span>
              <strong>Export adventure</strong>
              <small>Keep a backup of your current save</small>
            </span>
            <button
              className="secondary-button"
              disabled={!save}
              onClick={() => {
                const a = document.createElement("a");
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      JSON.stringify(
                        {
                          ...save,
                          x: position.current.x,
                          y: position.current.y,
                        },
                        null,
                        2,
                      ),
                    ],
                    { type: "application/json" },
                  ),
                );
                a.href = url;
                a.download = "nuvori-adventure.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="tip-box">
            <Shield size={20} />
            <p>
              Guests save in this browser. Sign in with Google or Discord for
              cloud saves and shared-world exploration.
            </p>
          </div>
          <button
            className="primary-button full-width"
            onClick={() => setPanel("online")}
          >
            <Users size={17} /> {user ? "Your account" : "Connect an account"}
          </button>
        </Modal>
      )}
      {dialog && (
        <Modal
          title={dialog.title}
          eyebrow="A MOMENT ON THE TRAIL"
          onClose={() => setDialog(null)}
        >
          <p className="dialog-text">{dialog.text}</p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            Back to the adventure
            <ArrowRight size={17} />
          </button>
        </Modal>
      )}
      {battle && save && (
        <BattleView
          battle={battle}
          save={save}
          busy={busy}
          onAction={takeTurn}
          onFinish={finishBattle}
        />
      )}
      {evolutionNotice && !battle && !otherTab && <EvolutionReady nuvo={evolutionNotice} onLater={dismissEvolution} onEvolve={id => {
        const key = evolutionKey(evolutionNotice);
        setSave(s => s ? { ...s, party: s.party.map(n => n.uid === evolutionNotice.uid ? evolve(n,id) : n), box: s.box.map(n => n.uid === evolutionNotice.uid ? evolve(n,id) : n), evolutionNotices: [...new Set([...(s.evolutionNotices || []),key])] } : s);
        notify(`${SPECIES_BY_ID[evolutionNotice.speciesId].name} evolved into ${SPECIES_BY_ID[id].name}!`);
        setEvolutionNotice(null); gameAudio.play("evolve"); gameAudio.cry(id, 1.5);
      }}/>}
      {toast && (
        <div className="toast" role="status">
          <Sparkles size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function Guide({ onClose, save }: { onClose: () => void; save: Save | null }) {
  const [tab, setTab] = useState<"nuvo" | "moves">("nuvo"),
    [query, setQuery] = useState(""),
    [type, setType] = useState("All types"),
    [selected, setSelected] = useState<Species | null>(null),
    [detailTab, setDetailTab] = useState("Evolution paths"),
    [movePreview, setMovePreview] = useState<string | null>(null),
    [animationKey, setAnimationKey] = useState(0);
  const filtered = [...BASE_SPECIES,...(save?.seen.includes("oneirune")||save?.caught.includes("oneirune")?[DREAM_SPECIES]:[])].filter(
    (s) =>
      (type === "All types" || s.types.includes(type as Element)) &&
      s.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Modal
      title={selected ? selected.name : "The Nuvopedia"}
      eyebrow={
        selected
          ? `NO. ${String(selected.dex).padStart(3, "0")} · ${selected.title}`
          : "25 FAMILIES · ONE MYTHICAL SECRET"
      }
      onClose={onClose}
      wide
    >
      {selected ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            <ChevronLeft size={16} />
            All Nuvo
          </button>
          <div className="species-overview">
            <div
              className="species-art-panel"
              style={
                { "--type": TYPE_COLORS[selected.types[0]] } as CSSProperties
              }
            >
              <NuvoArt id={selected.id} size={210} />
            </div>
            <div>
              <div className="type-row">
                {selected.types.map((t) => (
                  <TypeBadge type={t} key={t} />
                ))}
              </div>
              <p className="lore">{selected.lore}</p>
              <p className="habitat">
                <Compass size={16} />
                {selected.habitat}
              </p>
              <div className="stat-bars">
                {Object.entries(selected.stats).map(([stat, val]) => (
                  <div key={stat}>
                    <span>{stat}</span>
                    <i>
                      <b style={{ width: `${(val / 120) * 100}%` }} />
                    </i>
                    <strong>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="tabs">
            {[
              "Evolution paths",
              "Starting moves",
              "Level-up moves",
              "Teachable moves",
            ].map((t) => (
              <button
                key={t}
                className={detailTab === t ? "active" : ""}
                onClick={() => setDetailTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {detailTab === "Evolution paths" ? (
            <>
              <p className="section-intro">
                {selected.id === "oneirune" ? "Oneirune is a singular mythical being. It has no further evolution." : "Choose one path at level 12, then choose again at level 26. Each choice changes its form, types and stats."}
              </p>
              <EvolutionTree base={SPECIES_BY_ID[selected.base]} />
            </>
          ) : (
            <div className="table-scroll">
              <table className="move-table">
                <thead>
                  <tr>
                    <th>
                      {detailTab === "Level-up moves" ? "Level" : "Learn"}
                    </th>
                    <th>Move</th>
                    <th>Type</th>
                    <th>Power</th>
                    <th>Accuracy</th>
                    <th>PP</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailTab === "Starting moves"
                    ? selected.startMoves.map((move) => ({ level: 1, move }))
                    : detailTab === "Level-up moves"
                      ? selected.learnset
                      : selected.teachable.map((move) => ({ level: 0, move }))
                  ).map((l, i) => {
                    const m = MOVE_BY_ID[l.move];
                    return (
                      <tr key={i}>
                        <td>
                          {detailTab === "Teachable moves"
                            ? "Tutor"
                            : `Lv. ${l.level}`}
                        </td>
                        <td>
                          <strong>{m.name}</strong>
                          <small>{m.description}</small>
                        </td>
                        <td>
                          <TypeBadge type={m.type} />
                        </td>
                        <td>{m.power || "—"}</td>
                        <td>{m.accuracy}%</td>
                        <td>{m.pp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="guide-toolbar">
            <div className="tabs">
              <button
                className={tab === "nuvo" ? "active" : ""}
                onClick={() => setTab("nuvo")}
              >
                Nuvo <span>25</span>
              </button>
              <button
                className={tab === "moves" ? "active" : ""}
                onClick={() => setTab("moves")}
              >
                Moves <span>100</span>
              </button>
            </div>
            <div className="guide-filters">
              <label className="search-input">
                <Search size={16} />
                <input
                  aria-label="Search the Nuvopedia"
                  placeholder={tab === "nuvo" ? "Find a Nuvo…" : "Find a move…"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter by type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option>All types</option>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          {tab === "nuvo" ? (
            <div className="nuvo-grid">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  className="dex-card"
                  onClick={() => {
                    setSelected(s);
                    setDetailTab("Evolution paths");
                  }}
                >
                  <div className="dex-number">
                    <span>#{String(s.dex).padStart(3, "0")}</span>
                    {save?.caught.includes(s.id) ? (
                      <span className="caught-badge" title="Previously caught"><Check size={12}/> Caught</span>
                    ) : save?.seen.includes(s.id) ? (
                      <span>Seen</span>
                    ) : null}
                  </div>
                  <NuvoArt id={s.id} size={130} />
                  <h3>{s.name}</h3>
                  <div className="type-row">
                    {s.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </div>
                  <span className="dex-evolutions">
                    <GitBranch size={13} />6 possible evolutions
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="empty-state">No Nuvo match that search.</p>
              )}
            </div>
          ) : (
            <>
              <p className="section-intro">
                Every move has its own color, particle pattern, and timing.
                Select one to preview its animation.
              </p>
              <div className="move-list">
                {MOVES.filter(
                  (m) =>
                    (type === "All types" || m.type === type) &&
                    m.name.toLowerCase().includes(query.toLowerCase()),
                ).map((m) => (
                  <button
                    className={`move-list-item ${movePreview === m.id ? "active" : ""}`}
                    key={m.id}
                    onClick={() => {
                      setMovePreview(m.id);
                      setAnimationKey((k) => k + 1);
                    }}
                  >
                    <span
                      className="move-symbol"
                      style={{ color: TYPE_COLORS[m.type] }}
                    >
                      {TYPE_SYMBOLS[m.type]}
                    </span>
                    <span>
                      <strong>{m.name}</strong>
                      <small>
                        {m.category} · {m.power || "—"} power · {m.accuracy}%
                        accuracy · {m.pp} PP
                      </small>
                    </span>
                    <TypeBadge type={m.type} />
                  </button>
                ))}
              </div>
              {movePreview && (
                <div className="animation-preview">
                  <div>
                    <strong>{MOVE_BY_ID[movePreview].name}</strong>
                    <p>{MOVE_BY_ID[movePreview].description}</p>
                    <button
                      className="secondary-button"
                      onClick={() => setAnimationKey((k) => k + 1)}
                    >
                      <RotateCcw size={15} />
                      Replay
                    </button>
                  </div>
                  <div className="animation-stage">
                    <NuvoArt id="spriglet" size={95} />
                    <NuvoArt id="bubbfin" size={95} />
                    <MoveAnimation
                      moveId={movePreview}
                      animationKey={animationKey}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </Modal>
  );
}
function EvolutionTree({ base }: { base: Species }) {
  return (
    <div className="evolution-tree">
      <div className="evo-root">
        <NuvoArt id={base.id} size={95} />
        <strong>{base.name}</strong>
        <span>First companion</span>
      </div>
      <div className="evo-branches">
        {base.evolvesTo.map((id) => {
          const middle = SPECIES_BY_ID[id];
          return (
            <div className="evo-branch" key={id}>
              <div className="evo-node">
                <small>LV. 12</small>
                <NuvoArt id={id} size={87} />
                <strong>{middle.name}</strong>
                <div className="type-row">
                  {middle.types.map((t) => (
                    <TypeBadge key={t} type={t} />
                  ))}
                </div>
              </div>
              <div className="evo-leaves">
                {middle.evolvesTo.map((end) => {
                  const s = SPECIES_BY_ID[end];
                  return (
                    <div className="evo-node" key={end}>
                      <small>LV. 26</small>
                      <NuvoArt id={end} size={82} />
                      <strong>{s.name}</strong>
                      <div className="type-row">
                        {s.types.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Team({
  save,
  setSave,
  notify,
  onClose,
}: {
  save: Save;
  setSave: React.Dispatch<React.SetStateAction<Save | null>>;
  notify: (m: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(save.party[0].uid),
    [tutor, setTutor] = useState(""),
    [replace, setReplace] = useState(0);
  const n = save.party.find((p) => p.uid === selected) || save.party[0],
    s = SPECIES_BY_ID[n.speciesId];
  const update = (nuvo: Nuvo) =>
    setSave({
      ...save,
      party: save.party.map((p) => (p.uid === nuvo.uid ? nuvo : p)),
    });
  const available = [
    ...new Set([...learnedMoves(s, n.level), ...s.teachable]),
  ].filter((id) => !n.moves.includes(id));
  return (
    <Modal
      title="Your little crew"
      eyebrow={`${save.party.length} / 6 BY YOUR SIDE · ${save.box.length} IN RESERVE`}
      onClose={onClose}
      wide
    >
      <div className="team-management">
        <div className="party-list">
          {save.party.map((p, i) => (
            <button
              key={p.uid}
              className={p.uid === n.uid ? "selected" : ""}
              onClick={() => {
                setSelected(p.uid);
                setTutor("");
              }}
            >
              <NuvoArt id={p.speciesId} prismatic={p.prismatic} size={74} />
              <span>
                <strong>{SPECIES_BY_ID[p.speciesId].name}</strong>
                <small>
                  Lv. {p.level}
                  {i === 0 ? " · Following you" : ""}
                  {p.prismatic ? " · Prismatic" : ""}
                  {readyToEvolve(p) ? " · ✦ Ready to evolve" : ""}
                </small>
                <Health nuvo={p} />
              </span>
            </button>
          ))}
        </div>
        <div className="nuvo-detail">
          <div className="team-detail-top">
            <NuvoArt id={n.speciesId} prismatic={n.prismatic} size={142} />
            <div>
              <span className="eyebrow">
                {n.prismatic
                  ? "✦ PRISMATIC COMPANION"
                  : `LEVEL ${n.level} COMPANION`}
              </span>
              <h2>{s.name}</h2>
              <div className="type-row">
                {s.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
              <small className="xp-label">
                {n.xp} / {xpToNext(n.level)} XP to next level
              </small>
            </div>
          </div>
          <div className="team-actions">
            <button
              className="secondary-button"
              disabled={save.party[0].uid === n.uid || n.hp === 0}
              onClick={() => {
                setSave({
                  ...save,
                  party: [n, ...save.party.filter((p) => p.uid !== n.uid)],
                });
                notify(`${s.name} is now following you.`);
              }}
            >
              <Footprints size={16} /> Make companion
            </button>
            <button
              className="secondary-button"
              disabled={!save.potions || n.hp >= maxHp(n)}
              onClick={() => {
                setSave({
                  ...save,
                  potions: save.potions - 1,
                  party: save.party.map((p) =>
                    p.uid === n.uid
                      ? {
                          ...p,
                          hp: Math.min(maxHp(p), p.hp + 50),
                          status: undefined,
                        }
                      : p,
                  ),
                });
                notify(`${s.name} feels better.`);
              }}
            >
              <Heart size={16} /> Tonic ({save.potions})
            </button>
          </div>
          <h3 className="section-heading">Battle moves</h3>
          <div className="equipped-moves">
            {n.moves.map((m) => (
              <div key={m}>
                <TypeBadge type={MOVE_BY_ID[m].type} />
                <strong>{MOVE_BY_ID[m].name}</strong>
                <small>
                  {n.pp[m]} / {MOVE_BY_ID[m].pp} PP
                </small>
              </div>
            ))}
          </div>
          <div className="tutor-box">
            <h3>Move tutor</h3>
            <p>
              Relearn unlocked moves for free, or learn an eligible technique
              for 60 coins.
            </p>
            <select
              aria-label="Move to teach"
              value={tutor}
              onChange={(e) => setTutor(e.target.value)}
            >
              <option value="">Choose a technique…</option>
              {available.map((id) => (
                <option key={id} value={id}>
                  {MOVE_BY_ID[id].name} ·{" "}
                  {learnedMoves(s, n.level).includes(id) ? "Free" : "60 coins"}
                </option>
              ))}
            </select>
            {tutor && (
              <div className="tutor-actions">
                {n.moves.length === 4 && (
                  <select
                    aria-label="Move to replace"
                    value={replace}
                    onChange={(e) => setReplace(Number(e.target.value))}
                  >
                    {n.moves.map((id, i) => (
                      <option key={id} value={i}>
                        Replace {MOVE_BY_ID[id].name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  className="primary-button"
                  disabled={
                    !learnedMoves(s, n.level).includes(tutor) && save.coins < 60
                  }
                  onClick={() => {
                    if (!available.includes(tutor)) return;
                    const cost = learnedMoves(s, n.level).includes(tutor)
                      ? 0
                      : 60;
                    if (save.coins < cost) return;
                    const moves = [...n.moves];
                    if (moves.length >= 4) moves[replace] = tutor;
                    else moves.push(tutor);
                    setSave({
                      ...save,
                      coins: save.coins - cost,
                      party: save.party.map((p) =>
                        p.uid === n.uid
                          ? {
                              ...p,
                              moves,
                              pp: { ...p.pp, [tutor]: MOVE_BY_ID[tutor].pp },
                            }
                          : p,
                      ),
                    });
                    setTutor("");
                    gameAudio.play("learn");
                    notify(`${s.name} learned ${MOVE_BY_ID[tutor].name}!`);
                  }}
                >
                  Learn move
                </button>
              </div>
            )}
          </div>
          {s.evolvesTo.length > 0 && (
            <div className="evolution-choice">
              <h3>
                <GitBranch size={18} />{" "}
                {n.level >= s.evolveLevel
                  ? "A new possibility is ready."
                  : `A new choice at level ${s.evolveLevel}.`}
              </h3>
              <p>Choose the form your companion grows into.</p>
              <div>
                {s.evolvesTo.map((id) => (
                  <button
                    key={id}
                    disabled={n.level < s.evolveLevel}
                    onClick={() => {
                      update(evolve(n, id));
                      gameAudio.play("evolve"); gameAudio.cry(id, 1.5);
                      notify(
                        `${s.name} evolved into ${SPECIES_BY_ID[id].name}!`,
                      );
                    }}
                  >
                    <NuvoArt id={id} size={87} />
                    <strong>{SPECIES_BY_ID[id].name}</strong>
                    <span>{SPECIES_BY_ID[id].types.join(" / ")}</span>
                    <small>
                      {n.level >= s.evolveLevel
                        ? "Choose evolution"
                        : `Unlock at Lv. ${s.evolveLevel}`}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {save.box.length > 0 && (
        <>
          <h3 className="section-heading">Reserve companions</h3>
          <div className="reserve-list">
            {save.box.map((p) => (
              <button
                key={p.uid}
                onClick={() => {
                  if (save.party.length < 6)
                    setSave({
                      ...save,
                      party: [...save.party, p],
                      box: save.box.filter((x) => x.uid !== p.uid),
                    });
                  else
                    setSave({
                      ...save,
                      party: [...save.party.slice(0, 5), p],
                      box: [
                        ...save.box.filter((x) => x.uid !== p.uid),
                        save.party[5],
                      ],
                    });
                  notify(
                    `${SPECIES_BY_ID[p.speciesId].name} joined your team${save.party.length === 6 ? " in the last slot" : ""}.`,
                  );
                }}
              >
                <NuvoArt id={p.speciesId} prismatic={p.prismatic} size={70} />
                <strong>{SPECIES_BY_ID[p.speciesId].name}</strong>
                <small>
                  Lv. {p.level} ·{" "}
                  {save.party.length < 6 ? "Add to team" : "Swap with slot 6"}
                </small>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
function BattleView({
  battle,
  save,
  busy,
  onAction,
  onFinish,
}: {
  battle: Battle;
  save: Save;
  busy: boolean;
  onAction: (action: BattleAction) => void;
  onFinish: () => void;
}) {
  const [showSwitch, setShowSwitch] = useState(false);
  const [orb,setOrb] = useState<OrbKind>("binding");
  const p = save.party[battle.active],
    ps = SPECIES_BY_ID[p.speciesId],
    ws = SPECIES_BY_ID[battle.wild.speciesId];
  return (
    <div className="battle-backdrop">
      <section
        className="battle-modal"
        role="dialog"
        aria-modal="true"
        aria-label={battle.trainerName?`Battle with ${battle.trainerName}`:"Wild Nuvo encounter"}
      >
        <header>
          <span className="eyebrow">
            <Leaf size={14} /> {REGION_BY_ID[save.region].name} · {battle.trainerName ? `${battle.trainerName} · ${(battle.opponentQueue?.length||0)+1} Nuvo left` : "WILD ENCOUNTER"}
          </span>
          <span>
            {battle.wild.prismatic
              ? "✦ PRISMATIC DISCOVERY"
              : `TURN ${battle.turn + 1}`}
          </span>
        </header>
        <div className="battle-arena">
          <div className="arena-grass ag1" />
          <div className="arena-grass ag2" />
          <div className="wild-health battle-health">
            <div>
              <strong>
                {ws.name}
                {battle.wild.prismatic ? " ✦" : ""}
              </strong>
              <span>Lv. {battle.wild.level}</span>
            </div>
            <div className="type-row">
              {ws.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
              {caughtBefore(save, ws.id) && <span className="caught-badge"><Check size={12}/> Already caught</span>}
            </div>
            <Health nuvo={battle.wild} />
            {battle.wild.status && (
              <small>{battle.wild.status.toUpperCase()}</small>
            )}
          </div>
          <div className="wild-nuvo">
            <NuvoArt
              id={battle.wild.speciesId}
              size={205}
              prismatic={battle.wild.prismatic}
            />
          </div>
          <div className="player-nuvo">
            {battle.lastStand === "fighting" ? <PlayerArt palette={save.player.palette} look={save.player} size={240}/> : <NuvoArt id={p.speciesId} size={240} prismatic={p.prismatic} />}
          </div>
          <div className="player-health battle-health">
            <div>
              <strong>{battle.lastStand === "fighting"?save.player.name:ps.name}</strong>
              <span>{battle.lastStand === "fighting"?"LAST STAND":`Lv. ${p.level}`}</span>
            </div>
            <div className="type-row">
              {battle.lastStand !== "fighting" && ps.types.map((t) => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
            {battle.lastStand === "fighting"?<div className="health"><div className="health-track"><i style={{width:`${battle.keeperHp!/battle.keeperMaxHp!*100}%`}}/></div><span>{battle.keeperHp} / {battle.keeperMaxHp} HP</span></div>:<Health nuvo={p} />}
            {battle.lastStand !== "fighting" && p.status && <small>{p.status.toUpperCase()}</small>}
          </div>
          {battle.animation && (
            <MoveAnimation
              moveId={battle.animation.move}
              animationKey={battle.animation.key}
            />
          )}
        </div>
        <div className="battle-console">
          <div className="battle-log" aria-live="polite">
            {battle.log.slice(-3).map((l, i) => (
              <p key={`${battle.turn}-${i}`}>{l}</p>
            ))}
          </div>
          {battle.over ? (
            <div className="battle-result">
              <strong>
                {battle.over === "won"
                  ? "A little stronger, together."
                  : battle.over === "caught"
                    ? "The beginning of a new friendship."
                    : battle.over === "lost"
                      ? battle.dreamAwakening ? "You awaken in Dream Land…" : "A fresh start at the healing lodge."
                      : "Back to the adventure."}
              </strong>
              <button
                className="primary-button"
                disabled={busy}
                onClick={onFinish}
              >
                Continue exploring <ArrowRight size={17} />
              </button>
            </div>
          ) : battle.lastStand === "choice" ? <div className="last-stand-choice"><Shield size={32}/><h3>Your crew has fallen.</h3><p>You can step forward and fight as your keeper, or accept rescue to the Healing Lodge.</p><button className="primary-button" disabled={busy} onClick={()=>onAction({type:"stand"})}>I’ll fight myself</button><button className="secondary-button" disabled={busy} onClick={()=>onAction({type:"retreat"})}>Accept rescue</button></div> : (
            <>
              {battle.lastStand === "fighting" ? <div className="battle-moves"><button disabled={busy} onClick={()=>onAction({type:"strike"})}><strong>Courage Strike</strong><small>Strike with your keeper’s resolve</small></button><button disabled={busy} onClick={()=>onAction({type:"brace"})}><strong>Brace</strong><small>Reduce incoming damage by 70%</small></button></div> :
              <div className="battle-moves">
                {p.moves.every(id=>p.pp[id]<=0)&&<button disabled={busy} onClick={()=>onAction({type:"struggle"})}><strong>Struggle</strong><small>Fight without PP · takes recoil</small></button>}
                {p.moves.map((id) => {
                  const m = MOVE_BY_ID[id];
                  return (
                    <button
                      key={id}
                      disabled={busy || p.pp[id] <= 0}
                      onClick={() => onAction({ type: "move", id })}
                      style={{ "--type": TYPE_COLORS[m.type] } as CSSProperties}
                    >
                      <span className="move-symbol">
                        {TYPE_SYMBOLS[m.type]}
                      </span>
                      <span>
                        <strong>{m.name}</strong>
                        <small>
                          {m.type} ·{" "}
                          {m.power
                            ? `${m.power} power`
                            : m.effect === "heal"
                              ? "Recover HP"
                              : "Defense"}
                        </small>
                      </span>
                      <span className="move-pp">
                        {p.pp[id]}
                        <small>/{m.pp} PP</small>
                      </span>
                    </button>
                  );
                })}
              </div>}
              {!battle.trainerId&&<label className="orb-select">Capture orb<select value={orb} onChange={e=>setOrb(e.target.value as OrbKind)} disabled={busy}>{ORBS.map(o=><option key={o.id} value={o.id}>{o.name} · ×{orbCount(save,o.id)}</option>)}</select><small>{ORBS.find(o=>o.id===orb)!.description}</small></label>}
              <div className="battle-actions">
                <button
                  disabled={busy || Boolean(battle.trainerId) || orbCount(save,orb) < 1}
                  onClick={() => onAction({ type: "catch",orb })}
                >
                  <span>◈</span> {battle.trainerId?"Bonded Nuvo":ORBS.find(o=>o.id===orb)!.name} <small>×{orbCount(save,orb)}</small>
                </button>
                <button
                  disabled={busy || save.potions < 1}
                  onClick={() => onAction({ type: "potion" })}
                >
                  <Heart size={17} />
                  Tonic<small>×{save.potions}</small>
                </button>
                <button
                  disabled={busy || Boolean(battle.lastStand)}
                  onClick={() => setShowSwitch(!showSwitch)}
                >
                  <RotateCcw size={17} />
                  Switch
                </button>
                <button
                  disabled={busy || Boolean(battle.trainerId)}
                  onClick={() => onAction({ type: "run" })}
                >
                  <Footprints size={17} />
                  Run
                </button>
              </div>
              {showSwitch && (
                <div className="switch-list">
                  {save.party.map((n, i) => (
                    <button
                      key={n.uid}
                      disabled={busy || i === battle.active || n.hp === 0}
                      onClick={() => {
                        onAction({ type: "switch", index: i });
                        setShowSwitch(false);
                      }}
                    >
                      <NuvoArt id={n.speciesId} size={47} />
                      {SPECIES_BY_ID[n.speciesId].name}
                      <small>{n.hp} HP</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
