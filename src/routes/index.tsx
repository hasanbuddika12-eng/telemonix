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
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast, Toaster } from "sonner";
import {
  Send, Plus, Trash2, Image as ImageIcon, X, Save, Pencil, FileText,
  Users, Eye, Wallet, ArrowDownToLine, ArrowUpFromLine, Sparkles, Radio, TrendingUp,
  Megaphone, Share2, BookOpen, Shield, CheckCircle2, XCircle, Clock, Zap,
  Copy, MousePointerClick, LayoutGrid, Settings as SettingsIcon, ExternalLink,
} from "lucide-react";
import {
  addChannel, listChannels, deleteChannel, listCategories, reviewChannel,
  getMe, setMode, broadcast, listPosts, savePost, deletePost,
  createCampaign, listCampaigns, reviewCampaign, topupCampaign,
  advertiserStats, updateSettings, adminDeleteCampaign,
} from "@/lib/telegram.functions";
import logo from "@/assets/telemonix-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TeleMonix — Telegram Ad Network" },
      { name: "description", content: "Monetize your Telegram channel or advertise across thousands of channels with TeleMonix." },
    ],
  }),
  component: Index,
});

function useTelegram() {
  const [initData, setInitData] = useState<string>("");
  const [refCode, setRefCode] = useState<string | undefined>();
  useEffect(() => {
    const w: any = typeof window !== "undefined" ? window : null;
    const tg = w?.Telegram?.WebApp;
    if (tg) {
      try { tg.ready(); tg.expand(); } catch {}
      setInitData(tg.initData || "");
      const sp = tg.initDataUnsafe?.start_param;
      if (sp && typeof sp === "string" && sp.startsWith("ref_")) setRefCode(sp.replace("ref_", ""));
    }
  }, []);
  return { initData, refCode };
}

function openLink(url: string) {
  const tg: any = (window as any)?.Telegram?.WebApp;
  if (tg?.openLink) { tg.openLink(url); try { tg.close(); } catch {} }
  else window.open(url, "_blank");
}

function Splash() {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-purple-500 to-cyan-500 opacity-50 animate-pulse rounded-full" />
        <img src={logo} alt="TeleMonix" className="relative w-32 h-32 animate-[spin_3s_linear_infinite]" style={{ animationDuration: "8s" }} />
      </div>
      <p className="mt-6 text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">TeleMonix</p>
      <p className="text-xs text-muted-foreground mt-1">Telegram Ad Network</p>
      <div className="mt-6 flex gap-1.5">
        {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i*120}ms` }} />)}
      </div>
    </div>
  );
}

function ModePicker({ onPick }: { onPick: (m: "publisher" | "advertiser") => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-foreground p-5 flex flex-col">
      <div className="flex flex-col items-center mt-6 mb-8">
        <img src={logo} alt="TeleMonix" className="w-24 h-24" />
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mt-2">TeleMonix</h1>
        <p className="text-sm text-muted-foreground">Telegram Ad Network</p>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-6">Choose how you want to start. You can switch anytime.</p>
      <div className="space-y-4 max-w-md w-full mx-auto">
        <button onClick={() => onPick("publisher")} className="w-full text-left rounded-2xl p-5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Radio className="h-6 w-6 text-emerald-300" /></div>
            <div>
              <h3 className="font-bold text-lg">I'm a Publisher</h3>
              <p className="text-xs text-emerald-300">Monetize my Telegram channel</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Add your channels, earn from every ad view and click. Auto payouts.</p>
        </button>
        <button onClick={() => onPick("advertiser")} className="w-full text-left rounded-2xl p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-400/30 hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center"><Megaphone className="h-6 w-6 text-purple-300" /></div>
            <div>
              <h3 className="font-bold text-lg">I'm an Advertiser</h3>
              <p className="text-xs text-purple-300">Promote my product or channel</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Reach thousands of Telegram users across our publisher network. Pay per view + click.</p>
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, iconColor }: any) {
  return (
    <Card className={`border-white/10 bg-gradient-to-br ${color} backdrop-blur`}>
      <CardContent className="p-3">
        <div className={`flex items-center gap-1.5 ${iconColor}`}>{icon}<span className="text-[10px] uppercase tracking-wider">{label}</span></div>
        <p className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </CardContent>
    </Card>
  );
}

function Index() {
  const qc = useQueryClient();
  const { initData, refCode } = useTelegram();
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSplashDone(true), 1400); return () => clearTimeout(t); }, []);

  const meFn = useServerFn(getMe);
  const setModeFn = useServerFn(setMode);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me", initData, refCode],
    queryFn: () => meFn({ data: { initData, refCode } }),
  });

  const modeMut = useMutation({
    mutationFn: (mode: "publisher" | "advertiser") => setModeFn({ data: { mode, initData } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  if (!splashDone || isLoading || !me) return <Splash />;

  const isAdmin = me.isAdmin;
  const onboarded = !!me.profile?.onboarded;
  const mode = (me.profile?.mode as "publisher" | "advertiser") || "publisher";

  if (!onboarded && !isAdmin) return <ModePicker onPick={(m) => modeMut.mutate(m)} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-foreground pb-24">
      <Toaster position="top-center" richColors theme="dark" />
      <Header me={me} mode={mode} onSwitchMode={(m: any) => modeMut.mutate(m)} />
      <main className="max-w-2xl mx-auto px-4 pt-4">
        {isAdmin ? <AdminApp me={me} initData={initData} /> : mode === "publisher" ? <PublisherApp me={me} initData={initData} /> : <AdvertiserApp me={me} initData={initData} />}
      </main>
    </div>
  );
}

function Header({ me, mode, onSwitchMode }: any) {
  const initials = (me?.user?.first_name || "U").slice(0, 1).toUpperCase();
  return (
    <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/40 border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        <img src={logo} alt="" className="h-9 w-9" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate text-sm">{me?.user?.first_name || "Guest"}</p>
            {me.isAdmin && <Badge className="bg-gradient-to-r from-amber-500 to-pink-500 text-white border-0 text-[9px] h-4 px-1.5">ADMIN</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">@{me.bot_username}</p>
        </div>
        {!me.isAdmin && (
          <div className="flex bg-white/5 border border-white/10 rounded-full p-0.5 text-xs">
            <button onClick={() => onSwitchMode("publisher")} className={`px-2.5 py-1 rounded-full transition ${mode === "publisher" ? "bg-emerald-500/30 text-emerald-200" : "text-muted-foreground"}`}>📡</button>
            <button onClick={() => onSwitchMode("advertiser")} className={`px-2.5 py-1 rounded-full transition ${mode === "advertiser" ? "bg-purple-500/30 text-purple-200" : "text-muted-foreground"}`}>📣</button>
          </div>
        )}
        {me?.user?.photo_url ? (
          <img src={me.user.photo_url} alt="" className="h-9 w-9 rounded-full ring-2 ring-primary/50" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center font-bold text-white text-sm">{initials}</div>
        )}
      </div>
    </header>
  );
}

// =================== PUBLISHER ===================
function PublisherApp({ me, initData }: any) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("home");
  const settings = me.settings;
  const cpmRange = `$${settings.min_display_cpm} – $${settings.max_display_cpm}`;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid grid-cols-4 bg-white/5 border border-white/10 w-full">
        <TabsTrigger value="home" className="text-xs"><Wallet className="h-3 w-3 mr-1" />Home</TabsTrigger>
        <TabsTrigger value="channels" className="text-xs"><Radio className="h-3 w-3 mr-1" />Channels</TabsTrigger>
        <TabsTrigger value="refer" className="text-xs"><Share2 className="h-3 w-3 mr-1" />Refer</TabsTrigger>
        <TabsTrigger value="guide" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Guide</TabsTrigger>
      </TabsList>

      <TabsContent value="home" className="space-y-4 mt-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 ring-1 ring-emerald-400/20 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl animate-pulse" />
          <CardContent className="p-5 relative">
            <div className="flex items-center gap-2 mb-1 text-emerald-300"><Wallet className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Publisher Balance</span></div>
            <p className="text-4xl font-bold">${me.publisher.earned.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Earn up to <b className="text-emerald-300">{cpmRange} CPM</b> · paid per views & clicks</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" className="bg-white/5 border-white/20" onClick={() => toast.info("Deposit — coming soon")}><ArrowDownToLine className="h-4 w-4 mr-1" />Deposit</Button>
              <Button variant="outline" className="bg-white/5 border-white/20" onClick={() => toast.info("Withdraw — coming soon")}><ArrowUpFromLine className="h-4 w-4 mr-1" />Withdraw</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Radio className="h-4 w-4" />} label="Active Channels" value={me.publisher.activeChannelCount} color="from-blue-500/20 to-indigo-500/20" iconColor="text-blue-300" />
          <StatCard icon={<Users className="h-4 w-4" />} label="Reach" value={me.publisher.totalMembers} color="from-purple-500/20 to-pink-500/20" iconColor="text-purple-300" />
        </div>

        <button onClick={() => setTab("channels")} className="w-full text-left">
          <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 hover:scale-[1.01] transition-transform">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Plus className="h-5 w-5 text-cyan-300" /></div>
              <div className="flex-1">
                <p className="font-semibold">Add my channel</p>
                <p className="text-xs text-muted-foreground">Connect a channel in 30 seconds</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>

        <Card className="border-white/10 bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-amber-300" /><p className="font-semibold text-sm">How TeleMonix monetizes your channel</p></div>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
              <li>Add <b>@{me.bot_username}</b> as admin in your channel</li>
              <li>Submit channel for review</li>
              <li>Once approved, ads from our advertisers post automatically</li>
              <li>You earn for every view and every click — <b className="text-emerald-300">{settings.publisher_share_pct}% revenue share</b></li>
              <li>Refer friends and earn <b className="text-purple-300">{settings.referral_pct}%</b> of their earnings forever</li>
            </ol>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="channels" className="space-y-4 mt-4">
        <ChannelsList me={me} initData={initData} />
      </TabsContent>

      <TabsContent value="refer" className="space-y-4 mt-4">
        <ReferTab me={me} />
      </TabsContent>

      <TabsContent value="guide" className="space-y-4 mt-4">
        <GuideTab me={me} />
      </TabsContent>
    </Tabs>
  );
}

function ChannelsList({ me, initData }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listChannels);
  const addFn = useServerFn(addChannel);
  const delFn = useServerFn(deleteChannel);
  const catFn = useServerFn(listCategories);
  const { data: channels = [] } = useQuery({ queryKey: ["channels", initData], queryFn: () => listFn({ data: { initData } }) });
  const { data: categories = [] } = useQuery({ queryKey: ["cats"], queryFn: () => catFn() });
  const [chat, setChat] = useState("");
  const [cat, setCat] = useState<string>("");

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { chat, categoryId: cat, initData } }),
    onSuccess: () => { toast.success("Channel submitted for review"); setChat(""); qc.invalidateQueries({ queryKey: ["channels"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id, initData } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  return (
    <>
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Add channel</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">Add <b>@{me.bot_username}</b> as admin, then submit below.</p>
          <Input placeholder="@mychannel" value={chat} onChange={(e) => setChat(e.target.value)} className="bg-white/5 border-white/10" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => addMut.mutate()} disabled={!chat || !cat || addMut.isPending} className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 border-0"><Plus className="h-4 w-4 mr-1" />Submit for review</Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {channels.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No channels yet</p>}
        {channels.map((c: any) => <ChannelCard key={c.id} c={c} onDelete={() => delMut.mutate(c.id)} />)}
      </div>
    </>
  );
}

function ChannelCard({ c, onDelete }: any) {
  const statusUI: Record<string, any> = {
    pending: { label: "Pending review", color: "bg-amber-500/20 text-amber-300 border-amber-400/30", icon: <Clock className="h-3 w-3" /> },
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30", icon: <CheckCircle2 className="h-3 w-3" /> },
    inactive: { label: "Bot removed", color: "bg-red-500/20 text-red-300 border-red-400/30", icon: <XCircle className="h-3 w-3" /> },
    rejected: { label: "Not approved", color: "bg-red-500/20 text-red-300 border-red-400/30", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = statusUI[c.status] || statusUI.pending;
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{c.title}</p>
              <Badge className={`${s.color} border text-[10px] h-5`}>{s.icon}<span className="ml-1">{s.label}</span></Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{c.username ? `@${c.username}` : c.chat_id} {c.categories ? `· ${c.categories.emoji} ${c.categories.name}` : ""}</p>
            <div className="flex gap-3 text-xs mt-1.5 text-muted-foreground items-center">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{(c.members_count || 0).toLocaleString()}</span>
              <span className="flex items-center gap-1 text-emerald-300 font-medium">💰 ${Number(c.accumulated_usd || 0).toFixed(2)}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
        {c.status === "rejected" && c.rejection_reason && <p className="text-[11px] text-red-300 mt-2">Reason: {c.rejection_reason}</p>}
        {c.status === "inactive" && <p className="text-[11px] text-red-300 mt-2">Re-add @{c.bot_username || "teleMonix_bot"} as admin to resume earnings.</p>}
      </CardContent>
    </Card>
  );
}

function ReferTab({ me }: any) {
  const link = `https://t.me/${me.bot_username}?startapp=ref_${me.referral.code}`;
  return (
    <>
      <Card className="border-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 ring-1 ring-purple-400/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-1 text-purple-300"><Share2 className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Referral Earnings</span></div>
          <p className="text-4xl font-bold">${me.referral.earned.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{me.referral.count} referral{me.referral.count === 1 ? "" : "s"} · {me.settings.referral_pct}% lifetime commission</p>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Your referral link</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input value={link} readOnly className="bg-white/5 border-white/10 text-xs" />
            <Button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}><Copy className="h-4 w-4" /></Button>
          </div>
          <Button variant="outline" className="w-full bg-white/5 border-white/20" onClick={() => openLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Monetize your Telegram channel with TeleMonix")}`)}><Send className="h-4 w-4 mr-1" />Share via Telegram</Button>
        </CardContent>
      </Card>
    </>
  );
}

function GuideTab({ me }: any) {
  const steps = [
    { t: "1. Make the bot admin", d: `Open your Telegram channel → Admins → Add Admin → search @${me.bot_username} → grant "Post messages" permission.` },
    { t: "2. Add channel here", d: "Tap Channels → enter @yourchannel and pick a category. We'll verify the bot's admin rights." },
    { t: "3. Wait for approval", d: "Our team reviews each channel for quality. Approved channels become active within hours." },
    { t: "4. Earn automatically", d: `Ads from advertisers post daily. You earn ${me.settings.publisher_share_pct}% of all ad revenue from your channel.` },
    { t: "5. Withdraw anytime", d: "Once balance reaches the minimum, request a payout from your wallet." },
  ];
  return (
    <>
      <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-purple-500/15">
        <CardContent className="p-5 text-center">
          <Sparkles className="h-8 w-8 text-cyan-300 mx-auto mb-2" />
          <h3 className="font-bold text-lg">Turn your channel into income</h3>
          <p className="text-sm text-muted-foreground mt-1">TeleMonix is a full Telegram ad network. Real CPM, real payouts.</p>
        </CardContent>
      </Card>
      {steps.map((s, i) => (
        <Card key={i} className="border-white/10 bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <p className="font-semibold text-sm bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">{s.t}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// =================== ADVERTISER ===================
function AdvertiserApp({ me, initData }: any) {
  const [tab, setTab] = useState("home");
  const statsFn = useServerFn(advertiserStats);
  const { data: netStats } = useQuery({ queryKey: ["adstats"], queryFn: () => statsFn({ data: { initData } }) });

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid grid-cols-4 bg-white/5 border border-white/10 w-full">
        <TabsTrigger value="home" className="text-xs"><LayoutGrid className="h-3 w-3 mr-1" />Home</TabsTrigger>
        <TabsTrigger value="create" className="text-xs"><Plus className="h-3 w-3 mr-1" />Create</TabsTrigger>
        <TabsTrigger value="manage" className="text-xs"><Megaphone className="h-3 w-3 mr-1" />Manage</TabsTrigger>
        <TabsTrigger value="wallet" className="text-xs"><Wallet className="h-3 w-3 mr-1" />Wallet</TabsTrigger>
      </TabsList>

      <TabsContent value="home" className="space-y-4 mt-4">
        <Card className="border-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 ring-1 ring-purple-400/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-purple-300 mb-1"><Megaphone className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Network reach</span></div>
            <p className="text-4xl font-bold">{(netStats?.totalMembers || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">across {netStats?.totalChannels || 0} active Telegram channels</p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Wallet className="h-4 w-4" />} label="Balance" value={`$${me.advertiser.balance.toFixed(2)}`} color="from-emerald-500/20 to-teal-500/20" iconColor="text-emerald-300" />
          <StatCard icon={<Eye className="h-4 w-4" />} label="Rate / 1k views" value={`$${(me.settings.view_rate_usd * 1000).toFixed(2)}`} color="from-cyan-500/20 to-blue-500/20" iconColor="text-cyan-300" />
        </div>
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4">
            <p className="font-semibold text-sm mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-amber-300" />How TeleMonix Ads work</p>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
              <li>Create an ad: text, image, button URL, category, target views & clicks</li>
              <li>Pay ${(me.settings.view_rate_usd * 1000).toFixed(2)}/1k views + ${(me.settings.click_rate_usd * 1000).toFixed(2)}/1k clicks</li>
              <li>Admin reviews → ad auto-posts daily to matching channels</li>
              <li>Real-time stats. Auto-complete when targets hit. All posts auto-deleted.</li>
            </ol>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="create" className="space-y-4 mt-4"><CreateAdForm me={me} initData={initData} /></TabsContent>
      <TabsContent value="manage" className="space-y-4 mt-4"><ManageAds me={me} initData={initData} /></TabsContent>
      <TabsContent value="wallet" className="space-y-4 mt-4">
        <Card className="border-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-400/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-emerald-300 mb-1"><Wallet className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Advertiser Wallet</span></div>
            <p className="text-4xl font-bold">${me.advertiser.balance.toFixed(2)}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" className="bg-white/5 border-white/20" onClick={() => toast.info("Deposit — coming soon")}><ArrowDownToLine className="h-4 w-4 mr-1" />Deposit</Button>
              <Button variant="outline" className="bg-white/5 border-white/20" onClick={() => toast.info("Withdraw — coming soon")}><ArrowUpFromLine className="h-4 w-4 mr-1" />Withdraw</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function CreateAdForm({ me, initData }: any) {
  const qc = useQueryClient();
  const catFn = useServerFn(listCategories);
  const createFn = useServerFn(createCampaign);
  const { data: categories = [] } = useQuery({ queryKey: ["cats"], queryFn: () => catFn() });
  const [text, setText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [cat, setCat] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [targetViews, setTargetViews] = useState(1000);
  const [targetClicks, setTargetClicks] = useState(100);
  const fileRef = useRef<HTMLInputElement>(null);
  const cost = (targetViews * me.settings.view_rate_usd + targetClicks * me.settings.click_rate_usd);

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setImageBase64(r.result as string);
    r.readAsDataURL(f);
  };

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { text, imageBase64, buttonText, buttonUrl, categoryId: cat, watermark, targetViews, targetClicks, initData } }),
    onSuccess: () => {
      toast.success("Campaign submitted for review!");
      setText(""); setImageBase64(null); setButtonText(""); setButtonUrl("");
      qc.invalidateQueries({ queryKey: ["campaigns"] }); qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const valid = text && buttonText && buttonUrl && cat && targetViews >= me.settings.min_views && targetClicks >= me.settings.min_clicks;
  return (
    <>
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Create campaign</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Ad text (HTML supported)" value={text} onChange={(e) => setText(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px]" />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] || null)} />
          {imageBase64 ? (
            <div className="relative"><img src={imageBase64} alt="" className="rounded-lg max-h-40 w-full object-cover" />
              <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7" onClick={() => setImageBase64(null)}><X className="h-3 w-3" /></Button>
            </div>
          ) : <Button variant="outline" className="w-full bg-white/5 border-white/20" onClick={() => fileRef.current?.click()}><ImageIcon className="h-4 w-4 mr-1" />Add image</Button>}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Button text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="bg-white/5 border-white/10" />
            <Input placeholder="https://..." value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Target views (min {me.settings.min_views})</Label><Input type="number" value={targetViews} onChange={(e) => setTargetViews(+e.target.value)} className="bg-white/5 border-white/10" /></div>
            <div><Label className="text-xs">Target clicks (min {me.settings.min_clicks})</Label><Input type="number" value={targetClicks} onChange={(e) => setTargetClicks(+e.target.value)} className="bg-white/5 border-white/10" /></div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2"><Switch checked={watermark} onCheckedChange={setWatermark} /><span className="text-sm">TeleMonix watermark</span></div>
            <span className="text-[10px] text-muted-foreground">@{me.bot_username}</span>
          </div>
          <div className="rounded-lg p-3 bg-gradient-to-r from-purple-500/15 to-cyan-500/15 border border-white/10 flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Total cost</p><p className="text-2xl font-bold">${cost.toFixed(2)}</p></div>
            <div className="text-right text-[10px] text-muted-foreground"><p>Views: ${(targetViews * me.settings.view_rate_usd).toFixed(2)}</p><p>Clicks: ${(targetClicks * me.settings.click_rate_usd).toFixed(2)}</p><p>Balance: ${me.advertiser.balance.toFixed(2)}</p></div>
          </div>
          <Button onClick={() => createMut.mutate()} disabled={!valid || createMut.isPending} className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 border-0"><Send className="h-4 w-4 mr-1" />Submit for review</Button>
        </CardContent>
      </Card>
    </>
  );
}

function ManageAds({ me, initData }: any) {
  const listFn = useServerFn(listCampaigns);
  const topupFn = useServerFn(topupCampaign);
  const qc = useQueryClient();
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns", initData], queryFn: () => listFn({ data: { initData, scope: "mine" } }) });
  const topupMut = useMutation({
    mutationFn: (v: { id: string; views: number; clicks: number }) => topupFn({ data: { id: v.id, addViews: v.views, addClicks: v.clicks, initData } }),
    onSuccess: () => { toast.success("Topped up"); qc.invalidateQueries({ queryKey: ["campaigns"] }); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!campaigns.length) return <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet. Create your first ad!</p>;
  return <div className="space-y-3">{campaigns.map((c: any) => <CampaignCard key={c.id} c={c} onTopup={(v: number, cl: number) => topupMut.mutate({ id: c.id, views: v, clicks: cl })} />)}</div>;
}

function CampaignCard({ c, onTopup, adminActions }: any) {
  const statusUI: Record<string, any> = {
    pending_review: { label: "Pending review", color: "bg-amber-500/20 text-amber-300", icon: <Clock className="h-3 w-3" /> },
    active: { label: "Active", color: "bg-emerald-500/20 text-emerald-300", icon: <Zap className="h-3 w-3" /> },
    complete: { label: "Complete", color: "bg-blue-500/20 text-blue-300", icon: <CheckCircle2 className="h-3 w-3" /> },
    rejected: { label: "Rejected", color: "bg-red-500/20 text-red-300", icon: <XCircle className="h-3 w-3" /> },
    cancelled: { label: "Cancelled", color: "bg-gray-500/20 text-gray-300", icon: <X className="h-3 w-3" /> },
  };
  const s = statusUI[c.status];
  const vPct = Math.min(100, (c.views_count / c.target_views) * 100);
  const cPct = Math.min(100, (c.clicks_count / c.target_clicks) * 100);
  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Badge className={`${s.color} border-0 text-[10px] h-5`}>{s.icon}<span className="ml-1">{s.label}</span></Badge>
            <p className="text-sm mt-1.5 line-clamp-2">{c.text}</p>
            {c.categories && <p className="text-[10px] text-muted-foreground mt-1">{c.categories.emoji} {c.categories.name}</p>}
          </div>
          {c.image_base64 && <img src={c.image_base64} className="w-14 h-14 rounded object-cover" alt="" />}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Views {c.views_count}/{c.target_views}</span><span>{vPct.toFixed(0)}%</span></div>
          <Progress value={vPct} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Clicks {c.clicks_count}/{c.target_clicks}</span><span>{cPct.toFixed(0)}%</span></div>
          <Progress value={cPct} className="h-1.5" />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground"><span>Budget ${Number(c.budget_usd).toFixed(2)}</span><span>Spent ${Number(c.spent_usd).toFixed(2)}</span></div>
        {c.status === "active" && onTopup && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/20 text-xs" onClick={() => onTopup(1000, 0)}>+1k views</Button>
            <Button size="sm" variant="outline" className="flex-1 bg-white/5 border-white/20 text-xs" onClick={() => onTopup(0, 100)}>+100 clicks</Button>
          </div>
        )}
        {adminActions}
      </CardContent>
    </Card>
  );
}

// =================== ADMIN ===================
function AdminApp({ me, initData }: any) {
  const [tab, setTab] = useState("home");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid grid-cols-5 bg-white/5 border border-white/10 w-full text-[10px]">
        <TabsTrigger value="home"><LayoutGrid className="h-3 w-3" /></TabsTrigger>
        <TabsTrigger value="reviews"><Shield className="h-3 w-3" /></TabsTrigger>
        <TabsTrigger value="ads"><Megaphone className="h-3 w-3" /></TabsTrigger>
        <TabsTrigger value="compose"><Send className="h-3 w-3" /></TabsTrigger>
        <TabsTrigger value="settings"><SettingsIcon className="h-3 w-3" /></TabsTrigger>
      </TabsList>
      <TabsContent value="home" className="space-y-4 mt-4"><AdminHome me={me} initData={initData} /></TabsContent>
      <TabsContent value="reviews" className="space-y-4 mt-4"><AdminReviews initData={initData} /></TabsContent>
      <TabsContent value="ads" className="space-y-4 mt-4"><AdminAds initData={initData} /></TabsContent>
      <TabsContent value="compose" className="space-y-4 mt-4"><AdminCompose initData={initData} /></TabsContent>
      <TabsContent value="settings" className="space-y-4 mt-4"><AdminSettings me={me} initData={initData} /></TabsContent>
    </Tabs>
  );
}

function AdminHome({ me, initData }: any) {
  const statsFn = useServerFn(advertiserStats);
  const { data } = useQuery({ queryKey: ["adstats"], queryFn: () => statsFn({ data: { initData } }) });
  return (
    <>
      <Card className="border-0 bg-gradient-to-br from-amber-500/20 to-pink-500/20 ring-1 ring-amber-400/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-amber-300 mb-1"><Shield className="h-4 w-4" /><span className="text-xs uppercase tracking-wider">Admin Console</span></div>
          <p className="text-3xl font-bold">TeleMonix</p>
          <p className="text-xs text-muted-foreground mt-1">Manage the entire ad network from here.</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Radio className="h-4 w-4" />} label="Active Channels" value={data?.totalChannels ?? 0} color="from-blue-500/20 to-indigo-500/20" iconColor="text-blue-300" />
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Reach" value={data?.totalMembers ?? 0} color="from-purple-500/20 to-pink-500/20" iconColor="text-purple-300" />
      </div>
    </>
  );
}

function AdminReviews({ initData }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listChannels);
  const reviewFn = useServerFn(reviewChannel);
  const { data: pending = [] } = useQuery({ queryKey: ["pending-channels"], queryFn: () => listFn({ data: { initData, scope: "pending" } }) });
  const mut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string }) => reviewFn({ data: { ...v, initData } }),
    onSuccess: () => { toast.success("Reviewed"); qc.invalidateQueries({ queryKey: ["pending-channels"] }); },
  });
  if (!pending.length) return <p className="text-sm text-muted-foreground text-center py-8">No channels awaiting review.</p>;
  return <div className="space-y-2">{pending.map((c: any) => (
    <Card key={c.id} className="border-white/10 bg-white/5">
      <CardContent className="p-3 space-y-2">
        <div>
          <p className="font-medium">{c.title}</p>
          <p className="text-xs text-muted-foreground">{c.username ? `@${c.username}` : c.chat_id} · {c.categories?.emoji} {c.categories?.name} · {(c.members_count || 0).toLocaleString()} members</p>
        </div>
        <div className="flex gap-2">
          {c.username && <Button size="sm" variant="outline" className="bg-white/5 border-white/20" onClick={() => openLink(`https://t.me/${c.username}`)}><ExternalLink className="h-3 w-3 mr-1" />View</Button>}
          <Button size="sm" className="flex-1 bg-emerald-500/80 hover:bg-emerald-500" onClick={() => mut.mutate({ id: c.id, approve: true })}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
          <Button size="sm" variant="destructive" className="flex-1" onClick={() => { const r = prompt("Rejection reason?") || "Quality"; mut.mutate({ id: c.id, approve: false, reason: r }); }}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
        </div>
      </CardContent>
    </Card>
  ))}</div>;
}

function AdminAds({ initData }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listCampaigns);
  const reviewFn = useServerFn(reviewCampaign);
  const delFn = useServerFn(adminDeleteCampaign);
  const { data: pending = [] } = useQuery({ queryKey: ["pending-ads"], queryFn: () => listFn({ data: { initData, scope: "pending" } }) });
  const reviewMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string }) => reviewFn({ data: { ...v, initData } }),
    onSuccess: () => { toast.success("Reviewed"); qc.invalidateQueries({ queryKey: ["pending-ads"] }); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id, initData } }),
    onSuccess: () => { toast.success("Cancelled & messages deleted"); qc.invalidateQueries({ queryKey: ["pending-ads"] }); },
  });
  if (!pending.length) return <p className="text-sm text-muted-foreground text-center py-8">No ads awaiting review.</p>;
  return <div className="space-y-3">{pending.map((c: any) => (
    <CampaignCard key={c.id} c={c} adminActions={
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 bg-emerald-500/80" onClick={() => reviewMut.mutate({ id: c.id, approve: true })}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
        <Button size="sm" variant="destructive" className="flex-1" onClick={() => { const r = prompt("Reason?") || "Quality"; reviewMut.mutate({ id: c.id, approve: false, reason: r }); }}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
        <Button size="sm" variant="outline" className="bg-white/5 border-white/20" onClick={() => delMut.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    } />
  ))}</div>;
}

function AdminCompose({ initData }: any) {
  const qc = useQueryClient();
  const listFn = useServerFn(listChannels);
  const sendFn = useServerFn(broadcast);
  const { data: channels = [] } = useQuery({ queryKey: ["all-channels"], queryFn: () => listFn({ data: { initData, scope: "all" } }) });
  const [text, setText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const sendMut = useMutation({
    mutationFn: () => sendFn({ data: { text, imageBase64, buttonText: buttonText || null, buttonUrl: buttonUrl || null, channelIds: Array.from(selected), initData, siteOrigin: window.location.origin } }),
    onSuccess: (r) => { const ok = r.results.filter((x: any) => x.ok).length; toast.success(`Sent to ${ok} channels`); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-2"><CardTitle className="text-base">Admin broadcast (direct)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea placeholder="Message" value={text} onChange={(e) => setText(e.target.value)} className="bg-white/5 border-white/10 min-h-[100px]" />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setImageBase64(r.result as string); r.readAsDataURL(f); }} />
          {imageBase64 ? <img src={imageBase64} className="rounded max-h-32" /> : <Button variant="outline" className="w-full bg-white/5 border-white/20" onClick={() => fileRef.current?.click()}><ImageIcon className="h-4 w-4 mr-1" />Image</Button>}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Button text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="bg-white/5 border-white/10" />
            <Input placeholder="https://..." value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 border border-white/10 rounded p-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={selected.size === channels.length && channels.length > 0} onCheckedChange={(v) => setSelected(v ? new Set(channels.map((c: any) => c.id)) : new Set())} />All ({channels.length})</label>
            {channels.map((c: any) => (
              <label key={c.id} className="flex items-center gap-2 text-xs">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => { const s = new Set(selected); v ? s.add(c.id) : s.delete(c.id); setSelected(s); }} />
                {c.title} <Badge className="text-[9px] h-4 ml-auto">{c.status}</Badge>
              </label>
            ))}
          </div>
          <Button className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 border-0" disabled={!text || !selected.size || sendMut.isPending} onClick={() => sendMut.mutate()}><Send className="h-4 w-4 mr-1" />Send</Button>
        </CardContent>
      </Card>
    </>
  );
}

function AdminSettings({ me, initData }: any) {
  const qc = useQueryClient();
  const updFn = useServerFn(updateSettings);
  const [s, setS] = useState(me.settings);
  const mut = useMutation({
    mutationFn: (payload: any) => updFn({ data: { ...payload, initData } }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["me"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const f = (k: string, label: string, step = 0.01) => (
    <div><Label className="text-xs">{label}</Label><Input type="number" step={step} value={s[k]} onChange={(e) => setS({ ...s, [k]: +e.target.value })} className="bg-white/5 border-white/10" /></div>
  );
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader className="pb-2"><CardTitle className="text-base">Network settings</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {f("view_rate_usd", "$ per view", 0.0001)}
          {f("click_rate_usd", "$ per click", 0.001)}
          {f("publisher_share_pct", "Publisher %", 1)}
          {f("referral_pct", "Referral %", 1)}
          {f("min_views", "Min views", 100)}
          {f("min_clicks", "Min clicks", 100)}
          {f("min_display_cpm", "Display CPM min", 0.5)}
          {f("max_display_cpm", "Display CPM max", 0.5)}
        </div>
        <Button onClick={() => mut.mutate(s)} disabled={mut.isPending} className="w-full bg-gradient-to-r from-amber-500 to-pink-500 border-0"><Save className="h-4 w-4 mr-1" />Save</Button>
        <p className="text-[10px] text-muted-foreground">Distribution runs via /api/public/cron/distribute. Set up pg_cron to ping every 30 min.</p>
      </CardContent>
    </Card>
  );
}
