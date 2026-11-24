import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useGetPost, useLikePost, useGetMe, useGetAdProgress, useCreateAdSession, useListPosts } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Heart, Lock, PlaySquare, ArrowLeft, Download, Flame, Play, ShieldCheck } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import { VideoPlayer } from "@/components/VideoPlayer";
import { AdBanner, useAdSettings } from "@/components/AdBanner";
import createAdHandler from "monetag-tg-sdk";
import { useToast } from "@/hooks/use-toast";

function AdUnlockGate({
  postId,
  required,
  watched,
  canUseTelegram,
  onContentUnlocked,
  refetchProgress,
}: {
  postId: number;
  required: number;
  watched: number;
  canUseTelegram: boolean;
  onContentUnlocked: () => Promise<unknown>;
  refetchProgress: () => Promise<{ data?: { watchedAds: number; isUnlocked: boolean } }>;
}) {
  const createAdSession = useCreateAdSession();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [message, setMessage] = useState("");

  const handleWatchAd = async () => {
    if (!canUseTelegram || isShowingAd) return;
    setIsShowingAd(true);
    setMessage("");

    try {
      const session = await createAdSession.mutateAsync({ data: { postId } });
      const showAd = createAdHandler(Number(session.zoneId));
      const adOptions = {
        ymid: session.ymid,
        requestVar: `post_${postId}_unlock`,
      };
      
      try {
        await showAd({ ...adOptions, type: "preload" });
      } catch {
        // Preload failure should not prevent attempting to show the ad
      }
      await showAd({ ...adOptions, type: "end" });

      setMessage("Ad শেষ হয়েছে। ভেরিফাই করা হচ্ছে…");

      // Attempt immediate fallback claim via server API
      try {
        await fetch("/api/ad-progress/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(window.Telegram?.WebApp?.initData ? { "X-Telegram-Init-Data": window.Telegram.WebApp.initData } : {}),
          },
          body: JSON.stringify({ ymid: session.ymid, postId }),
        });
      } catch {
        // Fallback claim network issue, will proceed to poll progress
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const refreshed = await refetchProgress();
        if (refreshed.data?.isUnlocked) {
          await onContentUnlocked();
          setMessage("Content unlocked! ভিডিও দেখার জন্য প্রস্তুত।");
          return;
        }
        if ((refreshed.data?.watchedAds ?? 0) > watched) {
          setMessage(`Ad verified: ${refreshed.data?.watchedAds ?? watched + 1} / ${required}.`);
          return;
        }
      }

      const finalCheck = await refetchProgress();
      if (finalCheck.data?.isUnlocked) {
        await onContentUnlocked();
        setMessage("Content unlocked! ভিডিও দেখার জন্য প্রস্তুত।");
      } else {
        setMessage("Ad দেখা সম্পন্ন হয়েছে। পেজটি refresh করুন।");
      }
    } catch {
      setMessage("Ad load বা verification হয়নি। Telegram-এর ভিতরে খুলে আবার চেষ্টা করুন।");
    } finally {
      setIsShowingAd(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center max-w-sm mx-auto my-8">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <PlaySquare className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">Content Locked</h3>
      <p className="text-muted-foreground text-sm mb-6">
        ভিডিও ও locked content খুলতে {required}টি Monetag rewarded ad দেখুন। Unlock ২৪ ঘণ্টা থাকবে।
      </p>
      
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="font-bold text-primary">{watched} / {required}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (watched / required) * 100)}%` }}
          />
        </div>
        
        <Button 
          className="w-full font-bold" 
          onClick={handleWatchAd}
          disabled={isShowingAd || !canUseTelegram}
        >
          {isShowingAd ? "Ad যাচাই হচ্ছে…" : "WATCH AD"}
        </Button>
        {!canUseTelegram && (
          <p className="text-xs text-amber-300">Ad দেখতে এই Mini App Telegram-এর ভিতর থেকে খুলুন।</p>
        )}
        {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { data: post, isLoading, refetch: refetchPost } = useGetPost(slug, { query: { enabled: !!slug } } as any);
  const likePost = useLikePost();
  
  const tgId = localStorage.getItem("dwe_user_tg_id") || "";
  const { data: user } = useGetMe({ telegramId: tgId }, { query: { enabled: !!tgId } } as any);
  
  // Need to use the post ID for ad progress, which we only have after post loads
  const postId = post?.id || 0;
  const { data: adProgress, refetch: refetchProgress } = useGetAdProgress(
    { postId },
    { query: { enabled: Boolean(window.Telegram?.WebApp?.initData) && !!postId && post?.accessType === "ads" } } as any
  );

  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const { data: allPosts } = useListPosts({ section: "home" });
  const { data: adSettings } = useAdSettings();
  const { toast } = useToast();

  const handleDownloadVideo = async (videoUrl: string, title: string) => {
    const directUrl = mediaUrl(videoUrl);
    if (!directUrl) return;

    const zoneId = adSettings?.monetagZoneId ? Number(adSettings.monetagZoneId) : null;
    const canUseTelegram = Boolean(window.Telegram?.WebApp?.initData);

    if (zoneId && canUseTelegram && adSettings?.enabled) {
      setDownloadingUrl(videoUrl);
      toast({
        title: "ভিডিও ডাউনলোড",
        description: "ডাউনলোড শুরু করতে বিজ্ঞাপনটি দেখুন...",
      });
      try {
        const showAd = createAdHandler(zoneId);
        await showAd({ type: "end" });
      } catch (err) {
        console.warn("Download ad display skipped/failed:", err);
      } finally {
        setDownloadingUrl(null);
      }
    }

    const cleanFilename = `${title.replace(/[^a-zA-Z0-9_\-\u0980-\u09FF]/g, "_") || "video"}.mp4`;
    const a = document.createElement("a");
    a.href = directUrl;
    a.download = cleanFilename;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();

    toast({
      title: "ডাউনলোড শুরু হয়েছে",
      description: cleanFilename,
    });
  };

  useEffect(() => {
    if (post) {
      setLikesCount(post.likeCount);
      // In a real app we'd track if user liked this specifically
    }
  }, [post]);

  const handleLike = () => {
    if (post && !hasLiked) {
      setHasLiked(true);
      setLikesCount(prev => prev + 1);
      likePost.mutate({ id: post.id });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="w-full aspect-video rounded-xl" />
        <Skeleton className="w-3/4 h-8" />
        <div className="space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-5/6 h-4" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-4">Post not found</h2>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  const isPaid = post.sections.includes("paid");
  const isPremium = user?.isPremium;
  
  const requiresPremium = isPaid && !isPremium;
  const requiresAds = post.accessType === "ads" && !isPaid && !isPremium;
  
  const isLocked = requiresPremium || (requiresAds && !adProgress?.isUnlocked);
  const sortedBlocks = post.blocks?.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) || [];

  const categorySlugs = new Set((post?.categories || []).map((c: any) => c.slug).filter(Boolean));
  const sortedRelated = (allPosts || [])
    .filter((p) => p.id !== post?.id)
    .sort((a, b) => {
      const aMatch = (a.categories || []).some((c: any) => categorySlugs.has(c.slug));
      const bMatch = (b.categories || []).some((c: any) => categorySlugs.has(c.slug));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    })
    .slice(0, 6);

  return (
    <>
      <main className="flex-1 pb-24 md:pb-8">
        {/* Header/Nav */}
        <div className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-between items-center bg-gradient-to-b from-background/80 to-transparent pointer-events-none">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-full bg-background/50 backdrop-blur-md border-border pointer-events-auto"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Thumbnail Hero */}
        <div className="w-full aspect-square md:aspect-[21/9] relative bg-muted">
          {post.thumbnailUrl ? (
            <img src={mediaUrl(post.thumbnailUrl)} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
              <PlaySquare className="w-16 h-16 opacity-20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-4 pt-12 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {post.categories?.map((c, i) => (
                c.name && <Badge key={i} variant="secondary" className="bg-primary/20 text-primary border-primary/20">{c.name}</Badge>
              ))}
              {isPaid && <Badge variant="secondary" className="bg-accent text-accent-foreground"><Lock className="w-3 h-3 mr-1" /> Premium</Badge>}
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-foreground leading-tight">{post.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {post.viewCount} views</span>
              <button 
                onClick={handleLike} 
                className={`flex items-center gap-1 transition-colors ${hasLiked ? 'text-primary' : 'hover:text-foreground'}`}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-primary' : ''}`} /> {likesCount} likes
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto">
          {post.description && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-card/70 p-4">
              <p className="text-muted-foreground leading-relaxed">{post.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{sortedBlocks.length} content blocks</span>
                {isPaid ? <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-amber-300">VIP access</span> : null}
                {requiresAds ? <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-300">Ad unlock</span> : null}
              </div>
            </div>
          )}

          <AdBanner slot="top" className="mb-4" />

          {requiresPremium ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center my-8">
              <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Premium Content</h3>
              <p className="text-muted-foreground mb-6">এই পোস্টের পুরো ছবি, ভিডিও ও লেখা দেখতে VIP package-এ join করুন।</p>
              <Button onClick={() => setLocation("/packages")} className="font-bold">VIEW PACKAGES</Button>
            </div>
          ) : requiresAds && !adProgress?.isUnlocked ? (
            <AdUnlockGate
              postId={post.id}
              required={post.adsRequired || 1}
              watched={adProgress?.watchedAds || 0}
              canUseTelegram={Boolean(window.Telegram?.WebApp?.initData)}
              refetchProgress={refetchProgress}
              onContentUnlocked={refetchPost}
            />
          ) : (
            <div className="space-y-6">
              {sortedBlocks.map(block => (
                <div key={block.id} className="w-full">
                  {block.blockType === "text" && (
                    <div className="prose prose-invert max-w-none text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: block.content }} />
                  )}
                  {block.blockType === "image" && (
                    <img src={mediaUrl(block.content)} alt="" className="w-full rounded-xl object-cover" />
                  )}
                  {block.blockType === "video" && (
                    block.content.includes("youtube.com") || block.content.includes("vimeo.com") ? (
                      <div className="aspect-video w-full rounded-xl overflow-hidden">
                        <iframe src={block.content} className="w-full h-full" allowFullScreen />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <VideoPlayer src={block.content} controls playsInline preload="metadata" className="w-full rounded-xl bg-black" />
                        <div className="flex items-center justify-between rounded-xl bg-card/60 border border-white/5 px-3 py-2">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-pink-500" />
                            HD Video · Protected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingUrl === block.content}
                            onClick={() => handleDownloadVideo(block.content, post.title)}
                            className="h-8 gap-1.5 rounded-full border-pink-500/30 hover:border-pink-500 text-xs font-semibold text-pink-400 hover:text-pink-300 hover:bg-pink-500/10"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {downloadingUrl === block.content ? "বিজ্ঞাপন লোড হচ্ছে..." : "📥 ডাউনলোড করুন"}
                          </Button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ))}
              
              {(!post.blocks || post.blocks.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  Content is being prepared. Check back soon.
                </div>
              )}
            </div>
          )}

          {sortedRelated.length > 0 && (
            <section className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-pink-500" />
                  <h2 className="text-base font-bold text-foreground">সম্পর্কিত পোস্ট / Recommended</h2>
                </div>
                <span className="text-xs text-muted-foreground">{sortedRelated.length}টি পোস্ট</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sortedRelated.map((item) => (
                  <Link
                    key={item.id}
                    href={`/post/${item.slug}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#11111d] shadow-sm hover:border-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[1.55] w-full overflow-hidden bg-black/60">
                      {item.thumbnailUrl ? (
                        <img
                          src={mediaUrl(item.thumbnailUrl)}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black">
                          <Play className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500 text-white shadow-md transition-transform duration-200 group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5 fill-white" />
                        </span>
                      </div>
                    </div>
                    <div className="p-2">
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-pink-400 transition-colors">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {item.viewCount}</span>
                        <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {item.likeCount}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <AdBanner slot="bottom" />
        </div>
      </main>
      <Navbar />
    </>
  );
}
