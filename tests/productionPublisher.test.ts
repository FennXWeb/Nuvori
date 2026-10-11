import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createProductionPublisher} from '../scripts/production-publisher';
import {ProductionPublishView,reviewProductionBeta} from '../src/editor/ProductionPublish';
import {STUDIO_API_VERSION,StudioRestartRequired} from '../src/editor/studioProtocol';
import type {Runner} from '../scripts/editor-security';
import type {ProductionReview} from '../src/editor/productionTypes';

const beta='a'.repeat(40),main='b'.repeat(40),other='c'.repeat(40);
const production='https://github.com/FennXWeb/Nuvori.git',testing='https://github.com/FennXWeb/Nuvori-Testing.git';
function fixture(){
 const state={head:beta,beta,main,published:main,dirty:false,owner:'FennXWeb',branch:'codex/testing',origin:production,privateVisibility:'PRIVATE',productionVisibility:'PUBLIC',diverged:false,ci:'success',pushFailure:false,pushAccepted:true,verifyFailure:false,time:Date.now()};
 const calls:{command:string;args:string[];environment?:Record<string,string>}[]=[],phases:string[]=[];
 let checked=0,onCheck:()=>Promise<void>=async()=>{};
 const run:Runner=async(command,args,environment)=>{
  calls.push({command,args,environment});const line=args.join(' ');
  if(command==='gh'){
   if(args[0]==='api')return state.owner;
   if(args[0]==='repo'){const privateRepo=args.includes('https://github.com/FennXWeb/Nuvori-Testing');return JSON.stringify({nameWithOwner:privateRepo?'FennXWeb/Nuvori-Testing':'FennXWeb/Nuvori',visibility:privateRepo?state.privateVisibility:state.productionVisibility});}
   if(args[0]==='run')return JSON.stringify(state.ci==='missing'?[]:[{databaseId:123,headSha:state.beta,status:state.ci==='running'?'in_progress':'completed',conclusion:state.ci}]);
  }
  if(command==='git'){
   if(line==='branch --show-current')return state.branch;
   if(line==='remote get-url --push testing')return testing;
   if(line==='remote get-url --push --all origin')return state.origin;
   if(line==='status --porcelain')return state.dirty?' M src/game.ts':'';
   if(args[0]==='fetch')return '';
   if(line==='rev-parse HEAD')return state.head;
   if(line==='rev-parse refs/remotes/testing/codex/testing')return state.beta;
   if(line==='rev-parse refs/remotes/origin/main')return state.main;
   if(args[0]==='merge-base'){if(state.diverged)throw new Error('Not an ancestor');return '';}
   if(args[0]==='rev-list')return state.main===state.beta?'0':'2';
   if(args[0]==='log')return state.main===state.beta?'':`${beta}\tNew arena\n${other}\tWorld polish\n`;
   if(args[0]==='diff')return state.main===state.beta?'':'M\0src/game.ts\0A\0public/assets/arena.png\0';
   if(args.includes('push')){if(state.pushAccepted)state.published=state.beta;if(state.pushFailure)throw new Error('Connection closed');return '';}
   if(args[0]==='ls-remote'){if(state.verifyFailure)throw new Error('Connection closed');return `${state.published}\trefs/heads/main\n`;}
  }
  throw new Error('Unexpected command: '+command+' '+line);
 };
 const publisher=createProductionPublisher({run,phase:value=>phases.push(value),check:async()=>{checked++;await onCheck();},now:()=>state.time});
 return {state,calls,phases,publisher,checked:()=>checked,onCheck:(work:()=>Promise<void>)=>{onCheck=work;},pushes:()=>calls.filter(c=>c.args.includes('push'))};
}
const confirm=(r:ProductionReview)=>({reviewId:r.id,betaSha:r.betaSha,mainSha:r.mainSha,confirmed:true});

test('release review checks server compatibility before sending an action to an older server',async()=>{
 for(const apiVersion of [undefined,null,0,STUDIO_API_VERSION+1]){
  const calls:string[]=[];
  await assert.rejects(reviewProductionBeta(async route=>{calls.push(route);return {apiVersion};}),StudioRestartRequired);
  assert.deepEqual(calls,['/session']);
 }
 const calls:{route:string;body:unknown}[]=[],review=await fixture().publisher.preview();
 assert.equal(await reviewProductionBeta(async(route,body)=>{calls.push({route,body});return route==='/session'?{apiVersion:STUDIO_API_VERSION}:review;}),review);
 assert.deepEqual(calls,[{route:'/session',body:undefined},{route:'/production/review',body:{}}]);
 await assert.rejects(reviewProductionBeta(async()=>{throw new Error('Session expired');}),/Session expired/);
});

test('production review shows exact published beta changes without committing, building or pushing',async()=>{
 const f=fixture(),r=await f.publisher.preview();
 assert.equal(r.betaSha,beta);assert.equal(r.mainSha,main);assert.equal(r.commitCount,2);assert.equal(r.commits[0].subject,'New arena');assert.deepEqual(r.files,[{status:'M',path:'src/game.ts'},{status:'A',path:'public/assets/arena.png'}]);assert.equal(r.validation.passed,true);
 assert.equal(f.checked(),0);assert.equal(f.pushes().length,0);assert.ok(!f.calls.some(c=>['commit','add','switch','reset'].includes(c.args[0])));
 assert.deepEqual(f.calls.filter(c=>c.args[0]==='fetch').map(c=>c.args),[['fetch','--no-tags',testing,'refs/heads/codex/testing:refs/remotes/testing/codex/testing'],['fetch','--no-tags',production,'refs/heads/main:refs/remotes/origin/main']]);
});
test('owner-confirmed promotion validates and pushes only the reviewed commit to main with the guard enabled',async()=>{
 const f=fixture(),r=await f.publisher.preview(),result=await f.publisher.publish(confirm(r));
 assert.equal(f.checked(),1);assert.equal(result.sha,beta);assert.equal(result.liveUrl,'https://fennxweb.github.io/Nuvori/');assert.equal(f.pushes().length,1);
 assert.deepEqual(f.pushes()[0],{command:'git',args:['-c','core.hooksPath=.githooks','push',production,`${beta}:refs/heads/main`],environment:{NUVORI_MAIN_PUBLISH:'owner-confirmed',NUVORI_MAIN_SHA:beta,NUVORI_MAIN_BASE:main}});
 assert.ok(f.calls.every(c=>!c.args.some(a=>a.startsWith('--force'))));assert.ok(!f.calls.some(c=>['commit','add','switch','config'].includes(c.args[0])));
 await assert.rejects(f.publisher.publish(confirm(r)),/Review the current beta/);assert.equal(f.pushes().length,1);
});
test('publication requires explicit matching unexpired confirmation and invalidates superseded reviews',async()=>{
 const f=fixture(),r=await f.publisher.preview();
 for(const body of [{...confirm(r),confirmed:false},{...confirm(r),reviewId:'unknown'},{...confirm(r),betaSha:other},{...confirm(r),mainSha:other}])await assert.rejects(f.publisher.publish(body),/Review the current beta/);
 const newer=await f.publisher.preview();await assert.rejects(f.publisher.publish(confirm(r)),/Review the current beta/);
 f.state.time=Date.parse(newer.expiresAt);await assert.rejects(f.publisher.publish(confirm(newer)),/expired/);assert.equal(f.checked(),0);assert.equal(f.pushes().length,0);
});
test('review rejects wrong owners, branches, destinations, visibility, dirty or unpushed code and diverged main',async()=>{
 const cases:Partial<ReturnType<typeof fixture>['state']>[]=[{owner:'someone-else'},{branch:'main'},{origin:testing},{origin:production+'\nhttps://example.com/copy.git'},{privateVisibility:'PUBLIC'},{productionVisibility:'PRIVATE'},{dirty:true},{head:other},{diverged:true}];
 for(const patch of cases){const f=fixture();Object.assign(f.state,patch);await assert.rejects(f.publisher.preview());assert.equal(f.pushes().length,0);}
});
test('failed, missing or unfinished CI cannot be promoted even with a forged enabled client button',async()=>{
 for(const ci of ['failure','missing','running']){const f=fixture();f.state.ci=ci;const r=await f.publisher.preview();assert.equal(r.validation.passed,false);await assert.rejects(f.publisher.publish(confirm(r)),/successful beta build/);assert.equal(f.checked(),0);assert.equal(f.pushes().length,0);}
 const f=fixture(),r=await f.publisher.preview();f.state.ci='failure';await assert.rejects(f.publisher.publish(confirm(r)),/successful beta build/);assert.equal(f.pushes().length,0);
});
test('an up-to-date beta is shown clearly and cannot create an unnecessary production push',async()=>{
 const f=fixture();f.state.main=beta;const r=await f.publisher.preview();assert.equal(r.commitCount,0);assert.deepEqual(r.files,[]);await assert.rejects(f.publisher.publish(confirm(r)),/already contains/);assert.equal(f.pushes().length,0);
});
test('branch changes after review or during checks require a fresh release review',async()=>{
 for(const timing of ['before','during'])for(const patch of [{head:other,beta:other},{main:other},{dirty:true}]){
  const f=fixture(),r=await f.publisher.preview();if(timing==='before')Object.assign(f.state,patch);else f.onCheck(async()=>{Object.assign(f.state,patch);});
  await assert.rejects(f.publisher.publish(confirm(r)),/changed after|clean checkout/);assert.equal(f.pushes().length,0);
 }
});
test('failed checks and concurrent duplicate requests never bypass one-use confirmation',async()=>{
 const f=fixture(),r=await f.publisher.preview();f.onCheck(async()=>{throw new Error('Build failed');});await assert.rejects(f.publisher.publish(confirm(r)),/Build failed/);await assert.rejects(f.publisher.publish(confirm(r)),/Review the current beta/);assert.equal(f.pushes().length,0);
 const fresh=fixture(),review=await fresh.publisher.preview(),results=await Promise.allSettled([fresh.publisher.publish(confirm(review)),fresh.publisher.publish(confirm(review))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(fresh.pushes().length,1);
});
test('disconnected pushes are verified without duplicate retries or misleading failure reports',async()=>{
 const accepted=fixture(),r=await accepted.publisher.preview();accepted.state.pushFailure=true;assert.equal((await accepted.publisher.publish(confirm(r))).sha,beta);assert.equal(accepted.pushes().length,1);
 for(const patch of [{pushFailure:true,pushAccepted:false},{verifyFailure:true}]){const f=fixture(),r=await f.publisher.preview();Object.assign(f.state,patch);await assert.rejects(f.publisher.publish(confirm(r)),/not confirm|could not be confirmed/);assert.equal(f.pushes().length,1);await assert.rejects(f.publisher.publish(confirm(r)),/Review the current beta/);}
});

test('the actual pre-push guard remains closed except for the exact owner-confirmed main update',()=>{
 const script=path.resolve('scripts/guard-testing-push.cjs'),baseEnv=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.toUpperCase().startsWith('NUVORI_MAIN_')));
 const grant={NUVORI_MAIN_PUBLISH:'owner-confirmed',NUVORI_MAIN_SHA:beta,NUVORI_MAIN_BASE:main};
 const check=(destination:string,input:string,environment:Record<string,string>={})=>spawnSync(process.execPath,[script,'origin',destination],{input,encoding:'utf8',windowsHide:true,env:{...baseEnv,...environment}}).status;
 const line=`${beta} ${beta} refs/heads/main ${main}\n`;
 assert.equal(check(production,line),1);assert.equal(check(production,line,grant),0);assert.equal(check(production,line,{...grant,NUVORI_MAIN_BASE:other}),1);assert.equal(check(production,line,{...grant,NUVORI_MAIN_SHA:other}),1);
 for(const input of [line.replace('refs/heads/main','refs/heads/codex/testing'),line.replace('refs/heads/main','refs/tags/v2'),line+line,line.replace(`${beta} ${beta}`,`(delete) ${'0'.repeat(40)}`),line.replace(main,'0'.repeat(40))])assert.equal(check(production,input,grant),1);
 assert.equal(check('https://github.com/Someone/Nuvori.git',line,grant),1);assert.equal(check(production,line,{...grant,NUVORI_MAIN_BASE:'0'.repeat(40)}),1);
 assert.equal(check(testing,`refs/heads/codex/testing ${beta} refs/heads/codex/testing ${main}\n`),0);assert.equal(check(testing,line,grant),1);
});

test('release dialog requires confirmation and passing CI, identifies unpublished drafts and escapes commit text',async()=>{
 const review=await fixture().publisher.preview();review.commits[0].subject='<script>dangerous()</script>';
 const props={review,result:null,busy:false,phase:'',error:'',confirmed:false,hasDraftChanges:true,onConfirm:()=>{},onReview:()=>{},onPublish:()=>{}};
 const render=(patch:Partial<typeof props>={})=>renderToStaticMarkup(createElement(ProductionPublishView,{...props,...patch}));
 const button=(html:string)=>html.match(/<button[^>]*class="studio-primary studio-publish-button"[^>]*>/)?.[0]??'';
 const unconfirmed=render();assert.match(button(unconfirmed),/disabled/);assert.match(unconfirmed,/Your current world draft differs from beta/);assert.match(unconfirmed,/&lt;script&gt;dangerous\(\)&lt;\/script&gt;/);assert.doesNotMatch(unconfirmed,/<script>/);
 assert.doesNotMatch(button(render({confirmed:true})),/disabled/);assert.match(button(render({confirmed:true,busy:true})),/disabled/);
 review.validation.passed=false;assert.match(button(render({confirmed:true})),/disabled/);
});
test('release dialog renders an actionable error, no-op review, progress and deployment handoff without claiming the site is already live',async()=>{
 const review=await fixture().publisher.preview(),props={review,result:null,busy:false,phase:'',error:'Build failed',confirmed:false,hasDraftChanges:false,onConfirm:()=>{},onReview:()=>{},onPublish:()=>{}};
 assert.match(renderToStaticMarkup(createElement(ProductionPublishView,props)),/role="alert">Build failed/);
 review.commitCount=0;const noop=renderToStaticMarkup(createElement(ProductionPublishView,{...props,error:''}));assert.match(noop,/Main already contains this beta/);assert.doesNotMatch(noop,/studio-publish-button/);
 const progress=renderToStaticMarkup(createElement(ProductionPublishView,{...props,review:null,busy:true,phase:'Running regression checks'}));assert.match(progress,/role="status"/);assert.match(progress,/Running regression checks/);
 const done=renderToStaticMarkup(createElement(ProductionPublishView,{...props,review:null,result:{sha:beta,commitUrl:`https://github.com/FennXWeb/Nuvori/commit/${beta}`,actionsUrl:'https://github.com/FennXWeb/Nuvori/actions/workflows/deploy.yml',liveUrl:'https://fennxweb.github.io/Nuvori/'}}));assert.match(done,/Beta is on main/);assert.match(done,/GitHub will run its production checks/);assert.match(done,/View deployment/);assert.doesNotMatch(done,/Publish beta to main/);
});
