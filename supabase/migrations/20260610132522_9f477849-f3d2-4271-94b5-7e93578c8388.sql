
ALTER TABLE public.telegram_channels ADD COLUMN IF NOT EXISTS owner_id bigint;
ALTER TABLE public.telegram_channels ADD COLUMN IF NOT EXISTS members_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.profiles (
  telegram_user_id bigint PRIMARY KEY,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  balance_usd numeric(12,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles public insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles public update" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.sent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id bigint NOT NULL,
  channel_id uuid REFERENCES public.telegram_channels(id) ON DELETE SET NULL,
  chat_id text NOT NULL,
  message_id bigint,
  text text,
  views integer NOT NULL DEFAULT 0,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sent_messages TO anon, authenticated;
GRANT ALL ON public.sent_messages TO service_role;
ALTER TABLE public.sent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sent_messages public all" ON public.sent_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS sent_messages_owner_idx ON public.sent_messages(owner_id);
CREATE INDEX IF NOT EXISTS channels_owner_idx ON public.telegram_channels(owner_id);
