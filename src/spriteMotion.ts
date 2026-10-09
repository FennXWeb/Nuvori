import { SPECIES_BY_ID } from "./data";
import { nuvoSprite, fitSprite, spriteFill } from "./sprites";
export { nuvoAtlas } from "./sprites";

export function gaitFor(id: string) {
  const s = SPECIES_BY_ID[id];
  if (s.types.includes("Gale") || [3,9,12,19].includes(s.sprite) || id === "oneirune" || s.base === "dreamweaver") return "float";
  if ([2,6,11,14,16].includes(s.sprite)) return "swim";
  if ([4,21].includes(s.sprite)) return "hop";
  return "walk";
}
export function drawCompanion(ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: string, x: number, y: number, time: number, moving: boolean, direction: number, prismatic: boolean) {
  const s = SPECIES_BY_ID[id]; if (!s || !image.complete || !image.naturalWidth) return;
  const gait = gaitFor(id), phase = time * (moving ? 10 + s.sprite % 5 : 2.5) + s.sprite;
  const stride = moving ? 1 : .16, size = 58 + s.stage * 13;
  const { frame } = nuvoSprite(s), fitted = fitSprite(frame, size, spriteFill(s));
  ctx.fillStyle = "#183b3433"; ctx.beginPath();ctx.ellipse(x,y,12+s.stage*4,5,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(x,y);
  if (direction === 1) ctx.scale(-1,1);
  const lift = gait === "float" ? 6 + Math.sin(phase)*3 : gait === "hop" ? Math.max(0,Math.sin(phase))*7*stride : Math.abs(Math.sin(phase))*2*stride;
  ctx.translate(0,-lift);
  ctx.rotate(Math.sin(phase)*(gait === "swim" ? .075 : .03)*stride);
  ctx.scale(1+Math.sin(phase)*.025*stride,1-Math.sin(phase)*.025*stride);
  if (prismatic) ctx.filter = "hue-rotate(140deg)";
  // Animate the intact silhouette: offset strips can look like cropped or torn body parts.
  ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,-fitted.width/2,-fitted.height,fitted.width,fitted.height);
  ctx.restore();
  if(prismatic) { ctx.fillStyle="#fff2a2";ctx.fillRect(x+Math.cos(time*3)*23,y-30+Math.sin(time*3)*15,3,3); }
}
