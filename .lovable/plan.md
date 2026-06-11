# TeleMonix Ad Network — Implementation Plan

This is a large rebuild of the mini app into a two-sided ad network. I'll ship it in clearly separated phases so we can review each one. Please confirm the plan (and answer the few questions at the end) before I start.

## 1. Branding & Bot
- Rename app → **TeleMonix**. New bot username: `teleMonix_bot`.
- Need a new `TELEGRAM_BOT_TOKEN` secret for the new bot (current token belongs to the old bot). I'll ask for it via the secret tool when we start.
- Generate a TeleMonix logo asset + animated splash/loading screen on mini app open.
- Polished gradient theme, motion (framer-style CSS animations), glassmorphism cards.

## 2. Two Modes: Publisher & Advertiser
- First open → mode picker (Publisher / Advertiser), stored in profile.
- Top switcher to flip between modes anytime.
- Each mode has its own **wallet** (publisher_balance, advertiser_balance) and its own tabs.

## 3. Publisher Mode
Tabs: Home · Channels · Refer · Guide
- **Home**: total earnings, withdraw/deposit (coming soon), "Add my channel" CTA, monetization explainer, channel count + total members. No views/clicks/post-count shown to users.
- **Channels**:
  - Add channel → status `pending_review`. Admin must approve before it becomes `active` and earns.
  - Each channel row shows: status badge, member count, **accumulated balance from that channel**, category.
  - Category selector when adding (Tech, News, Crypto, Entertainment, Education, Business, Lifestyle, Other — editable by admin).
  - After adding, bot DMs the user a pre-made "About TeleMonix" promo post they can forward to their channel; admin reviews quality and approves.
  - If bot is removed from channel → channel set `inactive`, bot sends DM notification with channel name + "Open Mini App" button explaining re-add.
- **Refer**: unique referral link, total referrals, earnings (10% commission on referred users' earnings forever), history list.
- **Guide**: full image+text guide on how to monetize a Telegram channel via TeleMonix.

## 4. Advertiser Mode
Tabs: Home · Create Ad · Manage Ads · Wallet
- **Home**: total channels in network, total members reachable, active campaigns, balance. Network explainer.
- **Create Ad** (all required):
  - Post text, image, button title, button URL (website/bot/mini app).
  - Category select (aggregated from active channels' categories).
  - Target views (min 100) + target clicks (min 100).
  - Pricing shown live: **$1 per 1000 views + $10 per 1000 clicks** (rates editable by admin).
  - Total cost deducted from advertiser wallet on submit → status `pending_review`.
- **Manage Ads**: each campaign shows views/clicks progress bars, status (pending/active/complete), spend, remaining budget. Can top up views/clicks. On completion, bot auto-deletes all sent messages from channels.
- **Wallet**: balance, deposit (coming soon).

## 5. Admin (chat id 5419054691)
Extra admin-only tabs: Settings · Channel Reviews · Ad Reviews
- **Settings**: edit CPM range ($1–$5 display, "earn up to $1–$5 CPM"), per-1000-view rate, per-1000-click rate, referral % (default 10), publisher revenue share (default 65%), watermark toggle.
- **Channel Reviews**: pending channels list with "View Channel" button + Approve/Reject.
- **Ad Reviews**: preview each pending ad, Approve → begins distribution / Reject → refund.
- Admin keeps existing Compose + Saved tabs (direct broadcasts) — separate from the ad network.
- Admin can delete any bot-sent message from any channel via UI.

## 6. Ad Distribution Engine
- When an ad is approved, it enters a queue. A scheduler picks matching `active` channels (by category) and posts daily at a paced rate (more channels = faster completion).
- One ad → one shared tracking link `/api/public/t/:adId?c=:channelId`. Clicks from any channel/repost accumulate on the same ad. Per-channel breakdown stored for publisher payout.
- Each post tracked in `ad_placements` (ad_id, channel_id, message_id, views, clicks, sent_at).
- On reaching either views OR clicks target → ad marked `complete`, bot deletes every placement message, no more posting.
- Top-ups reopen the campaign and resume posting.

## 7. Real View Counting (the hard part)
The Bot API does not expose channel post views directly. Two options:

**Option A (recommended):** Use a **Telegram User Bot (MTProto)** via a small Python worker (Telethon/Pyrogram) running outside the Worker runtime — periodically reads `channel.messages.getMessages` which returns real `views`. Requires user to provide a Telegram API ID + API hash + a phone number / session string. Most accurate; this is what every real ad network does.

**Option B:** Approximate via members_count × engagement rate (15–40% sampled per channel based on past clicks) + click-driven floor. Cheap, no extra infra, but estimated.

I'll implement **B** now as a realistic estimator (50–500 views per 1000 subs, capped by member count, scaled by elapsed time + click ratio) and wire the schema so **A** can be added later as a sync worker. Let me know if you want me to set up Option A — I'll need API credentials.

## 8. Click Tracking (100% accurate)
- Inline button URL = `/api/public/t/:adId?c=:channelId&u=:userId`.
- Endpoint: increments click counters atomically (ad total, per-channel, unique-by-user if `u` set), then 302 redirects to advertiser URL.
- In mini app: clicking the button opens link via `Telegram.WebApp.openLink(url)` then calls `WebApp.close()`.

## 9. Watermark
- Per-post toggle "Add TeleMonix watermark" (default ON for ads, OFF for admin direct broadcasts).
- When ON: appends `\n\n— via @teleMonix_bot · Monetize your channel` to the post text.

## 10. Revenue Split
- Per click event with value `V`: publisher (channel owner) earns `V × 0.65`, referrer earns `V × 0.10` of publisher's share, platform keeps remainder.
- All accruals written to `earnings_ledger` (user_id, channel_id, ad_id, type, amount, created_at).

## 11. Database Changes (one migration)
New tables: `categories`, `ad_campaigns`, `ad_placements`, `referrals`, `earnings_ledger`, `notifications`.
Alter `profiles`: `mode`, `referrer_id`, `referral_code`, `advertiser_balance_usd`, `publisher_balance_usd`.
Alter `telegram_channels`: `status` (pending/active/inactive), `category_id`, `accumulated_usd`.
Alter `app_settings`: add `cpm_view_rate`, `cpm_click_rate`, `pub_share_pct`, `ref_pct`, `min_views`, `min_clicks`.

## 12. Bot-Side Webhook Additions
- Listen to `my_chat_member` updates → if bot kicked/demoted from a channel, set `inactive` and send owner the "re-add" DM with Open Mini App button.
- Listen to channel posts (optional) for view sampling.

## Technical notes
- Stack stays TanStack Start + Supabase (Lovable Cloud).
- Distribution scheduler: pg_cron job every 5 min calling a public `/api/public/cron/distribute` endpoint (HMAC-protected).
- All money math in `numeric(12,4)` USD.
- Toasts via existing sonner.

## Questions before I build
1. **Views accuracy:** ship the estimator now (Option B), or wait for you to provide Telegram API credentials for Option A?
2. **New bot token** for `teleMonix_bot` — I'll request it as a secret when you confirm. The old `TELEGRAM_BOT_TOKEN` will be overwritten. OK?
3. **Logo:** I'll generate a TeleMonix logo (purple/cyan gradient, modern fintech feel). Any preferences (colors, style)?
4. **Existing data:** wipe current `saved_posts` / `sent_messages` / channels, or migrate them?

This is ~2–3 large implementation passes. After you confirm, I'll execute phase-by-phase, starting with branding + DB migration + mode picker, then publisher flow, then advertiser flow, then admin reviews + distribution engine.
