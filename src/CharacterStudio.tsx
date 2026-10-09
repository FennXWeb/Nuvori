import {useState} from "react";
import { PlayerArt } from "./components";
import {SKIN_TONES,LOOK_COLORS,HAIR_STYLES,TOP_STYLES,BOTTOM_STYLES,HAT_STYLES,ACCESSORIES,cosmeticFor,type Appearance} from "./appearance";
export function CharacterStudio({value,onChange,owned=[],mode="all"}:{value:Appearance;onChange:(a:Appearance)=>void;owned?:string[];mode?:"all"|"tailor"|"barber"}){
 const [tab,setTab]=useState(mode==="tailor"?"Clothing":mode==="barber"?"Hair":"Appearance"),[direction,setDirection]=useState(0);
 const choose=(key:keyof Appearance,n:number)=>onChange({...value,[key]:n});
 const choices=(key:keyof Appearance,names:string[])=> <div className="studio-options">{names.map((name,i)=>{const required=cosmeticFor(key,i),locked=Boolean(required&&!owned.includes(required));return <button type="button" key={name} disabled={locked} aria-pressed={value[key]===i} onClick={()=>choose(key,i)}><span>{name}</span>{locked&&<small>Season 1 reward</small>}</button>;})}</div>;
 const swatches=(key:keyof Appearance,colors=LOOK_COLORS)=><div className="studio-swatches">{colors.map((color,i)=><button type="button" key={i} style={{background:color}} aria-label={`${key} color ${i+1}`} aria-pressed={value[key]===i} onClick={()=>choose(key,i)}>{value[key]===i?"✓":""}</button>)}</div>;
 return <section className="character-studio"><div className="studio-mirror"><span className="eyebrow">MAKE YOURSELF AT HOME</span><PlayerArt size={230} look={{appearance:value}} direction={direction}/><div><button type="button" aria-label="Turn keeper left" onClick={()=>setDirection(v=>(v+3)%4)}>↶</button><span>Live preview</span><button type="button" aria-label="Turn keeper right" onClick={()=>setDirection(v=>(v+1)%4)}>↷</button></div><button type="button" className="text-button" onClick={()=>onChange({...value,...(mode!=="tailor"?{skin:Math.floor(Math.random()*6),eyes:Math.floor(Math.random()*12),hairStyle:Math.floor(Math.random()*12),hairTint:Math.floor(Math.random()*12)}:{}),...(mode!=="barber"?{top:Math.floor(Math.random()*8),topTint:Math.floor(Math.random()*12),bottom:Math.floor(Math.random()*4),bottomTint:Math.floor(Math.random()*12),hat:Math.floor(Math.random()*4)}:{})})}>✧ Surprise me</button></div>
 <div className="studio-editor"><nav aria-label="Customization categories">{(mode==="tailor"?["Clothing","Accessories"]:mode==="barber"?["Appearance","Hair"]:["Appearance","Hair","Clothing","Accessories"]).map(t=><button type="button" aria-pressed={tab===t} onClick={()=>setTab(t)} key={t}>{t}</button>)}</nav>
 {tab==="Appearance"&&<><h4>Skin tone</h4>{swatches("skin",SKIN_TONES)}<h4>Eye color</h4>{swatches("eyes")}</>}
 {tab==="Hair"&&<><h4>Hairstyle</h4>{choices("hairStyle",HAIR_STYLES)}<h4>Hair color</h4>{swatches("hairTint")}</>}
 {tab==="Clothing"&&<><h4>Top</h4>{choices("top",TOP_STYLES)}{swatches("topTint")}<h4>Bottom</h4>{choices("bottom",BOTTOM_STYLES)}{swatches("bottomTint")}<h4>Shoes</h4>{swatches("shoes")}</>}
 {tab==="Accessories"&&<><h4>Headwear</h4>{choices("hat",HAT_STYLES)}<h4>Finishing touches</h4>{choices("accessory",ACCESSORIES)}</>}
 </div></section>;
}
