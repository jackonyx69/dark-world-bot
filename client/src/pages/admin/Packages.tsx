import { useState } from "react";
import { 
  useListAdminPackages, useCreatePackage, 
  useUpdatePackage, useDeletePackage,
  getListAdminPackagesQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPackages() {
  const { data: packages, isLoading } = useListAdminPackages();
  const createPackage = useCreatePackage();
  const updatePackage = useUpdatePackage();
  const deletePackage = useDeletePackage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    priceBdt: "",
    priceGbp: "",
    duration: "30",
    durationUnit: "days",
    features: "",
    videoCallAccess: false,
    isActive: true,
    sortOrder: "0"
  });

  const resetForm = () => {
    setFormData({ 
      name: "", priceBdt: "", priceGbp: "", 
      duration: "30", durationUnit: "days", 
      features: "", videoCallAccess: false, 
      isActive: true, sortOrder: "0" 
    });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setFormData({
      name: pkg.name,
      priceBdt: pkg.priceBdt.toString(),
      priceGbp: pkg.priceGbp.toString(),
      duration: pkg.duration.toString(),
      durationUnit: pkg.durationUnit,
      features: pkg.features || "",
      videoCallAccess: pkg.videoCallAccess || false,
      isActive: pkg.isActive,
      sortOrder: (pkg.sortOrder || 0).toString()
    });
    setEditingId(pkg.id);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      priceBdt: parseInt(formData.priceBdt, 10),
      priceGbp: parseInt(formData.priceGbp, 10),
      duration: parseInt(formData.duration, 10),
      sortOrder: parseInt(formData.sortOrder, 10) || 0
    };

    if (editingId) {
      updatePackage.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: "Package updated" });
            queryClient.invalidateQueries({ queryKey: getListAdminPackagesQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createPackage.mutate(
        { data },
        {
          onSuccess: () => {
            toast({ title: "Package created" });
            queryClient.invalidateQueries({ queryKey: getListAdminPackagesQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this package?")) {
      deletePackage.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Package deleted" });
            queryClient.invalidateQueries({ queryKey: getListAdminPackagesQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Packages</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Add Package</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Package" : "Add New Package"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (BDT)</Label>
                  <Input type="number" value={formData.priceBdt} onChange={e => setFormData(prev => ({...prev, priceBdt: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <Label>Price (GBP in cents, e.g. 500 = £5.00)</Label>
                  <Input type="number" value={formData.priceGbp} onChange={e => setFormData(prev => ({...prev, priceGbp: e.target.value}))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input type="number" value={formData.duration} onChange={e => setFormData(prev => ({...prev, duration: e.target.value}))} required />
                </div>
                <div className="space-y-2">
                  <Label>Duration Unit</Label>
                  <Select value={formData.durationUnit} onValueChange={v => setFormData(prev => ({...prev, durationUnit: v}))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Features (One per line)</Label>
                <Textarea value={formData.features} onChange={e => setFormData(prev => ({...prev, features: e.target.value}))} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sortOrder} onChange={e => setFormData(prev => ({...prev, sortOrder: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch id="vc-access" checked={formData.videoCallAccess} onCheckedChange={v => setFormData(prev => ({...prev, videoCallAccess: v}))} />
                  <Label htmlFor="vc-access">Video Call Access</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="active" checked={formData.isActive} onCheckedChange={v => setFormData(prev => ({...prev, isActive: v}))} />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createPackage.isPending || updatePackage.isPending}>
                Save Package
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-center">VIP Calls</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : packages?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No packages found</TableCell></TableRow>
            ) : (
              packages?.sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">৳{pkg.priceBdt}</div>
                    <div className="text-xs text-muted-foreground">£{(pkg.priceGbp / 100).toFixed(2)}</div>
                  </TableCell>
                  <TableCell>{pkg.duration} {pkg.durationUnit}</TableCell>
                  <TableCell className="text-center">
                    {pkg.videoCallAccess && <Check className="w-4 h-4 mx-auto text-primary" />}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${pkg.isActive ? 'bg-green-500/20 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(pkg)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pkg.id)}>
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
