import { Play, Lock, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { mediaUrl } from "@/lib/media";

interface PostCardProps {
  post: {
    title: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    videoUrl?: string | null;
    accessType: "direct" | "ads";
    sections: string;
    viewCount: number;
    likeCount: number;
    categories?: Array<{ id?: number; name?: string; slug?: string }>;
  };
  isVideoOpen?: boolean;
  onOpenVideo?: () => void;
  onCloseVideo?: () => void;
}

export function PostCard({ post }: PostCardProps) {
  const isPaid = post.sections.includes("paid");

  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <Link href={`/post/${post.slug}`} className="block relative aspect-[1.55] overflow-hidden bg-[#1a1b28]">
        {post.thumbnailUrl ? (
          <img
            src={mediaUrl(post.thumbnailUrl)}
            alt={post.title}
            loading="lazy"
            className="h-full w-full bg-black object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black">
            <Play className="h-14 w-14 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/25">
          {post.videoUrl ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-white shadow-[0_0_24px_rgba(236,72,153,0.5)] transition-transform duration-200 group-hover:scale-110">
              <Play className="ml-1 h-8 w-8 fill-white" />
            </span>
          ) : (
            <div className="flex flex-col items-center justify-center p-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-[0_0_24px_rgba(236,72,153,0.6)] mb-2 transition-transform duration-200 group-hover:scale-105">
                {post.accessType === "ads" ? (
                  <Sparkles className="h-7 w-7 text-white" />
                ) : (
                  <Lock className="h-7 w-7 text-white" />
                )}
              </span>
              <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white border border-white/10 shadow-md">
                {post.accessType === "ads" ? "🎬 Ad দেখে আনলক করুন" : "👑 VIP প্রিমিয়াম আনলক"}
              </span>
            </div>
          )}
        </div>
      </Link>

      <Link
        href={`/post/${post.slug}`}
        className="block rounded-b-xl bg-[#11111d] px-2.5 pb-2.5 pt-2 text-left hover:bg-[#161626] transition-colors"
      >
        <h3 className="line-clamp-2 bg-gradient-to-r from-white via-pink-100 to-fuchsia-200 bg-clip-text text-sm font-extrabold leading-snug tracking-tight text-transparent">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[10px] font-medium italic leading-relaxed text-slate-300/80">
          {post.description || (isPaid ? "প্রিমিয়াম কন্টেন্ট দেখতে VIP-তে যোগ দিন" : "ফ্রি কন্টেন্ট আনলক করতে কাজ সম্পূর্ণ করুন")}
        </p>
      </Link>
    </article>
  );
}
