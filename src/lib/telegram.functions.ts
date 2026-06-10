import { createServerFn } from "@tanstack/react-start";

const TG_API = "https://api.telegram.org";

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

export const addChannel = createServerFn({ method: "POST" })
  .inputValidator((d: { chat: string }) => d)
  .handler(async ({ data }) => {
    let chatRef = data.chat.trim();
    if (chatRef.startsWith("https://t.me/")) chatRef = chatRef.replace("https://t.me/", "");
    if (chatRef.startsWith("t.me/")) chatRef = chatRef.replace("t.me/", "");
    if (!chatRef.startsWith("@") && !chatRef.startsWith("-") && isNaN(Number(chatRef))) {
      chatRef = "@" + chatRef;
    }

    const info = await tg("getChat", { chat_id: chatRef });
    if (!info.ok) throw new Error(info.description || "Could not find channel. Add the bot as admin first.");

    const me = await tg("getMe", {});
    if (!me.ok) throw new Error(me.description || "Bot token invalid");
    const member = await tg("getChatMember", { chat_id: info.result.id, user_id: me.result.id });
    if (!member.ok) throw new Error(member.description || "Add @Postmaster21Bot to the channel first.");
    const status = member.result?.status;
    if (status !== "administrator" && status !== "creator") {
      throw new Error("Bot is not an admin in this channel. Make @Postmaster21Bot an admin first.");
    }

    const sb = await getAdmin();
    const { data: row, error } = await sb
      .from("telegram_channels")
      .upsert({
        chat_id: String(info.result.id),
        title: info.result.title || info.result.username || "Channel",
        username: info.result.username || null,
      }, { onConflict: "chat_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listChannels = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await getAdmin();
  const { data, error } = await sb.from("telegram_channels").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const deleteChannel = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const { error } = await sb.from("telegram_channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const broadcast = createServerFn({ method: "POST" })
  .inputValidator((d: {
    text: string;
    imageBase64?: string | null;
    buttonText?: string | null;
    buttonUrl?: string | null;
  }) => d)
  .handler(async ({ data }) => {
    const sb = await getAdmin();
    const { data: channels, error } = await sb.from("telegram_channels").select("*");
    if (error) throw new Error(error.message);
    if (!channels?.length) throw new Error("No channels saved.");

    const reply_markup = data.buttonText && data.buttonUrl
      ? { inline_keyboard: [[{ text: data.buttonText, url: data.buttonUrl }]] }
      : undefined;

    const results: { chat_id: string; ok: boolean; error?: string }[] = [];

    for (const ch of channels) {
      try {
        let resp: any;
        if (data.imageBase64) {
          // upload via multipart sendPhoto
          const b64 = data.imageBase64.includes(",") ? data.imageBase64.split(",")[1] : data.imageBase64;
          const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const fd = new FormData();
          fd.append("chat_id", ch.chat_id);
          fd.append("caption", data.text || "");
          fd.append("parse_mode", "HTML");
          if (reply_markup) fd.append("reply_markup", JSON.stringify(reply_markup));
          fd.append("photo", new Blob([bin]), "image.jpg");
          const r = await fetch(`${TG_API}/bot${token()}/sendPhoto`, { method: "POST", body: fd });
          resp = await r.json();
        } else {
          resp = await tg("sendMessage", {
            chat_id: ch.chat_id,
            text: data.text,
            parse_mode: "HTML",
            reply_markup,
          });
        }
        results.push({ chat_id: ch.chat_id, ok: !!resp.ok, error: resp.ok ? undefined : resp.description });
      } catch (e: any) {
        results.push({ chat_id: ch.chat_id, ok: false, error: e.message });
      }
    }
    return { results };
  });
