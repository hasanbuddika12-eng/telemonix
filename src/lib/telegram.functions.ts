import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

const TG_API = "https://api.telegram.org";
const ADMIN_ID = 5419054691;
const BOT_USERNAME = "teleMonix_bot";
const WATERMARK = `\n\n— via @${BOT_USERNAME} · Monetize your Telegram channel`;
const URL_RE = /(https?:\/\/[^\s<]+)/gi;

// Replace every http(s) URL in `text` with `${origin}/api/public/t/<id>?u=...&src=link&to=<url>`.
// Returns rewritten text + mapping (original url → tracker url).
function rewriteLinks(text: string, origin: string, trackerId: string, source: "post" | "ad"): { text: string; map: Record<string, string> } {
  if (!text || !origin) return { text: text || "", map: {} };
  const map: Record<string, string> = {};
  const out = text.replace(URL_RE, (orig) => {
    const tracker = `${origin}/api/public/t/${trackerId}?p=${source}&src=link&to=${encodeURIComponent(orig)}`;
    map[orig] = tracker;
    return tracker;
  });
  return { text: out, map };
}


function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN missing");
  return t;
}

async function tg(method: string, body: any) {
  const res = await fetch(`${TG_API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type TgUser = { id: number; username?: string; first_name?: string; last_name?: string; photo_url?: string };

function parseInitData(initData: string): { user: TgUser; valid: boolean; startParam?: string } | null {
  if (!initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const pairs: string[] = [];
    Array.from(params.keys()).sort().forEach((k) => pairs.push(`${k}=${params.get(k)}`));
    const dcs = pairs.join("\n");
    const secret = createHmac("sha256", "WebAppData").update(token()).digest();
    const expected = createHmac("sha256", secret).update(dcs).digest("hex");
    const valid = expected === hash;
    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson) as TgUser;
    return { user, valid, startParam: params.get("start_param") || undefined };
  } catch {
    return null;
  }
}

function resolveUser(initData?: string | null, devUid?: number | null) {
  const parsed = initData ? parseInitData(initData) : null;
  if (parsed?.valid) return parsed;
  const id = devUid || ADMIN_ID;
  return { user: { id, first_name: id === ADMIN_ID ? "Admin" : "User" } as TgUser, valid: false, startParam: undefined as string | undefined };
}

async function upsertProfile(u: TgUser, referralCode?: string) {
  const sb = await getAdmin();
  const myCode = String(u.id.toString(36)).toUpperCase().slice(-8).padStart(8, "0");
  await sb.from("profiles").upsert({
    telegram_user_id: u.id,
    username: u.username || null,
    first_name: u.first_name || null,
    last_name: u.last_name || null,
    photo_url: u.photo_url || null,
    referral_code: myCode,
  }, { onConflict: "telegram_user_id" });

  // Handle referral
  if (referralCode) {
    const { data: ref } = await sb.from("profiles").select("telegram_user_id").eq("referral_code", referralCode).maybeSingle();
    if (ref && ref.telegram_user_id !== u.id) {
      await sb.from("referrals").upsert({ referrer_id: ref.telegram_user_id, referred_id: u.id }, { onConflict: "referred_id" });
      await sb.from("profiles").update({ referrer_id: ref.telegram_user_id }).eq("telegram_user_id", u.id).is("referrer_id", null);
    }
  }
}

async function getSettings() {
  const sb = await getAdmin();
  const { data } = await sb.from("app_settings").select("*");
  const m: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { if (r.value_num != null) m[r.key] = Number(r.value_num); });
  return {
    view_rate_usd: m.view_rate_usd ?? 0.001,
    click_rate_usd: m.click_rate_usd ?? 0.01,
    publisher_share_pct: m.publisher_share_pct ?? 65,
    referral_pct: m.referral_pct ?? 10,
    min_views: m.min_views ?? 100,
    min_clicks: m.min_clicks ?? 100,
    max_display_cpm: m.max_display_cpm ?? 5,
    min_display_cpm: m.min_display_cpm ?? 1,
  };
}

// =============== ME / PROFILE ===============
export const getMe = createServerFn({ method: "POST" })
  .inputValidator((d: { initData?: string; devUid?: number; refCode?: string }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    await upsertProfile(user, data.refCode);
    const sb = await getAdmin();
    const { data: profile } = await sb.from("profiles").select("*").eq("telegram_user_id", user.id).single();
    const isAdmin = user.id === ADMIN_ID;
    const settings = await getSettings();

    // publisher stats
    const { data: channels } = await sb.from("telegram_channels").select("id, members_count, status, accumulated_usd").eq("owner_id", user.id);
    const activeCh = (channels ?? []).filter((c: any) => c.status === "active");
    const totalMembers = activeCh.reduce((s: number, c: any) => s + (c.members_count || 0), 0);
    const channelEarnings = (channels ?? []).reduce((s: number, c: any) => s + Number(c.accumulated_usd || 0), 0);

    // referral stats
    const { data: refs } = await sb.from("referrals").select("referred_id").eq("referrer_id", user.id);
    const { data: refEarn } = await sb.from("earnings_ledger").select("amount_usd").eq("user_id", user.id).eq("type", "referral");
    const referralEarned = (refEarn ?? []).reduce((s: number, r: any) => s + Number(r.amount_usd || 0), 0);

    return {
      user, isAdmin, profile, settings,
      bot_username: BOT_USERNAME,
      publisher: {
        channelCount: (channels ?? []).length,
        activeChannelCount: activeCh.length,
        totalMembers,
        earned: channelEarnings,
      },
      advertiser: {
        balance: Number(profile?.advertiser_balance_usd ?? 0),
      },
      referral: {
        code: profile?.referral_code,
        count: (refs ?? []).length,
        earned: referralEarned,
      },
    };
  });

export const setMode = createServerFn({ method: "POST" })
  .inputValidator((d: { mode: "publisher" | "advertiser"; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    const sb = await getAdmin();
    await sb.from("profiles").update({ mode: data.mode, onboarded: true }).eq("telegram_user_id", user.id);
    return { ok: true };
  });

// =============== CATEGORIES ===============
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await getAdmin();
  const { data } = await sb.from("categories").select("*").order("sort_order");
  return data ?? [];
});

// =============== CHANNELS ===============
export const addChannel = createServerFn({ method: "POST" })
  .inputValidator((d: { chat: string; categoryId: string; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    await upsertProfile(user);

    let chatRef = data.chat.trim();
    if (chatRef.startsWith("https://t.me/")) chatRef = chatRef.replace("https://t.me/", "");
    if (chatRef.startsWith("t.me/")) chatRef = chatRef.replace("t.me/", "");
    if (!chatRef.startsWith("@") && !chatRef.startsWith("-") && isNaN(Number(chatRef))) chatRef = "@" + chatRef;

    const info = await tg("getChat", { chat_id: chatRef });
    if (!info.ok) throw new Error(info.description || "Could not find channel.");

    const me = await tg("getMe", {});
    const member = await tg("getChatMember", { chat_id: info.result.id, user_id: me.result.id });
    if (!member.ok) throw new Error(`Add @${BOT_USERNAME} as admin first.`);
    const status = member.result?.status;
    if (status !== "administrator" && status !== "creator") {
      throw new Error(`Bot is not an admin. Make @${BOT_USERNAME} an admin first.`);
    }

    const count = await tg("getChatMemberCount", { chat_id: info.result.id });
    const sb = await getAdmin();
    const { data: row, error } = await sb
      .from("telegram_channels")
      .upsert({
        chat_id: String(info.result.id),
        title: info.result.title || info.result.username || "Channel",
        username: info.result.username || null,
        owner_id: user.id,
        members_count: count.ok ? count.result : 0,
        category_id: data.categoryId,
        status: "pending",
      }, { onConflict: "chat_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Send onboarding DM to user with intro post
    try {
      await tg("sendMessage", {
        chat_id: user.id,
        text: `✅ Channel <b>${row.title}</b> added!\n\nIt's now pending admin review. Once approved, ads will start appearing and you'll earn from views & clicks.\n\n💡 Forward this post about TeleMonix to your channel — it helps the review pass faster:`,
        parse_mode: "HTML",
      });
      await tg("sendMessage", {
        chat_id: user.id,
        text: `🚀 <b>Monetize your Telegram channel with TeleMonix</b>\n\nJoin the TeleMonix ad network and earn from every post your channel receives. Real CPM, real payouts, automated.\n\n👉 Open mini app: t.me/${BOT_USERNAME}/app`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "Open TeleMonix", url: `https://t.me/${BOT_USERNAME}/app` }]] },
      });
    } catch {}

    return row;
  });

export const listChannels = createServerFn({ method: "POST" })
  .inputValidator((d: { initData?: string; devUid?: number; scope?: "mine" | "all" | "pending" }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    const isAdmin = user.id === ADMIN_ID;
    const sb = await getAdmin();
    let q = sb.from("telegram_channels").select("*, categories(name, emoji)").order("created_at", { ascending: false });
    if (data.scope === "pending" && isAdmin) q = q.eq("status", "pending");
    else if (data.scope !== "all" || !isAdmin) q = q.eq("owner_id", user.id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteChannel = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    const isAdmin = user.id === ADMIN_ID;
    const sb = await getAdmin();
    let q = sb.from("telegram_channels").delete().eq("id", data.id);
    if (!isAdmin) q = q.eq("owner_id", user.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reviewChannel = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; approve: boolean; reason?: string; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    if (user.id !== ADMIN_ID) throw new Error("Forbidden");
    const sb = await getAdmin();
    const { data: ch } = await sb.from("telegram_channels").select("*").eq("id", data.id).single();
    if (!ch) throw new Error("Not found");
    await sb.from("telegram_channels").update({
      status: data.approve ? "active" : "rejected",
      reviewed_at: new Date().toISOString(),
      rejection_reason: data.approve ? null : (data.reason || "Not approved"),
    }).eq("id", data.id);
    // Notify owner
    if (ch.owner_id) {
      try {
        await tg("sendMessage", {
          chat_id: ch.owner_id,
          text: data.approve
            ? `✅ Channel <b>${ch.title}</b> approved! Ads will start appearing soon and you'll earn from views & clicks.`
            : `❌ Channel <b>${ch.title}</b> was not approved.\nReason: ${data.reason || "Quality review failed."}`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "Open TeleMonix", url: `https://t.me/${BOT_USERNAME}/app` }]] },
        });
      } catch {}
    }
    return { ok: true };
  });

// =============== AD CAMPAIGNS ===============
export const createCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: {
    text: string; imageBase64?: string | null;
    buttonText: string; buttonUrl: string;
    categoryId: string; watermark?: boolean;
    targetViews: number; targetClicks: number;
    initData?: string; devUid?: number;
  }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    await upsertProfile(user);
    const sb = await getAdmin();
    const settings = await getSettings();
    const targetViews = Math.max(settings.min_views, data.targetViews);
    const targetClicks = Math.max(settings.min_clicks, data.targetClicks);
    const cost = +((targetViews * settings.view_rate_usd) + (targetClicks * settings.click_rate_usd)).toFixed(4);

    const { data: profile } = await sb.from("profiles").select("advertiser_balance_usd").eq("telegram_user_id", user.id).single();
    const bal = Number(profile?.advertiser_balance_usd || 0);
    if (bal < cost) throw new Error(`Insufficient balance. Need $${cost.toFixed(2)}, have $${bal.toFixed(2)}.`);

    const { data: row, error } = await sb.from("ad_campaigns").insert({
      advertiser_id: user.id,
      text: data.text, image_base64: data.imageBase64 || null,
      button_text: data.buttonText, button_url: data.buttonUrl,
      category_id: data.categoryId,
      watermark: data.watermark !== false,
      target_views: targetViews, target_clicks: targetClicks,
      view_rate_usd: settings.view_rate_usd, click_rate_usd: settings.click_rate_usd,
      budget_usd: cost, status: "pending_review",
    }).select().single();
    if (error) throw new Error(error.message);
    await sb.from("profiles").update({ advertiser_balance_usd: bal - cost }).eq("telegram_user_id", user.id);
    return row;
  });

export const listCampaigns = createServerFn({ method: "POST" })
  .inputValidator((d: { initData?: string; devUid?: number; scope?: "mine" | "pending" }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    const isAdmin = user.id === ADMIN_ID;
    const sb = await getAdmin();
    let q = sb.from("ad_campaigns").select("*, categories(name, emoji)").order("created_at", { ascending: false });
    if (data.scope === "pending" && isAdmin) q = q.eq("status", "pending_review");
    else q = q.eq("advertiser_id", user.id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const reviewCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; approve: boolean; reason?: string; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    if (user.id !== ADMIN_ID) throw new Error("Forbidden");
    const sb = await getAdmin();
    const { data: c } = await sb.from("ad_campaigns").select("*").eq("id", data.id).single();
    if (!c) throw new Error("Not found");
    if (data.approve) {
      await sb.from("ad_campaigns").update({
        status: "active", approved_at: new Date().toISOString(),
      }).eq("id", data.id);
    } else {
      // refund
      const { data: prof } = await sb.from("profiles").select("advertiser_balance_usd").eq("telegram_user_id", c.advertiser_id).single();
      await sb.from("profiles").update({
        advertiser_balance_usd: Number(prof?.advertiser_balance_usd || 0) + Number(c.budget_usd || 0),
      }).eq("telegram_user_id", c.advertiser_id);
      await sb.from("ad_campaigns").update({
        status: "rejected", rejection_reason: data.reason || "Not approved",
      }).eq("id", data.id);
    }
    try {
      await tg("sendMessage", {
        chat_id: c.advertiser_id,
        text: data.approve
          ? `✅ Your ad campaign was approved and is now distributing to matching channels.`
          : `❌ Your ad campaign was not approved.\nReason: ${data.reason || "Quality"}\n\nYour balance has been refunded.`,
        reply_markup: { inline_keyboard: [[{ text: "Open TeleMonix", url: `https://t.me/${BOT_USERNAME}/app` }]] },
      });
    } catch {}
    return { ok: true };
  });

export const topupCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; addViews: number; addClicks: number; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    const sb = await getAdmin();
    const { data: c } = await sb.from("ad_campaigns").select("*").eq("id", data.id).eq("advertiser_id", user.id).single();
    if (!c) throw new Error("Not found");
    const settings = await getSettings();
    const addV = Math.max(0, data.addViews | 0);
    const addC = Math.max(0, data.addClicks | 0);
    const cost = +(addV * settings.view_rate_usd + addC * settings.click_rate_usd).toFixed(4);
    const { data: prof } = await sb.from("profiles").select("advertiser_balance_usd").eq("telegram_user_id", user.id).single();
    const bal = Number(prof?.advertiser_balance_usd || 0);
    if (bal < cost) throw new Error(`Need $${cost.toFixed(2)}, have $${bal.toFixed(2)}.`);
    await sb.from("profiles").update({ advertiser_balance_usd: bal - cost }).eq("telegram_user_id", user.id);
    await sb.from("ad_campaigns").update({
      target_views: c.target_views + addV,
      target_clicks: c.target_clicks + addC,
      budget_usd: Number(c.budget_usd) + cost,
      status: c.status === "complete" ? "active" : c.status,
      completed_at: c.status === "complete" ? null : c.completed_at,
    }).eq("id", data.id);
    return { ok: true };
  });

// =============== ADVERTISER WALLET ===============
export const advertiserStats = createServerFn({ method: "POST" })
  .inputValidator((d: { initData?: string; devUid?: number }) => d)
  .handler(async () => {
    const sb = await getAdmin();
    const { data: ch } = await sb.from("telegram_channels").select("members_count").eq("status", "active");
    const totalChannels = (ch ?? []).length;
    const totalMembers = (ch ?? []).reduce((s: number, c: any) => s + (c.members_count || 0), 0);
    return { totalChannels, totalMembers };
  });

// =============== ADMIN: legacy compose + saved posts (unchanged) ===============
export const broadcast = createServerFn({ method: "POST" })
  .inputValidator((d: {
    text: string; imageBase64?: string | null;
    buttonText?: string | null; buttonUrl?: string | null;
    channelIds?: string[]; siteOrigin?: string;
    watermark?: boolean; cpm?: number; cpc?: number;
    initData?: string; devUid?: number;
  }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    if (user.id !== ADMIN_ID) throw new Error("Admin only");
    const sb = await getAdmin();
    let q = sb.from("telegram_channels").select("*");
    if (data.channelIds && data.channelIds.length) q = q.in("id", data.channelIds);
    const { data: channels } = await q;
    if (!channels?.length) throw new Error("No channels selected.");

    const origin = (data.siteOrigin || "").replace(/\/$/, "");
    const watermark = data.watermark !== false;
    const cpm = Number(data.cpm || 0);
    const cpc = Number(data.cpc || 0);
    const results: { chat_id: string; channel_title: string; ok: boolean; error?: string }[] = [];

    for (const ch of channels) {
      let preRow: any = null;
      try {
        // Always pre-insert sent_message so we have an id for both button tracker AND link rewriting
        const { data: ins, error: insErr } = await sb.from("sent_messages").insert({
          owner_id: ch.owner_id || user.id, channel_id: ch.id,
          chat_id: ch.chat_id, text: data.text || null,
          button_url: data.buttonUrl || null,
          watermark, cpm_usd: cpm, cpc_usd: cpc,
        }).select().single();
        if (insErr || !ins) throw new Error(insErr?.message || "DB insert failed");
        preRow = ins;

        const trackerId = ins.id;
        const baseText = (data.text || "") + (watermark ? WATERMARK : "");
        const { text: rewrittenText, map: linkMap } = origin
          ? rewriteLinks(baseText, origin, trackerId, "post")
          : { text: baseText, map: {} as Record<string, string> };
        const buttonTracker = (origin && data.buttonText && data.buttonUrl)
          ? `${origin}/api/public/t/${trackerId}?p=post&src=button`
          : (data.buttonUrl || null);
        await sb.from("sent_messages").update({ link_map: linkMap }).eq("id", trackerId);

        const reply_markup = data.buttonText && buttonTracker
          ? { inline_keyboard: [[{ text: data.buttonText, url: buttonTracker }]] }
          : undefined;
        let resp: any;
        if (data.imageBase64) {
          const b64 = data.imageBase64.includes(",") ? data.imageBase64.split(",")[1] : data.imageBase64;
          const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const fd = new FormData();
          fd.append("chat_id", ch.chat_id);
          fd.append("caption", rewrittenText);
          fd.append("parse_mode", "HTML");
          if (reply_markup) fd.append("reply_markup", JSON.stringify(reply_markup));
          fd.append("photo", new Blob([bin], { type: "image/jpeg" }), "image.jpg");
          const r = await fetch(`${TG_API}/bot${token()}/sendPhoto`, { method: "POST", body: fd });
          resp = await r.json();
        } else {
          resp = await tg("sendMessage", { chat_id: ch.chat_id, text: rewrittenText, parse_mode: "HTML", reply_markup });
        }
        const ok = !!resp.ok;
        if (ok) {
          await sb.from("sent_messages").update({ message_id: resp.result?.message_id || null }).eq("id", trackerId);
        } else {
          await sb.from("sent_messages").delete().eq("id", trackerId);
        }
        results.push({ chat_id: ch.chat_id, channel_title: ch.title, ok, error: ok ? undefined : resp.description });
      } catch (e: any) {
        if (preRow) { try { await sb.from("sent_messages").delete().eq("id", preRow.id); } catch {} }
        results.push({ chat_id: ch.chat_id, channel_title: ch.title, ok: false, error: e.message });
      }
    }
    const okCount = results.filter(r => r.ok).length;
    return { results, okCount, failCount: results.length - okCount };
  });


export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await getAdmin();
  const { data } = await sb.from("saved_posts").select("*").order("updated_at", { ascending: false });
  return data ?? [];
});

export const savePost = createServerFn({ method: "POST" })
  .inputValidator((d: { id?: string | null; text: string; imageBase64?: string | null; buttonText?: string | null; buttonUrl?: string | null; buttonColor?: string | null; watermark?: boolean; cpm?: number; cpc?: number }) => d)
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const payload = {
      text: data.text || "", image_base64: data.imageBase64 || null,
      button_text: data.buttonText || null, button_url: data.buttonUrl || null,
      button_color: data.buttonColor || null,
      watermark: data.watermark !== false,
      cpm_usd: Number(data.cpm || 0),
      cpc_usd: Number(data.cpc || 0),
    };
    if (data.id) {
      const { data: row } = await sb.from("saved_posts").update(payload).eq("id", data.id).select().single();
      return row;
    }
    const { data: row } = await sb.from("saved_posts").insert(payload).select().single();
    return row;
  });


export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    await sb.from("saved_posts").delete().eq("id", data.id);
    return { ok: true };
  });

// =============== ADMIN: settings ===============
export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((d: {
    view_rate_usd?: number; click_rate_usd?: number;
    publisher_share_pct?: number; referral_pct?: number;
    min_views?: number; min_clicks?: number;
    max_display_cpm?: number; min_display_cpm?: number;
    initData?: string; devUid?: number;
  }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    if (user.id !== ADMIN_ID) throw new Error("Forbidden");
    const sb = await getAdmin();
    const keys: (keyof typeof data)[] = ["view_rate_usd","click_rate_usd","publisher_share_pct","referral_pct","min_views","min_clicks","max_display_cpm","min_display_cpm"];
    for (const k of keys) {
      const v = data[k];
      if (typeof v === "number") {
        await sb.from("app_settings").upsert({ key: k, value_num: v, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
    }
    return { ok: true };
  });

// =============== AD DISTRIBUTION (called by cron) ===============
export const distributeAds = createServerFn({ method: "POST" })
  .inputValidator((d: { siteOrigin?: string }) => d)
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const origin = (data.siteOrigin || `https://${BOT_USERNAME}.lovable.app`).replace(/\/$/, "");
    const { data: campaigns } = await sb.from("ad_campaigns").select("*").eq("status", "active");
    if (!campaigns?.length) return { posted: 0 };

    let posted = 0;
    for (const c of campaigns) {
      // Find matching channels not already posted to today (any time-since-last check kept simple)
      const { data: channels } = await sb.from("telegram_channels")
        .select("*").eq("status", "active").eq("category_id", c.category_id || "");
      if (!channels?.length) continue;

      const { data: existing } = await sb.from("ad_placements").select("channel_id, sent_at").eq("campaign_id", c.id);
      const recent = new Map<string, string>();
      (existing ?? []).forEach((p: any) => recent.set(p.channel_id, p.sent_at));
      const dayAgo = Date.now() - 24*60*60*1000;
      const candidates = channels.filter((ch: any) => {
        const last = recent.get(ch.id);
        return !last || new Date(last).getTime() < dayAgo;
      });
      if (!candidates.length) continue;

      for (const ch of candidates) {
        try {
          const { data: placement } = await sb.from("ad_placements").insert({
            campaign_id: c.id, channel_id: ch.id, chat_id: ch.chat_id,
          }).select().single();
          if (!placement) continue;
          const baseText = (c.text || "") + (c.watermark ? WATERMARK : "");
          const { text: rewrittenText, map: linkMap } = rewriteLinks(baseText, origin, placement.id, "ad");
          const buttonTracker = `${origin}/api/public/t/${placement.id}?p=ad&src=button`;
          await sb.from("ad_placements").update({ link_map: linkMap }).eq("id", placement.id);
          const reply_markup = { inline_keyboard: [[{ text: c.button_text, url: buttonTracker }]] };
          let resp: any;
          if (c.image_base64) {
            const b64 = c.image_base64.includes(",") ? c.image_base64.split(",")[1] : c.image_base64;
            const bin = Uint8Array.from(atob(b64), x => x.charCodeAt(0));
            const fd = new FormData();
            fd.append("chat_id", ch.chat_id);
            fd.append("caption", rewrittenText);
            fd.append("parse_mode", "HTML");
            fd.append("reply_markup", JSON.stringify(reply_markup));
            fd.append("photo", new Blob([bin], { type: "image/jpeg" }), "image.jpg");
            const r = await fetch(`${TG_API}/bot${token()}/sendPhoto`, { method: "POST", body: fd });
            resp = await r.json();
          } else {
            resp = await tg("sendMessage", { chat_id: ch.chat_id, text: rewrittenText, parse_mode: "HTML", reply_markup });
          }
          if (resp.ok) {
            await sb.from("ad_placements").update({ message_id: resp.result?.message_id || null }).eq("id", placement.id);
            posted++;
          } else {
            await sb.from("ad_placements").delete().eq("id", placement.id);
          }
        } catch {}
      }

    }
    return { posted };
  });

// =============== Click attribution + earnings ===============
// `userId` defaults to a synthetic anonymous-bucket key per ip-less request when unknown,
// but we always pass the Telegram user id when available (mini app open).
export async function recordAdClick(placementId: string, userIdRaw?: string | number | null, source: "button" | "link" = "button") {
  const sb = await getAdmin();
  const { data: p } = await sb.from("ad_placements").select("*, ad_campaigns(*)").eq("id", placementId).maybeSingle();
  if (!p) return null;
  const c: any = p.ad_campaigns;
  if (!c) return null;

  const userId = Number(userIdRaw) || 0;
  const redirectUrl = source === "link" ? null : c.button_url;
  // Dedupe: count at most 1 click per (placement, user). Anonymous (user=0) always counted (fallback).
  let isNew = true;
  if (userId) {
    const { error } = await sb.from("ad_clicks").insert({ placement_id: placementId, user_id: userId, source });
    if (error) isNew = false; // unique-violation -> already clicked
  }
  if (!isNew) return { url: redirectUrl ?? c.button_url };

  const newClicks = (p.clicks || 0) + 1;
  const newUnique = (p.unique_clicks || 0) + 1;
  const newViews = Math.max(p.views || 0, newClicks);
  await sb.from("ad_placements").update({ clicks: newClicks, unique_clicks: newUnique, views: newViews }).eq("id", placementId);

  const totalClicks = (c.clicks_count || 0) + 1;
  const totalViews = (c.views_count || 0) + 1;
  const settings = await getSettings();
  const earnedThisClick = Number(c.click_rate_usd) + Number(c.view_rate_usd);
  const spent = Number(c.spent_usd || 0) + earnedThisClick;
  const done = totalViews >= c.target_views && totalClicks >= c.target_clicks;
  await sb.from("ad_campaigns").update({
    clicks_count: totalClicks, views_count: totalViews,
    spent_usd: spent,
    status: done ? "complete" : c.status,
    completed_at: done ? new Date().toISOString() : null,
  }).eq("id", c.id);

  const { data: ch } = await sb.from("telegram_channels").select("owner_id, accumulated_usd, title").eq("id", p.channel_id).single();
  if (ch?.owner_id) {
    const pubShare = earnedThisClick * (settings.publisher_share_pct / 100);
    await sb.from("telegram_channels").update({ accumulated_usd: Number(ch.accumulated_usd || 0) + pubShare }).eq("id", p.channel_id);
    // Atomic-ish increment of publisher balance

    const { data: prof } = await sb.from("profiles").select("publisher_balance_usd").eq("telegram_user_id", ch.owner_id).maybeSingle();
    await sb.from("profiles").update({ publisher_balance_usd: Number(prof?.publisher_balance_usd || 0) + pubShare }).eq("telegram_user_id", ch.owner_id);
    await sb.from("earnings_ledger").insert({ user_id: ch.owner_id, channel_id: p.channel_id, campaign_id: c.id, type: "publisher_click", amount_usd: pubShare });
    const { data: refRow } = await sb.from("profiles").select("referrer_id").eq("telegram_user_id", ch.owner_id).maybeSingle();
    if (refRow?.referrer_id) {
      const refAmt = pubShare * (settings.referral_pct / 100);
      const { data: refProf } = await sb.from("profiles").select("publisher_balance_usd").eq("telegram_user_id", refRow.referrer_id).maybeSingle();
      await sb.from("profiles").update({ publisher_balance_usd: Number(refProf?.publisher_balance_usd || 0) + refAmt }).eq("telegram_user_id", refRow.referrer_id);
      await sb.from("earnings_ledger").insert({ user_id: refRow.referrer_id, channel_id: p.channel_id, campaign_id: c.id, type: "referral", amount_usd: refAmt });
    }
  }

  if (done) await deleteCampaignMessages(c.id);
  return { url: redirectUrl ?? c.button_url };
}

// Admin broadcast post click — same dedupe model, pays publisher CPC × pub_share when channel owner exists.
export async function recordPostClick(messageId: string, userIdRaw?: string | number | null, source: "button" | "link" = "button", linkTarget?: string | null) {
  const sb = await getAdmin();
  const { data: m } = await sb.from("sent_messages").select("*").eq("id", messageId).maybeSingle();
  if (!m) return null;
  const userId = Number(userIdRaw) || 0;
  const redirectUrl = source === "link" ? (linkTarget || m.button_url) : m.button_url;
  let isNew = true;
  if (userId) {
    const { error } = await sb.from("post_clicks").insert({ sent_message_id: messageId, user_id: userId, source });
    if (error) isNew = false;
  }
  if (!isNew) return { url: redirectUrl };

  const newClicks = (m.clicks || 0) + 1;
  const newUnique = (m.unique_clicks || 0) + 1;
  await sb.from("sent_messages").update({ clicks: newClicks, unique_clicks: newUnique, views: Math.max(m.views || 0, newClicks) }).eq("id", messageId);

  // Pay publisher: admin-defined CPC × publisher share
  if (m.channel_id && m.owner_id && Number(m.cpc_usd || 0) > 0) {
    const settings = await getSettings();
    const pubShare = Number(m.cpc_usd) * (settings.publisher_share_pct / 100);
    const { data: ch } = await sb.from("telegram_channels").select("accumulated_usd, owner_id").eq("id", m.channel_id).maybeSingle();
    if (ch?.owner_id) {
      await sb.from("telegram_channels").update({ accumulated_usd: Number(ch.accumulated_usd || 0) + pubShare }).eq("id", m.channel_id);
      const { data: prof } = await sb.from("profiles").select("publisher_balance_usd").eq("telegram_user_id", ch.owner_id).maybeSingle();
      await sb.from("profiles").update({ publisher_balance_usd: Number(prof?.publisher_balance_usd || 0) + pubShare }).eq("telegram_user_id", ch.owner_id);
      await sb.from("earnings_ledger").insert({ user_id: ch.owner_id, channel_id: m.channel_id, type: "publisher_click", amount_usd: pubShare });
    }
  }
  return { url: redirectUrl };
}


async function deleteCampaignMessages(campaignId: string) {
  const sb = await getAdmin();
  const { data: placements } = await sb.from("ad_placements").select("*").eq("campaign_id", campaignId).is("deleted_at", null);
  for (const p of placements ?? []) {
    if (p.message_id) {
      try { await tg("deleteMessage", { chat_id: p.chat_id, message_id: p.message_id }); } catch {}
    }
    await sb.from("ad_placements").update({ deleted_at: new Date().toISOString() }).eq("id", p.id);
  }
  // Notify advertiser
  const { data: c } = await sb.from("ad_campaigns").select("advertiser_id, text").eq("id", campaignId).single();
  if (c?.advertiser_id) {
    try {
      await tg("sendMessage", {
        chat_id: c.advertiser_id,
        text: `✅ Campaign complete. All placements were removed from channels.`,
        reply_markup: { inline_keyboard: [[{ text: "Open TeleMonix", url: `https://t.me/${BOT_USERNAME}/app` }]] },
      });
    } catch {}
  }
}

export const adminDeleteCampaign = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; initData?: string; devUid?: number }) => d)
  .handler(async ({ data }) => {
    const { user } = resolveUser(data.initData, data.devUid);
    if (user.id !== ADMIN_ID) throw new Error("Forbidden");
    await deleteCampaignMessages(data.id);
    const sb = await getAdmin();
    await sb.from("ad_campaigns").update({ status: "cancelled" }).eq("id", data.id);
    return { ok: true };
  });

// =============== Bot DM: channel-removed notification (called by webhook) ===============
export async function notifyBotRemoved(ownerId: number, channelTitle: string) {
  try {
    await tg("sendMessage", {
      chat_id: ownerId,
      text: `⚠️ TeleMonix bot was removed from <b>${channelTitle}</b>. You will not earn from this channel until you re-add @${BOT_USERNAME} as admin.`,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[{ text: "🔧 Open Mini App", url: `https://t.me/${BOT_USERNAME}/app` }]] },
    });
  } catch {}
}
