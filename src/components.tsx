import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import { nuvoAtlas, drawCustomization, keeperSheet } from "./spriteMotion";
import type { Player } from "./game";
import {
  SPECIES_BY_ID,
  TYPE_COLORS,
  TYPE_SYMBOLS,
  MOVE_BY_ID,
  maxHp,
  type Element,
  type Nuvo,
} from "./data";
export function TypeBadge({ type }: { type: Element }) {
  return (
    <span
      className="type-badge"
      style={{ "--type": TYPE_COLORS[type] } as CSSProperties}
    >
      {TYPE_SYMBOLS[type]} {type}
    </span>
  );
}
export function NuvoArt({
  id,
  size = 96,
  prismatic = false,
  className = "",
}: {
  id: string;
  size?: number;
  prismatic?: boolean;
  className?: string;
}) {
  const s = SPECIES_BY_ID[id];
  return (
    <span
      role="img"
      aria-label={`${prismatic ? "Prismatic " : ""}${s.name}`}
      className={`nuvo-art stage-${s.stage} ${prismatic ? "prismatic" : ""} ${className}`}
      style={
        {
          width: size,
          height: size,
          "--hue": `${prismatic ? 140 : 0}deg`,
          "--scale": 1,
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/${nuvoAtlas(s)})`,
          backgroundSize: s.id === "oneirune" ? "100% 100%" : "500% 500%",
          backgroundPosition: s.id === "oneirune" ? "center" : `${(s.sprite % 5) * 25}% ${Math.floor(s.sprite / 5) * 25}%`,
        } as CSSProperties
      }
    >
      {s.stage > 0 && (
        <span className="evo-stars">{s.stage === 1 ? "✧" : "✧ ✦ ✧"}</span>
      )}
      {prismatic && <span className="prism-star">✦</span>}
    </span>
  );
}
export function PlayerArt({
  palette = 0,
  size = 110,
  look,
}: {
  palette?: number;
  size?: number;
  look?: Pick<Player,"outfit"|"hair"|"hairColor">;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el=canvas.current!, ctx=el.getContext("2d")!, im=new Image(); let alive=true;
    im.src=import.meta.env.BASE_URL+"assets/explorer-atlas.png";
    void im.decode().then(()=>{ if(!alive)return;ctx.clearRect(0,0,size*2,size*2);ctx.save();ctx.scale(2,2);ctx.imageSmoothingEnabled=false;ctx.drawImage(keeperSheet(im,{palette,...look}),0,0,im.width/4,im.height/4,0,0,size,size);drawCustomization(ctx,size/2,size*.83,size,look || {});ctx.restore(); }).catch(()=>{});
    return()=>{alive=false;};
  },[size,palette,look?.outfit,look?.hair,look?.hairColor]);
  return (
    <canvas ref={canvas} width={size*2} height={size*2}
      className="keeper-art"
      role="img"
      aria-label="Your keeper"
      style={{
        width: size,
        height: size,
      }}
    />
  );
}
export function Health({
  nuvo,
  showText = true,
}: {
  nuvo: Nuvo;
  showText?: boolean;
}) {
  const pct = (nuvo.hp / maxHp(nuvo)) * 100;
  return (
    <div className="health">
      <div className="health-track">
        <i
          style={{
            width: `${pct}%`,
            background: pct < 25 ? "#d97970" : pct < 50 ? "#dcb966" : undefined,
          }}
        />
      </div>
      {showText && (
        <span>
          {nuvo.hp} / {maxHp(nuvo)} HP
        </span>
      )}
    </div>
  );
}
export function Modal({
  title,
  eyebrow,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,select,a[href],[tabindex="0"]',
          ) || [],
        );
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function MoveAnimation({
  moveId,
  animationKey,
}: {
  moveId: string;
  animationKey: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!,
      ctx = canvas.getContext("2d")!,
      move = MOVE_BY_ID[moveId];
    if (!move) return;
    let raf = 0,
      start = 0;
    const w = (canvas.width = 800),
      h = (canvas.height = 340);
    const pattern = move.animation % 10,
      color = TYPE_COLORS[move.type];
    const draw = (t: number) => {
      if (!start) start = t;
      const p = (t - start) / 1100;
      ctx.clearRect(0, 0, w, h);
      if (p > 1) return;
      const count = 12 + Math.floor(move.animation / 10);
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2,
          progress = Math.max(0, Math.min(1, p * 1.6 - i * 0.016));
        let x = 180 + 440 * progress,
          y = 225 - 110 * progress;
        const spread = pattern * 2 + 15;
        if (pattern === 0 || pattern === 1) {
          x += Math.cos(a + p * 10) * spread;
          y += Math.sin(a + p * 10) * spread;
        }
        if (pattern === 2) {
          x = 620 + Math.cos(a) * p * 85;
          y = 110 + Math.sin(a) * p * 60;
        }
        if (pattern === 3 || pattern === 8) {
          x = 190 + Math.cos(a) * 55;
          y = 200 + Math.sin(a) * 45 - p * 20;
        }
        if (pattern === 4) {
          x = 180 + 440 * progress;
          y += i % 2 ? 20 : -20;
        }
        if (pattern === 5) {
          x = 620 - 440 * progress;
          y = 110 + 110 * progress + Math.sin(progress * Math.PI) * 60;
        }
        if (pattern === 6) {
          x = 520 + i * 8;
          y = -40 + 250 * progress;
        }
        if (pattern === 7) {
          x = 620 + Math.cos(a) * p * 95;
          y = 180 + Math.sin(a) * p * 25;
        }
        if (pattern === 9) {
          x = 620 + Math.cos(a + p * 6) * (1 - p) * 160;
          y = 110 + Math.sin(a + p * 6) * (1 - p) * 100;
        }
        const size = 3 + (move.animation % 7) + Math.sin(p * Math.PI) * 5;
        ctx.globalAlpha = Math.sin(p * Math.PI);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + p * 3);
        if (move.type === "Volt") {
          ctx.beginPath();
          ctx.moveTo(0, -size * 2);
          ctx.lineTo(-size, 0);
          ctx.lineTo(0, 0);
          ctx.lineTo(-size / 2, size * 2);
          ctx.lineTo(size, -2);
          ctx.lineTo(0, -2);
          ctx.fill();
        } else if (move.type === "Tide" || move.type === "Shade") {
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (move.type === "Bloom" || move.type === "Gale") {
          ctx.beginPath();
          ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [moveId, animationKey]);
  return <canvas ref={ref} className="move-animation" aria-hidden="true" />;
}
let context: AudioContext | null = null;
export function sound(
  kind: "click" | "battle" | "catch" | "heal",
  enabled: boolean,
) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const notes =
      kind === "catch"
        ? [523, 659, 784, 1047]
        : kind === "heal"
          ? [392, 523, 659]
          : kind === "battle"
            ? [165, 220, 330]
            : [660];
    notes.forEach((freq, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, context!.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context!.currentTime + i * 0.09 + 0.2,
      );
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(context!.currentTime + i * 0.09);
      osc.stop(context!.currentTime + i * 0.09 + 0.21);
    });
  } catch {
    /* Audio is optional. */
  }
}
export function SoundButton({
  enabled,
  toggle,
}: {
  enabled: boolean;
  toggle: () => void;
}) {
  return (
    <button
      className="icon-button"
      title={enabled ? "Mute sound" : "Enable sound"}
      aria-label={enabled ? "Mute sound" : "Enable sound"}
      onClick={toggle}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
