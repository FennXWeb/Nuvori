// Animated landmarks use the same world-space canvas as terrain and collisions.
export function drawFrontierLandmark(c:CanvasRenderingContext2D,id:string,x:number,y:number,t:number):boolean {
  if(!["saffron","threadhaven","mirelight","tempest","crownspire","dreamland","brookbend","bramble","echohollow","glassvein","lanternlake","rimewind"].includes(id))return false;
  c.save();c.translate(x,y);c.lineWidth=4;
  if(id==="brookbend"){
    c.fillStyle="#667b76";c.fillRect(-47,-58,64,64);c.fillStyle="#dbc398";c.fillRect(-40,-54,52,45);c.fillStyle="#546954";c.beginPath();c.moveTo(-56,-55);c.lineTo(-14,-91);c.lineTo(26,-55);c.fill();c.fillStyle="#36574d";c.fillRect(-25,-33,18,25);
    c.save();c.translate(29,-27);c.rotate(t*.24);c.strokeStyle="#654934";c.lineWidth=8;c.beginPath();c.arc(0,0,35,0,Math.PI*2);c.stroke();c.strokeStyle="#c5a272";c.lineWidth=4;for(let i=0;i<10;i++){c.rotate(Math.PI/5);c.beginPath();c.moveTo(0,0);c.lineTo(35,0);c.stroke();c.fillStyle="#886441";c.fillRect(28,-7,13,14);}c.fillStyle="#dac499";c.beginPath();c.arc(0,0,7,0,7);c.fill();c.restore();
    c.fillStyle="#8ac3c2";for(let i=0;i<5;i++)c.fillRect(37+i*7,Math.sin(t*4+i)*4+10,4,2);
  }else if(id==="bramble"){
    c.fillStyle="#677953";c.fillRect(-43,-9,86,17);c.strokeStyle="#aac18c";c.lineWidth=10;c.beginPath();c.moveTo(-34,0);c.lineTo(-34,-54);c.quadraticCurveTo(0,-102,34,-54);c.lineTo(34,0);c.stroke();
    for(let i=0;i<10;i++){const a=Math.PI+i*Math.PI/9,xx=Math.cos(a)*34,yy=-46+Math.sin(a)*36;c.fillStyle=i%2?"#eba3b4":"#d87b9e";c.beginPath();c.arc(xx,yy,8,0,7);c.fill();c.fillStyle="#f3ce9c";c.fillRect(xx-2,yy-2,4,4);}
    c.fillStyle="#cfc697";c.beginPath();c.ellipse(0,-3,20,7,0,0,7);c.fill();c.fillStyle="#91bb83";c.fillRect(-4,-42,8,38);c.fillStyle="#f3b6c5";c.beginPath();c.arc(0,-45+Math.sin(t)*2,12,0,7);c.fill();
  }else if(id==="echohollow"){
    c.fillStyle="#4c6074";c.beginPath();c.ellipse(0,-3,58,19,0,0,7);c.fill();
    for(const [xx,height,color] of [[-30,61,"#97b8e0"],[0,104,"#b5d9e8"],[31,73,"#83c6c8"]] as const){c.fillStyle=color;c.beginPath();c.moveTo(xx-15,0);c.lineTo(xx-19,-height+24);c.lineTo(xx,-height);c.lineTo(xx+19,-height+23);c.lineTo(xx+13,-4);c.closePath();c.fill();c.fillStyle="#effafa77";c.beginPath();c.moveTo(xx,-height);c.lineTo(xx+3,-7);c.lineTo(xx+15,-height+23);c.fill();}
    c.globalAlpha=.25+Math.sin(t*2)*.1;c.fillStyle="#a9e0e8";c.beginPath();c.ellipse(0,-42,67,70,0,0,7);c.fill();c.globalAlpha=1;
  }else if(id==="glassvein"){
    c.fillStyle="#6f5848";c.fillRect(-44,-84,9,89);c.fillRect(35,-84,9,89);c.fillRect(-50,-91,100,13);c.fillStyle="#bca27a";c.fillRect(-44,-80,4,79);c.fillRect(36,-80,4,79);
    for(const xx of [-22,22]){c.strokeStyle="#a78f65";c.lineWidth=2;c.beginPath();c.moveTo(xx,-85);c.lineTo(xx,-48);c.stroke();c.fillStyle="#435055";c.fillRect(xx-9,-50,18,25);c.fillStyle="#f5d58c";c.fillRect(xx-6,-47,12,18);}
    c.fillStyle="#817866";c.fillRect(-31,-14,62,24);c.fillStyle="#b2c8d4";for(let i=0;i<6;i++)c.fillRect(-25+i*9,-24+i%2*5,7,15);c.fillStyle="#344b4e";for(const xx of [-21,21]){c.beginPath();c.arc(xx,11,8,0,7);c.fill();}
  }else if(id==="lanternlake"){
    c.fillStyle="#8c684e";c.fillRect(-55,-5,110,12);c.fillRect(-44,-49,88,47);c.fillStyle="#d6bf92";c.fillRect(-38,-45,76,38);c.fillStyle="#567d78";c.beginPath();c.moveTo(-59,-47);c.lineTo(0,-91);c.lineTo(59,-47);c.fill();c.fillStyle="#d6dcbb";c.fillRect(-5,-69,10,15);c.fillStyle="#355654";c.fillRect(-12,-36,24,32);
    for(const xx of [-28,28]){c.fillStyle="#95c5be";c.fillRect(xx-8,-34,16,17);c.fillStyle="#ead9a7";c.fillRect(xx-1,-34,2,17);}
    c.strokeStyle="#6b5946";c.lineWidth=3;c.beginPath();c.moveTo(59,7);c.lineTo(59,-57);c.stroke();c.fillStyle="#f1d394";c.fillRect(53,-56,12,19);
  }else if(id==="rimewind"){
    for(const [yy,w] of [[0,94],[-21,76],[-41,58],[-61,38]]){c.fillStyle="#7c97a1";c.beginPath();c.roundRect(-w/2,yy-15,w,25,7);c.fill();c.fillStyle="#d7e7e4";c.fillRect(-w/2+4,yy-14,w-8,6);}
    c.strokeStyle="#abbdc2";c.lineWidth=4;c.beginPath();c.moveTo(0,-62);c.lineTo(0,-119);c.stroke();c.fillStyle="#99b8d1";c.beginPath();c.moveTo(1,-117);c.lineTo(31+Math.sin(t*2)*4,-107);c.lineTo(1,-95);c.fill();
  }else if(id==="saffron") {
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
