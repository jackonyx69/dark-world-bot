import { useEffect, useState } from "react";
import { 
  useListAdminUsers, useUpdateUserPremium,
  getListAdminUsersQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Edit, Crown, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>(() => {
    try {
      return new URLSearchParams(window.location.search).get("filter") || "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    try {
      const f = new URLSearchParams(window.location.search).get("filter");
      if (f) setFilter(f);
    } catch {
      // ignore
    }
  }, []);

  const { data: users, isLoading } = useListAdminUsers();
  const updatePremium = useUpdateUserPremium();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    isPremium: false,
    packageType: "",
    premiumExpiresAt: ""
  });

  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      isPremium: user.isPremium,
      packageType: user.packageType || "",
      premiumExpiresAt: user.premiumExpiresAt ? new Date(user.premiumExpiresAt).toISOString().split('T')[0] : ""
    });
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    // Auto-set package type if missing but premium is checked
    const pkgType = formData.isPremium && !formData.packageType ? "manual" : formData.packageType;
    
    updatePremium.mutate(
      { 
        id: editingUser.id, 
        data: { 
          isPremium: formData.isPremium,
          packageType: formData.isPremium ? pkgType : null,
          premiumExpiresAt: formData.isPremium && formData.premiumExpiresAt ? new Date(formData.premiumExpiresAt).toISOString() : null
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "User updated successfully" });
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
          setIsOpen(false);
        }
      }
    );
  };

  const filteredUsers = (users || []).filter((u) => {
    if (filter === "premium" && !u.isPremium) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.telegramId && u.telegramId.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.firstName && u.firstName.toLowerCase().includes(q))
    );
  });

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users Directory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users, view registration IDs and control premium access.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-secondary/40 p-1 rounded-lg border border-border">
            <Button
              type="button"
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="h-8 text-xs font-semibold"
            >
              All Users ({users?.length || 0})
            </Button>
            <Button
              type="button"
              variant={filter === "premium" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("premium")}
              className="h-8 text-xs font-semibold flex items-center gap-1"
            >
              <Crown className="w-3.5 h-3.5 text-yellow-500" />
              Premium ({users?.filter((u) => u.isPremium).length || 0})
            </Button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card border-border"
            />
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Premium Status</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="p-3 bg-secondary/50 rounded-lg mb-4">
                <div className="font-bold">{editingUser.firstName}</div>
                <div className="text-sm font-mono text-muted-foreground">{editingUser.telegramId}</div>
              </div>
              
              <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-lg border border-primary/20">
                <Switch 
                  id="premium" 
                  checked={formData.isPremium} 
                  onCheckedChange={v => setFormData(prev => ({...prev, isPremium: v}))} 
                />
                <Label htmlFor="premium" className="font-bold flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" /> Active Premium Member
                </Label>
              </div>

              {formData.isPremium && (
                <div className="grid gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Package / Tier Name</Label>
                    <Input 
                      value={formData.packageType} 
                      onChange={e => setFormData(prev => ({...prev, packageType: e.target.value}))} 
                      placeholder="e.g. VIP, Diamond, Manual" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Date</Label>
                    <Input 
                      type="date"
                      value={formData.premiumExpiresAt} 
                      onChange={e => setFormData(prev => ({...prev, premiumExpiresAt: e.target.value}))} 
                      required={formData.isPremium}
                    />
                  </div>
                </div>
              )}
              
              <Button type="submit" className="w-full mt-4" disabled={updatePremium.isPending}>
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Telegram ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Referrals</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filteredUsers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.firstName}</div>
                    <div className="text-xs text-muted-foreground">@{user.username || 'unknown'}</div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.telegramId}</TableCell>
                  <TableCell>
                    {user.isPremium ? (
                      <div className="flex flex-col items-start gap-1">
                        <Badge className="bg-primary hover:bg-primary text-primary-foreground border-0 text-[10px] uppercase">
                          {user.packageType || 'Premium'}
                        </Badge>
                        {user.premiumExpiresAt && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Exp: {new Date(user.premiumExpiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {user.referralCount || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(user)} className="text-xs font-medium">
                      <Edit className="w-3 h-3 mr-1" /> Manage
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
