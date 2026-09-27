-- Public keeper profiles contain only player-chosen game information.
create table public.keeper_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 18),
  palette integer not null check (palette between 0 and 3),
  friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
);
create table public.keeper_friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.keeper_profiles(user_id) on delete cascade,
  recipient uuid not null references public.keeper_profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> recipient)
);
create unique index keeper_friend_pair on public.keeper_friendships (least(requester,recipient), greatest(requester,recipient));
create table public.keeper_blocks (
  user_id uuid not null references public.keeper_profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.keeper_profiles(user_id) on delete cascade,
  primary key (user_id,blocked_id), check (user_id <> blocked_id)
);
create table public.keeper_chat (
  id bigint generated always as identity primary key,
  sender uuid not null references public.keeper_profiles(user_id) on delete cascade,
  channel text not null check (channel = 'global' or channel ~ '^(mossbell|verdant|tideglass|sunwake|hollow|crystal|emberfall|frostmere|starfall)(:(lodge|shop))?$'),
  body text not null check (char_length(body) between 1 and 240),
  created_at timestamptz not null default now()
);
create index keeper_chat_channel_time on public.keeper_chat(channel, created_at desc);
create index keeper_chat_sender_time on public.keeper_chat(sender, created_at desc);
create table public.keeper_daily_spins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  prize integer not null check (prize between 0 and 7),
  primary key (user_id,day)
);

alter table public.keeper_profiles enable row level security;
alter table public.keeper_friendships enable row level security;
alter table public.keeper_blocks enable row level security;
alter table public.keeper_chat enable row level security;
alter table public.keeper_daily_spins enable row level security;
revoke all on public.keeper_profiles, public.keeper_friendships, public.keeper_blocks, public.keeper_chat, public.keeper_daily_spins from anon, authenticated;
-- All access uses the bounded, authenticated RPCs below; no client writes to social tables.

create function public.nuvori_profile(keeper_name text, keeper_palette integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); result jsonb;
begin
  if me is null then raise exception 'Sign in first'; end if;
  insert into public.keeper_profiles(user_id,name,palette) values(me, btrim(keeper_name),keeper_palette)
    on conflict(user_id) do update set name=excluded.name,palette=excluded.palette;
  select to_jsonb(p) into result from public.keeper_profiles p where user_id=me;
  return result;
end $$;

create function public.nuvori_social() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  return jsonb_build_object(
    'profile',(select to_jsonb(p) from public.keeper_profiles p where p.user_id=me),
    'friends',coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'status', f.status, 'incoming',f.recipient=me,'profile',to_jsonb(p)))
      from public.keeper_friendships f join public.keeper_profiles p on p.user_id=case when f.requester=me then f.recipient else f.requester end
      where me in(f.requester,f.recipient)), '[]'::jsonb),
    'blocked',coalesce((select jsonb_agg(to_jsonb(p)) from public.keeper_blocks b join public.keeper_profiles p on p.user_id=b.blocked_id where b.user_id=me), '[]'::jsonb)
  );
end $$;

create function public.nuvori_friend_request(code text default null, target uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid;
begin
  if me is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text, 0));
  select user_id into them from public.keeper_profiles where (target is not null and user_id=target) or (target is null and friend_code=upper(btrim(code)));
  if them is null then raise exception 'Keeper not found. Check the friend code.'; end if;
  if them=me then raise exception 'That is your own friend code.'; end if;
  if exists(select 1 from public.keeper_blocks where (user_id=me and blocked_id=them) or (user_id=them and blocked_id=me)) then raise exception 'This request is unavailable.'; end if;
  if exists(select 1 from public.keeper_friendships where least(requester,recipient)=least(me,them) and greatest(requester,recipient)=greatest(me,them)) then raise exception 'You already have a friendship or pending request.'; end if;
  if (select count(*) from public.keeper_friendships where requester=me and status='pending') >= 25 then raise exception 'You have 25 pending requests. Cancel one first.'; end if;
  if (select count(*) from public.keeper_friendships where requester=me and created_at > now()-interval '1 minute') >= 5 then raise exception 'Please wait a minute before sending more requests.'; end if;
  insert into public.keeper_friendships(requester,recipient) values(me,them);
end $$;

create function public.nuvori_friend_action(friendship uuid, action text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); f public.keeper_friendships;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select * into f from public.keeper_friendships where id=friendship for update;
  if f.id is null or me not in(f.requester,f.recipient) then raise exception 'Request not found'; end if;
  if action='accept' then
    if f.recipient<>me or f.status<>'pending' then raise exception 'Only the recipient can accept a pending request'; end if;
    update public.keeper_friendships set status='accepted' where id=friendship;
  elsif action='remove' then
    delete from public.keeper_friendships where id=friendship;
  else raise exception 'Unknown friendship action'; end if;
end $$;

create function public.nuvori_block(target uuid, blocked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  if blocked then
    insert into public.keeper_blocks values(me,target) on conflict do nothing;
    delete from public.keeper_friendships where least(requester,recipient)=least(me,target) and greatest(requester,recipient)=greatest(me,target);
  else delete from public.keeper_blocks where user_id=me and blocked_id=target; end if;
end $$;

create function public.nuvori_chat_send(room text, message text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text, 1));
  if exists(select 1 from public.keeper_chat where sender=me and created_at>clock_timestamp()-interval '2 seconds') then raise exception 'Take a breath. You can send a message every two seconds.'; end if;
  insert into public.keeper_chat(sender,channel,body) values(me,room,btrim(message));
end $$;

create function public.nuvori_chat_read(room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); result jsonb;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select coalesce(jsonb_agg(to_jsonb(messages) order by id),'[]'::jsonb) into result from (
    select c.id,c.sender,c.channel,c.body,c.created_at,p.name,p.palette from public.keeper_chat c
    join public.keeper_profiles p on p.user_id=c.sender
    where c.channel=room and not exists(select 1 from public.keeper_blocks b where (b.user_id=me and b.blocked_id=c.sender) or (b.user_id=c.sender and b.blocked_id=me))
    order by c.id desc limit 50
  ) messages;
  return result;
end $$;

-- Claim and apply the prize in one transaction. Duplicate requests return the same reward.
create function public.nuvori_daily_spin() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); today date := (now() at time zone 'UTC')::date;
  prize_id integer; adventure jsonb; coins integer; orbs integer; potions integer;
begin
  if me is null then raise exception 'Sign in first'; end if;
  select data into adventure from public.keeper_saves where user_id=me for update;
  if adventure is null then raise exception 'Create and save your keeper first.'; end if;
  insert into public.keeper_daily_spins(user_id,day,prize) values(me,today,floor(random()*8)::integer) on conflict do nothing;
  select prize into prize_id from public.keeper_daily_spins where user_id=me and day=today;
  if adventure->>'dailySpinDay' is distinct from today::text then
    coins := (array[100,0,0,200,0,0,500,100])[prize_id+1];
    orbs := (array[0,3,0,0,5,0,0,2])[prize_id+1];
    potions := (array[0,0,2,0,0,4,0,2])[prize_id+1];
    adventure := adventure || jsonb_build_object('coins',(adventure->>'coins')::integer+coins,'orbs',(adventure->>'orbs')::integer+orbs,'potions',(adventure->>'potions')::integer+potions,'dailySpinDay',today::text,'dailySpinPrize',prize_id);
    update public.keeper_saves set data=adventure,updated_at=now() where user_id=me;
  end if;
  return jsonb_build_object('save',adventure,'prize',prize_id,'day',today,'nextReset',((today+1)::timestamp at time zone 'UTC'));
end $$;

-- Older/offline saves cannot erase a previously claimed reward or allow another claim.
create function public.nuvori_preserve_spin() returns trigger
language plpgsql security definer set search_path = '' as $$
declare claim public.keeper_daily_spins; coins integer; orbs integer; potions integer;
begin
  select * into claim from public.keeper_daily_spins where user_id=new.user_id order by day desc limit 1;
  if found and (new.data->>'dailySpinDay' is null or new.data->>'dailySpinDay'<claim.day::text) then
    coins := (array[100,0,0,200,0,0,500,100])[claim.prize+1];
    orbs := (array[0,3,0,0,5,0,0,2])[claim.prize+1];
    potions := (array[0,0,2,0,0,4,0,2])[claim.prize+1];
    new.data := new.data || jsonb_build_object('coins',(new.data->>'coins')::integer+coins,'orbs',(new.data->>'orbs')::integer+orbs,'potions',(new.data->>'potions')::integer+potions,'dailySpinDay',claim.day::text,'dailySpinPrize',claim.prize);
  end if;
  return new;
end $$;
create trigger preserve_daily_spin before insert or update on public.keeper_saves for each row execute function public.nuvori_preserve_spin();

revoke all on function public.nuvori_profile(text,integer), public.nuvori_social(), public.nuvori_friend_request(text,uuid), public.nuvori_friend_action(uuid,text), public.nuvori_block(uuid,boolean), public.nuvori_chat_send(text,text), public.nuvori_chat_read(text), public.nuvori_daily_spin(), public.nuvori_preserve_spin() from public, anon, authenticated;
grant execute on function public.nuvori_profile(text,integer), public.nuvori_social(), public.nuvori_friend_request(text,uuid), public.nuvori_friend_action(uuid,text), public.nuvori_block(uuid,boolean), public.nuvori_chat_send(text,text), public.nuvori_chat_read(text), public.nuvori_daily_spin() to authenticated;
