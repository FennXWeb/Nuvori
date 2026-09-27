-- Cooperative Champions League. Clients submit intentions; PostgreSQL owns boss
-- health, crew snapshots, PP, damage, membership, and exactly-once rewards.
begin;
alter table public.keeper_chat drop constraint keeper_chat_channel_check;
alter table public.keeper_chat add constraint keeper_chat_channel_check check (channel = 'global' or channel ~ '^(mossbell|verdant|tideglass|sunwake|hollow|crystal|emberfall|frostmere|starfall|saffron|threadhaven|mirelight|tempest|crownspire|dreamland)(:(lodge|shop|tailor|barber))?$');

create table public.league_catalog (kind text not null, id text not null, data jsonb not null, primary key(kind,id));
create table public.league_raids (
  id uuid primary key default gen_random_uuid(), code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  host uuid not null references auth.users(id) on delete cascade, guardian text not null,
  status text not null default 'lobby' check(status in ('lobby','active','won','lost','closed')),
  hp integer not null, max_hp integer not null, revision integer not null default 0,
  log jsonb not null default '[]', created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '90 minutes'
);
create table public.league_members (
  raid_id uuid references public.league_raids(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  name text not null, player jsonb not null, party jsonb not null, active integer not null default 0,
  phase text not null default 'crew' check(phase in ('crew','choice','keeper','out')), keeper_hp integer not null default 0,
  keeper_max integer not null default 0, damage integer not null default 0, claimed boolean not null default false,
  last_action timestamptz, joined_at timestamptz not null default now(), primary key(raid_id,user_id)
);
create table public.league_actions (raid_id uuid, user_id uuid, nonce uuid, primary key(raid_id,user_id,nonce), foreign key(raid_id,user_id) references public.league_members(raid_id,user_id) on delete cascade);
create index league_member_current on public.league_members(user_id,joined_at desc) where not claimed;
alter table public.league_catalog enable row level security;
alter table public.league_raids enable row level security;
alter table public.league_members enable row level security;
alter table public.league_actions enable row level security;
revoke all on public.league_catalog,public.league_raids,public.league_members,public.league_actions from public,anon,authenticated;

create function public.nuvori_league_hp(n jsonb) returns integer language sql stable set search_path='' as $$
  select 20+floor((data->'stats'->>'hp')::numeric*.6)::integer+(n->>'level')::integer*4 from public.league_catalog where kind='species' and id=n->>'speciesId';
$$;
create function public.nuvori_league_xp(n jsonb, amount integer) returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb:=n; lev integer:=(n->>'level')::integer; xp integer:=(n->>'xp')::integer+amount; hp integer:=(n->>'hp')::integer; spec jsonb; learned jsonb; move_id text; pp integer;
begin
  select data into spec from public.league_catalog where kind='species' and id=n->>'speciesId';
  while lev<50 and xp>=25+lev*12 loop
    xp:=xp-(25+lev*12); lev:=lev+1; if hp>0 then hp:=hp+4; end if;
    for learned in select value from jsonb_array_elements(spec->'learnset') loop
      if (learned->>'level')::integer=lev and jsonb_array_length(result->'moves')<4 and not (result->'moves' ? (learned->>'move')) then
        move_id:=learned->>'move'; select (data->>'pp')::integer into pp from public.league_catalog where kind='move' and id=move_id;
        result:=jsonb_set(result,'{moves}',(result->'moves')||jsonb_build_array(move_id));result:=jsonb_set(result,array['pp',move_id],to_jsonb(pp));
      end if;
    end loop;
  end loop;
  return result||jsonb_build_object('level',lev,'xp',xp,'hp',hp);
end $$;

create function public.nuvori_league_view(raid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.league_raids;
begin
  if auth.uid() is null or not exists(select 1 from public.league_members where raid_id=raid and user_id=auth.uid()) then raise exception 'This is not your Champions room.';end if;
  update public.league_raids set status='lost',revision=revision+1 where id=raid and status in ('lobby','active') and expires_at<now();
  select * into r from public.league_raids where id=raid;
  return to_jsonb(r)||jsonb_build_object('members',(select jsonb_agg(to_jsonb(m)-'last_action' order by joined_at,user_id) from public.league_members m where raid_id=raid));
end $$;

create function public.nuvori_league_current() returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first';end if;
  select m.raid_id into target from public.league_members m join public.league_raids r on r.id=m.raid_id where m.user_id=auth.uid() and not m.claimed and r.status<>'closed' order by m.joined_at desc limit 1;
  if target is null then return null;end if;
  return public.nuvori_league_view(target);
end $$;

create function public.nuvori_league_rooms(area text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first';end if;
  return coalesce((select jsonb_agg(to_jsonb(rooms)) from (
    select r.code,r.guardian,p.name as host_name,(select count(*) from public.league_members m where m.raid_id=r.id)::integer as players
    from public.league_raids r join public.league_catalog c on c.kind='guardian' and c.id=r.guardian join public.keeper_profiles p on p.user_id=r.host
    where r.status='lobby' and r.expires_at>now() and c.data->>'region'=area
    and not exists(select 1 from public.keeper_blocks b where (b.user_id=auth.uid() and b.blocked_id=r.host) or (b.user_id=r.host and b.blocked_id=auth.uid()))
    order by r.created_at desc limit 20
  ) rooms),'[]'::jsonb);
end $$;

create function public.nuvori_league_open(trial text default null, room_code text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
  appearance:=jsonb_strip_nulls(jsonb_build_object('name',appearance->'name','palette',appearance->'palette','outfit',appearance->'outfit','hair',appearance->'hair','hairColor',appearance->'hairColor'));
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

create function public.nuvori_league_start(raid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.league_raids;
begin
  select * into r from public.league_raids where id=raid for update;
  if auth.uid() is null or r.host is distinct from auth.uid() then raise exception 'Only the host can begin the trial.';end if;
  if r.status='active' then return public.nuvori_league_view(raid);end if;
  if r.status<>'lobby' or r.expires_at<now() then raise exception 'This trial cannot start.';end if;
  update public.league_raids set status='active',revision=revision+1,log=log||jsonb_build_array('The trial begins! Each keeper acts independently; the guardian retaliates after each action.') where id=raid;
  return public.nuvori_league_view(raid);
end $$;

create function public.nuvori_league_leave(raid uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.league_raids; successor uuid;
begin
  select * into r from public.league_raids where id=raid for update;
  if auth.uid() is null or not exists(select 1 from public.league_members where raid_id=raid and user_id=auth.uid()) then raise exception 'Not your room';end if;
  if r.status<>'lobby' then raise exception 'Use withdraw during an active trial.';end if;
  delete from public.league_members where raid_id=raid and user_id=auth.uid();
  select user_id into successor from public.league_members where raid_id=raid order by joined_at,user_id limit 1;
  if successor is null then update public.league_raids set status='closed' where id=raid;
  elsif r.host=auth.uid() then update public.league_raids set host=successor where id=raid;end if;
  update public.league_raids set revision=revision+1 where id=raid;
end $$;

create function public.nuvori_league_action(raid uuid, action text, choice text, nonce uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); r public.league_raids; member public.league_members; g jsonb; boss jsonb; n jsonb; spec jsonb; m jsonb; damage integer:=0; hit integer; power integer; eff numeric:=1; strong jsonb:='{"Bloom":["Tide","Stone"],"Flame":["Bloom","Frost","Metal"],"Tide":["Flame","Stone"],"Gale":["Bloom","Shade"],"Volt":["Tide","Gale"],"Stone":["Volt","Flame"],"Frost":["Bloom","Gale"],"Shade":["Astral"],"Astral":["Shade","Stone"],"Metal":["Frost","Astral"]}'; t text; logs jsonb:='[]'; hp integer; idx integer; guarded boolean:=false; alive integer; move_name text;
begin
  if me is null or nonce is null then raise exception 'Sign in and submit an action id.';end if;
  select * into r from public.league_raids where id=raid for update;
  select * into member from public.league_members where raid_id=raid and user_id=me;
  if member.user_id is null or member.claimed then raise exception 'Not an active member of this room';end if;
  if exists(select 1 from public.league_actions a where a.raid_id=raid and a.user_id=me and a.nonce=nuvori_league_action.nonce) then return public.nuvori_league_view(raid);end if;
  if r.status<>'active' or r.expires_at<now() then raise exception 'The trial is not active';end if;
  if member.phase='out' then raise exception 'Your keeper needs rescue.';end if;
  if member.last_action>clock_timestamp()-interval '2 seconds' then raise exception 'Wait for your next action.';end if;
  select data into g from public.league_catalog where kind='guardian' and id=r.guardian;
  select data into boss from public.league_catalog where kind='species' and id=g->>'species';
  n:=member.party->member.active; select data into spec from public.league_catalog where kind='species' and id=n->>'speciesId';
  if action='withdraw' then member.phase:='out';logs:=jsonb_build_array(member.name||' calls for rescue.');
  elsif member.phase='choice' then
    if action<>'stand' then raise exception 'Choose your last stand or withdraw.';end if;
    select 80+floor(avg((value->>'level')::numeric)*3)::integer into member.keeper_max from jsonb_array_elements(member.party);
    member.keeper_hp:=member.keeper_max;member.phase:='keeper';logs:=jsonb_build_array(member.name||' makes a last stand!');
  elsif member.phase='keeper' then
    if action='strike' then damage:=10+floor((n->>'level')::numeric*1.5)::integer;move_name:='Courage Strike';
    elsif action='brace' then guarded:=true;move_name:='Brace';else raise exception 'Use a keeper ability.';end if;
  elsif action='switch' then
    idx:=choice::integer;
    if idx<0 or idx>=jsonb_array_length(member.party) or idx=member.active or (member.party->idx->>'hp')::integer<=0 then raise exception 'Choose another healthy Nuvo.';end if;
    member.active:=idx;n:=member.party->idx;select data into spec from public.league_catalog where kind='species' and id=n->>'speciesId';move_name:='Switch';
  elsif action='move' then
    select data into m from public.league_catalog where kind='move' and id=choice;
    if m is null or not (n->'moves' ? choice) or coalesce((n->'pp'->>choice)::integer,0)<1 then raise exception 'That move is unavailable or out of energy.';end if;
    n:=jsonb_set(n,array['pp',choice],to_jsonb((n->'pp'->>choice)::integer-1));move_name:=m->>'name';
    if random()*100<=(m->>'accuracy')::integer then
      if m->>'effect'='heal' then n:=jsonb_set(n,'{hp}',to_jsonb(least(public.nuvori_league_hp(n),(n->>'hp')::integer+ceil(public.nuvori_league_hp(n)*.4)::integer)));
      elsif m->>'effect'='guard' then guarded:=true;
      else
        for t in select jsonb_array_elements_text(boss->'types') loop
          eff:=eff*case when (strong->(m->>'type')) ? t then 2 when (strong->t) ? (m->>'type') or t=m->>'type' then .5 else 1 end;
        end loop;
        power:=(m->>'power')::integer;
        if power>0 then
          damage:=greatest(1,floor(
            ((2*(n->>'level')::numeric/5+2)*power*((spec->'stats'->>'attack')::integer+(n->>'level')::integer*2)/((boss->'stats'->>'defense')::integer+(g->>'level')::integer*2)/12+2)
            *eff*(case when (spec->'types') ? (m->>'type') then 1.25 else 1 end)
            *(case when coalesce((n->>'boost')::boolean,false) then 1.25 else 1 end)*(.9+random()*.1)
          )::integer);
        end if;
        if m->>'effect'='drain' then n:=jsonb_set(n,'{hp}',to_jsonb(least(public.nuvori_league_hp(n),(n->>'hp')::integer+ceil(damage/2.0)::integer)));end if;
        if m->>'effect'='boost' then n:=n||'{"boost":true}'::jsonb;end if;
        if m->>'effect' in ('burn','poison','slow') then logs:=logs||jsonb_build_array('The guardian resists lingering status effects.');end if;
      end if;
    else logs:=logs||jsonb_build_array('The move missed.');end if;
  else raise exception 'Unknown battle action';end if;
  r.hp:=greatest(0,r.hp-damage);member.damage:=member.damage+damage;
  if move_name is not null then logs:=logs||jsonb_build_array(member.name||' · '||move_name||case when damage>0 then ' · '||damage||' damage' else '' end);end if;
  if r.hp=0 then r.status:='won';logs:=logs||jsonb_build_array('Guardian defeated! Every participating keeper can collect a crest and rewards.');
  elsif action not in ('stand','withdraw') then
    hit:=greatest(1,floor((14+(g->>'level')::numeric*1.2)*(case when guarded then .3 else 1 end))::integer);
    if member.phase='keeper' then
      member.keeper_hp:=greatest(0,member.keeper_hp-hit);if member.keeper_hp=0 then member.phase:='out';end if;
    else
      hp:=greatest(0,(n->>'hp')::integer-hit);n:=jsonb_set(n,'{hp}',to_jsonb(hp));
      member.party:=jsonb_set(member.party,array[member.active::text],n);
      if hp=0 then
        select ordinality::integer-1 into alive from jsonb_array_elements(member.party) with ordinality where (value->>'hp')::integer>0 order by ordinality limit 1;
        if alive is null then member.phase:='choice';else member.active:=alive;end if;
      end if;
    end if;
    logs:=logs||jsonb_build_array('The guardian retaliates against '||member.name||' for '||hit||' HP.');
  end if;
  if member.phase='crew' and (n->>'hp')::integer>0 then member.party:=jsonb_set(member.party,array[member.active::text],n);end if;
  update public.league_members set party=member.party,active=member.active,phase=member.phase,keeper_hp=member.keeper_hp,keeper_max=member.keeper_max,damage=member.damage,last_action=clock_timestamp() where raid_id=raid and user_id=me;
  if r.status='active' and not exists(select 1 from public.league_members where raid_id=raid and phase<>'out' and not claimed) then r.status:='lost';logs:=logs||jsonb_build_array('The guardian stands. The Healing Lodge is ready to welcome you home.');end if;
  update public.league_raids set hp=r.hp,status=r.status,revision=revision+1,log=(select coalesce(jsonb_agg(value order by ordinality),'[]') from jsonb_array_elements(r.log||logs) with ordinality where ordinality>greatest(0,jsonb_array_length(r.log||logs)-30)) where id=raid;
  insert into public.league_actions values(raid,me,nonce);
  return public.nuvori_league_view(raid);
end $$;

create function public.nuvori_league_claim(raid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); r public.league_raids; member public.league_members; g jsonb; adventure jsonb; party jsonb:='[]'; n jsonb; md jsonb; energy jsonb; mid text; xp integer; idx integer; town text; dream boolean:=false;
begin
  if me is null then raise exception 'Sign in first';end if;
  select * into r from public.league_raids where id=raid for update;
  select * into member from public.league_members where raid_id=raid and user_id=me;
  if member.user_id is null then raise exception 'Not your trial';end if;
  select data into adventure from public.keeper_saves where user_id=me for update;
  if member.claimed then return adventure;end if;
  if r.expires_at<now() and r.status in ('active','lobby') then r.status:='lost';update public.league_raids set status='lost' where id=raid;end if;
  if r.status not in ('won','lost') and member.phase<>'out' then raise exception 'Finish the trial before collecting your adventure.';end if;
  select data into g from public.league_catalog where kind='guardian' and id=r.guardian;
  xp:=case when r.status='won' and member.phase<>'out' then 200+(g->>'level')::integer*20 else 0 end;
  for idx in 0..jsonb_array_length(member.party)-1 loop
    n:=member.party->idx;
    if xp>0 then n:=public.nuvori_league_xp(n,case when idx=member.active then xp else floor(xp*.2)::integer end);end if;
    n:=n-'status'-'boost'-'guard';energy:='{}';
    for mid in select jsonb_array_elements_text(n->'moves') loop
      select data into md from public.league_catalog where kind='move' and id=mid;energy:=energy||jsonb_build_object(mid,(md->>'pp')::integer);
    end loop;
    n:=n||jsonb_build_object('hp',public.nuvori_league_hp(n),'pp',energy);party:=party||jsonb_build_array(n);
  end loop;
  adventure:=adventure||jsonb_build_object('party',party,'leagueClaims',coalesce(adventure->'leagueClaims','[]')||jsonb_build_array(raid::text));
  if xp>0 then
    adventure:=adventure||jsonb_build_object('coins',(adventure->>'coins')::integer+300+(g->>'level')::integer*15,'battles',(adventure->>'battles')::integer+1);
    if not (coalesce(adventure->'leagueBadges','[]') ? r.guardian) then adventure:=adventure||jsonb_build_object('leagueBadges',coalesce(adventure->'leagueBadges','[]')||jsonb_build_array(r.guardian));end if;
  else
    town:=case when adventure->>'lastLodge' in ('mossbell','sunwake','frostmere','threadhaven','crownspire') then adventure->>'lastLodge' else 'mossbell' end;
    dream:=member.keeper_max>0 and member.keeper_hp=0 and random()<.0001;
    adventure:=adventure||jsonb_build_object('region',case when dream then 'dreamland' else town end,'x',576,'y',608);
    if dream then adventure:=adventure-'interior'-'outside';if not(adventure->'visited' ? 'dreamland')then adventure:=adventure||jsonb_build_object('visited',(adventure->'visited')||jsonb_build_array('dreamland'));end if;
    else adventure:=adventure||jsonb_build_object('interior','lodge','outside',jsonb_build_object('x',288,'y',336));end if;
  end if;
  update public.league_members set claimed=true where raid_id=raid and user_id=me;
  adventure:=adventure||jsonb_build_object('updated',now());
  update public.keeper_saves set data=adventure,updated_at=now() where user_id=me;
  return adventure;
end $$;

-- An old tab cannot overwrite a freshly collected raid with its pre-raid crew.
create function public.nuvori_preserve_league() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from jsonb_array_elements_text(coalesce(old.data->'leagueClaims','[]')) claim where not (coalesce(new.data->'leagueClaims','[]') ? claim)) then
    raise exception 'A Champions reward was collected in another session. Reload your cloud save before writing.';
  end if;
  return new;
end $$;
create trigger preserve_league before update on public.keeper_saves for each row execute function public.nuvori_preserve_league();

revoke all on function public.nuvori_league_hp(jsonb),public.nuvori_league_xp(jsonb,integer),public.nuvori_league_view(uuid),public.nuvori_league_current(),public.nuvori_league_rooms(text),public.nuvori_league_open(text,text),public.nuvori_league_start(uuid),public.nuvori_league_leave(uuid),public.nuvori_league_action(uuid,text,text,uuid),public.nuvori_league_claim(uuid),public.nuvori_preserve_league() from public,anon,authenticated;
grant execute on function public.nuvori_league_view(uuid),public.nuvori_league_current(),public.nuvori_league_rooms(text),public.nuvori_league_open(text,text),public.nuvori_league_start(uuid),public.nuvori_league_leave(uuid),public.nuvori_league_action(uuid,text,text,uuid),public.nuvori_league_claim(uuid) to authenticated;
commit;
