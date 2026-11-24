import { useGetMe, useGetReferralStats, useGetPublicSettings, useListSocialLinks } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Share2, ArrowLeft, ChevronRight, ExternalLink, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Referral() {
  const { toast } = useToast();
  const tgId = localStorage.getItem("dwe_user_tg_id") || "";
  const { data: user } = useGetMe({ telegramId: tgId }, { query: { enabled: !!tgId } } as any);
  const { data: refStats } = useGetReferralStats(
    { telegramId: user?.telegramId || tgId || "" },
    { query: { enabled: !!(user?.telegramId || tgId) } } as any
  );
  const { data: settings } = useGetPublicSettings();
  const { data: socialLinks } = useListSocialLinks();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const inviteLink = refStats?.referralLink || `https://t.me/darkwould_bot?start=${user?.referralCode || ""}`;
  const currentCount = refStats?.referralCount || 0;

  const handleShare = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent("Join Dark Would Expose!")}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <>
      <main className="flex-1 pb-24 md:pb-8 bg-background">
        <header className="p-4 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Share With Friends</h1>
        </header>

        <div className="p-4 max-w-md mx-auto space-y-6 mt-4">
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-1">Invite Friends</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Share your invite link with your friends to enjoy together.
            </p>
          </div>

          <Card className="border-primary/40 bg-card">
            <CardContent className="p-5">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                Your Personal Referral Link:
              </label>
              <div className="flex gap-2 mb-4">
                <Input readOnly value={inviteLink} className="bg-background border-border font-mono text-xs" />
                <Button size="icon" onClick={() => handleCopy(inviteLink)} title="Copy Link">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="secondary" onClick={handleShare} title="Share on Telegram">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              <Button onClick={() => handleCopy(inviteLink)} className="w-full font-bold mb-3">
                <Copy className="w-4 h-4 mr-2" /> Copy Referral Link
              </Button>

              <div className="text-center pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">Total friends joined: </span>
                <span className="font-bold text-primary text-base mx-1">{currentCount}</span>
              </div>
            </CardContent>
          </Card>

          {(settings?.channelLink || settings?.groupLink || settings?.telegramUsername || (socialLinks?.filter((link) => link.isActive).length ?? 0) > 0) && (
            <div className="space-y-3">
              <h3 className="px-1 text-xs font-black uppercase tracking-widest text-muted-foreground">
                Our Communities & Support
              </h3>

              {settings?.channelLink && (
                <a
                  href={settings.channelLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100 transition-colors hover:bg-sky-500/20"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm font-semibold">Join Official Channel</span>
                    <span className="block text-xs text-sky-300/70">Get latest viral updates & notifications</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              )}

              {settings?.groupLink && (
                <a
                  href={settings.groupLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100 transition-colors hover:bg-emerald-500/20"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm font-semibold">Join Discussion Group</span>
                    <span className="block text-xs text-emerald-300/70">Chat with community members</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              )}

              {socialLinks?.filter((link) => link.isActive).map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                    {link.logoUrl ? (
                      <img src={link.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-semibold">{link.displayName}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}

              {settings?.telegramUsername && (
                <a
                  href={`https://t.me/${settings.telegramUsername.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-cyan-200 transition-colors hover:bg-cyan-400/20"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-400">
                    <Send className="h-5 w-5" />
                  </div>
                  <span className="flex-1 text-sm font-semibold">Contact Admin</span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      <Navbar />
    </>
  );
}
