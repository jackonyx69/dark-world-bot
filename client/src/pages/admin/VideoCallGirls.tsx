import { useState } from "react";
import { 
  useListAdminVideoCallGirls, useCreateVideoCallGirl, 
  useUpdateVideoCallGirl, useDeleteVideoCallGirl,
  getListAdminVideoCallGirlsQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminVideoCallGirls() {
  const { data: girls, isLoading } = useListAdminVideoCallGirls();
  const createGirl = useCreateVideoCallGirl();
  const updateGirl = useUpdateVideoCallGirl();
  const deleteGirl = useDeleteVideoCallGirl();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    imageUrl: "",
    serviceStart: "22:00",
    serviceEnd: "04:00",
    status: "offline",
    sortOrder: "0"
  });

  const resetForm = () => {
    setFormData({ 
      name: "", age: "", imageUrl: "", 
      serviceStart: "22:00", serviceEnd: "04:00", 
      status: "offline", sortOrder: "0" 
    });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (girl: any) => {
    setFormData({
      name: girl.name,
      age: girl.age.toString(),
      imageUrl: girl.imageUrl,
      serviceStart: girl.serviceStart,
      serviceEnd: girl.serviceEnd,
      status: girl.status,
      sortOrder: (girl.sortOrder || 0).toString()
    });
    setEditingId(girl.id);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      age: parseInt(formData.age, 10),
      status: formData.status as 'online' | 'offline' | 'busy',
      sortOrder: parseInt(formData.sortOrder, 10) || 0
    };

    if (editingId) {
      updateGirl.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: "Updated successfully" });
            queryClient.invalidateQueries({ queryKey: getListAdminVideoCallGirlsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createGirl.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Created successfully" });
            queryClient.invalidateQueries({ queryKey: getListAdminVideoCallGirlsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this profile?")) {
      deleteGirl.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Deleted successfully" });
            queryClient.invalidateQueries({ queryKey: getListAdminVideoCallGirlsQueryKey() });
          }
        }
      );
    }
  };

  const statusColors = {
    online: "bg-green-500 text-white",
    busy: "bg-yellow-500 text-black",
    offline: "bg-neutral-600 text-white"
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Video Call Profiles</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Add Profile</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Profile" : "Add Profile"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} required />
                </div>
                <div className="col-span-1 space-y-2">
                  <Label>Age</Label>
                  <Input type="number" value={formData.age} onChange={e => setFormData(prev => ({...prev, age: e.target.value}))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={formData.imageUrl} onChange={e => setFormData(prev => ({...prev, imageUrl: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Start</Label>
                  <Input type="time" value={formData.serviceStart} onChange={e => setFormData(prev => ({...prev, serviceStart: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <Label>Service End</Label>
                  <Input type="time" value={formData.serviceEnd} onChange={e => setFormData(prev => ({...prev, serviceEnd: e.target.value}))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData(prev => ({...prev, status: v}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={formData.sortOrder} onChange={e => setFormData(prev => ({...prev, sortOrder: e.target.value}))} />
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createGirl.isPending || updateGirl.isPending}>
                Save Profile
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-16">Photo</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : girls?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">No profiles found</TableCell></TableRow>
            ) : (
              girls?.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((girl) => (
                <TableRow key={girl.id}>
                  <TableCell>
                    <img src={girl.imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%23222'/><text x='20' y='25' font-size='16' text-anchor='middle' fill='%23666'>?</text></svg>"} alt={girl.name} className="w-10 h-10 rounded-full object-cover bg-secondary" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{girl.name}, {girl.age}</div>
                    <div className="text-xs text-muted-foreground">{girl.totalFakeCalls || 0} calls</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {girl.serviceStart} - {girl.serviceEnd}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${statusColors[girl.status as keyof typeof statusColors]} border-0 uppercase text-[10px]`}>
                      {girl.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(girl)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(girl.id)}>
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
