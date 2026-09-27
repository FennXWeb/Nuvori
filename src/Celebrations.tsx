import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, GitBranch, Sparkles } from "lucide-react";
import { Modal, NuvoArt, TypeBadge } from "./components";
import { SPECIES_BY_ID, type Nuvo } from "./data";
import { WHEEL_PRIZES, utcDay } from "./adventure";
import type { Save } from "./game";
import { gameAudio } from "./audio";

export function EvolutionReady({ nuvo, onEvolve, onLater }: { nuvo: Nuvo; onEvolve: (id: string) => void; onLater: () => void }) {
  const s = SPECIES_BY_ID[nuvo.speciesId];
  return <Modal title="A new possibility is waking…" eyebrow="✦ READY TO EVOLVE" onClose={onLater}>
    <div className="evolution-reveal">
      <div className="evolution-halo"><i/><i/><i/><NuvoArt id={s.id} prismatic={nuvo.prismatic} size={152}/><span>✦</span><span>✧</span><span>✦</span></div>
      <h3>{s.name} is ready to grow!</h3><p>Level {nuvo.level} · Two paths. One choice, entirely yours.</p>
      <div className="evolution-paths">{s.evolvesTo.map((id, i) => { const next = SPECIES_BY_ID[id]; return <button className="evolution-path" key={id} onClick={() => onEvolve(id)}><span className="eyebrow">PATH {i + 1}</span><NuvoArt id={id} prismatic={nuvo.prismatic} size={98}/><strong>{next.name}</strong><span className="type-row">{next.types.map(t => <TypeBadge key={t} type={t}/>)}</span><span><GitBranch size={14}/> Choose this evolution</span></button>; })}</div>
      <button className="text-button centered" onClick={onLater}>Keep exploring · decide later in My team</button>
    </div>
  </Modal>;
}

export function DailyWheel({ save, account, onSpin, onClose }: { save: Save; account: boolean; onSpin: () => Promise<{ prize: number; day: string }>; onClose: () => void }) {
  const [spinning, setSpinning] = useState(false), [rotation, setRotation] = useState(0), [prize, setPrize] = useState<number | null>(null), [error, setError] = useState("");
  const [today, setToday] = useState(utcDay()), [countdown, setCountdown] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alive = useRef(true);
  const close = useCallback(() => { if (!spinning) onClose(); }, [spinning, onClose]);
  useEffect(() => {
    alive.current = true;
    const tick = () => {
      const now = new Date(), next = new Date(now); next.setUTCHours(24,0,0,0);
      const seconds = Math.ceil((next.getTime()-now.getTime())/1000);
      setToday(utcDay(now)); setCountdown(`${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m ${seconds%60}s`);
    };
    tick(); const interval = setInterval(tick, 1000);
    return () => { alive.current = false; clearInterval(interval); clearTimeout(timer.current); };
  }, []);
  const claimed = Boolean(save.dailySpinDay && save.dailySpinDay >= today);
  const spin = async () => {
    if (spinning || claimed) return;
    setSpinning(true); setError(""); setPrize(null);
    try {
      const result = await onSpin();
      if (!alive.current) return;
      gameAudio.play("wheel-spin", { rate: .75 });
      setRotation(old => old + 1800 + ((360 - result.prize * 45 - 22.5 - old % 360 + 360) % 360));
      timer.current = setTimeout(() => { setPrize(result.prize); setSpinning(false); gameAudio.play("wheel-prize"); }, 5200);
    } catch(e) { if (alive.current) { setError((e as Error).message); setSpinning(false); } }
  };
  return <Modal title="A little luck for the trail" eyebrow="THE DAILY WISHING WHEEL" onClose={close}>
    <div className="daily-wheel-panel"><p>One free spin. A new gift every day.</p>
      <div className="wheel-stage"><span className="wheel-pointer">▼</span><div className={`prize-wheel ${spinning ? "spinning" : ""}`} style={{ transform: `rotate(${rotation}deg)`, background: `conic-gradient(${WHEEL_PRIZES.map((p,i) => `${p.color} ${i*45}deg ${(i+1)*45}deg`).join(",")})` }}>
        {WHEEL_PRIZES.map((p,i) => <span className="wheel-sector" key={p.label} style={{ transform: `rotate(${i*45+22.5}deg)` }}><b>{p.icon}</b><small>{p.label}</small></span>)}
      </div><div className="wheel-hub"><Sparkles size={28}/></div></div>
      {prize !== null ? <div className="wheel-reward" role="status"><Gift/><span><small>YOUR DAILY GIFT</small><strong>{WHEEL_PRIZES[prize].label}</strong><small>Added to your satchel!</small></span></div> : claimed && !spinning ? <div className="wheel-claimed"><Checkmark/> Today's gift is claimed{save.dailySpinPrize !== undefined && <strong>{WHEEL_PRIZES[save.dailySpinPrize].label}</strong>}</div> : <p className="wheel-hint">{spinning ? "A little starlight, a little luck…" : "Every slice has an equal chance. Every spin wins."}</p>}
      <button className="primary-button full-width" disabled={spinning || claimed} onClick={() => void spin()}><Gift size={18}/>{spinning ? "Making your wish…" : claimed ? `Next spin in ${countdown}` : "Spin for free"}</button>
      {error && <p className="community-error" role="alert">{error}</p>}
      <p className="quiet-copy">Resets at midnight UTC. {account ? "Your spin is shared across all devices on this account." : "Guest spins are saved on this device. Sign in for an account-wide daily gift."}</p>
      <details className="wheel-prizes"><summary>See all eight prizes</summary><div>{WHEEL_PRIZES.map(p => <span key={p.label}>{p.icon} {p.label}<small>12.5%</small></span>)}</div></details>
    </div>
  </Modal>;
}
function Checkmark() { return <span aria-hidden="true">✓</span>; }
