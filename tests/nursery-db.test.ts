import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {newSave,validateSave,type Save} from "../src/game";
import {createNuvo} from "../src/data";
import {breedingDetails} from "../src/nursery";
test("PostgreSQL nursery: account isolation, server timer, escrow, immutable sex, retries, cancellation, and Dreamweaver lifetime quota",async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;create table public.keeper_saves(user_id uuid primary key references auth.users(id),data jsonb not null,updated_at timestamptz default now());`);
  for(const file of ["202609270002_community.sql","202609280001_frontiers.sql","202610070001_nursery_catalog.sql","202610070002_nursery.sql","202610090001_first_light.sql"])await db.exec(await readFile(`supabase/migrations/${file}`,"utf8"));
  const user="00000000-0000-4000-8000-000000000071",other="00000000-0000-4000-8000-000000000072";
  await db.query("insert into auth.users values($1),($2)",[user,other]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  const original={...newSave({name:"Clover test",palette:0,pronouns:"They"},"bubbfin"),interior:"nursery" as const};
  const a=createNuvo("spriglet-4",37,false,"male"),b=createNuvo("spriglet-8",39,false,"female");original.box=[a,b];
  await db.query("insert into keeper_saves(user_id,data) values($1,$2)",[user,JSON.stringify(original)]);
  const rpc=async(op:string,first:string|null=null,second:string|null=null,visit:string|null=null)=>(await db.query<{data:Save}>("select public.nuvori_nursery($1,$2,$3,$4) data",[op,first,second,visit])).rows[0].data;
  await db.exec("set role authenticated");
  await assert.rejects(rpc("start",a.uid,a.uid),/different/);
  const started=await rpc("start",a.uid,b.uid);assert.ok(validateSave(started));assert.equal(started.nursery!.readyAt-started.nursery!.startedAt,breedingDetails(a,b).seconds*1000);assert.equal(started.box.length,0);
  const job=started.nursery!;assert.equal(job.child.level,1);assert.equal(job.child.speciesId,"spriglet");
  await assert.rejects(rpc("collect",null,null,job.id),/not ready/);await assert.rejects(rpc("start",a.uid,b.uid),/already caring/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await assert.rejects(rpc("collect",null,null,job.id),/Save your adventure/);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
  await db.exec("reset role");
  await assert.rejects(db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(original),user]),/nursery changed/);
  // Advance only the fixture's database clock equivalent, leaving the advertised duration intact.
  const delta=job.readyAt+1000-Date.now();const ready={...started,nursery:{...job,startedAt:job.startedAt-delta,readyAt:job.readyAt-delta}};
  await db.exec("select set_config('nuvori.nursery_write','on',false)");await db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(ready),user]);await db.exec("select set_config('nuvori.nursery_write','off',false);set role authenticated");
  const collected=await rpc("collect",null,null,job.id);assert.ok(validateSave(collected));assert.equal(collected.party.length,4);assert.equal(collected.nursery,undefined);assert.deepEqual(await rpc("collect",null,null,job.id),collected);
  const visit=await rpc("start",a.uid,b.uid);const cancelled=await rpc("cancel",null,null,visit.nursery!.id);assert.equal(cancelled.party.length,4);assert.ok(validateSave(cancelled));
  await db.exec("reset role");const changedSex=structuredClone(cancelled);changedSex.party[0].sex=changedSex.party[0].sex==="male"?"female":"male";await assert.rejects(db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(changedSex),user]),/assigned sex/);
  const dream=createNuvo("dreamweaver",30,false,"male");const captured={...cancelled,box:[{...dream,origin:"wild"}],dreamweaverCaptures:{male:dream.uid}};
  await db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(captured),user]);
  await assert.rejects(db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(cancelled),user]),/already caught/);
  const duplicate={...captured,box:[...captured.box,{...createNuvo("dreamweaver",30,false,"male"),origin:"wild"}]};await assert.rejects(db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(duplicate),user]),/Only one wild/);
  const offspring={...duplicate,box:[...captured.box,{...createNuvo("dreamweaver",1,false,"male"),origin:"nursery"}]};await db.query("update keeper_saves set data=$1 where user_id=$2",[JSON.stringify(offspring),user]);
  await db.exec("set role anon");await assert.rejects(rpc("start",a.uid,b.uid),/permission denied/);
 }finally{await db.close();}
});
