import manifest from "./audioManifest.json";
import { DEFAULT_MIX, validMix, creatureSound, moveSound, type AudioMix } from "./audioCues";
import { FootstepSequence, FootstepStride, FOOTSTEP_TAKES, type FootstepSurface } from "./footsteps";
import { MOVE_BY_ID, TYPES } from "./data";

interface Cue { title: string; kind: string; file: string; available: boolean; seconds: number; loopStart?: number | null; loopEnd?: number | null }
export const AUDIO_CUES = manifest as Record<string, Cue>;
const BASE = (import.meta.env ?? {}).BASE_URL || "./";
type LoopBus = "music" | "ambience";
interface Loop { id: string; source: AudioBufferSourceNode; gain: GainNode }

/** One mixer for the whole game; assets load only when heard, never at app startup. */
export class GameAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private buses?: Record<keyof AudioMix, GainNode>;
  private buffers = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private loops: Partial<Record<LoopBus, Loop>> = {};
  private desired: Record<LoopBus, string | null> = { music: null, ambience: null };
  private generations = { music: 0, ambience: 0 };
  private effects = new Set<AudioBufferSourceNode | OscillatorNode>();
  private played = new Map<string, number>();
  private enabled = false;
  private paused = false;
  private mix = DEFAULT_MIX;
  private duckUntil = 0;
  private stride = new FootstepStride();
  private footstepSequence = new FootstepSequence();
  private footstepGeneration = 0;
  private effectGeneration = 0;
  private walking = false;
  private footstepSurface?: FootstepSurface;

  configure(enabled: boolean, mix = this.mix) {
    this.enabled = enabled;
    this.mix = validMix(mix);
    this.applyVolumes();
    if (!enabled) {
      this.stopEffects();
      for (const bus of ["music", "ambience"] as const) {
        this.generations[bus]++;
        this.loops[bus]?.source.stop(); delete this.loops[bus];
      }
    }
    if (enabled && this.context?.state === "running") this.refreshLoops();
  }

  async unlock() {
    if (!this.enabled || this.paused || typeof AudioContext === "undefined") return;
    try {
      if (!this.context) {
        const context = this.context = new AudioContext();
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -8;
        compressor.ratio.value = 4;
        this.master = context.createGain();
        this.master.connect(compressor); compressor.connect(context.destination);
        this.buses = { music: context.createGain(), sfx: context.createGain(), ambience: context.createGain() };
        Object.values(this.buses).forEach(bus => bus.connect(this.master!));
      }
      await this.context.resume();
      this.applyVolumes(); this.refreshLoops();
    } catch { /* Browser autoplay restrictions never block gameplay. */ }
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) { this.stopEffects(); void this.context?.suspend().catch(() => {}); }
    else if (this.enabled) void this.unlock();
  }

  setScene(music: string | null, ambience: string | null) {
    this.desired = { music, ambience };
    this.refreshLoops();
  }

  private applyVolumes() {
    if (!this.context || !this.master || !this.buses) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.enabled ? .8 : 0, now, .04);
    for (const bus of ["music", "sfx", "ambience"] as const) {
      const gain = this.buses[bus].gain;
      const base = this.mix[bus] * (bus === "music" ? .65 : bus === "ambience" ? .55 : 1);
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(base * (bus === "music" && now < this.duckUntil ? .35 : 1), now, .05);
      if (bus === "music" && now < this.duckUntil) gain.setTargetAtTime(base, this.duckUntil, .4);
    }
  }

  private refreshLoops() {
    if (!this.context || !this.enabled || this.paused) return;
    for (const bus of ["music", "ambience"] as const) {
      const id = this.mix[bus] > 0 ? this.desired[bus] : null;
      if (this.loops[bus]?.id !== id) void this.changeLoop(bus, id);
    }
  }

  private async buffer(id: string): Promise<AudioBuffer | null> {
    if (!AUDIO_CUES[id]?.available || !this.context) return null;
    const found = this.buffers.get(id);
    if (found) { this.buffers.delete(id); this.buffers.set(id, found); return found; }
    if (this.pending.has(id)) return this.pending.get(id)!;
    const context = this.context;
    const load = (async () => {
      try {
        const response = await fetch(BASE + AUDIO_CUES[id].file);
        if (!response.ok) return null;
        const result = await context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(id, result);
        const sameKind = [...this.buffers.keys()].filter(key => AUDIO_CUES[key].kind === AUDIO_CUES[id].kind);
        const limit = AUDIO_CUES[id].kind === "music" ? 3 : AUDIO_CUES[id].kind === "ambience" ? 2 : 40;
        while (sameKind.length > limit) this.buffers.delete(sameKind.shift()!);
        return result;
      } catch { return null; }
      finally { this.pending.delete(id); }
    })();
    this.pending.set(id, load);
    return load;
  }

  private async changeLoop(bus: LoopBus, id: string | null) {
    const generation = ++this.generations[bus];
    const buffer = id ? await this.buffer(id) : null;
    if (generation !== this.generations[bus] || !this.enabled || this.paused || !this.context || !this.buses) return;
    const now = this.context.currentTime, old = this.loops[bus];
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setTargetAtTime(0, now, .35);
      old.source.stop(now + 1.5);
      delete this.loops[bus];
    }
    if (!buffer || !id) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = buffer; source.loop = true;
    source.loopStart = Math.max(0, Math.min(buffer.duration - .01, AUDIO_CUES[id].loopStart ?? 0));
    source.loopEnd = Math.max(source.loopStart + .01, Math.min(buffer.duration, AUDIO_CUES[id].loopEnd ?? buffer.duration));
    source.connect(gain); gain.connect(this.buses[bus]);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(1, now + 1.3);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(); this.loops[bus] = { id, source, gain };
  }

  updateFootsteps(distance: number, surface: FootstepSurface | null, sprinting = false) {
    if (!surface || distance <= 0 || !this.enabled || this.paused || this.mix.sfx <= 0 || this.context?.state !== "running") {
      if (this.walking) this.footstepGeneration++;
      this.walking = false;
      this.stride.reset();
      return;
    }
    const warm = !this.walking || this.footstepSurface !== surface;
    this.walking = true;
    if (this.footstepSurface !== surface) {
      this.footstepSurface = surface;
      this.footstepGeneration++;
    }
    // Warm the next takes without queueing sounds while their downloads finish.
    if (warm) for (let take = 1; take <= FOOTSTEP_TAKES[surface]; take++) void this.buffer(`step-${surface}-${take}`);
    if (this.stride.advance(distance, sprinting)) {
      const { id, ...options } = this.footstepSequence.next(surface, sprinting);
      this.play(id, options);
    }
  }

  play(id: string, options: { rate?: number; gain?: number; delay?: number; pan?: number } = {}) {
    if (!this.enabled || this.paused || this.mix.sfx <= 0 || this.context?.state !== "running" || !AUDIO_CUES[id]?.available) return;
    const timestamp = performance.now(), previous = this.played.get(id) ?? -Infinity;
    const footstep = id.startsWith("step-");
    if (timestamp - previous < 90) return;
    this.played.set(id, timestamp);
    const generation = this.effectGeneration, stepGeneration = this.footstepGeneration;
    void this.buffer(id).then(buffer => {
      if (!buffer || generation !== this.effectGeneration || !this.enabled || this.paused || !this.context || !this.buses || this.context.state !== "running" || performance.now() - timestamp > (footstep ? 120 : 2500) || this.effects.size >= 10) return;
      if (footstep && stepGeneration !== this.footstepGeneration) return;
      const source = this.context.createBufferSource(), gain = this.context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = Math.max(.65, Math.min(1.4, options.rate ?? 1));
      const battle = id === "battle-start";
      const level = Math.max(0, Math.min(1, options.gain ?? 1)) * (battle ? .42 : 1);
      const start = this.context.currentTime + (options.delay ?? 0);
      const duration = Math.min(buffer.duration / source.playbackRate.value, footstep ? .38 : Infinity);
      const attack = battle ? .025 : .008, release = battle ? .14 : .065;
      if (battle || footstep) {
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level, start + Math.min(attack, duration / 3));
        gain.gain.setValueAtTime(level, start + Math.max(duration / 3, duration - release));
        gain.gain.linearRampToValueAtTime(0, start + duration);
      } else gain.gain.value = level;
      const pan = options.pan === undefined ? undefined : this.context.createStereoPanner();
      source.connect(gain);
      if (pan) { pan.pan.value = options.pan!; gain.connect(pan); pan.connect(this.buses.sfx); }
      else gain.connect(this.buses.sfx);
      this.effects.add(source);
      source.onended = () => { this.effects.delete(source); source.disconnect(); gain.disconnect(); pan?.disconnect(); };
      source.start(start); source.stop(start + duration);
      if (["victory", "defeat", "evolve", "capture-success", "prismatic", "wheel-prize"].includes(id)) this.duck(buffer.duration);
    });
  }

  private duck(duration: number) {
    if (!this.context || !this.buses) return;
    const now = this.context.currentTime, param = this.buses.music.gain, base = this.mix.music * .65;
    this.duckUntil = Math.max(this.duckUntil, now + duration);
    param.cancelScheduledValues(now); param.setTargetAtTime(base * .35, now, .08);
    param.setTargetAtTime(base, this.duckUntil, .4);
  }

  private stopEffects() {
    this.effectGeneration++;
    this.updateFootsteps(0, null);
    for (const effect of this.effects) { try { effect.stop(); } catch { /* Already ended. */ } }
    this.effects.clear();
  }

  cry(speciesId: string, delay = 0, gain = .8) { const cue = creatureSound(speciesId); if (cue) this.play(cue.id, { rate: cue.rate, gain, delay }); }
  /** Quiet synthesized transients complement the recorded effects through the same SFX bus. */
  private tone(frequency:number,end:number,duration:number,delay:number,level:number,wave:OscillatorType="sine") {
    const c=this.context;
    if(!this.enabled||this.paused||this.mix.sfx<=0||!c||c.state!=="running"||!this.buses||!c.createOscillator||this.effects.size>=18)return;
    const source=c.createOscillator(),gain=c.createGain(),start=c.currentTime+delay;
    source.type=wave;source.frequency.setValueAtTime(frequency,start);source.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+duration);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(gain);gain.connect(this.buses.sfx);this.effects.add(source);
    source.onended=()=>{this.effects.delete(source);source.disconnect();gain.disconnect();};source.start(start);source.stop(start+duration+.025);
  }
  evolution(){
    const before=new Set(this.effects);
    this.duck(6);this.play("evolve",{gain:.38,delay:.4});
    [261.63,329.63,392,523.25,659.25,783.99].forEach((hz,i)=>this.tone(hz,hz*1.005,1.2,i*.45,.035));
    [523.25,659.25,783.99,1046.5].forEach((hz,i)=>this.tone(hz,hz,1.4,4.6+i*.08,.025));
    const voices=[...this.effects].filter(voice=>!before.has(voice));
    return ()=>voices.forEach(voice=>{try{voice.stop();}catch{/* Already ended. */}this.effects.delete(voice);});
  }
  move(moveId: string) {
    const move=MOVE_BY_ID[moveId];if(!move)return;
    const cue = moveSound(moveId),index=TYPES.indexOf(move.type),note=155*Math.pow(2,index/12);
    this.play(cue.id, { rate: cue.rate, gain:.62,pan:-.2 });
    this.tone(note*.6,note*1.6,.23,0,.045,"sine");
    this.tone(note*(move.power?1:.8),move.power?note*.28:note*2,.36,.59,.055,index%3===0?"triangle":"sine");
    if(move.power>=70)this.tone(90,35,.25,.6,.04,"triangle");
  }
}

export const gameAudio = new GameAudio();
export function sound(kind: "click" | "battle" | "catch" | "heal", enabled: boolean) {
  if (enabled) gameAudio.play({ click: "ui-click", battle: "battle-start", catch: "capture-success", heal: "heal" }[kind]);
}
