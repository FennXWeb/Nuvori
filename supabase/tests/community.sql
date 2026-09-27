-- Run in the SQL Editor after the community migration. All fixtures roll back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid();
  friendship uuid; result jsonb; first_spin jsonb; second_spin jsonb; original jsonb;
begin
  insert into auth.users(id) values(a),(b),(c);
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.nuvori_profile('Fixture A',0);
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.nuvori_profile('Fixture B',1);
  perform set_config('request.jwt.claim.sub',c::text,true);
  perform public.nuvori_profile('Fixture C',2);
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.nuvori_friend_request(null,b);
  select id into friendship from public.keeper_friendships where requester=a and recipient=b;
  begin
    perform public.nuvori_friend_action(friendship,'accept');
    raise exception 'FAIL: requester accepted own request';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',c::text,true);
  result:=public.nuvori_social();
  assert jsonb_array_length(result->'friends')=0,'Third party can see friendships';
  begin
    perform public.nuvori_friend_action(friendship,'remove');
    raise exception 'FAIL: unrelated user removed friendship';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',b::text,true);
  perform public.nuvori_friend_action(friendship,'accept');
  assert (public.nuvori_social()->'friends'->0->>'status')='accepted','Recipient acceptance failed';
  perform public.nuvori_chat_send('mossbell','Local fixture');
  begin
    perform public.nuvori_chat_send('global','Too fast');
    raise exception 'FAIL: chat rate limit did not apply';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',a::text,true);
  perform public.nuvori_chat_send('global','Global fixture');
  assert exists(select 1 from jsonb_array_elements(public.nuvori_chat_read('mossbell')) m where m->>'body'='Local fixture'),'Local message missing';
  assert not exists(select 1 from jsonb_array_elements(public.nuvori_chat_read('mossbell:lodge')) m where m->>'body'='Local fixture'),'Local chat leaked into interior';
  assert not exists(select 1 from jsonb_array_elements(public.nuvori_chat_read('global')) m where m->>'body'='Local fixture'),'Local chat leaked into global';
  perform public.nuvori_block(b,true);
  assert jsonb_array_length(public.nuvori_social()->'friends')=0,'Block did not remove friendship';
  assert not exists(select 1 from jsonb_array_elements(public.nuvori_chat_read('mossbell')) m where m->>'sender'=b::text),'Blocked chat remains visible';
  begin
    perform public.nuvori_friend_request(null,b);
    raise exception 'FAIL: blocked keeper received friend request';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  perform public.nuvori_block(b,false);
  assert jsonb_array_length(public.nuvori_social()->'blocked')=0,'Unblock failed';
  original:='{"version":1,"coins":300,"orbs":12,"potions":5}'::jsonb;
  insert into public.keeper_saves(user_id,data) values(a,original);
  first_spin:=public.nuvori_daily_spin(); second_spin:=public.nuvori_daily_spin();
  assert first_spin=second_spin,'Duplicate daily spin changed the reward/save';
  assert (select count(*) from public.keeper_daily_spins where user_id=a)=1,'Multiple daily claims were created';
  update public.keeper_saves set data=original where user_id=a;
  assert (select data from public.keeper_saves where user_id=a)=first_spin->'save','Stale save lost the claimed reward';
  assert not has_function_privilege('anon','public.nuvori_daily_spin()','execute'),'Anonymous wheel claims allowed';
  assert not has_function_privilege('anon','public.nuvori_chat_read(text)','execute'),'Anonymous chat access allowed';
  assert not has_table_privilege('authenticated','public.keeper_chat','insert'),'Direct chat writes bypass rate limit';
  assert not has_table_privilege('authenticated','public.keeper_daily_spins','insert'),'Direct spin writes allowed';
  raise notice 'PASS: friendship authorization, blocking, channel isolation, chat rate limiting, daily idempotency, stale saves, and anonymous restrictions';
end $$;
rollback;
select 'Community backend checks passed; all test fixtures rolled back.' as result;
