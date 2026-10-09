import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { GameAudio } from "../src/audio";

class Parameter {
  value = 0;
  events: { value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number) { this.events.push({ value, time }); }
  linearRampToValueAtTime(value: number, time: number) { this.events.push({ value, time }); }
  exponentialRampToValueAtTime(value: number, time: number) { this.events.push({ value, time }); }
  setTargetAtTime() {}
  cancelScheduledValues() {}
}
class Node {
  target?: Node;
  gain = new Parameter();
  pan = new Parameter();
  connect(target: Node) { this.target = target; }
  disconnect() {}
}
class Source extends Node {
  playbackRate = new Parameter();
  frequency = new Parameter();
  buffer?: AudioBuffer;
  startTime?: number;
  stopTime?: number;
  start(time: number) { this.startTime = time; }
  stop(time: number) { this.stopTime = time; }
}
class Context {
  state = "running";
  currentTime = 10;
  destination = new Node();
  sources: Source[] = [];
  tones: Source[] = [];
  createOscillator() { const source=new Source();this.tones.push(source);return source; }
  createGain() { return new Node(); }
  createStereoPanner() { return new Node(); }
  createDynamicsCompressor() { return Object.assign(new Node(), { threshold: new Parameter(), ratio: new Parameter() }); }
  createBufferSource() { const source = new Source(); this.sources.push(source); return source; }
  async decodeAudioData() { return { duration: .8 }; }
  async resume() { this.state = "running"; }
  async suspend() { this.state = "suspended"; }
}
const settle = () => new Promise(resolve => setImmediate(resolve));
async function setup(t: TestContext, response: () => Promise<Response> = async () => new Response(new Uint8Array(4))) {
  const context = new Context(), original = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: function () { return context; } });
  t.after(() => original ? Object.defineProperty(globalThis, "AudioContext", original) : Reflect.deleteProperty(globalThis, "AudioContext"));
  t.mock.method(globalThis, "fetch", response);
  const audio = new GameAudio();
  audio.configure(true);
  await audio.unlock();
  return { audio, context };
}

test('battle entrance is attenuated and fades in and out through the shared mixer', async t => {
  const { audio, context } = await setup(t);
  audio.play('battle-start');
  await settle();
  assert.equal(context.sources.length, 1);
  const source = context.sources[0], envelope = source.target!.gain.events;
  assert.equal(envelope[0].value, 0);
  assert.ok(Math.max(...envelope.map(event => event.value)) <= .42);
  assert.equal(envelope.at(-1)!.value, 0);
  assert.ok(envelope[1].time > source.startTime!);
  assert.ok(source.stopTime! - source.startTime! < 1);
});

test('stopping during footstep downloads discards late sounds and walking can restart', async t => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { audio, context } = await setup(t, async () => { await gate; return new Response(new Uint8Array(4)); });
  audio.updateFootsteps(40, 'grass');
  audio.updateFootsteps(0, null);
  release();
  await settle();
  assert.equal(context.sources.length, 0, 'a completed download must not play after movement stops');
  audio.updateFootsteps(40, 'grass');
  await settle();
  assert.equal(context.sources.length, 1);
  assert.ok(context.sources[0].stopTime! - context.sources[0].startTime! <= .381);
});

test('muting and immediately re-enabling does not resurrect pending effects', async t => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { audio, context } = await setup(t, async () => { await gate; return new Response(new Uint8Array(4)); });
  audio.play('battle-start');
  audio.configure(false);
  audio.configure(true);
  release();
  await settle();
  assert.equal(context.sources.length, 0);
});

test('new attack layers have soft envelopes and timed impact; evolution voices stop on dismissal',async t=>{
  const {audio,context}=await setup(t);
  audio.move('flame-4');await settle();
  assert.ok(context.tones.length>=2);
  for(const source of context.tones){const envelope=source.target!.gain.events;assert.equal(envelope[0].value,0);assert.ok(Math.max(...envelope.map(e=>e.value))<=.055);assert.equal(envelope.at(-1)?.value,.0001);}
  assert.ok(context.tones[1].startTime!>=context.currentTime+.59);
  const previous=context.tones.length,stop=audio.evolution();assert.ok(context.tones.length>previous);stop();
  for(const source of context.tones.slice(previous))assert.equal(source.stopTime,undefined,'cleanup stops scheduled voices immediately');
  audio.configure(false);const muted=context.tones.length;audio.move('flame-4');assert.equal(context.tones.length,muted);
});
