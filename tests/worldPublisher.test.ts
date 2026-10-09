import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {publishWorld,worldHash} from '../scripts/world-publisher';
import {seedCell} from '../src/editor/model';
import type {WorldDocument} from '../src/worldContent';
import type {Runner} from '../scripts/editor-security';

async function fixture(){
 const home=path.resolve('.sites-runtime');await mkdir(home,{recursive:true});const root=await mkdtemp(path.join(home,'studio-publisher-'));
 await mkdir(path.join(root,'src/content'),{recursive:true});const before='{"schema":1,"cells":{}}\n';await writeFile(path.join(root,'src/content/world.json'),before);
 const document:WorldDocument={schema:1,cells:{mossbell:seedCell('mossbell')}};
 const cleanup=async()=>{assert.equal(path.dirname(path.resolve(root)),home);await rm(root,{recursive:true,force:true});};
 return {root,before,body:{document,revision:worldHash(before),name:'Fixture'},cleanup};
}
function fakeRunner(options:{failure?:'push'|'commit';dirty?:boolean}={}){
 const calls:{command:string;args:string[]}[]=[];let checks=0;
 const run:Runner=async(command,args)=>{
  calls.push({command,args});const line=args.join(' ');
  if(command==='gh')return args[0]==='api'?'FennXWeb':JSON.stringify({nameWithOwner:'FennXWeb/Nuvori-Testing',visibility:'PRIVATE'});
  if(line==='branch --show-current')return 'codex/testing';
  if(line==='remote get-url --push testing')return 'https://github.com/FennXWeb/Nuvori-Testing.git';
  if(line==='status --porcelain'){checks++;return options.dirty?' M src/App.tsx':checks===1?'':' M src/content/world.json';}
  if(args[0]===options.failure)throw new Error('Simulated Git failure');
  if(line==='rev-parse HEAD')return '1234567abcdef';return '';
 };
 return {run,calls};
}
test('publisher validates and checks the actual document before committing only world data to private beta',async()=>{
 const f=await fixture(),git=fakeRunner();let checked=false;
 try{const result=await publishWorld(f.body,{root:f.root,run:git.run,phase:()=>{},check:async()=>{checked=true;assert.deepEqual(JSON.parse(await readFile(path.join(f.root,'src/content/world.json'),'utf8')),f.body.document);}});
  assert.ok(checked);assert.equal(result.sha,'1234567abcdef');assert.deepEqual(git.calls.filter(c=>c.args[0]==='push').map(c=>c.args),[['push','testing','codex/testing:refs/heads/codex/testing']]);
  assert.deepEqual(git.calls.find(c=>c.args[0]==='add')!.args,['add','--','src/content/world.json']);
  const backups=await readdir(path.join(f.root,'.world-editor/drafts'));assert.equal(backups.length,1);const backup=JSON.parse(await readFile(path.join(f.root,'.world-editor/drafts',backups[0]),'utf8'));assert.deepEqual(backup.document,JSON.parse(f.before));
 }finally{await f.cleanup();}
});
test('failed checks or commits restore the previous world and never push',async()=>{
 for(const failure of ['check','commit'] as const){const f=await fixture(),git=fakeRunner({failure:failure==='commit'?'commit':undefined});try{
  await assert.rejects(publishWorld(f.body,{root:f.root,run:git.run,phase:()=>{},check:async()=>{if(failure==='check')throw new Error('Bad build');}}));
  assert.equal(await readFile(path.join(f.root,'src/content/world.json'),'utf8'),f.before);assert.ok(!git.calls.some(c=>c.args[0]==='push'));
 }finally{await f.cleanup();}}
});
test('a failed upload preserves the local beta commit for retry; stale drafts and dirty worktrees are rejected',async()=>{
 const f=await fixture(),git=fakeRunner({failure:'push'});try{
  await assert.rejects(publishWorld(f.body,{root:f.root,run:git.run,phase:()=>{},check:async()=>{}}),/saved locally/);
  assert.deepEqual(JSON.parse(await readFile(path.join(f.root,'src/content/world.json'),'utf8')),f.body.document);assert.ok(!git.calls.some(c=>c.args[0]==='reset'));
  const stale=fakeRunner();await assert.rejects(publishWorld(f.body,{root:f.root,run:stale.run,phase:()=>{},check:async()=>{throw new Error('Should not run');}}),/changed since/);assert.ok(!stale.calls.some(c=>c.args[0]==='commit'));
  const dirty=fakeRunner({dirty:true});await assert.rejects(publishWorld(f.body,{root:f.root,run:dirty.run,phase:()=>{},check:async()=>{}}),/clean checkout/);
 }finally{await f.cleanup();}
});
test('a concurrent external edit is preserved instead of overwritten or published',async()=>{
 const f=await fixture(),git=fakeRunner(),external='{"schema":1,"cells":{},"note":"external edit"}\n';
 try{await assert.rejects(publishWorld(f.body,{root:f.root,run:git.run,phase:()=>{},check:async()=>{await writeFile(path.join(f.root,'src/content/world.json'),external);}}),/newer file is preserved/);
  assert.equal(await readFile(path.join(f.root,'src/content/world.json'),'utf8'),external);assert.ok(!git.calls.some(c=>['push','commit'].includes(c.args[0])));
 }finally{await f.cleanup();}
});
