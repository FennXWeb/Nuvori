import { interiorName, type Interior } from "./adventure";

// Room art shares the world's tile grid so walking, followers and multiplayer stay continuous.
export function drawInterior(ctx: CanvasRenderingContext2D, room: Interior, time: number) {
  const lodge = room === "lodge";
  ctx.fillStyle = "#1b2d31"; ctx.fillRect(0, 0, 1152, 832);
  ctx.fillStyle = "#0d1e254d"; ctx.fillRect(244, 170, 674, 560);
  ctx.fillStyle = lodge ? "#629797" : "#8f6e54"; ctx.fillRect(256, 128, 640, 560);
  ctx.fillStyle = lodge ? "#bad4c9" : "#ecd5a0"; ctx.fillRect(268, 144, 616, 64);
  ctx.fillStyle = "#304745"; ctx.fillRect(256, 202, 640, 12);
  for (let y = 7; y < 21; y++) for (let x = 8; x < 28; x++) {
    ctx.fillStyle = (x + y) % 2 ? "#c6a777" : "#d3b688";
    ctx.fillRect(x*32, y*32, 32, 32);
    ctx.fillStyle = "#9b80552b"; ctx.fillRect(x*32, y*32+30, 32, 2);
  }
  // A woven runner leads from the door to the counter.
  ctx.fillStyle = lodge ? "#5d9b98" : "#a06b66"; ctx.fillRect(520, 366, 112, 305);
  ctx.strokeStyle = "#e8d59c"; ctx.lineWidth = 3; ctx.strokeRect(530, 378, 92, 282);
  for (let i=0;i<8;i++) { ctx.fillStyle="#f4e7bd77"; ctx.fillRect(554,395+i*32, 44,3); }
  // Windows and warm pools of light.
  for (const x of [336,752]) {
    ctx.fillStyle="#315051";ctx.fillRect(x,149,64,48);
    ctx.fillStyle=lodge?"#b9e6df":"#f8d786";ctx.fillRect(x+5,153,54,39);
    ctx.fillStyle="#f7f1cb";ctx.fillRect(x+29,153,5,39);ctx.fillRect(x+5,171,54,4);
    ctx.fillStyle="#fff3b413";ctx.beginPath();ctx.moveTo(x,208);ctx.lineTo(x+64,208);ctx.lineTo(x+110,390);ctx.lineTo(x-45,390);ctx.fill();
  }
  ctx.fillStyle="#344e47";ctx.fillRect(484,151,184,42);
  ctx.font="bold 17px Georgia";ctx.textAlign="center";ctx.fillStyle="#f3e4af";
  ctx.fillText(interiorName(room).toUpperCase(),576,178);
  // Framed wall pennants.
  for (const x of [292,850]) { ctx.fillStyle=lodge?"#dce9d5":"#d4a66d";ctx.fillRect(x,153,18,45);ctx.fillStyle="#ede1aa";ctx.fillRect(x+7,161,4,18); }
  // Door, threshold, and a softly pulsing exit rune.
  ctx.fillStyle="#283c39";ctx.fillRect(528,666,96,30);
  ctx.fillStyle="#dcb57c";ctx.fillRect(535,670,82,16);
  ctx.globalAlpha=.6+.2*Math.sin(time*2);ctx.fillStyle="#f9eabc";
  ctx.beginPath();ctx.moveTo(566,676);ctx.lineTo(586,676);ctx.lineTo(576,685);ctx.fill();ctx.globalAlpha=1;
  ctx.font="11px sans-serif";ctx.fillStyle="#d4e3d0";ctx.fillText("↓ OUTSIDE",576,712);
}

export function drawFurniture(ctx: CanvasRenderingContext2D, kind: number, x: number, y: number, lodge: boolean, time: number) {
  if (kind === 20) {
    // Resting cot with quilt, pillows and brass feet.
    ctx.fillStyle="#755742";ctx.fillRect(x-31,y-64,62,74);ctx.fillRect(x-34,y-69,68,10);
    ctx.fillStyle="#f6ead3";ctx.fillRect(x-26,y-62,52,60);
    ctx.fillStyle="#81b8ad";ctx.fillRect(x-26,y-38,52,39);
    ctx.fillStyle="#d6e8c8";ctx.fillRect(x-22,y-57,44,17);
    ctx.strokeStyle="#e6d996";ctx.strokeRect(x-22,y-34,44,28);
    ctx.fillStyle="#d9ba78";ctx.fillRect(x-31,y+7,7,9);ctx.fillRect(x+24,y+7,7,9);
  } else if (kind === 21) {
    ctx.fillStyle="#70543e";ctx.fillRect(x-35,y-35,70,44);
    ctx.fillStyle=lodge?"#7b9f9b":"#ba8e53";ctx.fillRect(x-35,y-46,70,19);
    ctx.fillStyle="#f4d99d";ctx.fillRect(x-35,y-29,70,4);
    ctx.fillStyle=lodge?"#dcf1d4":"#d8b683";ctx.fillRect(x-11,y-56,22,10);
    if (lodge) { ctx.fillStyle="#528a7c";ctx.fillRect(x-2,y-54,4,6);ctx.fillRect(x-5,y-52,10,2); }
  } else if (kind === 22) {
    ctx.fillStyle="#685240";ctx.fillRect(x-39,y-82,78,92);
    for(let row=0;row<3;row++) {
      ctx.fillStyle="#d3ae6e";ctx.fillRect(x-37,y-58+row*27,74,5);
      for(let col=0;col<4;col++) {
        ctx.fillStyle=["#7faea9","#d8968d","#b1bd79","#b4a1cb"][col];
        ctx.fillRect(x-29+col*16,y-76+row*27,10,18);
        ctx.fillStyle="#eee6bd";ctx.fillRect(x-27+col*16,y-79+row*27,6,4);
      }
    }
  } else if (kind === 24) {
    ctx.fillStyle="#614d46";ctx.fillRect(x-32,y-80,5,90);ctx.fillRect(x+27,y-80,5,90);ctx.fillRect(x-32,y-80,64,5);
    for(let i=0;i<3;i++){ctx.fillStyle=["#76ad91","#c78197","#8d80bc"][i];ctx.fillRect(x-25+i*18,y-62,15,46);ctx.fillRect(x-29+i*18,y-62,23,12);ctx.strokeStyle="#e0c793";ctx.beginPath();ctx.moveTo(x-20+i*18,y-76);ctx.lineTo(x-27+i*18,y-63);ctx.lineTo(x-12+i*18,y-63);ctx.stroke();}
  } else if (kind === 25) {
    ctx.fillStyle="#745942";ctx.fillRect(x-30,y-84,60,72);ctx.fillStyle="#acd1d3";ctx.fillRect(x-25,y-79,50,60);
    ctx.fillStyle="#e8f5e488";ctx.beginPath();ctx.moveTo(x-22,y-75);ctx.lineTo(x+10,y-75);ctx.lineTo(x-22,y-40);ctx.fill();
    ctx.fillStyle="#604e68";ctx.fillRect(x-24,y-30,48,33);ctx.fillStyle="#c49a8a";ctx.fillRect(x-26,y-7,52,12);ctx.fillStyle="#888783";ctx.fillRect(x-3,y+4,6,13);
  } else if (kind === 23) {
    ctx.fillStyle="#88766a";ctx.fillRect(x-36,y-65,72,74);
    ctx.fillStyle="#483d36";ctx.fillRect(x-25,y-36,50,42);
    for(let i=0;i<4;i++) {
      ctx.fillStyle=i%2?"#ffc270":"#e48857";ctx.beginPath();ctx.ellipse(x-18+i*12,y-5,7,15+Math.sin(time*8+i)*5,0,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle="#bda58a";ctx.fillRect(x-40,y-68,80,10);
  }
}
