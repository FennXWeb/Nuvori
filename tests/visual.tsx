// Local Vite-only fixture launcher. qa.html is not a production build entry.
import React from "react";
import { createRoot } from "react-dom/client";
import { newSave, writeSave } from "../src/game";
import { enterInterior } from "../src/adventure";
import { createNuvo } from "../src/data";

function launch(scenario: string) {
  if(scenario === "New keeper"){localStorage.removeItem("nuvori-save:guest");window.location.href="./";return;}
  let save = newSave({ name: "QA Keeper", palette: 2, pronouns: "They / them" }, "spriglet");
  if(scenario === "Season pass") save.passes={s1:{xp:30000,claimed:[],boosts:2,boostUntil:0}};
  if(scenario === "Town district"){save.x=1400;save.y=1000;}
  if(scenario === "Tall grass"){save.region="verdant";save.x=960;save.y=680;}
  const routes:Record<string,[string,number,number]>={"River crossing":["brookbend",33,13],"Crystal cavern":["echohollow",43,13],"Bramble maze":["bramble",36,25],"Lake islands":["lanternlake",54,33],"Mountain pass":["rimewind",43,42]};
  if(routes[scenario]){const [region,x,y]=routes[scenario];save.region=region;save.x=x*32+16;save.y=y*32+16;save.visited.push(region);}
  if (scenario === "Evolution") save.party[0].level = 12;
  if (scenario === "Frontier crew") {save.region="threadhaven";save.coins=3000;save.party=[createNuvo("spriglet-3",30,false),createNuvo("cindlet-4",30,false),createNuvo("bubbfin-5",30,true)];save.x=560;save.y=496;}
  if (scenario === "Clothing" || scenario === "Barber") {save.coins=3000;save=enterInterior(save,scenario==="Clothing"?"tailor":"barber",288,336);save.x=576;save.y=368;}
  if (scenario === "Last stand") {save.region="mossbell";save.party[0].hp=1;save.x=22*32;save.y=14.8*32;}
  if (scenario === "Dream Land") {save.region="dreamland";save.party=[createNuvo("oneirune",35,true),createNuvo("wisplet-6",32,false)];}
  if (scenario === "Healing Lodge" || scenario === "Supply Shop" || scenario === "Nursery") {
    save = enterInterior(save, scenario === "Healing Lodge" ? "lodge" : scenario === "Nursery" ? "nursery" : "shop", 288, 336);
    save.party[0].hp = 1;
  }
  writeSave(save);
  window.location.href = "./";
}
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<main style={{ maxWidth: 700, margin: "60px auto", fontFamily: "system-ui" }}><h1>Nuvori local QA</h1><p>These fixtures replace only this localhost browser's guest adventure. Production account saves are unaffected.</p>{["River crossing","Crystal cavern","Bramble maze","Lake islands","Mountain pass","New keeper","Season pass","Town district","Tall grass","Evolution","Healing Lodge","Supply Shop","Nursery","Daily wheel","Frontier crew","Clothing","Barber","Last stand","Dream Land"].map(s => <button key={s} onClick={() => launch(s)} style={{ padding: 18, margin: 8 }}>{s}</button>)}</main>);
