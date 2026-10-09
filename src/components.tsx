import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { drawDressedKeeper } from "./appearance";
import { X, Volume2, VolumeX } from "lucide-react";
import {keeperAppearance} from "./keeperArt";
import {preloadIllustratedArt} from "./illustratedArt";
import { nuvoSprite, fitSprite, spriteFill } from "./sprites";
import type { Player } from "./game";
import {
  SPECIES_BY_ID,
  TYPE_COLORS,
  TYPE_SYMBOLS,
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
  const { file, atlas, frame } = nuvoSprite(s);
  const fitted = fitSprite(frame, 100, spriteFill(s));
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
        } as CSSProperties
      }
    >
      <svg className="nuvo-sprite-image" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <svg x={fitted.x} y={fitted.y} width={fitted.width} height={fitted.height}
          viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} preserveAspectRatio="none" overflow="hidden">
          <image href={`${import.meta.env.BASE_URL}assets/${file}`} width={atlas.width} height={atlas.height} />
        </svg>
      </svg>
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
  direction = 0,
}: {
  palette?: number;
  size?: number;
  look?: Pick<Player,"outfit"|"hair"|"hairColor"|"appearance">;
  direction?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el=canvas.current!,ctx=el.getContext('2d')!;let alive=true;
    void preloadIllustratedArt().then(()=>{if(!alive)return;ctx.clearRect(0,0,size*2,size*2);ctx.save();ctx.scale(2,2);drawDressedKeeper(ctx,size/2,size*.95,size*.77,keeperAppearance(palette,look),direction);ctx.restore();});
    return()=>{alive=false;};
  },[size,palette,look?.outfit,look?.hair,look?.hairColor,look?.appearance,direction]);
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
export { MoveAnimation } from "./BattleEffects";
export { sound } from "./audio";
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
