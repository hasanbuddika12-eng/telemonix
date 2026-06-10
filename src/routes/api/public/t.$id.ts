import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/t/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await supabaseAdmin
            .from("sent_messages")
            .select("button_url, clicks, views")
            .eq("id", id)
            .maybeSingle();
          if (!row?.button_url) {
            return new Response("Not found", { status: 404 });
          }
          const clicks = (row.clicks || 0) + 1;
          const views = Math.max(row.views || 0, clicks);
          await supabaseAdmin
            .from("sent_messages")
            .update({ clicks, views })
            .eq("id", id);
          return new Response(null, { status: 302, headers: { Location: row.button_url } });
        } catch (e: any) {
          return new Response("Error: " + e.message, { status: 500 });
        }
      },
    },
  },
});
