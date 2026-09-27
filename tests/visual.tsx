// Local Vite-only fixture launcher. qa.html is not a production build entry.
import React from "react";
import { createRoot } from "react-dom/client";
import { newSave, writeSave } from "../src/game";
import { enterInterior } from "../src/adventure";

function launch(scenario: string) {
  let save = newSave({ name: "QA Keeper", palette: 2, pronouns: "They / them" }, "spriglet");
  if (scenario === "Evolution") save.party[0].level = 12;
  if (scenario === "Healing Lodge" || scenario === "Supply Shop") {
    save = enterInterior(save, scenario === "Healing Lodge" ? "lodge" : "shop", 288, 336);
    save.party[0].hp = 1;
  }
  writeSave(save);
  window.location.href = "./";
}
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<main style={{ maxWidth: 700, margin: "60px auto", fontFamily: "system-ui" }}><h1>Nuvori local QA</h1><p>These fixtures replace only this localhost browser's guest adventure. Production account saves are unaffected.</p>{["Evolution","Healing Lodge","Supply Shop","Daily wheel"].map(s => <button key={s} onClick={() => launch(s)} style={{ padding: 18, margin: 8 }}>{s}</button>)}</main>);
