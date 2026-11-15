import { useEffect, useRef } from "react";
import { ArrowLeft, Play, Lock, Sparkles } from "lucide-react";
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

export function PostCard({ post, isVideoOpen = false, onOpenVideo, onCloseVideo }: PostCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPaid = post.sections.includes("paid");

  useEffect(() => {
    if (isVideoOpen) {
      document.body.style.overflow = "hidden";
      videoRef.current?.play().catch(() => undefined);
    } else {
      videoRef.current?.pause();
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => undefined);
      }
    }

    return () => {
      document.body.style.overflow = "";
      videoRef.current?.pause();
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => undefined);
      }
    };
  }, [isVideoOpen]);

  useEffect(() => {
    if (!isVideoOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseVideo?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isVideoOpen, onCloseVideo]);

  return (
    <>
      <article className="group overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40">
        <div className="relative aspect-[1.55] overflow-hidden bg-[#1a1b28]">
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
          {post.videoUrl ? (
            <button
              type="button"
              aria-label="Play video"
              onClick={onOpenVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/10"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-white shadow-[0_0_24px_rgba(236,72,153,0.45)]">
                <Play className="ml-1 h-8 w-8 fill-white" />
              </span>
            </button>
          ) : (
            <Link
              href={`/post/${post.slug}`}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] transition-colors hover:bg-black/30 p-2"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-[0_0_24px_rgba(236,72,153,0.6)] mb-2">
                {post.accessType === "ads" ? (
                  <Sparkles className="h-7 w-7 text-white" />
                ) : (
                  <Lock className="h-7 w-7 text-white" />
                )}
              </span>
              <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white border border-white/10 shadow-md">
                {post.accessType === "ads" ? "🎬 Ad দেখে আনলক করুন" : "👑 VIP প্রিমিয়াম আনলক"}
              </span>
            </Link>
          )}
        </div>

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

      {isVideoOpen && post.videoUrl && (
        <div
          className="fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={post.title}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/90 via-black/45 to-transparent px-4 pb-8 pt-4">
            <button
              type="button"
              onClick={onCloseVideo}
              aria-label="Back from full screen video"
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <span className="truncate text-sm font-semibold text-white">{post.title}</span>
          </div>
          <video
            ref={videoRef}
            src={mediaUrl(post.videoUrl)}
            poster={mediaUrl(post.thumbnailUrl)}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="h-full w-full bg-black object-contain"
          />
        </div>
      )}
    </>
  );
}