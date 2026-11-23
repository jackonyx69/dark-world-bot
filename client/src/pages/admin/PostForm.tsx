import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  useGetAdminPost,
  useCreatePost,
  useUpdatePost,
  useListAdminCategories,
  useUploadAdminFile,
  getListAdminPostsQueryKey,
  type PostBlockInput,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Bell,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Megaphone,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAdSettings } from "@/components/AdBanner";

type EditorBlock = PostBlockInput & { localId: string; id?: number };
type AccessType = "direct" | "ads" | "premium";

const emptyForm = {
  title: "",
  slug: "",
  description: "",
  thumbnailUrl: "",
  accessType: "direct" as AccessType,
  sections: [] as string[],
  monetagZoneId: "",
  adTimer: "15",
  adsgramBlockId: "",
  adsRequired: "2",
  pinOrder: "0",
  isPinned: false,
  postToChannel: true,
  notifyUsers: false,
  categoryIds: [] as number[],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function ensureValidSlug(slug: string, title: string) {
  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/(^-|-$)+/g, "");
  if (cleanSlug) return cleanSlug;
  const fromTitle = slugify(title);
  if (fromTitle) return fromTitle;
  return `post-${Math.random().toString(36).substring(2, 8)}`;
}

function blockFromApi(block: { id: number; blockType: string; content: string; sortOrder: number }): EditorBlock {
  return {
    id: block.id,
    localId: `saved-${block.id}`,
    blockType: block.blockType,
    content: block.content,
    sortOrder: block.sortOrder,
  };
}

export default function AdminPostForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");
  const postId = isEditing ? Number(id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const { data: post, isLoading: postLoading } = useGetAdminPost(postId, {
    query: { enabled: isEditing },
  } as any);
  const { data: categories } = useListAdminCategories();
  const { data: adSettings } = useAdSettings();
  const defaultZoneId = adSettings?.monetagZoneId?.trim() || "";
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const uploadFile = useUploadAdminFile();

  const [formData, setFormData] = useState(emptyForm);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isEditing && defaultZoneId && !formData.monetagZoneId) {
      setFormData((prev) => ({ ...prev, monetagZoneId: defaultZoneId }));
    }
  }, [isEditing, defaultZoneId]);

  useEffect(() => {
    if (!post) return;
    setFormData({
      title: post.title,
      slug: post.slug,
      description: post.description || "",
      thumbnailUrl: post.thumbnailUrl || "",
      accessType: post.accessType as AccessType,
      sections: post.sections.split(",").filter(Boolean),
      monetagZoneId: post.monetagZoneId || "",
      adTimer: String(post.adTimer ?? 15),
      adsgramBlockId: post.adsgramBlockId || "",
      adsRequired: String(post.adsRequired ?? 2),
      pinOrder: String(post.pinOrder ?? 0),
      isPinned: post.pinOrder !== null && post.pinOrder !== undefined,
      postToChannel: false,
      notifyUsers: false,
      categoryIds: post.categories?.map((category) => category.id) || [],
    });
    setBlocks((post.blocks || []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map(blockFromApi));
  }, [post]);

  const isSaving = createPost.isPending || updatePost.isPending;
  const selectedCategoryNames = useMemo(
    () => (categories || []).filter((category) => formData.categoryIds.includes(category.id)).map((category) => category.name),
    [categories, formData.categoryIds],
  );

  const updateField = <K extends keyof typeof emptyForm>(field: K, value: (typeof emptyForm)[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const toggleListValue = (field: "sections" | "categoryIds", value: string | number) => {
    setFormData((current) => {
      const currentValues = current[field] as Array<string | number>;
      const next = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [field]: next };
    });
  };

  const handleTitleChange = (title: string) => {
    setFormData((current) => {
      let nextSlug = current.slug;
      if (!isEditing) {
        const derived = slugify(title);
        if (derived) {
          nextSlug = derived;
        } else if (!current.slug || current.slug.startsWith("post-")) {
          nextSlug = current.slug || `post-${Math.random().toString(36).substring(2, 8)}`;
        }
      }
      return {
        ...current,
        title,
        slug: nextSlug,
      };
    });
  };

  const uploadAndSet = (file: File | undefined, target: string, onUploaded: (url: string) => void) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"].includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Use JPG, PNG, WEBP, GIF, MP4 or WEBM.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File is too large", description: "Maximum upload size is 25MB.", variant: "destructive" });
      return;
    }
    setUploadingTarget(target);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadFile.mutate(
        { data: { filename: file.name, mimeType: file.type, data: reader.result } },
        {
          onSuccess: (result) => {
            onUploaded(result.url);
            toast({ title: "File uploaded" });
          },
          onError: () => toast({ title: "Upload failed", variant: "destructive" }),
          onSettled: () => setUploadingTarget(null),
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const addBlock = (blockType: string) => {
    setBlocks((current) => [
      ...current,
      {
        localId: `new-${Date.now()}-${current.length}`,
        blockType,
        content: blockType === "text" ? "<p>New text block</p>" : "",
        sortOrder: current.length,
      },
    ]);
  };

  const updateBlock = (localId: string, patch: Partial<EditorBlock>) => {
    setBlocks((current) => current.map((block) => block.localId === localId ? { ...block, ...patch } : block));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setBlocks(next.map((block, sortOrder) => ({ ...block, sortOrder })));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const title = formData.title.trim();
    const slug = ensureValidSlug(formData.slug, title);
    if (!title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!slug) {
      toast({ title: "A valid slug is required", variant: "destructive" });
      return;
    }
    if (formData.sections.length === 0) {
      toast({ title: "Select at least one section", description: "Choose Home, Free Zone or Paid Zone.", variant: "destructive" });
      return;
    }

    const data = {
      title,
      slug,
      description: formData.description.trim(),
      thumbnailUrl: formData.thumbnailUrl.trim(),
      accessType: formData.accessType,
      sections: formData.sections.join(","),
      monetagZoneId: formData.monetagZoneId.trim(),
      adTimer: Math.max(0, Number(formData.adTimer) || 15),
      adsgramBlockId: formData.adsgramBlockId.trim(),
      adsRequired: Math.max(1, Number(formData.adsRequired) || 1),
      pinOrder: formData.isPinned ? Math.max(0, Number(formData.pinOrder) || 0) : undefined,
      isPinned: formData.isPinned,
      categoryIds: formData.categoryIds,
      blocks: blocks.map(({ blockType, content }, sortOrder) => ({ blockType, content, sortOrder })),
      postToChannel: formData.postToChannel,
      notifyUsers: formData.notifyUsers,
    } as any;

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
      toast({ title: isEditing ? "Post updated successfully" : "Post published successfully" });
      setLocation("/admin/posts");
    };

    if (isEditing) {
      updatePost.mutate({ id: postId, data }, { onSuccess });
    } else {
      createPost.mutate({ data }, { onSuccess });
    }
  };

  if (isEditing && postLoading) {
    return <AdminLayout><div className="py-20 text-center text-muted-foreground">Loading post editor…</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={() => setLocation("/admin/posts")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{isEditing ? "Edit Post" : "Create Post"}</h1>
            <p className="text-sm text-muted-foreground">Match the original post publishing controls without leaving the admin panel.</p>
          </div>
          <Button type="submit" disabled={isSaving || uploadFile.isPending}>
            <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving…" : isEditing ? "Update Post" : "Publish Post"}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>Post details</CardTitle><CardDescription>Title, short link, sections, category and cover image.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Post title…" required />
            </div>
            <div className="space-y-2">
              <Label>Custom short link / slug</Label>
              <Input
                value={formData.slug}
                onChange={(event) => updateField("slug", event.target.value)}
                placeholder="e.g. viral-video-1 or leave blank for auto"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to auto-generate (supports English &amp; Bengali titles). Must be alphanumeric.
              </p>
              {formData.slug.trim() && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 p-2.5 text-xs">
                  <div className="min-w-0 truncate">
                    <span className="text-muted-foreground">Post link: </span>
                    <span className="font-mono font-medium text-foreground truncate">{window.location.origin}/post/{formData.slug.trim()}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/post/${formData.slug.trim()}`;
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url);
                      } else {
                        const input = document.createElement("input");
                        input.value = url;
                        document.body.appendChild(input);
                        input.select();
                        document.execCommand("copy");
                        document.body.removeChild(input);
                      }
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                      toast({ title: "Post link copied!", description: url });
                    }}
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedLink ? "Copied" : "Copy Link"}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label>Sections *</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  ["home", "Home"],
                  ["free", "Free Zone"],
                  ["paid", "Paid Zone"],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.sections.includes(value)} onCheckedChange={() => toggleListValue("sections", value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-3">
                {(categories || []).map((category) => (
                  <label key={category.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.categoryIds.includes(category.id)} onCheckedChange={() => toggleListValue("categoryIds", category.id)} />
                    {category.name}
                  </label>
                ))}
                {categories?.length === 0 && <span className="text-sm text-muted-foreground">No categories available.</span>}
              </div>
              {selectedCategoryNames.length > 0 && <p className="text-xs text-muted-foreground">Selected: {selectedCategoryNames.join(", ")}</p>}
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <div className="flex gap-2">
                <Input className="flex-1" value={formData.thumbnailUrl} onChange={(event) => updateField("thumbnailUrl", event.target.value)} placeholder="https://…" />
                <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => uploadAndSet(event.target.files?.[0], "thumbnail", (url) => updateField("thumbnailUrl", url))} />
                <Button type="button" variant="outline" onClick={() => thumbnailInputRef.current?.click()} disabled={uploadingTarget === "thumbnail"}>
                  <Upload className="w-4 h-4 mr-2" /> {uploadingTarget === "thumbnail" ? "Uploading…" : "Upload"}
                </Button>
              </div>
              {formData.thumbnailUrl && <img src={formData.thumbnailUrl} alt="Thumbnail preview" className="w-40 h-24 object-cover rounded-lg border border-border" />}
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea value={formData.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Short preview text…" rows={4} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Access and ads</CardTitle><CardDescription>Choose direct access or the original ad-unlock flow.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessType" checked={formData.accessType === "direct"} onChange={() => updateField("accessType", "direct")} />
                Direct access
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessType" checked={formData.accessType === "ads"} onChange={() => updateField("accessType", "ads")} />
                <Megaphone className="w-4 h-4" /> Ads unlock
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessType" checked={formData.accessType === "premium"} onChange={() => updateField("accessType", "premium")} />
                Premium
              </label>
            </div>
            {formData.accessType === "ads" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 grid sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-4 h-4 text-amber-400" /> Monetag Zone ID
                    </Label>
                    {defaultZoneId && (
                      <button
                        type="button"
                        onClick={() => updateField("monetagZoneId", defaultZoneId)}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        ডিফল্ট জোন আইডি বসান ({defaultZoneId})
                      </button>
                    )}
                  </div>
                  <Input
                    value={formData.monetagZoneId}
                    onChange={(event) => updateField("monetagZoneId", event.target.value)}
                    placeholder={defaultZoneId || "1100756"}
                    className="font-mono bg-black/20"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>বারবার কপি-পেস্ট করার দরকার নেই!</strong> আপনি <span className="text-foreground font-semibold">Ads Setup</span>-এ যে ডিফল্ট Zone ID ({defaultZoneId ? <code className="bg-primary/10 text-primary px-1 py-0.5 rounded font-mono">{defaultZoneId}</code> : "সেট করা হয়নি"}) সংরক্ষণ করেছেন, নতুন পোস্ট করার সময় তা স্বয়ংক্রিয়ভাবে এখানে বসে যাবে। এমনকি খালি রাখলেও সাইট স্বয়ংক্রিয়ভাবে ডিফল্ট Zone ID ব্যবহার করে বিজ্ঞাপন চালাবে।
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Adsgram Block ID</Label>
                  <Input value={formData.adsgramBlockId} onChange={(event) => updateField("adsgramBlockId", event.target.value)} placeholder="12345" />
                </div>
                <div className="space-y-2">
                  <Label>Ad timer (seconds)</Label>
                  <Input type="number" min="0" value={formData.adTimer} onChange={(event) => updateField("adTimer", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ads required</Label>
                  <Input type="number" min="1" value={formData.adsRequired} onChange={(event) => updateField("adsRequired", event.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post content</CardTitle>
            <CardDescription>Sequential text, image and video blocks. Changes are saved with the post.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")}><FileText className="w-4 h-4 mr-2" />Text</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")}><ImageIcon className="w-4 h-4 mr-2" />Image</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")}><Video className="w-4 h-4 mr-2" />Video</Button>
            </div>
            {blocks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border rounded-lg text-sm text-muted-foreground">No blocks yet. Add text, image or video content.</div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div key={block.localId} className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold uppercase text-primary">{block.blockType}</span>
                      <span className="text-xs text-muted-foreground">Block {index + 1}</span>
                      <div className="ml-auto flex gap-1">
                        <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => moveBlock(index, -1)} aria-label="Move block up">↑</Button>
                        <Button type="button" variant="ghost" size="icon" disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} aria-label="Move block down">↓</Button>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setBlocks((current) => current.filter((item) => item.localId !== block.localId))} aria-label="Delete block"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    {block.blockType === "text" ? (
                      <Textarea value={block.content} onChange={(event) => updateBlock(block.localId, { content: event.target.value })} rows={6} placeholder="Write HTML/text content…" />
                    ) : (
                      <div className="flex gap-2">
                        <Input className="flex-1" value={block.content} onChange={(event) => updateBlock(block.localId, { content: event.target.value })} placeholder={`${block.blockType} URL…`} />
                        <label className="inline-flex items-center justify-center rounded-md border px-3 text-sm cursor-pointer hover:bg-muted">
                          <Upload className="w-4 h-4 mr-2" /> Upload
                          <input
                            type="file"
                            accept={block.blockType === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm"}
                            className="hidden"
                            onChange={(event) => uploadAndSet(event.target.files?.[0], block.localId, (url) => updateBlock(block.localId, { content: url }))}
                          />
                        </label>
                      </div>
                    )}
                    {block.content && block.blockType === "image" && <img src={block.content} alt={`Block ${index + 1}`} className="max-h-48 rounded-lg object-contain" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Publish controls</CardTitle><CardDescription>Order, pin state and optional Telegram broadcast.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display order (lower = first)</Label>
                <Input type="number" min="0" value={formData.pinOrder} onChange={(event) => updateField("pinOrder", event.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm sm:items-end sm:pb-2">
                <Checkbox checked={formData.isPinned} onCheckedChange={(checked) => updateField("isPinned", Boolean(checked))} />
                Pin to top
              </label>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm cursor-pointer">
              <Checkbox checked={formData.postToChannel} onCheckedChange={(checked) => updateField("postToChannel", Boolean(checked))} />
              <span>
                <span className="font-semibold flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Post to Telegram Channel
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Automatically share thumbnail, title, description and "Watch Now" button to your Telegram channel.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm cursor-pointer">
              <Checkbox checked={formData.notifyUsers} onCheckedChange={(checked) => updateField("notifyUsers", Boolean(checked))} />
              <span>
                <span className="font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Send Telegram notification
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Notify all registered users after this post is saved.
                </span>
              </span>
            </label>
            <Button type="submit" disabled={isSaving || uploadFile.isPending} className="w-full h-12">
              <Save className="w-4 h-4 mr-2" /> {isEditing ? "Save Changes" : "Publish Post"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </AdminLayout>
  );
}