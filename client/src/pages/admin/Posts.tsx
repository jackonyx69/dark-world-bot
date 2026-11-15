import { useMemo, useState } from "react";
import {
  useListAdminPosts,
  useDeletePost,
  usePinAdminPost,
  useSetAdminPostActive,
  getListAdminPostsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Pin, Eye, EyeOff, Search, RotateCcw, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminPosts() {
  const { data: posts, isLoading } = useListAdminPosts();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("all");
  const [accessType, setAccessType] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const deletePost = useDeletePost();
  const pinPost = usePinAdminPost();
  const setPostActive = useSetAdminPostActive();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    deletePost.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
          toast({ title: "Post deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete post", variant: "destructive" });
        }
      }
    );
  };

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
  };

  const handlePin = (id: number, isPinned: boolean) => {
    pinPost.mutate(
      { id, data: { isPinned, pinOrder: isPinned ? 1 : undefined } },
      {
        onSuccess: () => {
          invalidatePosts();
          toast({ title: isPinned ? "Post pinned" : "Post unpinned" });
        },
        onError: () => toast({ title: "Failed to update pin", variant: "destructive" }),
      },
    );
  };

  const handleActive = (id: number, isActive: boolean) => {
    setPostActive.mutate(
      { id, data: { isActive } },
      {
        onSuccess: () => {
          invalidatePosts();
          toast({ title: isActive ? "Post activated" : "Post hidden" });
        },
        onError: () => toast({ title: "Failed to update visibility", variant: "destructive" }),
      },
    );
  };

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (posts || [])
      .filter((post) => {
        const haystack = `${post.title} ${post.slug} ${post.description || ""} ${(post.categories || []).map((category) => category.name).join(" ")}`.toLowerCase();
        const hasSection = section === "all" || post.sections.split(",").includes(section);
        const hasAccess = accessType === "all" || post.accessType === accessType;
        const hasVisibility = visibility === "all" || (visibility === "active" ? post.isActive : !post.isActive);
        return (!query || haystack.includes(query)) && hasSection && hasAccess && hasVisibility;
      })
      .sort((a, b) => Number(Boolean(b.pinOrder)) - Number(Boolean(a.pinOrder)) || b.id - a.id);
  }, [posts, search, section, accessType, visibility]);

  const resetFilters = () => {
    setSearch("");
    setSection("all");
    setAccessType("all");
    setVisibility("all");
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">Create, search, publish, pin and manage every post.</p>
        </div>
        <Button asChild>
          <Link href="/admin/posts/new"><Plus className="w-4 h-4 mr-2" /> New Post</Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 mb-5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, slug, description or category…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={section} onChange={(event) => setSection(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All sections</option>
            <option value="home">Home</option>
            <option value="free">Free Zone</option>
            <option value="paid">Paid Zone</option>
          </select>
          <select value={accessType} onChange={(event) => setAccessType(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All access types</option>
            <option value="direct">Direct</option>
            <option value="ads">Ads unlock</option>
            <option value="premium">Premium</option>
          </select>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All visibility</option>
            <option value="active">Active only</option>
            <option value="inactive">Hidden only</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} disabled={!search && section === "all" && accessType === "all" && visibility === "all"}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <span className="text-xs text-muted-foreground self-center ml-auto">{filteredPosts.length} of {posts?.length || 0} posts</span>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Access / status</TableHead>
              <TableHead className="text-right">Stats</TableHead>
              <TableHead className="text-center">Order</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredPosts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No posts match these filters.</TableCell></TableRow>
            ) : (
              filteredPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {post.thumbnailUrl ? (
                        <img src={post.thumbnailUrl} alt="" className="w-14 h-10 rounded-md object-cover border border-border shrink-0" />
                      ) : (
                        <div className="w-14 h-10 rounded-md border border-border bg-muted flex items-center justify-center shrink-0"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-1">{post.title}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">{post.slug}</div>
                        <div className="text-[11px] text-muted-foreground">{post.categories?.map((category) => category.name).join(", ") || "Uncategorized"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {post.sections.split(',').filter(Boolean).map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                      {post.accessType === 'ads' && <Badge variant="outline" className="text-[10px] border-primary text-primary">ADS</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={post.accessType === "ads" ? "outline" : "secondary"} className={post.accessType === "ads" ? "text-[10px] border-primary text-primary" : post.accessType === "premium" ? "text-[10px] border-amber-500 text-amber-500" : "text-[10px]"}>
                        {post.accessType === "ads" ? "ADS UNLOCK" : post.accessType === "premium" ? "PREMIUM" : "DIRECT"}
                      </Badge>
                      <Badge variant={post.isActive ? "secondary" : "destructive"} className="text-[10px]">{post.isActive ? "ACTIVE" : "HIDDEN"}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(post.createdAt).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-xs text-muted-foreground">
                      <div>{post.viewCount} views</div>
                      <div>{post.likeCount} likes</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">{post.pinOrder || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant={post.pinOrder ? "default" : "outline"}
                        size="icon"
                        title={post.pinOrder ? "Unpin post" : "Pin post"}
                        onClick={() => handlePin(post.id, !post.pinOrder)}
                        disabled={pinPost.isPending}
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title={post.isActive ? "Hide post" : "Activate post"}
                        onClick={() => handleActive(post.id, !post.isActive)}
                        disabled={setPostActive.isPending}
                      >
                        {post.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/admin/posts/${post.id}/edit`}><Edit className="w-4 h-4" /></Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Post</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{post.title}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
