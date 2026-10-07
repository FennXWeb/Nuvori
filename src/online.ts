import {
  createClient,
  type SupabaseClient,
  type RealtimeChannel,
  type User,
} from "@supabase/supabase-js";
import { validateSave, type Save } from "./game";
import { normalizeSave } from "./nursery";
import { REGION_BY_ID, SPECIES_BY_ID } from "./data";
import type { Interior } from "./adventure";
const env = import.meta.env ?? {};
export const backendConfigured = Boolean(
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY,
);
export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    )
  : null;
let desktopLoginPending = false;
export async function signIn(provider: "google" | "discord") {
  if (!supabase)
    throw new Error(
      "Online accounts are still being set up. You can play and save on this device now.",
    );
  const desktop = window.nuvoriDesktop;
  if (desktop && desktopLoginPending) throw new Error('Finish signing in through the browser window already open.');
  if (desktop) desktopLoginPending = true;
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: desktop ? 'https://fennxweb.github.io/Nuvori/' : new URL(".", window.location.href).href,
        skipBrowserRedirect: Boolean(desktop),
      },
    });
    if (error) throw error;
    if (desktop) {
      if (!data.url) throw new Error('Sign-in could not start. Please try again.');
      const code = await desktop.signIn(data.url);
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
    }
  } finally { desktopLoginPending = false; }
}
export async function fetchCloudSave(user: User): Promise<Save | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("keeper_saves")
    .select("data,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data && !validateSave(data.data))
    throw new Error(
      "Your cloud save could not be read. Your local save is safe.",
    );
  return data ? normalizeSave({ ...data.data, updated: data.updated_at }) : null;
}
export async function saveCloud(user: User, save: Save) {
  if (!supabase) return;
  const { error } = await supabase
    .from("keeper_saves")
    .upsert({
      user_id: user.id,
      data: save,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
export interface RemoteKeeper {
  id: string;
  name: string;
  region: string;
  interior?: Interior;
  x: number;
  y: number;
  palette: number;
  outfit?: number;
  hair?: number;
  hairColor?: number;
  direction: number;
  moving: boolean;
  speciesId: string;
  prismatic: boolean;
  emote?: string;
  seenAt: number;
}
export function validRemote(p: unknown): p is RemoteKeeper {
  if (!p || typeof p !== "object") return false;
  const k = p as RemoteKeeper;
  return (
    typeof k.id === "string" &&
    k.id.length > 0 &&
    k.id.length <= 64 &&
    typeof k.name === "string" &&
    k.name.length <= 18 &&
    typeof k.region === "string" &&
    Boolean(REGION_BY_ID[k.region]) &&
    (k.interior === undefined || ["lodge","shop","tailor","barber","nursery"].includes(k.interior)) &&
    [k.outfit,k.hair,k.hairColor].every(v => v === undefined || (Number.isInteger(v) && v >= 0 && v < 6)) &&
    Number.isFinite(k.x) &&
    Number.isFinite(k.y) &&
    k.x >= 0 &&
    k.x <= 1152 &&
    k.y >= 0 &&
    k.y <= 832 &&
    Number.isInteger(k.palette) &&
    k.palette >= 0 &&
    k.palette <= 3 &&
    Number.isInteger(k.direction) &&
    k.direction >= 0 &&
    k.direction <= 3 &&
    typeof k.speciesId === "string" &&
    Boolean(SPECIES_BY_ID[k.speciesId]) &&
    typeof k.moving === "boolean" &&
    typeof k.prismatic === "boolean" &&
    Number.isFinite(k.seenAt) &&
    (k.emote === undefined || k.emote === "Hello! 👋")
  );
}
export class OnlineWorld {
  channel: RealtimeChannel | null = null;
  connected = false;
  private generation = 0;
  private tracked = false;
  private sending = false;
  private nextTrackAt = 0;
  private lastSent = -Infinity;
  private lastPayload = "";
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private clearPlayers: (() => void) | undefined;

  constructor(private client: SupabaseClient | null = supabase) {}

  async join(
    user: User,
    onPlayers: (p: RemoteKeeper[]) => void,
    onStatus: (s: string) => void,
  ) {
    this.close();
    const client = this.client;
    if (!client) return;
    const generation = this.generation;
    this.clearPlayers = () => onPlayers([]);
    const connect = async () => {
      try {
        const session = await client.auth.getSession();
        if (generation !== this.generation) return;
        if (session.error || !session.data.session) {
          onStatus("Sign in to reconnect");
          return;
        }
        await client.realtime.setAuth(session.data.session.access_token);
        if (generation !== this.generation) return;
        const channel = client.channel("nuvori:auralis", {
          config: { private: true, presence: { key: user.id } },
        });
        this.channel = channel;
        let players = new Map<string, RemoteKeeper>();
        const current = () => generation === this.generation && this.channel === channel;
        const publish = () => onPlayers([...players.values()].slice(0, 100));
        channel
          .on("presence", { event: "sync" }, () => {
            if (!current()) return;
            const members = new Map<string, RemoteKeeper>();
            for (const [id, entries] of Object.entries(channel.presenceState<RemoteKeeper>())) {
              const keeper = entries.find(p => validRemote(p) && p.id === id && id !== user.id);
              if (keeper) members.set(id, players.get(id) ?? keeper);
            }
            players = members;
            // A newly joined keeper needs everyone's current position, not their join position.
            this.lastSent = -Infinity;
            publish();
          })
          .on("broadcast", { event: "keeper" }, ({ payload }) => {
            if (!current() || !validRemote(payload) || !players.has(payload.id)) return;
            players.set(payload.id, payload);
            publish();
          })
          .subscribe(status => {
            if (!current()) return;
            this.connected = status === "SUBSCRIBED";
            this.tracked = false;
            this.nextTrackAt = 0;
            this.lastSent = -Infinity;
            if (!this.connected) {
              players.clear();
              publish();
            }
            onStatus(this.connected ? "Connected" : "Reconnecting");
            // The SDK retries network errors; a server-closed channel needs a fresh subscription.
            if (status === "CLOSED" && !this.retryTimer) {
              this.channel = null;
              this.retryTimer = setTimeout(() => {
                this.retryTimer = undefined;
                if (generation === this.generation) void connect();
              }, 30_000);
            }
          });
      } catch {
        if (generation === this.generation) onStatus("Connection unavailable");
      }
    };
    await connect();
  }
  async update(keeper: RemoteKeeper) {
    const channel = this.channel;
    if (!this.connected || !channel || this.sending || !validRemote(keeper)) return;
    const generation = this.generation;
    this.sending = true;
    try {
      // Presence is limited to five changes per 30 seconds. Register once per subscription.
      if (!this.tracked) {
        if (Date.now() < this.nextTrackAt) return;
        this.nextTrackAt = Date.now() + 30_000;
        const result = await channel.track(keeper);
        if (generation !== this.generation || channel !== this.channel) return;
        if (result !== "ok") return;
        this.tracked = true;
      }
      const { seenAt: _seenAt, ...state } = keeper;
      const payload = JSON.stringify(state);
      if (payload === this.lastPayload && Date.now() - this.lastSent < 5_000) return;
      const result = await channel.send({ type: "broadcast", event: "keeper", payload: keeper });
      if (generation !== this.generation || channel !== this.channel) return;
      if (result === "ok") {
        this.lastPayload = payload;
        this.lastSent = Date.now();
      }
    } catch {
      // A transient transport error should not reject the game's fire-and-forget update loop.
    } finally {
      if (generation === this.generation) this.sending = false;
    }
  }
  close() {
    this.generation++;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    const channel = this.channel;
    this.channel = null;
    this.connected = false;
    this.tracked = false;
    this.sending = false;
    this.nextTrackAt = 0;
    this.lastSent = -Infinity;
    this.lastPayload = "";
    this.clearPlayers?.();
    this.clearPlayers = undefined;
    if (channel && this.client) void this.client.removeChannel(channel);
  }
}
