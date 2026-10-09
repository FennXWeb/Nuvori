import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {REGIONS} from "../src/data";

test("route expansion enables local chat in every new cell without dropping existing messages or channel restrictions",async()=>{
 const db=new PGlite();try{
  await db.exec("create table public.keeper_chat(channel text not null constraint keeper_chat_channel_check check(channel in ('global','mossbell')),body text);insert into keeper_chat values('global','Existing message');");
  await db.exec(await readFile("supabase/migrations/202610090002_trail_expansion.sql","utf8"));
  for(const r of REGIONS)await db.query("insert into keeper_chat values($1,'Route message')",[r.id]);
  await db.query("insert into keeper_chat values('mossbell:nursery','Nursery message')");
  await assert.rejects(db.query("insert into keeper_chat values('unknown-place','bad')"),/keeper_chat_channel_check/);
  await assert.rejects(db.query("insert into keeper_chat values('brookbend:unknown','bad')"),/keeper_chat_channel_check/);
  const result=await db.query<{body:string}>("select body from keeper_chat where channel='global'");assert.equal(result.rows[0].body,"Existing message");
 }finally{await db.close();}
});
