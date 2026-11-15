import { useState } from "react";
import { useListGallery, type GalleryMedia } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Images, Eye, Heart, Crown, Play, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { mediaUrl } from "@/lib/media";

export default function Gallery() {
  const { data: items, isLoading } = useListGallery();
  const [, setLocation] = useLocation();
  const [selectedMedia, setSelectedMedia] = useState<{ media: GalleryMedia; title: string } | null>(null);

  return (
    <>
      <main className="flex-1 pb-24 md:pb-8">
        <header className="relative px-4 pt-8 pb-6 border-b border-white/5 overflow-hidden">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_20%_0%,hsl(270_80%_35%),transparent_65%)]" />
          <div className="relative flex items-start gap-3">
            <Button type="button" variant="outline" size="icon" onClick={() => setLocation("/", { replace: true })} aria-label="Go back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
            <div className="flex items-center gap-2 mb-1">
              <Images className="w-6 h-6 text-violet-400" />
              <h1 className="text-xl font-black tracking-tight text-white">⭐ প্রিমিয়াম কন্টেন্টের নমুনা</h1>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              প্রিমিয়ামে কী ধরনের কন্টেন্ট পাবেন — নিচে দেখুন!<br />
              <span className="font-extrabold text-cyan-300">(সব কন্টেন্ট দেখতে প্রিমিয়াম সাবস্ক্রাইব করুন)</span>
            </p>
            </div>
          </div>
        </header>

        <section className="p-4 space-y-4">
          {isLoading ? (
            [1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-2xl bg-white/5" />)
          ) : items?.length ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden rounded-2xl border-white/10 bg-card">
                <CardContent className="p-3.5">
                  <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {item.medias.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((media, index) => (
                      <button
                        type="button"
                        key={`${item.id}-${index}`}
                        onClick={() => setSelectedMedia({ media, title: media.title || item.title })}
                        className="relative aspect-video w-full overflow-hidden rounded-xl bg-black text-left"
                        aria-label={`Open ${media.title || item.title}`}
                      >
                        {media.type === "video" ? (
                          <>
                            <video src={mediaUrl(media.url)} muted playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/65">
                                <Play className="ml-1 h-8 w-8 fill-white text-white" />
                              </span>
                            </span>
                          </>
                        ) : (
                          <img src={mediaUrl(media.url)} alt={media.title || item.title} loading="lazy" className="h-full w-full bg-black object-contain" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-white">{item.title}</h2>
                        <Badge className="bg-primary/15 text-primary border-primary/20 text-[9px]">
                          <Crown className="w-3 h-3 mr-1" /> VIP
                        </Badge>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.description || "প্রিমিয়াম কন্টেন্টের একটি অংশ"}</p>
                      <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.viewCount} বার দেখা</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-primary" /> {item.likeCount} লাইক</span>
                      </div>
                    </div>
                    <Sparkles className="w-5 h-5 shrink-0 text-violet-400" />
                  </div>
                  <div className="my-3 rounded-md border-l-4 border-primary bg-[#1a1b28] px-3 py-2 text-[11px] text-slate-400">📌 প্রিমিয়াম কন্টেন্টের একটি অংশ</div>
                  <div className="flex gap-2">
                    <Link href="/packages" className="flex-1">
                      <Button className="w-full py-2 text-[11px] font-bold"><Crown className="mr-1 h-4 w-4" /> প্রিমিয়ামে যোগ দিন</Button>
                    </Link>
                    <Link href="/packages" className="flex-1">
                      <Button variant="outline" className="w-full border-white/10 py-2 text-[11px] font-bold">📦 প্যাকেজ দেখুন</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              <Images className="mx-auto mb-4 h-12 w-12 opacity-20" />
              <p className="text-sm">No premium previews yet.</p>
            </div>
          )}
        </section>
      </main>
      <Navbar />
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={selectedMedia.title}
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col items-center" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedMedia(null)} className="absolute right-1 top-1 z-10 rounded-full bg-black/70 px-3 py-1 text-xl text-white" aria-label="Close viewer">×</button>
            {selectedMedia.media.type === "video" ? (
              <video src={mediaUrl(selectedMedia.media.url)} controls autoPlay playsInline className="max-h-[82dvh] w-full rounded-xl bg-black object-contain" />
            ) : (
              <img src={mediaUrl(selectedMedia.media.url)} alt={selectedMedia.title} className="max-h-[82dvh] w-full rounded-xl bg-black object-contain" />
            )}
            <p className="mt-2 text-center text-sm font-semibold text-white">{selectedMedia.title}</p>
          </div>
        </div>
      )}
    </>
  );
}