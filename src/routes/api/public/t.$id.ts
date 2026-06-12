import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/t/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const id = params.id;
        const url = new URL(request.url);
        const kind = url.searchParams.get("p"); // "ad" | "post"
        const src = (url.searchParams.get("src") === "link" ? "link" : "button") as "link" | "button";
        const u = url.searchParams.get("u"); // telegram user id (set by mini-app shim)
        const to = url.searchParams.get("to"); // for in-text link rewriting
        try {
          if (kind === "ad") {
            const { recordAdClick } = await import("@/lib/telegram.functions");
            const r = await recordAdClick(id, u, src);
            const target = src === "link" && to ? decodeURIComponent(to) : r?.url;
            if (!target) return new Response("Not found", { status: 404 });
            return new Response(null, { status: 302, headers: { Location: target } });
          }
          if (kind === "post") {
            const { recordPostClick } = await import("@/lib/telegram.functions");
            const r = await recordPostClick(id, u, src, to ? decodeURIComponent(to) : null);
            if (!r?.url) return new Response("Not found", { status: 404 });
            return new Response(null, { status: 302, headers: { Location: r.url } });
          }
          // legacy fallback (no kind param)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin
            .from("sent_messages").select("button_url, clicks, views").eq("id", id).maybeSingle();
          if (!row?.button_url) return new Response("Not found", { status: 404 });
          await supabaseAdmin.from("sent_messages").update({
            clicks: (row.clicks || 0) + 1,
            views: Math.max(row.views || 0, (row.clicks || 0) + 1),
          }).eq("id", id);
          return new Response(null, { status: 302, headers: { Location: row.button_url } });
        } catch (e: any) {
          return new Response("Error: " + e.message, { status: 500 });
        }
      },
    },
  },
});
