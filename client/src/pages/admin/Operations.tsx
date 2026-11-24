import { useState } from "react";
import {
  useGetAdminAnalytics,
  useGetAdminDatabaseStatus,
  useClearAdminCache,
  useRegisterAdminWebhook,
  useRemoveAdminWebhook,
  useGetAdminWebhookStatus,
  useTestAdminBotConnection,
  useTestAdminMiniAppConnection,
  useListAdminActivity,
  useBroadcastAdminMessage,
  useUploadAdminFile,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Database, RefreshCw, Send, Webhook, Download, Upload, Search, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminOperations() {
  const { data: analytics, isLoading: analyticsLoading } = useGetAdminAnalytics();
  const { data: dbStatus, refetch: refetchDb } = useGetAdminDatabaseStatus();
  const clearCache = useClearAdminCache();
  const registerWebhook = useRegisterAdminWebhook();
  const removeWebhook = useRemoveAdminWebhook();
  const webhookStatus = useGetAdminWebhookStatus();
  const testBot = useTestAdminBotConnection();
  const testMiniApp = useTestAdminMiniAppConnection();
  const broadcast = useBroadcastAdminMessage();
  const uploadFile = useUploadAdminFile();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("users");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityAction, setActivityAction] = useState("");
  const { data: activity } = useListAdminActivity({
    search: activitySearch || undefined,
    action: activityAction || undefined,
    limit: 50,
    offset: 0,
  });

  const notify = (title: string, description?: string, destructive = false) =>
    toast({ title, description, variant: destructive ? "destructive" : "default" });

  const getOperationError = (error: unknown, fallback: string) => {
    const data = (error as { data?: unknown } | null)?.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string" && message.trim()) return message;
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message.replace(/^HTTP \d+ [^:]+:\s*/, "");
    }
    return fallback;
  };

  const clearSystemCache = async () => {
    try {
      await clearCache.mutateAsync();
      if ("caches" in window) {
        const cacheNames = await window.caches.keys();
        await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
      }
      await Promise.all([refetchDb(), webhookStatus.refetch()]);
      notify("System cache cleared", "Server cache marker and this browser's cached app files were cleared.");
    } catch (error) {
      notify("Cache clear failed", getOperationError(error, "Could not clear the system cache."), true);
    }
  };

  const downloadBackup = async () => {
    try {
      const token = localStorage.getItem("dwe_admin_token");
      const response = await fetch("/api/admin/backup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let message = "Could not create the database backup.";
        try {
          const result = await response.json() as { error?: string };
          message = result.error || message;
        } catch {
          // Keep the user-facing fallback when the server does not return JSON.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dark-would-expose-backup.json";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      await refetchDb();
      notify("Backup downloaded", "Your JSON backup file is ready.");
    } catch (error) {
      notify("Backup failed", getOperationError(error, "Could not download the database backup."), true);
    }
  };

  const restoreBackup = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const backup = JSON.parse(String(reader.result));
        const response = await fetch("/api/admin/backup/restore", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("dwe_admin_token")}`,
          },
          body: JSON.stringify({ backup }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Restore failed");
        notify("Backup restored without replacing existing rows");
        refetchDb();
      } catch (error) {
        notify(error instanceof Error ? error.message : "Backup restore failed");
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      notify("File must be 25MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      uploadFile.mutate(
        {
          data: {
            filename: file.name,
            mimeType: file.type,
            data: reader.result,
          },
        },
        {
          onSuccess: (result) => {
            setUploadedUrl(result.url);
            notify("File uploaded");
          },
          onError: () => notify("Upload failed"),
        },
      );
    };
    reader.readAsDataURL(file);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Operations</h1>
          <p className="text-sm text-muted-foreground">Original admin maintenance, analytics and broadcast controls.</p>
        </div>
        <Button variant="outline" onClick={() => refetchDb()}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          ["Posts", analytics?.totalPosts],
          ["Users", analytics?.totalUsers],
          ["Views", analytics?.totalViews],
          ["Revenue", analytics?.revenue],
          ["Premium users", analytics?.premiumUsers],
          ["Pending payments", analytics?.pendingPayments],
          ["Approved payments", analytics?.approvedPayments],
        ].map(([label, value]) => (
          <Card key={String(label)}><CardContent className="p-4"><div className="text-2xl font-black">{analyticsLoading ? "…" : value}</div><div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-4 h-4" /> Database status</CardTitle><CardDescription>Protected operational health check.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
             <div className="flex items-center gap-2"><Badge variant={dbStatus?.connected ? "default" : "destructive"}>{dbStatus?.connected ? "Connected" : "Unavailable"}</Badge><span className="text-sm">{dbStatus?.provider || "Checking…"}</span></div>
             <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
               <span>Users: {dbStatus?.users ?? "—"}</span>
               <span>Tables: {dbStatus?.totalTables ?? "—"}</span>
               <span>Version: {dbStatus?.version ?? "—"}</span>
               <span>Size: {dbStatus?.size ?? "—"}</span>
               <span>Connections: {dbStatus?.activeConnections ?? "—"}</span>
               <span>Last backup: {dbStatus?.lastBackupAt ? new Date(dbStatus.lastBackupAt).toLocaleString() : "—"}</span>
             </div>
             <div className="flex flex-wrap gap-2">
               <Button variant="outline" onClick={clearSystemCache} disabled={clearCache.isPending}><RefreshCw className="w-4 h-4 mr-2" />{clearCache.isPending ? "Clearing…" : "Clear cache"}</Button>
                <Button variant="outline" onClick={() => registerWebhook.mutate(undefined, { onSuccess: () => { notify("Webhook registered"); webhookStatus.refetch(); }, onError: (error) => notify("Webhook registration failed", getOperationError(error, "Could not register the webhook."), true) })} disabled={registerWebhook.isPending}><Webhook className="w-4 h-4 mr-2" />{registerWebhook.isPending ? "Registering…" : "Register webhook"}</Button>
                <Button variant="outline" onClick={() => removeWebhook.mutate(undefined, { onSuccess: () => { notify("Webhook removed"); webhookStatus.refetch(); }, onError: (error) => notify("Webhook removal failed", getOperationError(error, "Could not remove the webhook."), true) })} disabled={removeWebhook.isPending}>{removeWebhook.isPending ? "Removing…" : "Remove webhook"}</Button>
                <Button variant="outline" onClick={() => testBot.mutate(undefined, { onSuccess: (result) => notify(result.message, result.connected ? undefined : "Configure Telegram settings before testing the bot.", !result.connected), onError: (error) => notify("Bot connection test failed", getOperationError(error, "Could not reach Telegram."), true) })} disabled={testBot.isPending}><ShieldCheck className="w-4 h-4 mr-2" />{testBot.isPending ? "Testing…" : "Test bot"}</Button>
                <Button variant="outline" onClick={() => testMiniApp.mutate(undefined, { onSuccess: (result) => notify(result.message, result.connected ? undefined : "Configure Telegram settings before testing the Mini App.", !result.connected), onError: (error) => notify("Mini App test failed", getOperationError(error, "Could not reach Telegram."), true) })} disabled={testMiniApp.isPending}>{testMiniApp.isPending ? "Testing…" : "Test Mini App"}</Button>
               <Button variant="outline" onClick={downloadBackup} disabled={false}><Download className="w-4 h-4 mr-2" />Backup database</Button>
               <label className="inline-flex items-center cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-secondary"><Upload className="w-4 h-4 mr-2" />Restore JSON<input type="file" accept="application/json,.json" className="hidden" onChange={(event) => restoreBackup(event.target.files?.[0])} /></label>
            </div>
              <p className="text-xs text-muted-foreground">
                Webhook: {webhookStatus.data?.registered ? `registered at ${webhookStatus.data.url}` : "not registered"}
                {!webhookStatus.data?.registered && " · Set the public HTTPS URL ending in /api/telegram/webhook in Settings, then register it here. The bot will answer /start with the Mini App button."}
              </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-4 h-4" /> Telegram broadcast</CardTitle><CardDescription>Send to all registered users or the configured channel.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Label className="sr-only" htmlFor="broadcast-target">Target</Label>
              <select id="broadcast-target" value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="users">All users</option><option value="channel">Channel</option></select>
            </div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="HTML message…" rows={5} />
            <Button disabled={!message.trim() || broadcast.isPending} onClick={() => broadcast.mutate({ data: { message, target } }, { onSuccess: (result) => { setMessage(""); notify(`Broadcast finished: ${result.sent} sent, ${result.failed} failed`); }, onError: () => notify("Broadcast failed") })}><Send className="w-4 h-4 mr-2" />Send broadcast</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="w-4 h-4" /> Admin file upload</CardTitle><CardDescription>Upload validated images or videos for posts, profiles and gallery items.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="admin-upload" className="block cursor-pointer rounded-lg border border-dashed border-border p-6 text-center hover:border-primary transition-colors">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm">{uploadFile.isPending ? "Uploading…" : "Choose image or video"}</span>
              <input id="admin-upload" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" className="sr-only" disabled={uploadFile.isPending} onChange={(event) => handleUpload(event.target.files?.[0])} />
            </Label>
            {uploadedUrl && (
              <div className="rounded-md bg-muted p-3 text-xs break-all">
                <div className="font-medium mb-1">Uploaded URL</div>
                <button className="text-primary underline text-left" onClick={() => navigator.clipboard?.writeText(uploadedUrl)}>{uploadedUrl}</button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Admin activity log</CardTitle>
            <CardDescription>Search and filter all recorded admin changes, authentication events, backups and broadcasts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_220px] gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input value={activitySearch} onChange={(event) => setActivitySearch(event.target.value)} placeholder="Search action, admin or IP..." className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
              </div>
              <select value={activityAction} onChange={(event) => setActivityAction(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All actions</option>
                <option>Admin Login</option>
                <option>Password Changed</option>
                <option>Settings Changed</option>
                <option>Webhook Registered</option>
                <option>Database Restore</option>
                <option>Broadcast Sent</option>
              </select>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/50"><tr><th className="p-2">Time</th><th className="p-2">Action</th><th className="p-2">Admin</th><th className="p-2">Request</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {activity?.items?.length ? activity.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="p-2 font-medium">{item.action}</td>
                      <td className="p-2">{item.admin}</td>
                      <td className="p-2 text-muted-foreground">{item.method || ""} {item.path || ""}</td>
                      <td className="p-2">{item.statusCode || "—"}</td>
                    </tr>
                  )) : <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No activity matches these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}