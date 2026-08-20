-- Sidegrade — lets a conversation participant mark messages read.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- There was no UPDATE policy on `messages` at all before this, so nothing
-- could ever clear the unread badge server-side: the app could set
-- read_at all it wanted, but RLS silently matched zero rows under the
-- default deny, and the count just came back unread on the next load.

drop policy if exists "participants mark messages read" on messages;
create policy "participants mark messages read" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and auth.uid() in (c.buyer_id, c.seller_id)
    )
  );
