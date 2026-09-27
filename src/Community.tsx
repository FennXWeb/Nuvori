import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Send, UserPlus, Users, X, ShieldOff } from "lucide-react";
import { Modal, PlayerArt } from "./components";
import { REGION_BY_ID } from "./data";
import { interiorName } from "./adventure";
import type { RemoteKeeper } from "./online";
import { rpc, type ChatMessage, type SocialState } from "./social";

export function FriendsPanel({ social, error, remote, refresh, notify, onClose }: {
  social: SocialState; error: string; remote: RemoteKeeper[]; refresh: () => Promise<void>;
  notify: (text: string) => void; onClose: () => void;
}) {
  const [code, setCode] = useState(""), [busy, setBusy] = useState(false);
  const act = async (name: string, args: Record<string, unknown>, success: string) => {
    if (busy) return;
    setBusy(true);
    try { await rpc(name, args); await refresh(); notify(success); setCode(""); }
    catch(e) { notify((e as Error).message); }
    finally { setBusy(false); }
  };
  const friends = social.friends.filter(f => f.status === "accepted");
  const requests = social.friends.filter(f => f.status === "pending");
  return <Modal title="Your trail companions" eyebrow="FRIENDS · FIND YOUR PEOPLE" onClose={onClose}>
    <div className="friend-code"><span><small>Your friend code</small><strong>{social.profile?.friend_code || "Loading…"}</strong></span><button className="icon-button" aria-label="Copy friend code" disabled={!social.profile} onClick={() => void navigator.clipboard.writeText(social.profile!.friend_code).then(() => notify("Friend code copied.")).catch(() => notify("Select and copy the code above."))}><Copy size={18}/></button></div>
    <form className="friend-add" onSubmit={e => { e.preventDefault(); void act("nuvori_friend_request", { code: code.trim() }, "Friend request sent."); }}>
      <input aria-label="Friend code" placeholder="Enter a friend's code" value={code} maxLength={12} onChange={e => setCode(e.target.value.toUpperCase())}/>
      <button className="primary-button" disabled={busy || !code.trim() || !social.profile}><UserPlus size={16}/> Add friend</button>
    </form>
    {error && <p className="community-error" role="alert">{error} <button onClick={() => void refresh()}>Retry</button></p>}
    <h3 className="section-heading">Requests <small>{requests.length}</small></h3>
    {!requests.length && <p className="quiet-copy">No pending requests. Share your code to meet up.</p>}
    {requests.map(f => <div className="friend-row" key={f.id}><PlayerArt palette={f.profile.palette} size={42}/><span><strong>{f.profile.name}</strong><small>{f.incoming ? "Wants to be your friend" : "Request sent"}</small></span>{f.incoming && <button className="small-action" disabled={busy} onClick={() => void act("nuvori_friend_action", { friendship: f.id, action: "accept" }, "You're now friends!")}><Check size={14}/> Accept</button>}<button className="icon-button" disabled={busy} aria-label={`${f.incoming ? "Decline" : "Cancel"} request ${f.profile.name}`} onClick={() => void act("nuvori_friend_action", { friendship: f.id, action: "remove" }, "Request removed.")}><X size={16}/></button></div>)}
    <h3 className="section-heading">Friends <small>{friends.length}</small></h3>
    {!friends.length && <div className="empty-state compact"><Users/><p>Your next adventure is better with company.</p></div>}
    {friends.map(f => { const p = remote.find(p => p.id === f.profile.user_id); return <div className="friend-row" key={f.id}><PlayerArt palette={f.profile.palette} size={48}/><span><strong><i className={`friend-dot ${p ? "live" : ""}`}/>{f.profile.name}</strong><small>{p ? `${REGION_BY_ID[p.region]?.name}${p.interior ? ` · ${interiorName(p.interior)}` : ""}` : "Offline"}</small></span><button className="text-button" disabled={busy} onClick={() => void act("nuvori_friend_action", { friendship: f.id, action: "remove" }, "Friend removed.")}>Remove</button></div>; })}
    <h3 className="section-heading">Online keepers</h3>
    {remote.filter(p => !social.friends.some(f => f.profile.user_id === p.id) && !social.blocked.some(b => b.user_id === p.id)).map(p => <div className="friend-row" key={p.id}><PlayerArt palette={p.palette} size={42}/><span><strong>{p.name}</strong><small>{REGION_BY_ID[p.region]?.name}</small></span><button className="small-action" disabled={busy || !social.profile} onClick={() => void act("nuvori_friend_request", { target: p.id }, "Friend request sent.")}><UserPlus size={14}/> Add</button><button className="icon-button" aria-label={`Block ${p.name}`} disabled={busy} onClick={() => void act("nuvori_block", { target: p.id, blocked: true }, "Keeper blocked. Their chat is hidden.")}><ShieldOff size={15}/></button></div>)}
    {!!social.blocked.length && <details className="blocked-list"><summary>Blocked keepers ({social.blocked.length})</summary>{social.blocked.map(p => <div className="friend-row" key={p.user_id}><span>{p.name}</span><button disabled={busy} className="text-button" onClick={() => void act("nuvori_block", { target: p.user_id, blocked: false }, "Keeper unblocked.")}>Unblock</button></div>)}</details>}
    <p className="quiet-copy">Accepted friends in your current area get gold direction markers when they're off screen.</p>
  </Modal>;
}

export function ChatDock({ userId, cell, cellName, blockedIds, ready, onSignIn, notify, refresh }: {
  userId?: string; cell: string; cellName: string; blockedIds: string[]; ready: boolean;
  onSignIn: () => void; notify: (text: string) => void; refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false), [scope, setScope] = useState<"global" | "local">("global");
  const [messages, setMessages] = useState<ChatMessage[]>([]), [draft, setDraft] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const feed = useRef<HTMLDivElement>(null), room = scope === "global" ? "global" : cell;
  const revision = useRef(0);
  useEffect(() => {
    const turn = ++revision.current;
    setMessages([]); setError(""); setDraft("");
    if (!open || !userId || !ready) return;
    let live = true, pending = false;
    const load = async () => {
      if (pending) return;
      pending = true;
      try { const next = await rpc<ChatMessage[]>("nuvori_chat_read", { room }); if (live && turn === revision.current) { setMessages(next); setError(""); } }
      catch(e) { if (live) setError((e as Error).message); }
      finally { pending = false; }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 2500);
    return () => { live = false; clearInterval(timer); };
  }, [room, open, userId, ready]);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" }); }, [messages.at(-1)?.id, open]);
  const send = async () => {
    const body = draft.trim(); if (!body || busy || !ready) return;
    const turn = revision.current;
    setBusy(true);
    try {
      await rpc("nuvori_chat_send", { room, message: body });
      if (turn === revision.current) {
        setDraft(""); setError("");
        const next = await rpc<ChatMessage[]>("nuvori_chat_read", { room });
        if (turn === revision.current) setMessages(next);
      }
    } catch(e) { if (turn === revision.current) setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return <section className={`chat-dock ${open ? "expanded" : ""}`} aria-label="Keeper chat">
    <button className="chat-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={18}/><strong>Trail chat</strong><span>Global & local</span>{open ? <X size={16}/> : <span className="chat-live-dot"/>}</button>
    {open && <div className="chat-body">{!userId ? <div className="chat-login"><p>Sign in to talk with other keepers.</p><button className="primary-button" onClick={onSignIn}>Connect your account</button></div> : <>
      <div className="chat-tabs" role="tablist" aria-label="Chat channels"><button role="tab" aria-selected={scope === "global"} onClick={() => setScope("global")}># Global</button><button role="tab" aria-selected={scope === "local"} onClick={() => setScope("local")}># Local · {cellName}</button></div>
      <div className="chat-messages" ref={feed} role="log" aria-live="polite" aria-label={`${scope} messages`}>
        {!messages.filter(m => !blockedIds.includes(m.sender)).length && <p className="quiet-copy">{ready ? "The trail is quiet. Say hello!" : "Connecting your keeper profile…"}</p>}
        {messages.filter(m => !blockedIds.includes(m.sender)).map(m => <div className="chat-message" key={m.id}><div><strong>{m.name}{m.sender === userId && <small> you</small>}</strong><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{m.sender !== userId && <button className="chat-block" aria-label={`Block chat from ${m.name}`} onClick={() => void rpc("nuvori_block", { target: m.sender, blocked: true }).then(() => refresh()).then(() => notify("Keeper blocked.")).catch(e => notify(e.message))}><ShieldOff size={12}/></button>}</div><p>{m.body}</p></div>)}
      </div>
      {error && <p role="alert" className="community-error">{error}</p>}
      <form className="chat-compose" onSubmit={e => { e.preventDefault(); void send(); }}><input aria-label={`Message ${scope} channel`} placeholder={scope === "global" ? "Message all keepers…" : `Message ${cellName}…`} maxLength={240} value={draft} onChange={e => setDraft(e.target.value)} disabled={!ready}/><small>{draft.length}/240</small><button className="icon-button" aria-label="Send message" disabled={!ready || busy || !draft.trim()}><Send size={17}/></button></form>
      <small className="chat-note">Be kind. Global messages are public to signed-in keepers. Local follows your current area.</small>
    </>}</div>}
  </section>;
}
