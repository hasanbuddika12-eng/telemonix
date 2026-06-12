
-- Dedupe table: 1 row per (placement, user, source). Source ignored for dedupe across sources.
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES public.ad_placements(id) ON DELETE CASCADE,
  user_id bigint NOT NULL,
  source text NOT NULL DEFAULT 'button',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ad_clicks_placement_user_uniq
  ON public.ad_clicks(placement_id, user_id);
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.ad_clicks FOR ALL USING (false);

CREATE TABLE IF NOT EXISTS public.post_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_message_id uuid NOT NULL REFERENCES public.sent_messages(id) ON DELETE CASCADE,
  user_id bigint NOT NULL,
  source text NOT NULL DEFAULT 'button',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS post_clicks_msg_user_uniq
  ON public.post_clicks(sent_message_id, user_id);
GRANT ALL ON public.post_clicks TO service_role;
ALTER TABLE public.post_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.post_clicks FOR ALL USING (false);

-- Link rewriting map + extra counters
ALTER TABLE public.sent_messages
  ADD COLUMN IF NOT EXISTS link_map jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS watermark boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cpm_usd numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc_usd numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unique_clicks integer NOT NULL DEFAULT 0;

ALTER TABLE public.ad_placements
  ADD COLUMN IF NOT EXISTS link_map jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unique_clicks integer NOT NULL DEFAULT 0;

ALTER TABLE public.saved_posts
  ADD COLUMN IF NOT EXISTS watermark boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cpm_usd numeric(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpc_usd numeric(12,4) NOT NULL DEFAULT 0;
