-- First Light: new companion and bounded keeper layers in Champions snapshots.
begin;
insert into public.league_catalog(kind,id,data) values ('species','solunelle','{"stats":{"hp":76,"attack":73,"defense":69,"speed":82},"types":["Astral","Bloom"],"learnset":[{"level":4,"move":"astral-2"},{"level":7,"move":"bloom-3"},{"level":10,"move":"astral-4"},{"level":13,"move":"bloom-5"},{"level":17,"move":"astral-6"},{"level":22,"move":"bloom-7"},{"level":26,"move":"astral-8"},{"level":32,"move":"astral-9"}],"base":"solunelle","stage":0,"rarity":"Mythical","startMoves":["astral-0","bloom-1"],"evolvesTo":[],"evolveLevel":50}'::jsonb) on conflict(kind,id) do update set data=excluded.data;
create or replace function public.nuvori_league_open(trial text default null, room_code text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); adventure jsonb; r public.league_raids; g jsonb; n jsonb; spec jsonb; mid text; md jsonb; i integer; first_alive integer:=-1; appearance jsonb; field text;
begin
  if me is null then raise exception 'Sign in first';end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text,28));
  if exists(select 1 from public.league_members m join public.league_raids rr on rr.id=m.raid_id where m.user_id=me and not m.claimed and rr.status<>'closed') then raise exception 'Finish or leave your existing Champions room first.';end if;
  select data into adventure from public.keeper_saves where user_id=me;
  if adventure is null then raise exception 'Save your adventure first.';end if;
  if room_code is not null then
    select * into r from public.league_raids where code=upper(btrim(room_code)) for update;
    if r.id is null or r.status<>'lobby' or r.expires_at<now() then raise exception 'This room is no longer accepting keepers.';end if;
    if (select count(*) from public.league_members where raid_id=r.id)>=4 then raise exception 'This room already has four keepers.';end if;
    if exists(select 1 from public.league_members m join public.keeper_blocks b on (b.user_id=me and b.blocked_id=m.user_id) or (b.blocked_id=me and b.user_id=m.user_id) where m.raid_id=r.id) then raise exception 'This room is unavailable.';end if;
    trial:=r.guardian;
  end if;
  select data into g from public.league_catalog where kind='guardian' and id=trial;
  if g is null then raise exception 'Unknown guardian';end if;
  if adventure->>'region' is distinct from g->>'region' then raise exception 'Travel to this guardian’s town before joining.';end if;
  if jsonb_typeof(adventure->'party') is distinct from 'array' then raise exception 'Invalid crew';end if;
  if jsonb_array_length(adventure->'party') not between 1 and 6 then raise exception 'Invalid crew';end if;
  appearance:=adventure->'player';
  if jsonb_typeof(appearance->'name') is distinct from 'string' or length(appearance->>'name') not between 1 and 18 or jsonb_typeof(appearance->'palette') is distinct from 'number' or (appearance->>'palette')::integer not between 0 and 3 then raise exception 'Invalid keeper appearance';end if;
  foreach field in array array['outfit','hair','hairColor'] loop
    if appearance ? field and (jsonb_typeof(appearance->field) is distinct from 'number' or (appearance->>field)::integer not between 0 and 5) then raise exception 'Invalid keeper appearance';end if;
  end loop;
  if appearance ? 'appearance' then
    if jsonb_typeof(appearance->'appearance') is distinct from 'object' then raise exception 'Invalid keeper layers';end if;
    foreach field in array array['skin','eyes','hairStyle','hairTint','top','topTint','bottom','bottomTint','shoes','hat','accessory'] loop
      if jsonb_typeof(appearance->'appearance'->field) is distinct from 'number' then raise exception 'Invalid keeper layer';end if;
      if (appearance->'appearance'->>field)::numeric <> trunc((appearance->'appearance'->>field)::numeric) or (appearance->'appearance'->>field)::numeric < 0 or (appearance->'appearance'->>field)::numeric >= (case field when 'skin' then 6 when 'top' then 10 when 'bottom' then 4 when 'hat' then 6 when 'accessory' then 6 else 12 end) then raise exception 'Invalid keeper layer';end if;
    end loop;
  end if;
  appearance:=jsonb_strip_nulls(jsonb_build_object('name',appearance->'name','palette',appearance->'palette','outfit',appearance->'outfit','hair',appearance->'hair','hairColor',appearance->'hairColor','appearance',appearance->'appearance'));
  -- Validate the bounded snapshot. Save inventory is cooperative, but combat values and moves cannot be supplied in an attack.
  for i in 0..jsonb_array_length(adventure->'party')-1 loop
    n:=adventure->'party'->i; select data into spec from public.league_catalog where kind='species' and id=n->>'speciesId';
    if jsonb_typeof(n->'uid') is distinct from 'string' or length(n->>'uid') not between 1 and 100 or jsonb_typeof(n->'level') is distinct from 'number' or jsonb_typeof(n->'hp') is distinct from 'number' or jsonb_typeof(n->'xp') is distinct from 'number' or (n->>'xp')::numeric<0 or jsonb_typeof(n->'prismatic') is distinct from 'boolean' or jsonb_typeof(n->'moves') is distinct from 'array' then raise exception 'Invalid Nuvo in crew';end if;
    if spec is null or (n->>'level')::integer not between 1 and 50 or (n->>'hp')::integer not between 0 and public.nuvori_league_hp(n) or jsonb_array_length(n->'moves') not between 1 and 4 then raise exception 'Invalid Nuvo in crew';end if;
    if first_alive<0 and (n->>'hp')::integer>0 then first_alive:=i;end if;
    for mid in select jsonb_array_elements_text(n->'moves') loop
      select data into md from public.league_catalog where kind='move' and id=mid;
      if md is null or coalesce((n->'pp'->>mid)::integer,-1) not between 0 and (md->>'pp')::integer then raise exception 'Invalid move energy';end if;
    end loop;
  end loop;
  if first_alive<0 then raise exception 'Heal your crew before challenging a guardian.';end if;
  if room_code is null then
    insert into public.league_raids(host,guardian,hp,max_hp,log) values(me,trial,(g->>'hp')::integer,(g->>'hp')::integer,jsonb_build_array('The guardian awaits. The host can begin with one to four keepers.')) returning * into r;
  end if;
  insert into public.league_members(raid_id,user_id,name,player,party,active) values(r.id,me,appearance->>'name',appearance,adventure->'party',first_alive);
  update public.league_raids set revision=revision+1 where id=r.id;
  return public.nuvori_league_view(r.id);
end $$;
commit;
