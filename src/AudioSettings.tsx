import { useState } from "react";
import { Headphones, Music2, Wind, Volume2 } from "lucide-react";
import { AUDIO_CUES, gameAudio } from "./audio";
import { DEFAULT_MIX, validMix, type AudioMix } from "./audioCues";
import "./audio.css";

export function readAudioMix() {
  try { return validMix(JSON.parse(localStorage.getItem("nuvori-audio-mix") || "null")); }
  catch { return { ...DEFAULT_MIX }; }
}

export function AudioSettings({ enabled, setEnabled, mix, setMix }: { enabled: boolean; setEnabled: (value: boolean) => void; mix: AudioMix; setMix: (mix: AudioMix) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const readyMusic = Object.values(AUDIO_CUES).filter(cue => cue.kind === "music" && cue.available).length;
  return <section className="audio-settings" aria-label="Audio settings">
    <div className="audio-settings-heading"><Headphones size={23}/><div><h3>The sound of Auralis</h3><p>Music, little details, and a world that breathes.</p></div><button className="secondary-button" onClick={() => { gameAudio.configure(!enabled, mix); void gameAudio.unlock(); setEnabled(!enabled); }}>{enabled ? "Mute all" : "Enable audio"}</button></div>
    {([['music',Music2,'Music'],['sfx',Volume2,'Sound effects'],['ambience',Wind,'World ambience']] as const).map(([key, Icon, label]) => <label className="audio-slider" key={key}><span><Icon size={16}/>{label}</span><input aria-label={`${label} volume`} type="range" min="0" max="100" value={Math.round(mix[key]*100)} onChange={e => setMix({ ...mix, [key]: Number(e.target.value)/100 })}/><output>{Math.round(mix[key]*100)}%</output></label>)}
    <p className="audio-note">Audio pauses in background tabs. {readyMusic ? `${readyMusic} original music themes are installed.` : 'The soundtrack is ready for your Suno tracks.'}</p>
    <div className="audio-preview-row">{['move-bloom','move-flame','cry-spriglet','evolve'].filter(id => AUDIO_CUES[id]?.available).map(id => <button className="small-action" key={id} disabled={!enabled} onClick={() => { setPreview(id); gameAudio.play(id); }}>{preview === id ? '♪ ' : '▶ '}{AUDIO_CUES[id].title}</button>)}</div>
    <a className="text-button" href={`${import.meta.env.BASE_URL}audio/studio.html`} target="_blank" rel="noreferrer">Open Suno music prompts & handoff studio ↗</a>
  </section>;
}
