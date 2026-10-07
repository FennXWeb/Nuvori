-- Nursery visits are escrowed in each keeper's existing RLS-protected adventure.
-- Only this RPC may begin/end a visit; normal saves must retain its exact contents.
alter table public.keeper_chat drop constraint keeper_chat_channel_check;
alter table public.keeper_chat add constraint keeper_chat_channel_check check (channel = 'global' or channel ~ '^(mossbell|verdant|tideglass|sunwake|hollow|crystal|emberfall|frostmere|starfall|saffron|threadhaven|mirelight|tempest|crownspire|dreamland)(:(lodge|shop|tailor|barber|nursery))?$');
create function public.nuvori_nursery(operation text, parent_a text default null, parent_b text default null, visit_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  me uuid:=auth.uid(); adventure jsonb; owned jsonb; a jsonb; b jsonb; sa jsonb; sb jsonb; base_spec jsonb;
  job jsonb; child jsonb; party jsonb; box jsonb; arriving jsonb; n jsonb; moves jsonb; pp jsonb;
  seconds integer; rarity_minutes integer; stamp bigint:=floor(extract(epoch from clock_timestamp())*1000);
  base_id text; child_id text; child_sex text; new_id text; receipts jsonb; captured jsonb;
begin
  if me is null then raise exception 'Sign in to use the nursery.'; end if;
  if operation is null or operation not in ('start','collect','cancel') then raise exception 'Unknown nursery action.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(me::text,28));
  select data into adventure from public.keeper_saves where user_id=me for update;
  if adventure is null then raise exception 'Save your adventure first.'; end if;
  if adventure->>'interior' is distinct from 'nursery' then raise exception 'Visit Clover inside a town nursery first.'; end if;
  if exists(select 1 from public.league_members m join public.league_raids r on r.id=m.raid_id where m.user_id=me and not m.claimed and r.status<>'closed') then raise exception 'Finish your Champions room before using the nursery.';end if;
  party:=adventure->'party'; box:=adventure->'box'; owned:=party||box;
  receipts:=coalesce(adventure->'nurseryReceipts','[]'::jsonb); job:=adventure->'nursery';
  if operation='start' then
    if job is not null then raise exception 'The nursery is already caring for a pair.'; end if;
    if parent_a is null or parent_b is null or parent_a=parent_b then raise exception 'Choose two different parents.'; end if;
    select value into a from jsonb_array_elements(owned) where value->>'uid'=parent_a;
    select value into b from jsonb_array_elements(owned) where value->>'uid'=parent_b;
    if a is null or b is null then raise exception 'Both parents must belong to your adventure.';end if;
    if a->>'sex' is null or b->>'sex' is null or a->>'sex' not in ('male','female') or b->>'sex' not in ('male','female') or a->>'sex'=b->>'sex' then raise exception 'Choose one male and one female.'; end if;
    select data into sa from public.league_catalog where kind='species' and id=a->>'speciesId';
    select data into sb from public.league_catalog where kind='species' and id=b->>'speciesId';
    base_id:=sa->>'base';
    if base_id is null or base_id is distinct from sb->>'base' then raise exception 'Both parents must belong to the same Nuvo family.';end if;
    if (a->>'level')::numeric not between 1 and 50 or (b->>'level')::numeric not between 1 and 50 then raise exception 'Invalid parent level.';end if;
    select coalesce(jsonb_agg(value order by ord),'[]') into party from jsonb_array_elements(party) with ordinality t(value,ord) where value->>'uid' not in (parent_a,parent_b);
    select coalesce(jsonb_agg(value order by ord),'[]') into box from jsonb_array_elements(box) with ordinality t(value,ord) where value->>'uid' not in (parent_a,parent_b);
    if not exists(select 1 from jsonb_array_elements(party) where (value->>'hp')::numeric>0) then raise exception 'Keep at least one healthy Nuvo in your crew.';end if;
    if jsonb_array_length(owned)>=506 then raise exception 'Make room for a new Nuvo before starting a nursery visit.';end if;
    rarity_minutes:=case sa->>'rarity' when 'Common' then 5 when 'Uncommon' then 15 when 'Rare' then 45 when 'Mythical' then 120 else null end;
    if rarity_minutes is null then raise exception 'This family is not ready for the nursery.';end if;
    seconds:=ceil(rarity_minutes*60*(1+((a->>'level')::numeric+(b->>'level')::numeric-2)/100)*(1+((sa->>'stage')::numeric+(sb->>'stage')::numeric)/2));
    select data into base_spec from public.league_catalog where kind='species' and id=base_id;
    moves:=base_spec->'startMoves';
    select jsonb_object_agg(m.value,c.data->'pp') into pp from jsonb_array_elements_text(moves) m(value) join public.league_catalog c on c.kind='move' and c.id=m.value;
    child_id:=gen_random_uuid()::text; child_sex:=case when random()<.5 then 'male' else 'female' end;
    child:=jsonb_build_object('uid',child_id,'speciesId',base_id,'level',1,'xp',0,'hp',24+floor((base_spec->'stats'->>'hp')::numeric*.6),'prismatic',random()<1.0/512,'sex',child_sex,'origin','nursery','moves',moves,'pp',pp);
    new_id:=gen_random_uuid()::text;
    job:=jsonb_build_object('id',new_id,'parents',jsonb_build_array(a,b),'child',child,'startedAt',stamp,'readyAt',stamp+seconds::bigint*1000);
    adventure:=adventure||jsonb_build_object('party',party,'box',box,'nursery',job);
  else
    if visit_id is null then raise exception 'Choose a nursery visit.';end if;
    if receipts ? visit_id then return adventure; end if; -- Retry after an uncertain network response.
    if job is null or job->>'id' is distinct from visit_id then raise exception 'This nursery visit has already ended.';end if;
    if operation='collect' and stamp<(job->>'readyAt')::bigint then raise exception 'Your new Nuvo is not ready yet.';end if;
    arriving:=job->'parents';
    if operation='collect' then arriving:=arriving||jsonb_build_array(job->'child');end if;
    if jsonb_array_length(party)+jsonb_array_length(box)+jsonb_array_length(arriving)>506 then raise exception 'Make room in your crew or reserve, then return to collect.';end if;
    for n in select value from jsonb_array_elements(arriving) loop
      if jsonb_array_length(party)<6 then party:=party||jsonb_build_array(n);else box:=box||jsonb_build_array(n);end if;
    end loop;
    adventure:=(adventure-'nursery')||jsonb_build_object('party',party,'box',box,'nurseryReceipts',receipts||jsonb_build_array(visit_id));
    if operation='collect' then
      base_id:=job->'child'->>'speciesId';
      if not adventure->'caught' ? base_id then adventure:=jsonb_set(adventure,'{caught}',adventure->'caught'||jsonb_build_array(base_id));end if;
      if not adventure->'seen' ? base_id then adventure:=jsonb_set(adventure,'{seen}',adventure->'seen'||jsonb_build_array(base_id));end if;
    end if;
  end if;
  adventure:=adventure||jsonb_build_object('updated',clock_timestamp());
  perform set_config('nuvori.nursery_write','on',true);
  update public.keeper_saves set data=adventure,updated_at=clock_timestamp() where user_id=me;
  perform set_config('nuvori.nursery_write','off',true);
  return adventure;
end $$;

create function public.nuvori_preserve_nursery() returns trigger language plpgsql security definer set search_path='' as $$
declare all_nuvo jsonb; old_nuvo jsonb; ledger jsonb; sex text; identity text; ids text[];
begin
  if current_setting('nuvori.nursery_write',true) is distinct from 'on' then
    if tg_op='INSERT' then
      if new.data ? 'nursery' then raise exception 'Start an online nursery visit through Clover.';end if;
    elsif old.data->'nursery' is distinct from new.data->'nursery' or coalesce(old.data->'nurseryReceipts','[]') is distinct from coalesce(new.data->'nurseryReceipts','[]') then
      raise exception 'Your nursery changed in another session. Reload your cloud save before writing.';
    end if;
  end if;
  ledger:=coalesce(new.data->'dreamweaverCaptures','{}');
  if jsonb_typeof(ledger)<>'object' or exists(select 1 from jsonb_each(ledger) t where t.key not in ('male','female') or jsonb_typeof(t.value)<>'string' or length(t.value#>>'{}')=0) then raise exception 'Invalid Dreamweaver capture record.';end if;
  if tg_op='UPDATE' then
    for sex,identity in select key,value from jsonb_each_text(coalesce(old.data->'dreamweaverCaptures','{}')) loop
      if ledger->>sex is distinct from identity then raise exception 'A wild Dreamweaver of this sex was already caught. Reload your cloud save.';end if;
    end loop;
  end if;
  all_nuvo:=(new.data->'party')||(new.data->'box')||coalesce(new.data->'nursery'->'parents','[]');
  if exists(select 1 from jsonb_array_elements(all_nuvo) group by value->>'uid' having count(*)>1) then raise exception 'A Nuvo cannot be in two places at once.';end if;
  if tg_op='UPDATE' then
    old_nuvo:=(old.data->'party')||(old.data->'box')||coalesce(old.data->'nursery'->'parents','[]');
    if exists(select 1 from jsonb_array_elements(all_nuvo) n join jsonb_array_elements(old_nuvo) p on n->>'uid'=p->>'uid' where p->>'sex' in ('male','female') and n->>'sex' is distinct from p->>'sex') then raise exception 'A companion keeps its assigned sex. Refresh this older adventure.';end if;
  end if;
  foreach sex in array array['male','female'] loop
    select array_agg(value->>'uid') into ids from jsonb_array_elements(all_nuvo) where (value->>'speciesId'='dreamweaver' or value->>'speciesId' like 'dreamweaver-%') and value->>'origin' is distinct from 'nursery' and value->>'sex'=sex;
    if coalesce(array_length(ids,1),0)>1 then raise exception 'Only one wild male and one wild female Dreamweaver may be caught.';end if;
    if ids is not null then
      if ledger ? sex and ledger->>sex is distinct from ids[1] then raise exception 'This Dreamweaver catch allowance has already been used.';end if;
      if not ledger ? sex then raise exception 'Dreamweaver catches must preserve their lifetime record.';end if;
    end if;
  end loop;
  return new;
end $$;
create trigger preserve_nursery before insert or update on public.keeper_saves for each row execute function public.nuvori_preserve_nursery();
revoke all on function public.nuvori_nursery(text,text,text,text), public.nuvori_preserve_nursery() from public,anon,authenticated;
grant execute on function public.nuvori_nursery(text,text,text,text) to authenticated;
notify pgrst, 'reload schema';
