import {interiorName,type Interior} from './adventure';
import {drawArt,paintSurface} from './illustratedArt';

// Room boundaries and furniture anchors still match the existing walking grid.
export function drawInterior(c:CanvasRenderingContext2D,room:Interior,time:number){
 const mint=room==='lodge'||room==='nursery';
 c.fillStyle='#18292c';c.fillRect(0,0,1152,832);
 c.shadowColor='#071c2380';c.shadowBlur=30;c.fillStyle='#463b31';c.fillRect(252,145,648,554);c.shadowBlur=0;
 c.fillStyle='#b68c59';c.fillRect(264,208,624,480);paintSurface(c,3,264,208,624,480,160);
 c.fillStyle='#d6c5a0';c.fillRect(264,138,624,78);
 for(let x=264;x<888;x+=78)drawArt(c,'illustrated-decor.png',15,x+39,228,84,94);
 for(const x of [256,880]){c.fillStyle='#5c4933';c.fillRect(x,211,16,477);c.fillStyle='#bf975d';c.fillRect(x+4,211,4,477);}
 // Patterned wool runner, with a recessed border and small stitched diamond motifs.
 c.fillStyle='#122c293d';c.fillRect(514,353,124,323);c.fillStyle=mint?'#548d7c':room==='barber'?'#965366':'#665b86';c.fillRect(520,355,112,317);
 c.strokeStyle='#d8bd7e';c.lineWidth=2;c.strokeRect(526,361,100,305);c.strokeStyle='#eee1b188';c.lineWidth=1;c.strokeRect(532,367,88,293);
 for(let yy=392;yy<650;yy+=44){c.save();c.translate(576,yy);c.rotate(Math.PI/4);c.strokeStyle='#e8d39a';c.strokeRect(-8,-8,16,16);c.strokeRect(-3,-3,6,6);c.restore();}
 for(const x of [361,786]){drawArt(c,'illustrated-decor.png',14,x,213,76,84);const g=c.createLinearGradient(0,216,0,420);g.addColorStop(0,'#fbe8ac25');g.addColorStop(1,'#fbe8ac00');c.fillStyle=g;c.beginPath();c.moveTo(x-24,216);c.lineTo(x+24,216);c.lineTo(x+76,420);c.lineTo(x-70,420);c.fill();}
 c.fillStyle='#304b40';c.strokeStyle='#d1b977';c.lineWidth=2;c.beginPath();c.roundRect(470,162,212,36,8);c.fill();c.stroke();c.font='600 15px Georgia';c.textAlign='center';c.fillStyle='#f6e4b9';c.fillText(interiorName(room),576,185);
 for(const x of [292,860])drawArt(c,'illustrated-decor.png',7,x,285,38,54);
 c.fillStyle='#342e2c';c.fillRect(528,670,96,24);c.fillStyle='#c69c60';c.fillRect(534,674,84,12);c.globalAlpha=.65+Math.sin(time*2)*.15;c.fillStyle='#ffe9b5';c.beginPath();c.moveTo(566,677);c.lineTo(586,677);c.lineTo(576,685);c.fill();c.globalAlpha=1;c.font='11px sans-serif';c.fillStyle='#d4e3d0';c.fillText('↓ OUTSIDE',576,712);
}
export function drawFurniture(c:CanvasRenderingContext2D,kind:number,x:number,y:number,_lodge:boolean,time:number){
 const frame:Record<number,number>={20:0,21:1,22:2,23:3,24:4,25:5,26:6};
 const width=kind===21?76:kind===22?82:kind===23?89:77,height=kind===21?68:kind===20?88:98;
 drawArt(c,'illustrated-decor.png',frame[kind]??7,x,y+12,width,height);
 if(kind===23){const glow=c.createRadialGradient(x,y-10,3,x,y-10,55);glow.addColorStop(0,'#ffc36624');glow.addColorStop(1,'#ffc36600');c.fillStyle=glow;c.fillRect(x-55,y-65,110,110);c.save();c.globalAlpha=.25+Math.sin(time*7)*.08;c.fillStyle='#fff1b1';c.beginPath();c.ellipse(x,y-12,6,10,0,0,7);c.fill();c.restore();}
}
