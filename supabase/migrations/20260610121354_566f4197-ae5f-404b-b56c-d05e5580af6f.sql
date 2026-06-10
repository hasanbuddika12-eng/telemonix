
CREATE TABLE public.telegram_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_channels TO anon, authenticated;
GRANT ALL ON public.telegram_channels TO service_role;
ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.telegram_channels FOR SELECT USING (true);
CREATE POLICY "public insert" ON public.telegram_channels FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete" ON public.telegram_channels FOR DELETE USING (true);
