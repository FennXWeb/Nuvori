import {useState} from 'react';
import {ArrowUpRight,Check,ScrollText} from 'lucide-react';
import {Modal} from './components';
import {RELEASES} from './menuModel';
export function UpdateArchive({onClose}:{onClose:()=>void}){
 const [selected,setSelected]=useState(0),release=RELEASES[selected];
 return <Modal title="The Auralis chronicles" eyebrow="UPDATE ARCHIVE" onClose={onClose} wide><div className="update-archive"><nav aria-label="Update versions">{RELEASES.map((r,i)=><button key={r.version} aria-pressed={selected===i} onClick={()=>setSelected(i)}><small>VERSION {r.version}{i===0?' · LATEST':''}</small><strong>{r.title}</strong><span>{r.tag}</span></button>)}</nav><article key={release.version}><span className="archive-mark"><ScrollText size={30}/></span><span className="eyebrow">{release.tag} · {release.date}</span><h3>{release.title}</h3><p className="archive-version">Nuvori {release.version}</p><ul>{release.highlights.map(line=><li key={line}><Check size={16}/><span>{line}</span></li>)}</ul><p>{release.detail}</p><a href="https://github.com/FennXWeb/Nuvori/blob/main/docs/RELEASE-NOTES.md" target="_blank" rel="noreferrer">Full release notes <ArrowUpRight size={15}/></a></article></div></Modal>;
}
