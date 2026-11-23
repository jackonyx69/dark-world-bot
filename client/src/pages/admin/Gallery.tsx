import { useState } from "react";
import {
  useListAdminGallery,
  useCreateGalleryItem,
  useUpdateGalleryItem,
  useDeleteGalleryItem,
  useUploadAdminFile,
  getListAdminGalleryQueryKey,
  type GalleryItem,
  type GalleryMedia,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, Edit, Images, Plus, Trash2, Upload, X } from "lucide-react";
import { mediaUrl } from "@/lib/media";

type MediaDraft = GalleryMedia & { key: string };

const blankMedia = (): MediaDraft => ({ key: `${Date.now()}-${Math.random()}`, type: "image", url: "", title: "" });

export default function AdminGallery() {
  const { data: items, isLoading } = useListAdminGallery();
  const createItem = useCreateGalleryItem();
  const updateItem = useUpdateGalleryItem();
  const deleteItem = useDeleteGalleryItem();
  const uploadFile = useUploadAdminFile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [medias, setMedias] = useState<MediaDraft[]>([blankMedia()]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setSortOrder("0");
    setIsActive(true);
    setMedias([blankMedia()]);
  };

  const edit = (item: GalleryItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || "");
    setSortOrder(String(item.sortOrder));
    setIsActive(item.isActive);
    setMedias(item.medias.map((media, index) => ({ ...media, key: `${item.id}-${index}` })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadMedia = (file: File | undefined, media: MediaDraft) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported file type", description: "Use JPG, PNG, WEBP, GIF, MP4 or WEBM.", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File is too large", description: "Maximum upload size is 25MB.", variant: "destructive" });
      return;
    }
    setUploadingKey(media.key);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadFile.mutate(
        { data: { filename: file.name, mimeType: file.type, data: reader.result } },
        {
          onSuccess: (result) => {
            setMedias((current) => current.map((item) => item.key === media.key ? {
              ...item,
              url: result.url,
              type: file.type.startsWith("video/") ? "video" : "image",
              title: item.title || file.name.replace(/\.[^.]+$/, ""),
            } : item));
            toast({ title: "Media uploaded" });
          },
          onError: () => toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" }),
          onSettled: () => setUploadingKey(null),
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const moveMedia = (index: number, direction: -1 | 1) => {
    setMedias((current) => {
      const next = index + direction;
      if (next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const validMedias = medias.filter((media) => media.url.trim()).map(({ key: _key, ...media }, index) => ({ ...media, sortOrder: index }));
    if (!title.trim() || !validMedias.length) {
      toast({ title: "Title and at least one media URL are required", variant: "destructive" });
      return;
    }
    const data = { title: title.trim(), description: description.trim(), medias: validMedias, sortOrder: Number(sortOrder) || 0, isActive };
    const done = () => {
      queryClient.invalidateQueries({ queryKey: getListAdminGalleryQueryKey() });
      reset();
      toast({ title: editingId ? "Gallery item updated" : "Gallery item created" });
    };
    const onError = () => toast({ title: "Could not save gallery item", description: "Check the fields and try again.", variant: "destructive" });
    if (editingId) updateItem.mutate({ id: editingId, data }, { onSuccess: done, onError });
    else createItem.mutate({ data }, { onSuccess: done, onError });
  };

  const remove = (id: number) => {
    if (!confirm("Delete this premium gallery item?")) return;
    deleteItem.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminGalleryQueryKey() });
        toast({ title: "Gallery item deleted" });
      },
      onError: () => toast({ title: "Could not delete gallery item", variant: "destructive" }),
    });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-3">
        <Images className="h-7 w-7 text-primary" />
        <div><h1 className="text-2xl font-bold">Premium Gallery</h1><p className="text-sm text-muted-foreground">Manage preview images and videos shown before VIP checkout.</p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="border-border">
          <CardHeader><CardTitle>{editingId ? "Edit Preview" : "Add Preview"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Sort order</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
                <div className="flex items-center gap-2 pt-7"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Active</Label></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Media</Label><Button type="button" size="sm" variant="outline" onClick={() => setMedias((current) => [...current, blankMedia()])}><Plus className="mr-1 h-3 w-3" /> Add</Button></div>
                {medias.map((media, index) => (
                  <div key={media.key} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex gap-2">
                      <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={media.type} onChange={(e) => setMedias((current) => current.map((item) => item.key === media.key ? { ...item, type: e.target.value as GalleryMedia["type"] } : item))}><option value="image">Image</option><option value="video">Video</option></select>
                      <Input placeholder="https://..." value={media.url} onChange={(e) => setMedias((current) => current.map((item) => item.key === media.key ? { ...item, url: e.target.value } : item))} />
                      {medias.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => setMedias((current) => current.filter((item) => item.key !== media.key))}><X className="h-4 w-4" /></Button>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-secondary">
                        <Upload className="h-3.5 w-3.5" /> {uploadingKey === media.key ? "Uploading..." : "Upload file"}
                        <input type="file" className="hidden" accept="image/*,video/mp4,video/webm" disabled={uploadingKey === media.key} onChange={(event) => uploadMedia(event.target.files?.[0], media)} />
                      </label>
                      <Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveMedia(index, -1)} aria-label="Move media up"><ArrowUp className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" disabled={index === medias.length - 1} onClick={() => moveMedia(index, 1)} aria-label="Move media down"><ArrowDown className="h-4 w-4" /></Button>
                    </div>
                    <Input placeholder={`Media ${index + 1} title (optional)`} value={media.title || ""} onChange={(e) => setMedias((current) => current.map((item) => item.key === media.key ? { ...item, title: e.target.value } : item))} />
                    {media.url && (
                      <div className="overflow-hidden rounded-md border border-border bg-black">
                        {media.type === "video" ? <video src={mediaUrl(media.url)} controls preload="metadata" className="max-h-32 w-full object-contain" /> : <img src={mediaUrl(media.url)} alt={media.title || `Media ${index + 1}`} className="max-h-32 w-full object-contain" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2"><Button type="submit" disabled={createItem.isPending || updateItem.isPending}>{editingId ? "Save Changes" : "Create Preview"}</Button>{editingId && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {isLoading ? <Card><CardContent className="p-8 text-center text-muted-foreground">Loading gallery...</CardContent></Card> : items?.length ? items.map((item) => (
            <Card key={item.id} className="border-border">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="grid w-28 shrink-0 grid-cols-2 gap-1">{item.medias.slice(0, 4).map((media, index) => media.type === "video" ? <video key={index} src={mediaUrl(media.url)} preload="metadata" className="aspect-video w-full rounded object-cover bg-secondary" /> : <img key={index} src={mediaUrl(media.url)} alt="" className="aspect-video w-full rounded object-cover bg-secondary" />)}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="font-bold truncate">{item.title}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] ${item.isActive ? "bg-green-500/15 text-green-400" : "bg-secondary text-muted-foreground"}`}>{item.isActive ? "Active" : "Hidden"}</span></div><p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.medias.length} media · {item.viewCount} views · order {item.sortOrder}</p></div>
                <div className="flex shrink-0 gap-1"><Button size="icon" variant="ghost" onClick={() => edit(item)}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}><Trash2 className="h-4 w-4" /></Button></div>
              </CardContent>
            </Card>
          )) : <Card><CardContent className="p-8 text-center text-muted-foreground">No gallery previews yet.</CardContent></Card>}
        </div>
      </div>
    </AdminLayout>
  );
}