// Animated landmarks use the same world-space canvas as terrain and collisions.
export function drawFrontierLandmark(c:CanvasRenderingContext2D,id:string,x:number,y:number,t:number):boolean {
  if(!["saffron","threadhaven","mirelight","tempest","crownspire","dreamland"].includes(id))return false;
  c.save();c.translate(x,y);c.lineWidth=4;
  if(id==="saffron") {
    c.fillStyle="#876f50";c.fillRect(-51,-100,102,105);c.fillStyle="#e3c284";c.fillRect(-42,-96,84,88);c.fillStyle="#6a6553";
    c.beginPath();c.moveTo(-31,-89);c.lineTo(31,-89);c.lineTo(0,-51);c.lineTo(31,-14);c.lineTo(-31,-14);c.lineTo(0,-51);c.closePath();c.fill();
    c.fillStyle="#f2d691";c.beginPath();c.moveTo(-25,-22);c.lineTo(25,-22);c.lineTo(0,-46);c.fill();c.fillRect(-1,-58,2,20);
    for(let i=0;i<4;i++)c.fillRect(-1,-77+(i*12+t*10)%26,2,3);
    c.fillStyle="#b49666";c.fillRect(-60,-107,120,12);c.fillRect(-60,-6,120,15);
  } else if(id==="threadhaven") {
    c.fillStyle="#dbc9a1";c.beginPath();c.moveTo(-34,5);c.lineTo(-25,-88);c.lineTo(25,-88);c.lineTo(34,5);c.fill();c.fillStyle="#9f6872";c.beginPath();c.moveTo(-43,-87);c.lineTo(0,-121);c.lineTo(43,-87);c.fill();
    c.fillStyle="#715d53";c.fillRect(-10,-23,20,29);c.translate(0,-73);c.rotate(t*.3);
    for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.fillStyle="#785f52";c.fillRect(-3,0,6,73);c.fillStyle="#f7e7b6";c.fillRect(3,22,19,45);c.strokeStyle="#b7a377";c.strokeRect(3,22,19,45);}
    c.fillStyle="#efd391";c.beginPath();c.arc(0,0,9,0,7);c.fill();
  } else if(id==="mirelight") {
    c.strokeStyle="#bfd0b0";c.lineWidth=11;c.beginPath();c.moveTo(-68,0);c.bezierCurveTo(-72,-95,55,-110,66,-12);c.stroke();
    for(let i=0;i<7;i++){const px=-55+i*18,py=-65-Math.sin(i/6*Math.PI)*28;c.strokeStyle="#bcc9a6";c.lineWidth=5;c.beginPath();c.moveTo(px,py);c.lineTo(px-7,py+30);c.stroke();c.strokeStyle="#657d6a";c.lineWidth=2;c.beginPath();c.moveTo(px,py);c.lineTo(px,py+50);c.stroke();c.fillStyle=`rgba(243,217,119,${.7+.2*Math.sin(t*2+i)})`;c.fillRect(px-4,py+44,9,12);}
  } else if(id==="tempest") {
    c.strokeStyle="#c3b1d7";c.lineWidth=13;c.beginPath();c.moveTo(-54,0);c.lineTo(-41,-104);c.quadraticCurveTo(3,-75,48,-119);c.lineTo(39,0);c.closePath();c.stroke();
    c.strokeStyle="#e4d49a";c.lineWidth=2;for(let i=0;i<7;i++){c.beginPath();c.moveTo(-31+i*10,-91-i*2);c.quadraticCurveTo(-25+i*10+Math.sin(t*4+i)*4,-42,-32+i*10,-3);c.stroke();}
    c.fillStyle="#dcd5ff";c.beginPath();c.moveTo(-7,-122);c.lineTo(4,-144);c.lineTo(2,-130);c.lineTo(12,-130);c.lineTo(-1,-110);c.lineTo(2,-124);c.fill();
  } else if(id==="crownspire") {
    c.fillStyle="#dad1e2";c.fillRect(-39,-48,78,55);c.fillStyle="#b7a6c5";c.fillRect(-48,-4,96,14);
    c.translate(0,Math.sin(t*1.8)*4);c.fillStyle="#d5ae59";c.beginPath();c.moveTo(-46,-67);c.lineTo(-54,-114);c.lineTo(-23,-88);c.lineTo(0,-130);c.lineTo(23,-88);c.lineTo(54,-114);c.lineTo(46,-67);c.closePath();c.fill();c.fillStyle="#f4df97";c.fillRect(-47,-73,94,12);c.fillStyle="#b499d5";for(const px of [-28,0,28]){c.beginPath();c.ellipse(px,-79,5,8,0,0,7);c.fill();}
  } else {
    c.strokeStyle="#d0b9e7";c.lineWidth=14;c.beginPath();c.ellipse(0,-59,43,62,0,0,Math.PI*2);c.stroke();
    const glow=c.createRadialGradient(0,-59,4,0,-59,54);glow.addColorStop(0,"#f1d5ed");glow.addColorStop(.6,"#a284d3bb");glow.addColorStop(1,"#74609611");c.fillStyle=glow;c.beginPath();c.ellipse(0,-59,36,56,0,0,7);c.fill();
    for(let i=0;i<12;i++){const a=t*.5+i*Math.PI/6;c.fillStyle="#f7e9b8";c.fillRect(Math.cos(a)*49-2,-59+Math.sin(a)*68-2,4,4);}
  }
  c.restore();return true;
}
