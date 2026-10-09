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

export { drawIllustratedKeeper as drawDressedKeeper } from "./keeperArt";
