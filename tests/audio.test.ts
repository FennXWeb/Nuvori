import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { MOVES, SPECIES, REGIONS } from "../src/data";
import { creatureSound, moveSound, soundscape, validMix } from "../src/audioCues";
import { FootstepSequence, FootstepStride, FOOTSTEP_SURFACES, FOOTSTEP_TAKES, footstepSurface } from "../src/footsteps";

const manifest=JSON.parse(readFileSync(new URL('../src/audioManifest.json',import.meta.url),'utf8'));
const receipts=JSON.parse(readFileSync(new URL('../docs/audio/generation.json',import.meta.url),'utf8'));
test('all moves and all creature forms resolve to generated sound assets',()=>{
  for(const move of MOVES) assert.equal(manifest[moveSound(move.id).id]?.available,true,move.id);
  for(const species of SPECIES) assert.equal(manifest[creatureSound(species.id)!.id]?.available,true,species.id);
});
test('every scene has a Suno music cue, with battle and interior precedence',()=>{
  for(const region of REGIONS) assert.equal(manifest[soundscape(region.id).music]?.kind,'music',region.id);
  assert.deepEqual(soundscape('dreamland','lodge','keeper'),{music:'last-stand',ambience:null});
  assert.deepEqual(soundscape('verdant','lodge'),{music:'lodge',ambience:null});
  assert.deepEqual(soundscape(),{music:'title',ambience:null});
});
test('sound assets exist and receipts match their published availability',()=>{
  for(const [id,entry]of Object.entries(manifest) as [string,{available:boolean;file:string;kind:string}][]){
    assert.equal(entry.available,Boolean(receipts[id])&&existsSync(new URL('../public/'+entry.file,import.meta.url)),id);
    if(entry.kind!=='music') assert.equal(entry.available,true,id);
    if(entry.available) assert.equal(createHash('sha256').update(readFileSync(new URL('../public/'+entry.file,import.meta.url))).digest('hex'),receipts[id].sha256,id);
  }
});

test('replacement battle and footstep files have controlled peaks and distinct recordings',()=>{
  const levels=JSON.parse(readFileSync(new URL('../docs/audio/validation.json',import.meta.url),'utf8')) as {id:string;peak:number;rms:number;duration:number}[];
  const battle=levels.find(c=>c.id==='battle-start')!;
  assert.ok(battle.duration<1,'the battle opening should stay brief');
  assert.ok(battle.peak<.4&&battle.rms<.09,'battle entrance must remain gently leveled');
  const takes=levels.filter(c=>c.id.startsWith('step-'));
  assert.equal(takes.length,28);
  assert.equal(new Set(takes.map(c=>receipts[c.id].sha256)).size,28);
  for(const take of takes) assert.ok(take.peak<.4&&take.rms<.10,take.id);
});
test('audio settings recover corrupt values and clamp volumes',()=>{
  assert.deepEqual(validMix({music:2,sfx:-1,ambience:NaN}),{music:1,sfx:0,ambience:.3});
  assert.deepEqual(validMix(null),{music:.5,sfx:.7,ambience:.3});
});

test('footsteps exhaust every surface take before repeating, including bag boundaries',()=>{
  let seed=716;
  const sequence=new FootstepSequence(()=>((seed=(seed*1664525+1013904223)>>>0)/2**32));
  for(const surface of FOOTSTEP_SURFACES){
    let previous='';
    for(let bag=0;bag<20;bag++){
      const ids=new Set<string>();
      for(let take=0;take<FOOTSTEP_TAKES[surface];take++){
        const cue=sequence.next(surface,bag%2===0);
        assert.equal(manifest[cue.id]?.available,true,cue.id);
        assert.notEqual(cue.id,previous);
        assert.ok(cue.rate>=.94&&cue.rate<=1.12);
        assert.ok(cue.gain>=.19&&cue.gain<=.3);
        assert.ok(Math.abs(cue.pan)<=.1);
        ids.add(cue.id);previous=cue.id;
      }
      assert.equal(ids.size,FOOTSTEP_TAKES[surface]);
    }
  }
});

test('remade grass and UI recordings are new ElevenLabs responses, softly leveled and versioned',()=>{
 const previous=JSON.parse(readFileSync(new URL('../docs/audio/pre-soft-trails.json',import.meta.url),'utf8'));
 const levels=JSON.parse(readFileSync(new URL('../docs/audio/validation.json',import.meta.url),'utf8')) as {id:string;peak:number;rms:number;duration:number}[];
 const ids=['ui-click','ui-confirm','ui-back','ui-error','ui-notify','ui-reorder','purchase','customize',...Array.from({length:8},(_,i)=>`step-grass-${i+1}`)];
 for(const id of ids){const receipt=receipts[id],level=levels.find(c=>c.id===id)!;
  assert.equal(receipt.provider,'ElevenLabs');assert.equal(receipt.processing.version,'soft-trails-2');
  assert.ok(manifest[id].file.endsWith('-v2.mp3'));assert.ok(level.peak<.28&&level.rms<.06,id);
  if(previous[id])assert.notEqual(receipt.processing.sourceSha256,previous[id].processing?.sourceSha256??previous[id].sha256,id);
 }
 assert.equal(new Set(ids.map(id=>receipts[id].processing.sourceSha256)).size,16);
});

test('footsteps follow actual travel at any frame rate, accelerate with sprinting, and stop at rest',()=>{
  function travel(speed:number,sprint:boolean,fps:number){
    const stride=new FootstepStride();let count=0;
    for(let frame=0;frame<fps*4;frame++)if(stride.advance(speed/fps,sprint))count++;
    return count;
  }
  assert.equal(travel(103,false,60),11);
  assert.equal(travel(103,false,30),11);
  assert.equal(travel(175,true,60),15);
  assert.equal(travel(175,true,30),15);
  assert.equal(travel(0,true,60),0);
  const stride=new FootstepStride();
  assert.equal(stride.advance(35,false),false);
  assert.equal(stride.advance(0,false),false);
  assert.equal(stride.advance(2,false),false,'stopping clears the unfinished stride');
});

test('footsteps reflect paving, trails, indoor wood, beaches and snowy towns',()=>{
  assert.equal(footstepSurface('mossbell',undefined,true),'stone');
  assert.equal(footstepSurface('mossbell',undefined,false),'grass');
  assert.equal(footstepSurface('verdant',undefined,true),'dirt');
  assert.equal(footstepSurface('frostmere',undefined,true),'snow');
  assert.equal(footstepSurface('sunwake'),'sand');
  assert.equal(footstepSurface('frostmere','lodge'),'wood');
});
