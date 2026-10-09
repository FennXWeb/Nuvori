export const SKIN_TONES = ["#f6d7b5","#e9b88e","#cb946b","#aa704e","#805239","#593a30"];
export const LOOK_COLORS = ["#283c51","#67413b","#be8447","#f2d391","#faf1de","#db787b","#9e80cf","#568eae","#56b399","#416b50","#c1495b","#202837"];
export const HAIR_STYLES = ["Tousled","Cropped","Side swept","Long braid","Twin buns","Wild spikes","Ponytail","Bob","Long waves","Curly crown","Shaved","Mohawk"];
export const TOP_STYLES = ["Trail jacket","T-shirt","Overalls","Sailor shirt","Hoodie","Long coat","Striped sweater","Vest","Starlace coat","Dawnwarden regalia"];
export const BOTTOM_STYLES = ["Trousers","Shorts","Skirt","Dungarees"];
export const HAT_STYLES = ["None","Beanie","Sunhat","Ribbon","Starlace halo","Dawnwarden crown"];
export const ACCESSORIES = ["None","Glasses","Scarf","Satchel","Earrings","Freckles"];
export interface Appearance { skin:number; eyes:number; hairStyle:number; hairTint:number; top:number; topTint:number; bottom:number; bottomTint:number; shoes:number; hat:number; accessory:number }
export const DEFAULT_APPEARANCE:Appearance = {skin:1,eyes:8,hairStyle:0,hairTint:1,top:0,topTint:9,bottom:0,bottomTint:0,shoes:1,hat:0,accessory:0};
export const APPEARANCE_LIMITS:Record<keyof Appearance,number>={skin:6,eyes:12,hairStyle:12,hairTint:12,top:10,topTint:12,bottom:4,bottomTint:12,shoes:12,hat:6,accessory:6};
export function validAppearance(value:unknown):value is Appearance {
  if(!value||typeof value!=="object")return false;
  return Object.entries(APPEARANCE_LIMITS).every(([k,max])=>{const n=(value as Record<string,unknown>)[k];return Number.isInteger(n)&&Number(n)>=0&&Number(n)<max;});
}
export function cosmeticFor(key:keyof Appearance,index:number){return key==="top"&&index>=8?`s1-top-${index}`:key==="hat"&&index>=4?`s1-hat-${index}`:undefined;}

/** A directional, layered 32px keeper. All materials share the same walk/sprint pose. */
export function drawDressedKeeper(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,a:Appearance,direction=0,phase=0,moving=false){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(size/48,size/48);
 const back=direction===3,side=direction===1||direction===2,flip=direction===1?-1:1;
 ctx.scale(flip,1);const walk=moving?Math.sin(phase)*2:0,bob=moving?Math.abs(Math.sin(phase))*.7:Math.sin(phase)*.2;
 ctx.translate(0,-bob);const skin=SKIN_TONES[a.skin],hair=LOOK_COLORS[a.hairTint],shirt=LOOK_COLORS[a.topTint],pants=LOOK_COLORS[a.bottomTint];
 const box=(c:string,px:number,py:number,w:number,h:number)=>{ctx.fillStyle=c;ctx.fillRect(px,py,w,h);};
 const outline="#263042";
 // Hair behind shoulders, trousers and independent walking feet.
 if([3,6,8].includes(a.hairStyle)){box(outline,-8,-28,16,19);box(hair,-7,-28,14,17);}
 box(outline,-6,-11,12,10);box(pants,-5,-10,4,8);box(pants,1,-10,4,8);
 if(a.bottom===1){box(skin,-5,-5,4,4);box(skin,1,-5,4,4);}
 if(a.bottom===2){box(pants,-7,-11,14,8);box(outline,-7,-3,14,1);}
 box(outline,-6,-2+walk,6,3);box(LOOK_COLORS[a.shoes],-5,-2+walk,4,2);
 box(outline,1,-2-walk,6,3);box(LOOK_COLORS[a.shoes],2,-2-walk,4,2);
 box(outline,-7,-22,14,12);box(shirt,-6,-21,12,a.top===5||a.top>=8?17:11);
 if(a.top===5||a.top>=8){box(outline,-7,-5,14,1);box("#ead399",-1,-20,2,15);}
 if(a.top===2||a.bottom===3){box(pants,-5,-16,10,7);box(pants,-4,-21,2,6);box(pants,2,-21,2,6);box("#ead399",-4,-17,1,1);box("#ead399",3,-17,1,1);}
 if(a.top===6)for(let j=0;j<3;j++)box("#ece6d1",-6,-20+j*3,12,1);
 if(a.top===3){box("#f2e5c7",-6,-21,12,2);box("#bd4e62",-1,-19,2,5);}
 if(a.top===7){box("#eaddc7",-2,-21,4,11);box(outline,-1,-18,1,1);box(outline,-1,-14,1,1);}
 box(outline,-10,-20-walk,4,11);box(shirt,-9,-19-walk,3,a.top===1?4:7);box(skin,-9,-12-walk,3,3);
 box(outline,7,-20+walk,4,11);box(shirt,7,-19+walk,3,a.top===1?4:7);box(skin,7,-12+walk,3,3);
 if(a.top===4&&back){box("#263042",-5,-24,10,7);box(shirt,-4,-23,8,5);}
 // Face and ear; back and side frames have distinct silhouettes.
 box(outline,-6,-34,12,13);box(outline,-7,-32,14,9);box(skin,-5,-33,10,11);box(skin,-6,-31,12,8);box(skin,side?6:-8,-29,2,4);
 ctx.globalAlpha=.16;box("#fff0be",-5,-31,7,5);box("#603543",4,-29,2,7);ctx.globalAlpha=1;
 if(!back){box("#fff4dd",side?1:-4,-28,2,2);box(LOOK_COLORS[a.eyes],side?2:-3,-28,1,2);if(!side){box("#fff4dd",3,-28,2,2);box(LOOK_COLORS[a.eyes],3,-28,1,2);}box("#9d5d53",side?4:-1,-24,2,1);}
 // Twelve genuinely different hairstyles, all rendered in each facing direction.
 if(a.hairStyle!==10){box(outline,-8,-36,16,7);box(hair,-7,-35,14,5);box(hair,-7,-31,3,5);if(back)box(hair,-6,-31,12,8);else if(!side)box(hair,5,-31,2,5);
 if(a.hairStyle===0||a.hairStyle===5||a.hairStyle===9){for(let i=0;i<5;i++){box(outline,-7+i*3,-38-(i%2)*2,3,4);box(hair,-6+i*3,-37-(i%2)*2,2,4);}}
 if(a.hairStyle===1){box(skin,-6,-33,12,2);}
 if(a.hairStyle===2){for(let i=0;i<4;i++)box(hair,-5+i*3,-32,3,5-i);}
 if(a.hairStyle===3)for(let i=0;i<6;i++){box(outline,6+(i%2),-27+i*2,4,3);box(hair,7+(i%2),-27+i*2,2,2);}
 if(a.hairStyle===4){box(outline,-11,-35,5,6);box(outline,6,-35,5,6);box(hair,-10,-34,4,4);box(hair,7,-34,3,4);}
 if(a.hairStyle===6){box(hair,side?-10:7,-33,4,17);box("#e3a379",side?-10:7,-31,4,2);}
 if(a.hairStyle===7){box(hair,-8,-30,3,9);box(hair,5,-30,3,9);}
 if(a.hairStyle===8){box(hair,-9,-29,4,16);box(hair,6,-29,4,16);}
 if(a.hairStyle===11){box(skin,-7,-34,4,4);box(skin,3,-34,4,4);box(hair,-2,-40,5,10);}
 ctx.globalAlpha=.16;box("#fff3cc",-5,-35,7,2);box("#141c35",5,-34,2,5);
 if([3,6,7,8].includes(a.hairStyle)){box("#fff3cc",-8,-28,1,a.hairStyle===8?12:5);box("#17233e",8,-28,1,a.hairStyle===8?14:5);}ctx.globalAlpha=1;
 }
 // Seams, cuffs, shaded shoulders and boots give the small sprite readable depth.
 ctx.globalAlpha=.16;box("#fff1cd",-5,-20,4,7);box("#162237",3,-19,3,8);box("#162237",-5,-8,2,5);box("#fff1cd",2,-9,2,4);ctx.globalAlpha=1;
 if(a.top===0){box("#d5c09b",-1,-20,1,9);box("#233f39",-5,-16,3,2);box("#233f39",2,-16,3,2);}
 if(a.top===9){box("#f7d18a",-9,-21,4,3);box("#f7d18a",6,-21,4,3);box("#94d4c0",-2,-17,3,3);}
 if(a.hat===1){box(outline,-9,-38,18,7);box(shirt,-8,-37,16,5);box("#f2ddb5",-8,-32,16,2);}
 if(a.hat===2){box("#a27143",-13,-33,26,3);box("#edd29a",-8,-39,16,7);box("#bd5f6a",-8,-34,16,2);}
 if(a.hat===3){box("#e889a4",5,-36,4,4);box("#e889a4",10,-36,4,4);box("#ffe4c1",9,-35,1,2);}
 if(a.hat===4){box("#d4fff4",-8,-42,16,1);box("#94ceff",-10,-41,2,2);box("#94ceff",8,-41,2,2);}
 if(a.hat===5){box("#f8d578",-8,-37,16,3);for(let i=0;i<3;i++)box("#f8d578",-8+i*7,-41,2,5);}
 if(a.accessory===1&&!back){box(outline,-6,-29,5,4);box(outline,1,-29,5,4);box("#b5d9d9",-5,-28,3,2);box("#b5d9d9",2,-28,3,2);box(outline,-1,-28,2,1);}
 if(a.accessory===2){box("#e4a053",-6,-22,12,3);box("#e4a053",3,-19,3,9);}
 if(a.accessory===3){box("#94674c",4,-17,7,7);box("#e7c58f",5,-16,5,2);box("#593b32",-4,-21,2,6);}
 if(a.accessory===4){box("#ffd878",-8,-26,1,3);box("#ffd878",7,-26,1,3);}
 if(a.accessory===5&&!back){box("#a57359",-5,-25,1,1);box("#a57359",4,-25,1,1);}
 ctx.restore();
}
