import {useEffect,useRef} from 'react';

/** Native SVG cursor stays precise; this optional, noninteractive ripple marks a press. */
export function NuvoriCursor(){
 const ref=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const fine=matchMedia('(pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let timer:ReturnType<typeof setTimeout>;
  const up=()=>document.documentElement.classList.remove('nu-cursor-down');
  const down=(e:PointerEvent)=>{if(!fine.matches||e.pointerType==='touch'||e.button!==0)return;document.documentElement.classList.add('nu-cursor-down');
   const el=ref.current;if(el&&!reduced.matches){clearTimeout(timer);el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';el.classList.remove('burst');void el.offsetWidth;el.classList.add('burst');timer=setTimeout(()=>el.classList.remove('burst'),480);}
  };
  window.addEventListener('pointerdown',down,{passive:true});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('blur',up);
  return()=>{clearTimeout(timer);up();window.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('blur',up);};
 },[]);
 return <span ref={ref} className="nu-cursor-ripple" aria-hidden="true"/>;
}
