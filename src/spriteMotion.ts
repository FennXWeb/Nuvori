import { SPECIES_BY_ID, type Species } from "./data";
import { OUTFITS, HAIR_COLORS } from "./expansion";
import type { Player } from "./game";

export function nuvoAtlas(s: Species) { return s.id === "oneirune" ? "oneirune.png" : s.stage ? `evolution-${s.branch}.png` : "nuvo-atlas.png"; }
export function gaitFor(id: string) {
  const s = SPECIES_BY_ID[id];
  if (s.types.includes("Gale") || [3,9,12,19].includes(s.sprite) || id === "oneirune") return "float";
  if ([2,6,11,14,16].includes(s.sprite)) return "swim";
  if ([4,21].includes(s.sprite)) return "hop";
  return "walk";
}
export function drawCompanion(ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: string, x: number, y: number, time: number, moving: boolean, direction: number, prismatic: boolean) {
  const s = SPECIES_BY_ID[id]; if (!s || !image.complete || !image.naturalWidth) return;
  const gait = gaitFor(id), phase = time * (moving ? 10 + s.sprite % 5 : 2.5) + s.sprite;
  const stride = moving ? 1 : .16, size = s.stage === 2 ? 84 : s.stage === 1 ? 70 : 58;
  const columns = s.id === "oneirune" ? 1 : 5, index = s.id === "oneirune" ? 0 : s.sprite;
  const cw = image.width / columns, ch = image.height / columns;
  ctx.fillStyle = "#183b3433"; ctx.beginPath();ctx.ellipse(x,y,12+s.stage*4,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(x,y);
  if (direction === 1) ctx.scale(-1,1);
  const lift = gait === "float" ? 6 + Math.sin(phase)*3 : gait === "hop" ? Math.max(0,Math.sin(phase))*7*stride : Math.abs(Math.sin(phase))*2*stride;
  ctx.translate(0,-lift);
  ctx.rotate(Math.sin(phase)*(gait === "swim" ? .075 : .03)*stride);
  ctx.scale(1+Math.sin(phase)*.025*stride,1-Math.sin(phase)*.025*stride);
  if (prismatic) ctx.filter = "hue-rotate(140deg)";
  // Slice deformation gives tails, feet and wing tips their own moving silhouette.
  const strips = 10;
  for (let band=0; band<strips; band++) {
    const sway = Math.sin(phase + band*.7) * (gait === "float" ? 2.2 : gait === "swim" ? 2.5 : band>6 ? 1.5 : .3) * stride;
    ctx.drawImage(image,(index%columns)*cw,Math.floor(index/columns)*ch+band*ch/strips,cw,ch/strips,-size/2+sway,-size*.86+band*size/strips,size,size/strips+.3);
  }
  ctx.restore();
  if(prismatic) { ctx.fillStyle="#fff2a2";ctx.fillRect(x+Math.cos(time*3)*23,y-30+Math.sin(time*3)*15,3,3); }
}

// Layered pixel clothing and hair stay aligned with every direction/walk frame.
export function drawCustomization(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, player: Pick<Player,"outfit"|"hair"|"hairColor">, direction=0, phase=0) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/68,size/68);ctx.translate(0,Math.sin(phase)*.6);
  const outfit = player.outfit || 0, hair=player.hair || 0, color=HAIR_COLORS[player.hairColor || 0];
  // Small accessories supplement the recolored original shading, never obscure the face.
  if(outfit===3&&direction!==3){ctx.fillStyle="#f5eaca";ctx.fillRect(-5,-17,10,1.5);}
  if(outfit===4){ctx.fillStyle="#f8e6ae";ctx.fillRect(-8,-19,4,3);ctx.fillRect(5,-19,4,3);ctx.fillRect(-1,-12,2,2);}
  if(outfit===5&&direction!==3){ctx.fillStyle="#e8c7ac";ctx.fillRect(-5,-18,1.5,8);ctx.fillRect(5,-18,1.5,8);}
  if(hair===3){for(let i=0;i<6;i++){const bx=direction===1?-10:10;ctx.fillStyle="#382f3d";ctx.fillRect(bx-2,-28+i*3,5,4);ctx.fillStyle=color;ctx.fillRect(bx-1+(i%2),-28+i*3,3,3);}ctx.fillStyle="#dbc088";ctx.fillRect(direction===1?-11:9,-11,4,2);}
  if(hair===4){for(const side of [-1,1]){ctx.fillStyle="#302c3a";ctx.beginPath();ctx.arc(side*10,-40,4.6,0,7);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(side*10-.5,-40.5,3.5,0,7);ctx.fill();}}
  ctx.restore();
}

const keeperCache = new WeakMap<HTMLImageElement,Map<string,HTMLCanvasElement>>();
/** Runtime material palettes retain the source sprite's shaded edges and walk frames. */
export function keeperSheet(image:HTMLImageElement, player:Pick<Player,"outfit"|"hair"|"hairColor"|"palette">):CanvasImageSource {
  if(!image.complete||!image.naturalWidth)return image;
  let cache=keeperCache.get(image);if(!cache){cache=new Map();keeperCache.set(image,cache);}
  const key=`${player.palette}:${player.outfit||0}:${player.hair||0}:${player.hairColor??"base"}`;
  if(cache.has(key))return cache.get(key)!;
  const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext("2d",{willReadFrequently:true})!;
  c.drawImage(image,0,0);const original=c.getImageData(0,0,canvas.width,canvas.height);
  c.clearRect(0,0,canvas.width,canvas.height);c.filter=`hue-rotate(${[0,140,240,60][player.palette]}deg)`;c.drawImage(image,0,0);c.filter="none";
  const pixels=c.getImageData(0,0,canvas.width,canvas.height), data=pixels.data, src=original.data;
  const rgb=(hex:string)=>[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
  const coat=rgb(OUTFITS[player.outfit||0].color),hair=rgb(HAIR_COLORS[player.hairColor||0]);
  for(let p=0;p<data.length;p+=4){if(!src[p+3])continue;const r=src[p],g=src[p+1],b=src[p+2],index=p/4,ny=(Math.floor(index/canvas.width)%(canvas.height/4))/(canvas.height/4),nx=(index%canvas.width%(canvas.width/4))/(canvas.width/4);
    const isHair=ny<.49&&b>g*1.22&&r>g*1.08;
    const material=player.outfit&&g>r*1.14&&g>b*1.05?coat:(player.hairColor!==undefined&&isHair?hair:null);
    if(material){const brightness=(Math.max(r,g,b)+Math.min(r,g,b))/2/110;for(let channel=0;channel<3;channel++)data[p+channel]=Math.min(255,Math.round(material[channel]*brightness));}
    if(isHair&&player.hair===1&&(ny<.19||Math.abs(nx-.5)>.18))data[p+3]=0;
    if(isHair&&player.hair===2&&ny<.18&&nx>.52)data[p+3]=0;
  }
  c.putImageData(pixels,0,0);cache.set(key,canvas);return canvas;
}
