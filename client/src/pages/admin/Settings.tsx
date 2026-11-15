import { useState, useEffect, useRef } from "react";
import { 
  useGetSettings, useUpdateSettings, 
  useListReferralSettings, useCreateReferralSetting, 
  useDeleteReferralSetting, getListReferralSettingsQueryKey,
  useChangeAdminPassword, useImportAdminSettings, useResetAdminSettings,
  useTestAdminMongoDb, useUploadAdminFile,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Trash2, Plus, ShieldCheck, Database, Wrench, Download, Upload, RotateCcw, Image as ImageIcon, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useGetSettings();
  const { data: refTiers, isLoading: tiersLoading } = useListReferralSettings();
  
  const updateSettings = useUpdateSettings();
  const createTier = useCreateReferralSetting();
  const deleteTier = useDeleteReferralSetting();
  const changePassword = useChangeAdminPassword();
  const importSettings = useImportAdminSettings();
  const resetSettings = useResetAdminSettings();
  const testMongo = useTestAdminMongoDb();
  const uploadFile = useUploadAdminFile();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    chatId: "",
    premiumGroupLink: "",
    siteName: "",
    siteLogo: "",
    primaryColor: "",
    secondaryColor: "",
    channelLink: "",
    groupLink: "",
    supportLink: "",
    telegramUsername: "",
    enableNotice: false,
    noticeText: "",
    paymentInstructions: "",
    enableReferral: true,
    postgresEnabled: true,
    mongodbEnabled: false,
    mongodbUri: "",
    mongodbDatabaseName: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    faviconUrl: "",
    webhookUrl: "",
  });

  const [newTier, setNewTier] = useState({ friendsCount: "", freeDays: "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showMongoUri, setShowMongoUri] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        chatId: settings.chatId || "",
        premiumGroupLink: settings.premiumGroupLink || "",
        siteName: settings.siteName || "",
        siteLogo: settings.siteLogo || "",
        primaryColor: settings.primaryColor || "",
        secondaryColor: settings.secondaryColor || "",
        channelLink: settings.channelLink || "",
        groupLink: settings.groupLink || "",
        supportLink: settings.supportLink || "",
        telegramUsername: settings.telegramUsername || "",
        enableNotice: settings.enableNotice ?? false,
        noticeText: settings.noticeText || "",
        paymentInstructions: settings.paymentInstructions || "",
        enableReferral: settings.enableReferral ?? true,
        postgresEnabled: settings.postgresEnabled ?? true,
        mongodbEnabled: settings.mongodbEnabled ?? false,
        mongodbUri: settings.mongodbUri || "",
        mongodbDatabaseName: settings.mongodbDatabaseName || "",
        maintenanceMode: settings.maintenanceMode ?? false,
        maintenanceMessage: settings.maintenanceMessage || "",
        faviconUrl: settings.faviconUrl || "",
        webhookUrl: settings.webhookUrl || "",
      });
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings.mutate(
      { data: formData as any },
      {
        onSuccess: () => {
          toast({ title: "Settings updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        },
        onError: () => toast({
          title: "Could not update settings",
          description: "Please check the values and try again.",
          variant: "destructive",
        }),
      }
    );
  };

  const handleAddTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTier.friendsCount || !newTier.freeDays) return;
    
    createTier.mutate(
      { 
        data: { 
          friendsCount: parseInt(newTier.friendsCount, 10), 
          freeDays: parseInt(newTier.freeDays, 10) 
        } 
      },
      {
        onSuccess: () => {
          setNewTier({ friendsCount: "", freeDays: "" });
          toast({ title: "Tier added" });
          queryClient.invalidateQueries({ queryKey: getListReferralSettingsQueryKey() });
        },
        onError: () => toast({ title: "Could not add tier", variant: "destructive" }),
      }
    );
  };

  const handleDeleteTier = (id: number) => {
    deleteTier.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Tier deleted" });
          queryClient.invalidateQueries({ queryKey: getListReferralSettingsQueryKey() });
        },
        onError: () => toast({ title: "Could not delete tier", variant: "destructive" }),
      }
    );
  };

  const handleChangePassword = (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordData.newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    changePassword.mutate({ data: passwordData }, {
      onSuccess: () => {
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast({ title: "Admin password changed securely" });
      },
      onError: () => toast({ title: "Could not change password", description: "Check the current password and try again.", variant: "destructive" }),
    });
  };

  const downloadSettings = async () => {
    const response = await fetch("/api/admin/settings/export", {
      headers: { Authorization: `Bearer ${localStorage.getItem("dwe_admin_token")}` },
    });
    if (!response.ok) {
      toast({ title: "Settings export failed", variant: "destructive" });
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dark-would-expose-settings.json";
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Settings exported" });
  };

  const handleImportSettings = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        importSettings.mutate({ data: { settings: parsed.settings || parsed } }, {
          onSuccess: () => {
            toast({ title: "Settings imported" });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
          },
          onError: () => toast({ title: "Settings import failed", variant: "destructive" }),
        });
      } catch {
        toast({ title: "Choose a valid JSON settings file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const handleBrandUpload = (file: File | undefined, field: "siteLogo" | "faviconUrl") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadFile.mutate({ data: { filename: file.name, mimeType: file.type, data: reader.result } }, {
        onSuccess: (result) => {
          setFormData((previous) => ({ ...previous, [field]: result.url }));
          toast({ title: `${field === "siteLogo" ? "Logo" : "Favicon"} uploaded` });
        },
        onError: () => toast({ title: "Image upload failed", variant: "destructive" }),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {settingsLoading ? (
        <Card className="border-border mb-6">
          <CardContent className="py-10 text-center text-muted-foreground">Loading settings...</CardContent>
        </Card>
      ) : settingsError ? (
        <Card className="border-destructive/40 mb-6">
          <CardContent className="py-6 text-center text-destructive">
            Could not load settings. Refresh the page and try again.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>General Configuration</CardTitle>
            <CardDescription>System-wide settings and integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Telegram Bot Token</Label>
              <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                {settings?.botToken === "[configured]"
                  ? "Token is configured in Replit Secrets. Use Operations → Test bot to check the connection."
                  : "Add TELEGRAM_BOT_TOKEN in Replit Secrets to enable bot features."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Admin Chat ID (for notifications)</Label>
              <Input 
                value={formData.chatId} 
                onChange={e => setFormData(prev => ({...prev, chatId: e.target.value}))} 
              />
            </div>
            <div className="space-y-2">
              <Label>Premium Group/Channel Link</Label>
              <Input 
                value={formData.premiumGroupLink} 
                onChange={e => setFormData(prev => ({...prev, premiumGroupLink: e.target.value}))} 
                placeholder="https://t.me/..." 
              />
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input value={formData.siteName} onChange={e => setFormData(prev => ({ ...prev, siteName: e.target.value }))} placeholder="Dark Would Expose" />
            </div>
            <div className="space-y-2">
              <Label>Site Logo URL</Label>
              <Input value={formData.siteLogo} onChange={e => setFormData(prev => ({ ...prev, siteLogo: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Input value={formData.primaryColor} onChange={e => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))} placeholder="#ef2b5f" />
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <Input value={formData.secondaryColor} onChange={e => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))} placeholder="#7c3aed" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Channel Link</Label>
                <Input value={formData.channelLink} onChange={e => setFormData(prev => ({ ...prev, channelLink: e.target.value }))} placeholder="https://t.me/..." />
              </div>
              <div className="space-y-2">
                <Label>Group Link</Label>
                <Input value={formData.groupLink} onChange={e => setFormData(prev => ({ ...prev, groupLink: e.target.value }))} placeholder="https://t.me/..." />
              </div>
              <div className="space-y-2">
                <Label>Support Link</Label>
                <Input value={formData.supportLink} onChange={e => setFormData(prev => ({ ...prev, supportLink: e.target.value }))} placeholder="https://t.me/..." />
              </div>
              <div className="space-y-2">
                <Label>Content Admin Telegram Username</Label>
                <Input
                  value={formData.telegramUsername}
                  onChange={e => setFormData(prev => ({ ...prev, telegramUsername: e.target.value.replace(/^https?:\/\/t\.me\//, "") }))}
                  placeholder="@your_username"
                />
                <p className="text-xs text-muted-foreground">This appears as the Content Admin button on the Home screen.</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Public Notice</Label>
                <div className="text-sm text-muted-foreground">Show a notice banner on the home screen.</div>
              </div>
              <Switch checked={formData.enableNotice} onCheckedChange={v => setFormData(prev => ({ ...prev, enableNotice: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Notice Text</Label>
              <Input value={formData.noticeText} onChange={e => setFormData(prev => ({ ...prev, noticeText: e.target.value }))} placeholder="Important announcement..." />
            </div>

              <div className="space-y-2">
                <Label>Payment Instructions</Label>
                <Textarea
                  value={formData.paymentInstructions}
                  onChange={e => setFormData(prev => ({ ...prev, paymentInstructions: e.target.value }))}
                  placeholder={"উপরের নম্বরে Send Money করতে হবে। Cash In করবেন না.\nSend Money সম্পন্ন করার পর Sender Number এবং Transaction ID দিন।"}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">এই লেখা Checkout পেজে পেমেন্ট নম্বরের নিচে দেখা যাবে। নতুন লাইনে লিখলে Checkout-এও নতুন লাইনে দেখা যাবে।</p>
              </div>
            
            <Separator className="my-4" />
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Referral System</Label>
                <div className="text-sm text-muted-foreground">Enable users to earn free days by inviting friends.</div>
              </div>
              <Switch 
                checked={formData.enableReferral} 
                onCheckedChange={v => setFormData(prev => ({...prev, enableReferral: v}))} 
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full mt-4" disabled={updateSettings.isPending || settingsLoading || settingsError}>
              <Save className="w-4 h-4 mr-2" /> {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Referral Tiers */}
        <Card className={`border-border ${!formData.enableReferral ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle>Referral Rewards Tiers</CardTitle>
            <CardDescription>Configure how many friends unlock how many free days</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTier} className="flex items-end gap-2 mb-6">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Friends Count</Label>
                <Input type="number" required value={newTier.friendsCount} onChange={e => setNewTier(prev => ({...prev, friendsCount: e.target.value}))} placeholder="e.g. 5" />
              </div>
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Free Days Reward</Label>
                <Input type="number" required value={newTier.freeDays} onChange={e => setNewTier(prev => ({...prev, freeDays: e.target.value}))} placeholder="e.g. 1" />
              </div>
              <Button type="submit" size="icon" disabled={createTier.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/50">
                  <TableRow>
                    <TableHead>Friends Required</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiersLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-4">Loading tiers...</TableCell></TableRow>
                  ) : refTiers?.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-4">No tiers configured</TableCell></TableRow>
                  ) : (
                    refTiers?.slice().sort((a,b) => a.friendsCount - b.friendsCount).map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-bold">{tier.friendsCount} friends</TableCell>
                        <TableCell className="text-primary font-bold">+{tier.freeDays} days</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTier(tier.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Security</CardTitle>
            <CardDescription>Change the admin password without exposing or storing plaintext credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input type="password" required placeholder="Current password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
              <Input type="password" required minLength={8} placeholder="New password (8+ characters)" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
              <Input type="password" required minLength={8} placeholder="Confirm new password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
              <Button type="submit" disabled={changePassword.isPending}><ShieldCheck className="w-4 h-4 mr-2" />{changePassword.isPending ? "Changing..." : "Change password"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" />Maintenance mode</CardTitle>
            <CardDescription>Normal users see the maintenance message; authenticated Admin routes remain available.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Enable maintenance mode</Label>
              <Switch checked={formData.maintenanceMode} onCheckedChange={(value) => setFormData({ ...formData, maintenanceMode: value })} />
            </div>
            <Input placeholder="Maintenance message" value={formData.maintenanceMessage} onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })} />
            <Button variant="outline" onClick={handleSaveSettings} disabled={updateSettings.isPending}><Save className="w-4 h-4 mr-2" />Save maintenance settings</Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" />Branding & Telegram webhook</CardTitle>
            <CardDescription>Upload and preview the logo/favicon, then set the public HTTPS URL that Telegram will use for bot updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Logo</Label>
                {formData.siteLogo && <img src={formData.siteLogo} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border border-border" />}
                <Input type="file" accept="image/*" onChange={(e) => handleBrandUpload(e.target.files?.[0], "siteLogo")} />
                <Input placeholder="Logo URL" value={formData.siteLogo} onChange={(e) => setFormData({ ...formData, siteLogo: e.target.value })} />
                {formData.siteLogo && <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, siteLogo: "" })}>Remove logo</Button>}
              </div>
              <div className="space-y-2">
                <Label>Favicon</Label>
                {formData.faviconUrl && <img src={formData.faviconUrl} alt="Favicon preview" className="h-12 w-12 rounded-lg object-cover border border-border" />}
                <Input type="file" accept="image/*" onChange={(e) => handleBrandUpload(e.target.files?.[0], "faviconUrl")} />
                <Input placeholder="Favicon URL" value={formData.faviconUrl} onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })} />
                {formData.faviconUrl && <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, faviconUrl: "" })}>Remove favicon</Button>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telegram webhook URL</Label>
              <Input placeholder="https://your-public-domain/api/telegram/webhook" value={formData.webhookUrl} onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })} />
              <p className="text-xs text-muted-foreground">Use the app's public HTTPS URL ending in /api/telegram/webhook. The Mini App launch URL is derived from this address. Save it, then register the webhook under Operations.</p>
            </div>
            <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}><Save className="w-4 h-4 mr-2" />Save branding & webhook URL</Button>
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardHeader><CardTitle>Settings portability</CardTitle><CardDescription>Export a JSON copy, import compatible settings, or reset non-secret settings to defaults.</CardDescription></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadSettings}><Download className="w-4 h-4 mr-2" />Export settings</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()} disabled={importSettings.isPending}><Upload className="w-4 h-4 mr-2" />Import settings</Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => handleImportSettings(e.target.files?.[0])} />
             <Button variant="destructive" onClick={() => resetSettings.mutate(undefined, { onSuccess: (result) => { setFormData((previous) => ({ ...previous, chatId: result.chatId || "", premiumGroupLink: result.premiumGroupLink || "", siteName: result.siteName || "", siteLogo: result.siteLogo || "", primaryColor: result.primaryColor || "", secondaryColor: result.secondaryColor || "", channelLink: result.channelLink || "", groupLink: result.groupLink || "", supportLink: result.supportLink || "", telegramUsername: result.telegramUsername || "", enableNotice: result.enableNotice ?? false, noticeText: result.noticeText || "", paymentInstructions: result.paymentInstructions || "", enableReferral: result.enableReferral ?? true, postgresEnabled: result.postgresEnabled ?? true, mongodbEnabled: result.mongodbEnabled ?? false, mongodbUri: result.mongodbUri || "", mongodbDatabaseName: result.mongodbDatabaseName || "", maintenanceMode: result.maintenanceMode ?? false, maintenanceMessage: result.maintenanceMessage || "", faviconUrl: result.faviconUrl || "", webhookUrl: result.webhookUrl || "" })); toast({ title: "Settings reset" }); }, onError: () => toast({ title: "Reset failed", variant: "destructive" }) })} disabled={resetSettings.isPending}><RotateCcw className="w-4 h-4 mr-2" />Reset settings</Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
