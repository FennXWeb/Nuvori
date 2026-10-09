import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORLD_ART_SHEETS,measureWorldArt} from '../scripts/measure-world-art';
import {WORLD_ART} from '../src/illustratedArt';
import {keeperAppearance} from '../src/keeperArt';
import {APPEARANCE_LIMITS,DEFAULT_APPEARANCE,validAppearance} from '../src/appearance';
import {terrainSurface} from '../src/terrainArt';
import {REGIONS} from '../src/data';
import {getTerrain} from '../src/terrain';

test('new illustrated sheets have measured complete non-overlapping silhouettes',()=>{
 let total=0;
 for(const [file,cols,rows] of WORLD_ART_SHEETS){const measured=measureWorldArt(readFileSync(new URL('../public/assets/'+file,import.meta.url)),cols,rows);assert.deepEqual(WORLD_ART[file],measured,file);total+=measured.frames.length;}
 assert.equal(total,184);
});
test('every customization choice has four illustrated facing frames',()=>{
 assert.equal(WORLD_ART['keeper-heads-a.png'].frames.length+WORLD_ART['keeper-heads-b.png'].frames.length,APPEARANCE_LIMITS.hairStyle*4);
 assert.equal(WORLD_ART['keeper-tops-a.png'].frames.length+WORLD_ART['keeper-tops-b.png'].frames.length,APPEARANCE_LIMITS.top*4);
 assert.equal(WORLD_ART['keeper-bottoms.png'].frames.length,APPEARANCE_LIMITS.bottom*4);
 assert.equal(WORLD_ART['keeper-hats.png'].frames.length,(APPEARANCE_LIMITS.hat-1)*4);
});
test('legacy adventures get valid illustrated appearances without mutating their saved choices',()=>{
 for(let palette=0;palette<4;palette++)for(let outfit=0;outfit<6;outfit++)for(let hair=0;hair<6;hair++)for(let hairColor=0;hairColor<6;hairColor++)assert.ok(validAppearance(keeperAppearance(palette,{outfit,hair,hairColor})));
 assert.equal(keeperAppearance(0,{appearance:DEFAULT_APPEARANCE}),DEFAULT_APPEARANCE);
 assert.equal(keeperAppearance(0,{outfit:5}).top,2,'legacy Rose overalls remain overalls');
 assert.equal(keeperAppearance(0,{outfit:1}).top,5,'legacy Sunset cloak keeps its long silhouette');
 assert.equal(keeperAppearance(0,{hairColor:1}).hairTint,3,'legacy blond hair remains blond');
});
test('every region tile resolves to an illustrated surface',()=>{
 for(const region of REGIONS)for(const row of getTerrain(region).tiles)for(const tile of row){const index=terrainSurface(region,tile);assert.ok(Number.isInteger(index)&&index>=0&&index<16);}
});
