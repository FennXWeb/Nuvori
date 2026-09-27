import {
  createClient,
  type SupabaseClient,
  type RealtimeChannel,
  type User,
} from "@supabase/supabase-js";
import { validateSave, type Save } from "./game";
import { REGION_BY_ID, SPECIES_BY_ID } from "./data";
export const backendConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
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
export async function signIn(provider: "google" | "discord") {
  if (!supabase)
    throw new Error(
      "Online accounts are still being set up. You can play and save on this device now.",
    );
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: new URL(".", window.location.href).href },
  });
  if (error) throw error;
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
  return data ? { ...data.data, updated: data.updated_at } : null;
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
  x: number;
  y: number;
  palette: number;
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
    k.id.length <= 64 &&
    typeof k.name === "string" &&
    k.name.length <= 18 &&
    typeof k.region === "string" &&
    Boolean(REGION_BY_ID[k.region]) &&
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
    (k.emote === undefined || k.emote === "Hello! 👋")
  );
}
export class OnlineWorld {
  channel: RealtimeChannel | null = null;
  connected = false;
  async join(
    user: User,
    onPlayers: (p: RemoteKeeper[]) => void,
    onStatus: (s: string) => void,
  ) {
    if (!supabase) return;
    const session = await supabase.auth.getSession();
    await supabase.realtime.setAuth(session.data.session?.access_token);
    this.channel = supabase.channel("nuvori:auralis", {
      config: { private: true, presence: { key: user.id } },
    });
    this.channel
      .on("presence", { event: "sync" }, () => {
        const state = this.channel!.presenceState<RemoteKeeper>();
        const players = Object.values(state).flat().filter((p) => validRemote(p) && p.id !== user.id);
        onPlayers([...new Map(players.map(p => [p.id, p])).values()].slice(0, 100));
      })
      .subscribe((status) => {
        this.connected = status === "SUBSCRIBED";
        onStatus(
          this.connected
            ? "Connected"
            : status === "CHANNEL_ERROR"
              ? "Connection unavailable"
              : status === "TIMED_OUT"
                ? "Connection timed out"
                : "Connecting",
        );
      });
  }
  async update(keeper: RemoteKeeper) {
    if (this.connected) await this.channel?.track(keeper);
  }
  close() {
    if (this.channel && supabase) supabase.removeChannel(this.channel);
    this.channel = null;
    this.connected = false;
  }
}
