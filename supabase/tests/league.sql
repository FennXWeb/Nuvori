-- Run after both frontier migrations. Every synthetic account and trial rolls back.
begin;
do $$
declare ids uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()]; i integer; result jsonb; raid uuid; room text; n jsonb; save jsonb; original jsonb; before_hp integer; before_pp integer; action_id uuid:=gen_random_uuid(); claims jsonb; other_room uuid;
begin
  n:='{"uid":"fixture-nuvo","speciesId":"cindlet-3","level":30,"xp":0,"hp":173,"prismatic":false,"moves":["flame-0","flame-3","flame-8"],"pp":{"flame-0":30,"flame-3":20,"flame-8":10}}'::jsonb;
  n:=n||jsonb_build_object('hp',public.nuvori_league_hp(n),'pp',(select jsonb_object_agg(id,(data->>'pp')::integer) from public.league_catalog where kind='move' and id in ('flame-0','flame-3','flame-8')));
  save:=jsonb_build_object('version',1,'player',jsonb_build_object('name','League fixture','palette',0,'pronouns','They / them'),'party',jsonb_build_array(n,n||'{"uid":"fixture-crew"}'::jsonb),'box','[]'::jsonb,'region','mossbell','x',560,'y',496,'orbs',12,'potions',5,'coins',300,'seen',jsonb_build_array('cindlet'),'caught',jsonb_build_array('cindlet'),'visited',jsonb_build_array('mossbell'),'landmarks','[]'::jsonb,'steps',0,'battles',0,'started',now(),'updated',now());
  for i in 1..5 loop
    insert into auth.users(id) values(ids[i]);insert into public.keeper_saves(user_id,data) values(ids[i],save);
    perform set_config('request.jwt.claim.sub',ids[i]::text,true);perform public.nuvori_profile('League fixture '||i,0);
  end loop;
  perform set_config('request.jwt.claim.sub',ids[1]::text,true);
  update public.keeper_saves set data=jsonb_set(save,'{party}',jsonb_build_array(n,n-'level')) where user_id=ids[1];
  begin perform public.nuvori_league_open('heartwood',null);raise exception 'FAIL: malformed crew accepted';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  update public.keeper_saves set data=save where user_id=ids[1];
  result:=public.nuvori_league_open('heartwood',null);raid:=(result->>'id')::uuid;room:=result->>'code';
  assert result->>'status'='lobby','Room not created';
  assert not (result->'members'->0->'player' ? 'pronouns'),'Unneeded keeper profile data shared';
  begin perform public.nuvori_league_open('heartwood',null);raise exception 'FAIL: duplicate room';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  for i in 2..4 loop perform set_config('request.jwt.claim.sub',ids[i]::text,true);result:=public.nuvori_league_open(null,room);end loop;
  assert jsonb_array_length(result->'members')=4,'Four keepers did not join';
  perform set_config('request.jwt.claim.sub',ids[5]::text,true);
  begin perform public.nuvori_league_open(null,room);raise exception 'FAIL: fifth player joined';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  begin perform public.nuvori_league_view(raid);raise exception 'FAIL: nonmember viewed';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',ids[2]::text,true);
  begin perform public.nuvori_league_start(raid);raise exception 'FAIL: guest started';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',ids[1]::text,true);result:=public.nuvori_league_start(raid);assert result->>'status'='active','Start failed';
  before_hp:=(result->>'hp')::integer;
  result:=public.nuvori_league_action(raid,'move','flame-0',action_id);
  assert (result->>'hp')::integer<before_hp,'Boss did not take damage';
  before_hp:=(result->>'hp')::integer;result:=public.nuvori_league_action(raid,'move','flame-0',action_id);
  assert (result->>'hp')::integer=before_hp,'Duplicate action applied twice';
  begin perform public.nuvori_league_action(raid,'move','flame-0',gen_random_uuid());raise exception 'FAIL: action cooldown bypass';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  perform set_config('request.jwt.claim.sub',ids[2]::text,true);
  result:=public.nuvori_league_view(raid);assert (result->>'hp')::integer=before_hp,'Second player sees different boss HP';
  begin perform public.nuvori_league_action(raid,'move','astral-9',gen_random_uuid());raise exception 'FAIL: unequipped move';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  result:=public.nuvori_league_action(raid,'move','flame-3',gen_random_uuid());
  assert (result->>'hp')::integer=before_hp,'Guard should not damage boss';
  assert (select (party->0->>'hp')::integer>public.nuvori_league_hp(party->0)-20 from public.league_members where raid_id=raid and user_id=ids[2]),'Guard did not reduce damage';
  -- Exhaust one full crew and exercise the player-avatar last stand.
  update public.league_members set party=jsonb_set(jsonb_set(party,'{0,hp}','0'),'{1,hp}','0'),phase='choice' where raid_id=raid and user_id=ids[3];
  perform set_config('request.jwt.claim.sub',ids[3]::text,true);result:=public.nuvori_league_action(raid,'stand','',gen_random_uuid());
  assert exists(select 1 from public.league_members where raid_id=raid and user_id=ids[3] and phase='keeper' and keeper_hp>0),'Last stand missing';
  update public.league_members set last_action=null where raid_id=raid and user_id=ids[3];
  result:=public.nuvori_league_action(raid,'strike','',gen_random_uuid());assert (result->>'hp')::integer<before_hp,'Keeper strike failed';
  -- Finish with a single HP guardian; every participant gets exactly one reward.
  update public.league_raids set hp=1 where id=raid;
  perform set_config('request.jwt.claim.sub',ids[4]::text,true);result:=public.nuvori_league_action(raid,'move','flame-0',gen_random_uuid());assert result->>'status'='won','Victory failed';
  perform set_config('request.jwt.claim.sub',ids[1]::text,true);original:=(select data from public.keeper_saves where user_id=ids[1]);
  result:=public.nuvori_league_claim(raid);assert result->'leagueBadges' ? 'heartwood','Crest missing';assert (result->>'coins')::integer=870,'Coin reward incorrect';
  assert (result->'party'->0->>'level')::integer>30 or (result->'party'->0->>'xp')::integer>0,'Lead XP missing';
  assert (result->'party'->1->>'xp')::integer=112,'Shared crew XP incorrect';
  claims:=public.nuvori_league_claim(raid);assert result=claims,'Reward claim not idempotent';
  begin update public.keeper_saves set data=original where user_id=ids[1];raise exception 'FAIL: stale save erased reward';exception when others then if sqlerrm like 'FAIL:%' then raise;end if;end;
  for i in 2..4 loop perform set_config('request.jwt.claim.sub',ids[i]::text,true);result:=public.nuvori_league_claim(raid);assert result->'leagueBadges' ? 'heartwood','Participant crest missing';end loop;
  -- A host can leave a lobby; another keeper inherits host privileges.
  perform set_config('request.jwt.claim.sub',ids[1]::text,true);result:=public.nuvori_league_open('heartwood',null);other_room:=(result->>'id')::uuid;room:=result->>'code';
  perform set_config('request.jwt.claim.sub',ids[2]::text,true);perform public.nuvori_league_open(null,room);
  perform set_config('request.jwt.claim.sub',ids[1]::text,true);perform public.nuvori_league_leave(other_room);
  perform set_config('request.jwt.claim.sub',ids[2]::text,true);result:=public.nuvori_league_start(other_room);assert result->>'host'=ids[2]::text,'Host transfer failed';
  result:=public.nuvori_league_action(other_room,'withdraw','',gen_random_uuid());assert result->>'status'='lost','All-player withdrawal should end trial';
  claims:=public.nuvori_league_claim(other_room);assert claims->>'interior'='lodge','Loss did not restore to lodge';assert (claims->>'coins')::integer=870,'Withdrawal awarded coins';
  -- New local channels accept all frontier and customization cells.
  perform public.nuvori_chat_send('threadhaven:tailor','Transactional fixture');
  assert jsonb_array_length(public.nuvori_chat_read('threadhaven:tailor'))=1,'New local channel failed';
  assert not has_table_privilege('authenticated','public.league_raids','UPDATE'),'Clients can mutate boss HP directly';
  assert not has_table_privilege('authenticated','public.league_catalog','SELECT'),'Private battle catalog exposed';
  assert not has_function_privilege('anon','public.nuvori_league_open(text,text)','EXECUTE'),'Anonymous league writes allowed';
  assert not has_function_privilege('authenticated','public.nuvori_league_xp(jsonb,integer)','EXECUTE'),'Internal reward function exposed';
end $$;
rollback;
select 'League checks passed: four-player combat, authority, cooldowns, retries, rewards, rescue and privacy. Fixtures rolled back.' as result;
