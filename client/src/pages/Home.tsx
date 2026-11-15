import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListPosts, useListCategories, useRegisterUser, useGetPublicSettings } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { PostCard } from "@/components/PostCard";
import { AdBanner } from "@/components/AdBanner";
import { Input } from "@/components/ui/input";
import { Bot, Search, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getBrowserUserId, getStoredValue, setStoredValue } from "@/lib/storage";

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeVideoPostId, setActiveVideoPostId] = useState<number | null>(null);
  const { data: posts, isLoading } = useListPosts({ section: "home" });
  const { data: categories } = useListCategories();
  const registerUser = useRegisterUser();
  const { data: settings } = useGetPublicSettings();

  useEffect(() => {
    const tgId = getStoredValue("dwe_user_tg_id") || getBrowserUserId();
    setStoredValue("dwe_user_tg_id", tgId);
    registerUser.mutate({
      data: {
        telegramId: tgId,
        username: getStoredValue("dwe_user_username") || undefined,
        firstName: getStoredValue("dwe_user_first_name") || undefined,
        referralCode: getStoredValue("dwe_referral_code") || undefined,
      },
    });
  }, []);

  const filteredPosts = posts?.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === "all"
      || p.categories?.some(category => category.slug === activeCategory);
    return matchSearch && matchCategory;
  });

  return (
    <>
      <main className="flex-1 pb-20 md:pb-8">
        {/* Hero Header */}
        <header className="relative px-4 pb-1.5 pt-2 border-b border-white/5 sticky top-0 z-30 overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(240 10% 5%) 0%, hsl(240 10% 4%/0.95) 100%)", backdropFilter: "blur(20px)" }}>
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "radial-gradient(ellipse at 0% 0%, hsl(346 87% 30%) 0%, transparent 60%)" }} />
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-7 w-7 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.65)]" />
                <h1 className="text-[23px] font-black tracking-tight text-transparent bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-400 bg-clip-text">
                  Dark World
                </h1>
              </div>
            </div>

            {settings?.enableNotice && settings.noticeText && (
              <div className="mb-2 flex items-center gap-2 overflow-hidden rounded-xl border border-primary/40 bg-primary/[0.07] px-3 py-1.5 text-[11px] text-white shadow-[0_0_14px_rgba(225,29,72,0.08)]">
                <span className="shrink-0 rounded-md bg-pink-500 px-2 py-1 text-[10px] font-black text-white">
                  🔔 নোটিশ
                </span>
                <span className="truncate">{settings.noticeText}</span>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="🔍 পোস্ট খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl text-sm placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="mt-2 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-[11px] font-semibold transition-all",
                    activeCategory === "all"
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_18px_rgba(225,29,72,0.18)]"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  All
                </button>
                {categories?.map(category => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.slug)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-[11px] font-semibold transition-all",
                      activeCategory === category.slug
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_18px_rgba(225,29,72,0.18)]"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 pb-4 pt-2">
          <AdBanner slot="top" className="max-w-2xl mx-auto" />
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-video rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : filteredPosts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Flame className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground text-sm">No posts found.</p>
              <p className="text-muted-foreground/50 text-xs mt-1">Add posts from the admin panel.</p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {filteredPosts?.map((post, index) => (
                  <div key={post.id} className="space-y-3">
                    <PostCard
                      post={post as any}
                      isVideoOpen={activeVideoPostId === post.id}
                      onOpenVideo={() => setActiveVideoPostId(post.id)}
                      onCloseVideo={() => setActiveVideoPostId(null)}
                    />
                    {index % 3 === 1 && <AdBanner slot="feed" />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Navbar />
    </>
  );
}
