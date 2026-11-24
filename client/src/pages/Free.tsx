import { useState } from "react";
import { useListPosts } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { PostCard } from "@/components/PostCard";
import { AdBanner } from "@/components/AdBanner";
import { Input } from "@/components/ui/input";
import { Search, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Free() {
  const [search, setSearch] = useState("");
  const [activeVideoPostId, setActiveVideoPostId] = useState<number | null>(null);
  const { data: posts, isLoading } = useListPosts({ section: "free" });

  const filteredPosts = posts?.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <main className="flex-1 pb-20 md:pb-8">
        <header className="relative px-4 pt-10 pb-5 border-b border-white/5 sticky top-0 z-30 overflow-hidden"
          style={{ background: "linear-gradient(180deg, hsl(240 10% 5%) 0%, hsl(240 10% 4%/0.95) 100%)", backdropFilter: "blur(20px)" }}>
          <div className="absolute inset-0 opacity-25"
            style={{ backgroundImage: "radial-gradient(ellipse at 0% 0%, hsl(200 80% 30%) 0%, transparent 60%)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              <h1 className="text-2xl font-black tracking-tighter">FREE ACCESS</h1>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-4">No premium required</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search free content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10 focus:border-amber-400/50 rounded-xl text-sm"
              />
            </div>
          </div>
        </header>

        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-video rounded-2xl bg-white/5" />)}
            </div>
          ) : filteredPosts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground text-sm">No free posts yet.</p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              <AdBanner slot="top" />
              {filteredPosts?.map((post, index) => (
                <div key={post.id} className="space-y-4">
                  <PostCard post={post as any} />
                  {index % 3 === 1 && <AdBanner slot="feed" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Navbar />
    </>
  );
}
