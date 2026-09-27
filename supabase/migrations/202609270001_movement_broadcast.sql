-- Frequent positions use Broadcast; Presence is reserved for membership.
-- The same authenticated players and private world are authorized in both directions.
create policy "Nuvori keepers receive movement" on realtime.messages
  for select to authenticated
  using (realtime.topic() = 'nuvori:auralis' and extension = 'broadcast');
create policy "Nuvori keepers publish movement" on realtime.messages
  for insert to authenticated
  with check (realtime.topic() = 'nuvori:auralis' and extension = 'broadcast');
