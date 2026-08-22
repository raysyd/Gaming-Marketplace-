-- Sidegrade — messages are intentionally immutable except for read_at.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- 03-messages-read-policy.sql added an UPDATE policy so a participant can
-- clear their own unread badge, but RLS only gates which ROWS a policy
-- lets through, not which COLUMNS. Without this, "participants mark
-- messages read" also lets either participant rewrite a message's body,
-- sender_id, kind, offer_amount or created_at after the fact — exactly
-- the tampering "messages are immutable" is supposed to rule out. Column
-- grants are the actual control; the API route only ever sending
-- { read_at } was never more than convention.

revoke update on messages from authenticated;
grant update (read_at) on messages to authenticated;
