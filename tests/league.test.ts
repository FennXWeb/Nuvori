import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL league: four-player membership, shared damage, authorization, idempotency, XP and rescue",async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;create table public.keeper_saves(user_id uuid primary key references auth.users(id),data jsonb not null,updated_at timestamptz not null default now());`);
    for(const file of ["202609270002_community.sql","202609280001_frontiers.sql","202609280002_league_catalog.sql"]){try{await db.exec(await readFile(`supabase/migrations/${file}`,"utf8"));}catch(error){throw new Error(`${file}: ${(error as Error).message}`,{cause:error});}}
    await db.exec(await readFile("supabase/tests/league.sql","utf8"));
    const result=await db.query<{count:number}>("select count(*)::integer as count from public.league_raids");assert.equal(result.rows[0].count,0,"Transactional fixtures must roll back");
  } finally {await db.close();}
});
