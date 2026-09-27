import { useCallback, useEffect, useState } from "react";
import { supabase } from "./online";
import type { Save } from "./game";
import { validateSave } from "./game";

export interface KeeperProfile { user_id: string; name: string; palette: number; friend_code: string }
export interface Friendship { id: string; status: "pending" | "accepted"; incoming: boolean; profile: KeeperProfile }
export interface SocialState { profile: KeeperProfile | null; friends: Friendship[]; blocked: KeeperProfile[] }
export interface ChatMessage { id: number; sender: string; channel: string; body: string; created_at: string; name: string; palette: number }
export const emptySocial: SocialState = { profile: null, friends: [], blocked: [] };
export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Sign in to use online features.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export function useSocial(userId: string | undefined, name: string | undefined, palette: number | undefined) {
  const [social, setSocial] = useState<SocialState>(emptySocial);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (!userId || !name) return;
    try { setSocial(await rpc<SocialState>("nuvori_social")); setError(""); }
    catch (e) { setError((e as Error).message); }
  }, [userId, name]);
  useEffect(() => {
    setSocial(emptySocial); setError("");
    if (!userId || !name || palette === undefined) return;
    let live = true, polling = false;
    const load = async (register = false) => {
      if (polling) return;
      polling = true;
      try {
        if (register) await rpc("nuvori_profile", { keeper_name: name, keeper_palette: palette });
        const next = await rpc<SocialState>("nuvori_social");
        if (live) { setSocial(next); setError(""); }
      } catch (e) { if (live) setError((e as Error).message); }
      finally { polling = false; }
    };
    void load(true);
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    return () => { live = false; clearInterval(timer); };
  }, [userId, name, palette]);
  return { social, error, refresh };
}
export async function claimWheel(): Promise<{ save: Save; prize: number; day: string; nextReset: string }> {
  const result = await rpc<{ save: Save; prize: number; day: string; nextReset: string }>("nuvori_daily_spin");
  if (!validateSave(result.save)) throw new Error("The daily reward could not be read. Reload to restore your cloud save.");
  return result;
}
