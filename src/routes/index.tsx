import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast, Toaster } from "sonner";
import {
  Send, Plus, Trash2, Image as ImageIcon, X, Save, Pencil, FileText,
  Users, Eye, Wallet, ArrowDownToLine, ArrowUpFromLine, Sparkles, Radio, TrendingUp,
} from "lucide-react";
import {
  addChannel, listChannels, deleteChannel, broadcast,
  listPosts, savePost, deletePost, getMe, setCpm, syncViews,
} from "@/lib/telegram.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Postmaster — Telegram Broadcaster" },
      { name: "description", content: "Broadcast posts with image and button to your Telegram channels via @Postmaster21Bot." },
    ],
  }),
  component: Index,
});

const BUTTON_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Pink", value: "#ec4899" },
];

function useTelegram() {
  const [initData, setInitData] = useState<string>("");
  useEffect(() => {
    const w: any = typeof window !== "undefined" ? window : null;
    const tg = w?.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); tg.expand(); } catch {}
      setInitData(tg.initData || "");
    }
  }, []);
  return { initData };
}

function Index() {
  const qc = useQueryClient();
  const { initData } = useTelegram();
  const meFn = useServerFn(getMe);
  const listFn = useServerFn(listChannels);
  const addFn = useServerFn(addChannel);
  const delFn = useServerFn(deleteChannel);
  const sendFn = useServerFn(broadcast);
  const listPostsFn = useServerFn(listPosts);
  const savePostFn = useServerFn(savePost);
  const delPostFn = useServerFn(deletePost);
  const setCpmFn = useServerFn(setCpm);
  const syncViewsFn = useServerFn(syncViews);

  const { data: me } = useQuery({
    queryKey: ["me", initData],
    queryFn: () => meFn({ data: { initData } }),
  });
  const isAdmin = me?.isAdmin ?? false;

  const { data: channels = [] } = useQuery({
    queryKey: ["channels", initData, isAdmin],
    queryFn: () => listFn({ data: { initData } }),
    enabled: !!me,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["posts"], queryFn: () => listPostsFn(), enabled: isAdmin,
  });

  const [tab, setTab] = useState("home");
  const [chatInput, setChatInput] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());

  // auto-select all when channels load
  useEffect(() => {
    if (channels.length && selectedChannels.size === 0) {
      setSelectedChannels(new Set(channels.map((c: any) => c.id)));
    }
  }, [channels]);

  const addMut = useMutation({
    mutationFn: (chat: string) => addFn({ data: { chat, initData } }),
    onSuccess: () => { toast.success("Channel added"); setChatInput(""); qc.invalidateQueries({ queryKey: ["channels"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id, initData } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [cpmInput, setCpmInput] = useState<string>("");
  useEffect(() => { if (me?.cpm != null) setCpmInput(String(me.cpm)); }, [me?.cpm]);

  const cpmMut = useMutation({
    mutationFn: (cpm: number) => setCpmFn({ data: { cpm, initData } }),
    onSuccess: () => { toast.success("CPM updated"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const syncMut = useMutation({
    mutationFn: () => syncViewsFn({ data: { initData } }),
    onSuccess: (r: any) => { toast.success(`Synced ${r.updated} posts`); qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["channels"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonColor, setButtonColor] = useState(BUTTON_COLORS[0].value);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditId(null); setText(""); setImageBase64(null); setImagePreview(null);
    setButtonText(""); setButtonUrl(""); setButtonColor(BUTTON_COLORS[0].value);
    if (fileRef.current) fileRef.current.value = "";
  };

  const loadPost = (p: any) => {
    setEditId(p.id); setText(p.text || "");
    setImageBase64(p.image_base64 || null); setImagePreview(p.image_base64 || null);
    setButtonText(p.button_text || ""); setButtonUrl(p.button_url || "");
    setButtonColor(p.button_color || BUTTON_COLORS[0].value);
    setTab("compose");
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setImageBase64(r.result as string); setImagePreview(r.result as string); };
    r.readAsDataURL(f);
  };

  const sendMut = useMutation({
    mutationFn: () => sendFn({ data: {
      text, imageBase64, buttonText: buttonText || null, buttonUrl: buttonUrl || null,
      channelIds: Array.from(selectedChannels), initData,
      siteOrigin: typeof window !== "undefined" ? window.location.origin : "",
    } }),
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.filter((r) => !r.ok);
      if (failed.length === 0) toast.success(`Sent to ${ok} channel${ok === 1 ? "" : "s"}`);
      else {
        const first = failed[0];
        toast.error(`Sent: ${ok} · Failed: ${failed.length}. ${first.chat_id}: ${first.error}`, { duration: 10000 });
      }
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: () => savePostFn({ data: { id: editId, text, imageBase64, buttonText: buttonText || null, buttonUrl: buttonUrl || null, buttonColor } }),
    onSuccess: (row: any) => { toast.success(editId ? "Post updated" : "Post saved"); setEditId(row.id); qc.invalidateQueries({ queryKey: ["posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const delPostMut = useMutation({
    mutationFn: (id: string) => delPostFn({ data: { id } }),
    onSuccess: (_d, id) => { toast.success("Deleted"); if (editId === id) resetForm(); qc.invalidateQueries({ queryKey: ["posts"] }); },
  });

  const hasContent = text.trim().length > 0 || imageBase64;
  const canSend = hasContent && selectedChannels.size > 0;
  const stats = me?.stats || { channelCount: 0, totalMembers: 0, postCount: 0, totalViews: 0, earned: 0 };
  const balance = (me?.profile?.balance_usd ?? 0) + (stats.earned || 0);

  const initials = useMemo(() => {
    const n = me?.user?.first_name || "U";
    return n.slice(0, 1).toUpperCase();
  }, [me]);

  const toggleAll = () => {
    if (selectedChannels.size === channels.length) setSelectedChannels(new Set());
    else setSelectedChannels(new Set(channels.map((c: any) => c.id)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-foreground pb-24">
      <Toaster position="top-center" richColors theme="dark" />

      {/* Header / Profile */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/40 border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {me?.user?.photo_url ? (
            <img src={me.user.photo_url} alt="" className="h-10 w-10 rounded-full ring-2 ring-primary/50" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white ring-2 ring-primary/30">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold truncate">{me?.user?.first_name || "Guest"}</p>
              {isAdmin && <Badge className="bg-gradient-to-r from-amber-500 to-pink-500 text-white border-0">ADMIN</Badge>}
            </div>
            <p className="text-xs text-muted-foreground truncate">@Postmaster21Bot</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Earned</p>
            <p className="font-bold text-emerald-400">${balance.toFixed(2)}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className={`grid w-full ${isAdmin ? "grid-cols-4" : "grid-cols-2"} bg-white/5 border border-white/10`}>
            <TabsTrigger value="home"><Sparkles className="h-3.5 w-3.5 mr-1" />Home</TabsTrigger>
            <TabsTrigger value="channels"><Radio className="h-3.5 w-3.5 mr-1" />Channels</TabsTrigger>
            {isAdmin && <TabsTrigger value="compose"><Send className="h-3.5 w-3.5 mr-1" />Send</TabsTrigger>}
            {isAdmin && <TabsTrigger value="saved"><FileText className="h-3.5 w-3.5 mr-1" />Saved</TabsTrigger>}
          </TabsList>

          {/* HOME */}
          <TabsContent value="home" className="space-y-4 mt-4">
            {/* Wallet */}
            <Card className="border-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 backdrop-blur-md ring-1 ring-emerald-400/20 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
              <CardContent className="p-5 relative">
                <div className="flex items-center gap-2 mb-1 text-emerald-300">
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wider">Wallet Balance</span>
                </div>
                <p className="text-4xl font-bold tracking-tight">${balance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">CPM ${(me?.cpm ?? 1).toFixed(2)} · earn per 1,000 views</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" className="bg-white/5 border-white/20 hover:bg-white/10" onClick={() => toast.info("Deposit — coming soon")}>
                    <ArrowDownToLine className="h-4 w-4 mr-1" /> Deposit
                  </Button>
                  <Button variant="outline" className="bg-white/5 border-white/20 hover:bg-white/10" onClick={() => toast.info("Withdraw — coming soon")}>
                    <ArrowUpFromLine className="h-4 w-4 mr-1" /> Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Radio className="h-4 w-4" />} label="Channels" value={stats.channelCount} color="from-blue-500/20 to-indigo-500/20" iconColor="text-blue-300" />
              <StatCard icon={<Users className="h-4 w-4" />} label="Members" value={stats.totalMembers} color="from-purple-500/20 to-pink-500/20" iconColor="text-purple-300" />
              <StatCard icon={<Send className="h-4 w-4" />} label="Posts" value={stats.postCount} color="from-amber-500/20 to-orange-500/20" iconColor="text-amber-300" />
              <StatCard icon={<Eye className="h-4 w-4" />} label="Views" value={stats.totalViews} color="from-cyan-500/20 to-teal-500/20" iconColor="text-cyan-300" />
            </div>

            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div className="text-sm flex-1">
                  <p className="font-medium">Earnings from views</p>
                  <p className="text-xs text-muted-foreground">${stats.earned.toFixed(4)} from {stats.totalViews.toLocaleString()} views</p>
                </div>
                <Button size="sm" variant="outline" className="bg-white/5 border-white/20"
                  disabled={syncMut.isPending} onClick={() => syncMut.mutate()}>
                  {syncMut.isPending ? "Syncing..." : "Sync views"}
                </Button>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card className="border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-pink-500/10 backdrop-blur">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" />CPM rate</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Rate paid per 1,000 views. Allowed: $0.80 – $1.00</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input type="number" step="0.01" min="0.8" max="1" value={cpmInput}
                      onChange={(e) => setCpmInput(e.target.value)}
                      className="bg-white/5 border-white/10" />
                    <Button size="sm" disabled={cpmMut.isPending} onClick={() => cpmMut.mutate(Number(cpmInput))}
                      className="bg-gradient-to-r from-amber-500 to-pink-500 border-0">
                      Save
                    </Button>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    {[0.8, 0.9, 1.0].map((v) => (
                      <Button key={v} size="sm" variant="outline" className="bg-white/5 border-white/20 h-7 text-xs"
                        onClick={() => { setCpmInput(String(v)); cpmMut.mutate(v); }}>
                        ${v.toFixed(2)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CHANNELS */}
          <TabsContent value="channels" className="space-y-4 mt-4">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-base">Add channel</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  First make <b>@Postmaster21Bot</b> an admin in the channel. Then enter the channel username or link.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="@mychannel or t.me/mychannel"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && chatInput && addMut.mutate(chatInput)}
                    className="bg-white/5 border-white/10"
                  />
                  <Button onClick={() => addMut.mutate(chatInput)} disabled={!chatInput || addMut.isPending}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 border-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {channels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No channels yet</p>
              )}
              {channels.map((c: any) => (
                <Card key={c.id} className="border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 transition">
                  <CardContent className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.username ? `@${c.username}` : c.chat_id}
                      </p>
                      <div className="flex gap-3 text-xs mt-1.5 text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.members_count?.toLocaleString() || 0}</span>
                        <span className="flex items-center gap-1"><Send className="h-3 w-3" />{c.posts || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{c.views?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => delMut.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* COMPOSE (admin only) */}
          {isAdmin && (
          <TabsContent value="compose" className="space-y-4 mt-4">
            {editId && (
              <div className="flex items-center justify-between px-3 py-2 rounded-md bg-white/5 border border-white/10 text-xs">
                <span>Editing saved post</span>
                <Button size="sm" variant="ghost" onClick={resetForm}>New</Button>
              </div>
            )}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-base">Message</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10">
                    <img src={imagePreview} alt="" className="w-full max-h-80 object-cover" />
                    <button
                      onClick={() => { setImageBase64(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5 hover:bg-background"
                    ><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/20 rounded-lg py-8 flex flex-col items-center gap-2 text-muted-foreground hover:bg-white/5 transition"
                  >
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-sm">Add image (optional)</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
                <Textarea
                  placeholder="Write your message... HTML allowed (<b>, <i>, <a>)"
                  value={text} onChange={(e) => setText(e.target.value)} rows={5}
                  className="bg-white/5 border-white/10"
                />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-2"><CardTitle className="text-base">Button (optional)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Text</Label>
                    <Input placeholder="Open" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                  <div>
                    <Label className="text-xs">URL</Label>
                    <Input placeholder="https://..." value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Color (preview only)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {BUTTON_COLORS.map((c) => (
                      <button key={c.value} onClick={() => setButtonColor(c.value)}
                        className={`h-8 w-8 rounded-full border-2 transition ${buttonColor === c.value ? "ring-2 ring-offset-2 ring-offset-background ring-white" : "border-transparent"}`}
                        style={{ background: c.value }} aria-label={c.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Channel selection */}
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Send to ({selectedChannels.size}/{channels.length})</CardTitle>
                <Button size="sm" variant="ghost" onClick={toggleAll}>
                  {selectedChannels.size === channels.length ? "None" : "All"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {channels.length === 0 && <p className="text-sm text-muted-foreground">Add a channel first.</p>}
                {channels.map((c: any) => {
                  const checked = selectedChannels.has(c.id);
                  return (
                    <label key={c.id} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition ${checked ? "bg-primary/10 border-primary/40" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        const next = new Set(selectedChannels);
                        if (v) next.add(c.id); else next.delete(c.id);
                        setSelectedChannels(next);
                      }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.username ? `@${c.username}` : c.chat_id} · {c.members_count || 0} members</p>
                      </div>
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            {(text || imagePreview || buttonText) && (
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader className="pb-2"><CardTitle className="text-base">Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-white/10 bg-background/40 p-3 max-w-sm">
                    {imagePreview && <img src={imagePreview} alt="" className="rounded-md mb-2 w-full" />}
                    {text && <p className="text-sm whitespace-pre-wrap mb-2" dangerouslySetInnerHTML={{ __html: text }} />}
                    {buttonText && buttonUrl && (
                      <button className="w-full py-2 rounded-md text-white font-medium text-sm" style={{ background: buttonColor }}>
                        {buttonText}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" disabled={!hasContent || saveMut.isPending}
                onClick={() => saveMut.mutate()} className="bg-white/5 border-white/20">
                <Save className="h-4 w-4 mr-2" />
                {saveMut.isPending ? "Saving..." : editId ? "Update" : "Save"}
              </Button>
              <Button size="lg" disabled={!canSend || sendMut.isPending} onClick={() => sendMut.mutate()}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 border-0">
                <Send className="h-4 w-4 mr-2" />
                {sendMut.isPending ? "Sending..." : `Send (${selectedChannels.size})`}
              </Button>
            </div>
          </TabsContent>
          )}

          {/* SAVED (admin only) */}
          {isAdmin && (
          <TabsContent value="saved" className="space-y-3 mt-4">
            {posts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No saved posts yet</p>
              </div>
            )}
            {posts.map((p: any) => (
              <Card key={p.id} className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="p-3 space-y-2">
                  <div className="flex gap-3">
                    {p.image_base64 && (
                      <img src={p.image_base64} alt="" className="h-16 w-16 rounded-md object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm line-clamp-3 break-words">{p.text || <span className="italic text-muted-foreground">(no text)</span>}</p>
                      {p.button_text && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">🔘 {p.button_text} → {p.button_url}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 border-0"
                      disabled={selectedChannels.size === 0 || sendMut.isPending}
                      onClick={() => { loadPost(p); setTimeout(() => sendMut.mutate(), 0); }}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadPost(p)} className="bg-white/5 border-white/20">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => delPostMut.mutate(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor }: { icon: React.ReactNode; label: string; value: number; color: string; iconColor: string }) {
  return (
    <Card className={`border-white/10 bg-gradient-to-br ${color} backdrop-blur overflow-hidden`}>
      <CardContent className="p-4">
        <div className={`flex items-center gap-1.5 ${iconColor} mb-1`}>
          {icon}
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
