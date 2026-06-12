# TeleMonix — Telegram Ad Network

Mini app for monetizing Telegram channels and running ad campaigns.

## Local dev

```bash
bun install
bun run dev
```

## Deploy

### Lovable (default)
Already wired. Just publish from the editor.

### Netlify
1. Push this repo to GitHub.
2. Create a new Netlify site from the repo (build settings auto-detected from `netlify.toml`).
3. Add the env vars from `.env.example` in Netlify Site settings → Environment variables.
4. Note: TanStack Start server functions on Netlify require the Netlify adapter; for full backend the recommended hosting stays on Lovable Cloud.

### GitHub
Standard Git workflow; `.lovable/`, `.env`, `node_modules`, and `dist` are gitignored.

## Bot
- Bot: `@teleMonix_bot`
- Mini app start link: `https://t.me/teleMonix_bot?startapp`
- Referral: `https://t.me/teleMonix_bot?startapp=ref_<code>`

## Deposits (BEP20 / TRC20 / TON)
- USDT BEP20: `0x082679f6cD88A25a17b58979AC72a500b1Aa1b9c`
- TRX TRC20: `THK7E2wEz6SjakNM3Z7jigJdU9ixKJPDEo`
- TON: `UQA3agalrvn_PYTiVYvaS55qthZFxnLrjQm0tUNb2lQ3A9pL`
