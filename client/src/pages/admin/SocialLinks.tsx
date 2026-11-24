import { useState } from "react";
import { 
  useListAdminSocialLinks, useCreateSocialLink, 
  useUpdateSocialLink, useDeleteSocialLink,
  getListAdminSocialLinksQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminSocialLinks() {
  const { data: links, isLoading } = useListAdminSocialLinks();
  const createLink = useCreateSocialLink();
  const updateLink = useUpdateSocialLink();
  const deleteLink = useDeleteSocialLink();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    platform: "",
    displayName: "",
    url: "",
    logoUrl: "",
    isActive: true
  });

  const resetForm = () => {
    setFormData({ platform: "", displayName: "", url: "", logoUrl: "", isActive: true });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (link: any) => {
    setFormData({
      platform: link.platform,
      displayName: link.displayName,
      url: link.url,
      logoUrl: link.logoUrl || "",
      isActive: link.isActive
    });
    setEditingId(link.id);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateLink.mutate(
        { id: editingId, data: formData },
        {
          onSuccess: () => {
            toast({ title: "Link updated" });
            queryClient.invalidateQueries({ queryKey: getListAdminSocialLinksQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createLink.mutate(
        { data: formData },
        {
          onSuccess: () => {
            toast({ title: "Link created" });
            queryClient.invalidateQueries({ queryKey: getListAdminSocialLinksQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this social link?")) {
      deleteLink.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Link deleted" });
            queryClient.invalidateQueries({ queryKey: getListAdminSocialLinksQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Social Links</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Add Link</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Link" : "Add New Link"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Input value={formData.platform} onChange={e => setFormData(prev => ({...prev, platform: e.target.value}))} placeholder="e.g. telegram, twitter" required />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={formData.displayName} onChange={e => setFormData(prev => ({...prev, displayName: e.target.value}))} placeholder="e.g. Official Channel" required />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={formData.url} onChange={e => setFormData(prev => ({...prev, url: e.target.value}))} placeholder="https://..." required />
              </div>
              <div className="space-y-2">
                <Label>Logo URL (Optional)</Label>
                <Input value={formData.logoUrl} onChange={e => setFormData(prev => ({...prev, logoUrl: e.target.value}))} placeholder="https://..." />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="active" 
                  checked={formData.isActive} 
                  onCheckedChange={v => setFormData(prev => ({...prev, isActive: v}))} 
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createLink.isPending || updateLink.isPending}>
                Save Link
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-16"></TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : links?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No links found</TableCell></TableRow>
            ) : (
              links?.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    {link.logoUrl ? (
                      <img src={link.logoUrl} alt={link.platform} className="w-8 h-8 rounded bg-secondary object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs uppercase">{link.platform.substring(0,2)}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium capitalize">{link.platform}</TableCell>
                  <TableCell>
                    <div>{link.displayName}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-[300px]">{link.url}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${link.isActive ? 'bg-green-500/20 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                      {link.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(link)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(link.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </AdminLayout>
  );
}
