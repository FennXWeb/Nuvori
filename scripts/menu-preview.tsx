import {useState} from 'react';
import {createRoot} from 'react-dom/client';
function Preview(){const [size,setSize]=useState([390,844]);return <main style={{background:'#33414a',color:'#fff',minHeight:'100vh',padding:16,fontFamily:'system-ui'}}><h1>Nuvori responsive menu workshop</h1><p>Local preview. This frame uses only the localhost guest adventure.</p><nav style={{display:'flex',gap:10,marginBottom:20}}>{[[390,844],[768,1024],[1280,720]].map(([w,h])=><button key={w} onClick={()=>setSize([w,h])}>{w} × {h}</button>)}</nav><iframe title="Nuvori responsive preview" src="../" style={{width:size[0],height:size[1],border:0,display:'block'}}/></main>}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Preview/>);
