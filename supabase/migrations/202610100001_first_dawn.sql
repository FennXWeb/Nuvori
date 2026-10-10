-- Prepared for the future production promotion. Private beta remains offline.
begin;
alter table public.keeper_chat drop constraint keeper_chat_channel_check;
alter table public.keeper_chat add constraint keeper_chat_channel_check check (
 channel = 'global' or channel = 'hall' or channel ~ '^(mossbell|verdant|tideglass|sunwake|hollow|crystal|emberfall|frostmere|starfall|saffron|threadhaven|mirelight|tempest|crownspire|dreamland|brookbend|bramble|echohollow|glassvein|lanternlake|rimewind)(:(lodge|shop|tailor|barber|nursery))?$'
);
commit;
