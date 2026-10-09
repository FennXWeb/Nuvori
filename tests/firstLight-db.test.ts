import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {newSave} from "../src/game";
import {createNuvo} from "../src/data";
import {DEFAULT_APPEARANCE} from "../src/appearance";
test("PostgreSQL First Light: Solunelle joins Champions, appearance persists, invalid layers are rejected",async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;create table public.keeper_saves(user_id uuid primary key references auth.users(id),data jsonb not null,updated_at timestamptz default now());`);
 for(const file of ["202609270002_community.sql","202609280001_frontiers.sql","202610070001_nursery_catalog.sql","202610070002_nursery.sql","202610090001_first_light.sql"])await db.exec(await readFile(`supabase/migrations/${file}`,"utf8"));
 const user="00000000-0000-4000-8000-000000000081",other="00000000-0000-4000-8000-000000000082";
 const s=newSave({name:"Starlace keeper",palette:0,pronouns:"They",appearance:{...DEFAULT_APPEARANCE,top:9,hat:5}},"spriglet");s.party=[createNuvo("solunelle",50,false)];
 await db.query("insert into auth.users values($1),($2)",[user,other]);
 await db.query("insert into keeper_saves(user_id,data) values($1,$2),($3,$4)",[user,JSON.stringify(s),other,JSON.stringify({...s,player:{...s.player,appearance:{...DEFAULT_APPEARANCE,hat:99}}})]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec("set role authenticated");
 const result=await db.query<{data:{members:{player:unknown;party:{speciesId:string}[]}[]}}>("select public.nuvori_league_open('heartwood',null) data");
 assert.deepEqual(result.rows[0].data.members[0].player,{name:s.player.name,palette:0,appearance:s.player.appearance});assert.equal(result.rows[0].data.members[0].party[0].speciesId,"solunelle");
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await assert.rejects(db.query("select public.nuvori_league_open('heartwood',null)"),/Invalid keeper layer/);
 }finally{await db.close();}
});
