import { useState } from "react";
import { 
  useListAdminPaymentMethods, useCreatePaymentMethod, 
  useUpdatePaymentMethod, useDeletePaymentMethod,
  getListAdminPaymentMethodsQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPaymentMethods() {
  const { data: methods, isLoading } = useListAdminPaymentMethods();
  const createMethod = useCreatePaymentMethod();
  const updateMethod = useUpdatePaymentMethod();
  const deleteMethod = useDeletePaymentMethod();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    type: "local",
    emoji: "",
    name: "",
    logoUrl: "",
    phoneNumber: "",
    isActive: true
  });

  const resetForm = () => {
    setFormData({ type: "local", emoji: "", name: "", logoUrl: "", phoneNumber: "", isActive: true });
    setEditingId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (method: any) => {
    setFormData({
      type: method.type,
      emoji: method.emoji || "",
      name: method.name,
      logoUrl: method.logoUrl || "",
      phoneNumber: method.phoneNumber,
      isActive: method.isActive
    });
    setEditingId(method.id);
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMethod.mutate(
        { id: editingId, data: formData as any },
        {
          onSuccess: () => {
            toast({ title: "Payment method updated" });
            queryClient.invalidateQueries({ queryKey: getListAdminPaymentMethodsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    } else {
      createMethod.mutate(
        { data: formData as any },
        {
          onSuccess: () => {
            toast({ title: "Payment method created" });
            queryClient.invalidateQueries({ queryKey: getListAdminPaymentMethodsQueryKey() });
            setIsOpen(false);
          }
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this payment method?")) {
      deleteMethod.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Payment method deleted" });
            queryClient.invalidateQueries({ queryKey: getListAdminPaymentMethodsQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}><Plus className="w-4 h-4 mr-2" /> Add Method</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(prev => ({...prev, type: v}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (BD)</SelectItem>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label>Emoji</Label>
                  <Input value={formData.emoji} onChange={e => setFormData(prev => ({...prev, emoji: e.target.value}))} placeholder="📱" />
                </div>
                <div className="col-span-3 space-y-2">
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={e => setFormData(prev => ({...prev, name: e.target.value}))} placeholder="bKash / PayPal" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Account / Phone Number</Label>
                <Input value={formData.phoneNumber} onChange={e => setFormData(prev => ({...prev, phoneNumber: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label>Logo URL (Optional)</Label>
                <Input value={formData.logoUrl} onChange={e => setFormData(prev => ({...prev, logoUrl: e.target.value}))} />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  id="active" 
                  checked={formData.isActive} 
                  onCheckedChange={v => setFormData(prev => ({...prev, isActive: v}))} 
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <Button type="submit" className="w-full mt-4" disabled={createMethod.isPending || updateMethod.isPending}>
                Save Payment Method
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : methods?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">No payment methods found</TableCell></TableRow>
            ) : (
              methods?.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="text-xl text-center">{method.emoji}</TableCell>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{method.type}</TableCell>
                  <TableCell className="font-mono">{method.phoneNumber}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded-full ${method.isActive ? 'bg-green-500/20 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                      {method.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(method)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(method.id)}>
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
