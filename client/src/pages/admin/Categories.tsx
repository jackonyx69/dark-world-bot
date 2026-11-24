import { useState } from "react";
import { 
  useListAdminCategories, useCreateCategory, 
  useUpdateCategory, useDeleteCategory,
  getListAdminCategoriesQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminCategories() {
  const { data: categories, isLoading } = useListAdminCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    createCategory.mutate(
      { data: { name: newName } },
      {
        onSuccess: () => {
          setNewName("");
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });
        }
      }
    );
  };

  const startEdit = (id: number, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleUpdate = (id: number) => {
    if (!editName) return;
    updateCategory.mutate(
      { id, data: { name: editName } },
      {
        onSuccess: () => {
          setEditingId(null);
          toast({ title: "Category updated" });
          queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this category?")) {
      deleteCategory.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Category deleted" });
            queryClient.invalidateQueries({ queryKey: getListAdminCategoriesQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Categories</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Add New Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="Category Name" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                  />
                  <div className="text-xs text-muted-foreground">
                    Slug: {newName ? newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : 'auto-generated'}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!newName || createCategory.isPending}>
                  Add Category
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-center">Posts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : categories?.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">No categories found</TableCell></TableRow>
                ) : (
                  categories?.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        {editingId === cat.id ? (
                          <Input 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)} 
                            className="h-8 w-full max-w-[200px]"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium">{cat.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="text-center">{cat.postCount}</TableCell>
                      <TableCell className="text-right">
                        {editingId === cat.id ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-500" onClick={() => handleUpdate(cat.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={cancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(cat.id, cat.name)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
