import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NuvoArt } from "../src/components";
import { SPECIES } from "../src/data";
import { drawCompanion, nuvoAtlas } from "../src/spriteMotion";
import "../src/styles.css";

function Follower({ id, prismatic }: { id: string; prismatic: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0, stopped = false;
    const ctx = canvas.current!.getContext("2d")!, image = new Image();
    image.src = `/assets/${nuvoAtlas(SPECIES.find(s => s.id === id)!)}`;
    void image.decode().then(() => {
      function frame(time: number) {
        if (stopped) return;
        ctx.clearRect(0, 0, 120, 115); ctx.imageSmoothingEnabled = false;
        drawCompanion(ctx, image, id, 60, 100, time / 1000, true, 2, prismatic);
        raf = requestAnimationFrame(frame);
      }
      if (!stopped) raf = requestAnimationFrame(frame);
    });
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [id, prismatic]);
  return <canvas ref={canvas} width={120} height={115} aria-label={`Animated ${id}`} />;
}
function Preview() {
  const [branch, setBranch] = useState(3), [prismatic, setPrismatic] = useState(false);
  const creatures = SPECIES.filter(s => branch === 7 ? s.id === "oneirune" : s.branch === branch && s.id !== "oneirune");
  return <main style={{ padding: 24, maxWidth: 1180, margin: "auto" }}>
    <h1>Sprite crop checks</h1><p>Left: game portrait. Right: animated follower. All artwork uses the game’s production renderers.</p>
    <label>Evolution sheet <select value={branch} onChange={e => setBranch(Number(e.target.value))}>
      {Array.from({ length: 7 }, (_, n) => <option key={n} value={n}>{n ? `Branch ${n}` : "Base forms"}</option>)}
      <option value={7}>Mythical</option>
    </select></label>{" "}<label><input type="checkbox" checked={prismatic} onChange={e => setPrismatic(e.target.checked)} /> Prismatic</label>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginTop: 18 }}>
      {creatures.map(s => <article key={s.id} style={{ border: "1px solid #c4cebf", background: "#eef1e6", borderRadius: 10, padding: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><NuvoArt id={s.id} size={88} prismatic={prismatic} /><Follower id={s.id} prismatic={prismatic} /></div>
        <p style={{ margin: 0, textAlign: "center", fontSize: 12 }}>{s.name}</p>
      </article>)}
    </div>
  </main>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<Preview />);
import.meta.hot?.dispose(() => root.unmount());
