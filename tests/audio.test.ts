import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { MOVES, SPECIES, REGIONS } from "../src/data";
import { creatureSound, moveSound, soundscape, validMix } from "../src/audioCues";

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
  }
});
test('audio settings recover corrupt values and clamp volumes',()=>{
  assert.deepEqual(validMix({music:2,sfx:-1,ambience:NaN}),{music:1,sfx:0,ambience:.3});
  assert.deepEqual(validMix(null),{music:.5,sfx:.7,ambience:.3});
});
