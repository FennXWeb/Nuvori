import test from 'node:test';import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {newSave} from '../src/game';import {writeCloudAdventure} from '../src/cloudSave';
const save=newSave({name:'Keeper',palette:0,pronouns:'They'},'spriglet');
function fixture(updates:{data:unknown;error:unknown}[],insertError:unknown=null){const calls:string[]=[];return {calls,client:{from(table:string){assert.equal(table,'keeper_saves');return {update(row:unknown){assert.deepEqual((row as {data:unknown}).data,save);calls.push('update');return {eq(key:string,id:string){assert.equal(key,'user_id');assert.equal(id,'keeper');return {select(key:string){assert.equal(key,'user_id');return {async maybeSingle(){return updates.shift();}};}};}};},async insert(row:{user_id:string}){assert.equal(row.user_id,'keeper');calls.push('insert');return {error:insertError};}};}} as unknown as SupabaseClient};}
test('cloud saves update existing adventures and create only missing adventures',async()=>{for(const exists of [true,false]){const f=fixture([{data:exists?{user_id:'keeper'}:null,error:null}]);await writeCloudAdventure(f.client,'keeper',save);assert.deepEqual(f.calls,exists?['update']:['update','insert']);}});
test('first-save race retries update once; guard and network errors are surfaced without unsafe insertion',async()=>{
 const race=fixture([{data:null,error:null},{data:{user_id:'keeper'},error:null}],{code:'23505',message:'duplicate'});await writeCloudAdventure(race.client,'keeper',save);assert.deepEqual(race.calls,['update','insert','update']);
 for(const message of ['Your nursery changed in another session.','Network unreachable']){const f=fixture([{data:null,error:{message}}]);await assert.rejects(writeCloudAdventure(f.client,'keeper',save),e=>e instanceof Error&&e.message===message);assert.deepEqual(f.calls,['update']);}
 const fail=fixture([{data:null,error:null}],{code:'42501',message:'Permission denied'});await assert.rejects(writeCloudAdventure(fail.client,'keeper',save),/Permission denied/);assert.deepEqual(fail.calls,['update','insert']);
});
