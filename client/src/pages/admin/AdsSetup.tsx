import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Megaphone, 
  Save, 
  Sparkles, 
  Code, 
  Layout, 
  Eye, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  ExternalLink 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AdSettings {
  id?: number;
  enabled: boolean;
  hideForPremium: boolean;
  headerScript: string;
  popunderScript: string;
  topBanner: string;
  topBannerEnabled: boolean;
  bottomBanner: string;
  bottomBannerEnabled: boolean;
  feedBanner: string;
  feedBannerEnabled: boolean;
  monetagZoneId: string;
  directLinkUrl: string;
}

const defaultAds: AdSettings = {
  enabled: true,
  hideForPremium: true,
  headerScript: "",
  popunderScript: "",
  topBanner: "",
  topBannerEnabled: true,
  bottomBanner: "",
  bottomBannerEnabled: true,
  feedBanner: "",
  feedBannerEnabled: true,
  monetagZoneId: "",
  directLinkUrl: "",
};

export default function AdminAdsSetup() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("monetag");

  const [formData, setFormData] = useState<AdSettings>(defaultAds);

  const { data, isLoading } = useQuery<AdSettings>({
    queryKey: ["admin-ad-settings"],
    queryFn: async () => {
      const token = localStorage.getItem("dwe_admin_token");
      const res = await fetch("/api/admin/ads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch ad settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (data) {
      setFormData({
        enabled: data.enabled ?? true,
        hideForPremium: data.hideForPremium ?? true,
        headerScript: data.headerScript || "",
        popunderScript: data.popunderScript || "",
        topBanner: data.topBanner || "",
        topBannerEnabled: data.topBannerEnabled ?? true,
        bottomBanner: data.bottomBanner || "",
        bottomBannerEnabled: data.bottomBannerEnabled ?? true,
        feedBanner: data.feedBanner || "",
        feedBannerEnabled: data.feedBannerEnabled ?? true,
        monetagZoneId: data.monetagZoneId || "",
        directLinkUrl: data.directLinkUrl || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: AdSettings) => {
      const token = localStorage.getItem("dwe_admin_token");
      const res = await fetch("/api/admin/ads", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save ad settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ad-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-ad-settings"] });
      toast({
        title: "অ্যাড সেটিংস সংরক্ষিত হয়েছে!",
        description: "Ad network tags successfully updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "সংরক্ষণ ব্যর্থ হয়েছে",
        description: err?.message || "Could not save ad settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const insertSampleMonetag = () => {
    setFormData((prev) => ({
      ...prev,
      headerScript:
        '<script src="https://alwingulla.com/88/tag.min.js" data-zone="8912345" async data-cfasync="false"></script>',
      monetagZoneId: "8912345",
    }));
    toast({ title: "Monetag নমুনা ট্যাগ বসানো হয়েছে!" });
  };

  const insertSampleBanner = (slot: "top" | "bottom" | "feed") => {
    const sampleHtml = `<div style="text-align:center; padding:12px; background:linear-gradient(45deg,#1f1f2e,#2a2a3e); border-radius:10px; color:#fff; font-size:12px; font-weight:bold; border:1px solid rgba(255,255,255,0.1);">
  🚀 <span style="color:#f43f5e;">SPONSORED AD:</span> Join VIP Club for 100% Unlocked HD Videos & Live Calls!
  <br/>
  <a href="/packages" style="display:inline-block; margin-top:6px; background:#e11d48; color:#fff; padding:4px 14px; border-radius:6px; text-decoration:none; font-size:11px;">GET ACCESS NOW</a>
</div>`;

    if (slot === "top") setFormData((prev) => ({ ...prev, topBanner: sampleHtml }));
    if (slot === "bottom") setFormData((prev) => ({ ...prev, bottomBanner: sampleHtml }));
    if (slot === "feed") setFormData((prev) => ({ ...prev, feedBanner: sampleHtml }));

    toast({ title: "নমুনা ব্যানার বসানো হয়েছে!" });
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-black tracking-tight">Ads Setup (বিজ্ঞাপন কনফিগারেশন)</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Monetag, Adsterra বা যেকোনো নেটওয়ার্কের Ad Tag সহজে বসিয়ে লাইভ বিজ্ঞাপন চালু করুন।
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || isLoading}
            className="font-bold shadow-lg shadow-primary/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "Save All Ads (সংরক্ষণ করুন)"}
          </Button>
        </div>

        {/* Master Controls Card */}
        <Card className="border-primary/20 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Master Ad Controls (প্রধান নিয়ন্ত্রণ)
              </span>
              <Badge variant={formData.enabled ? "default" : "destructive"}>
                {formData.enabled ? "ADS ACTIVE (চলমান)" : "ADS DISABLED (বন্ধ)"}
              </Badge>
            </CardTitle>
            <CardDescription>
              সাইটের সব বিজ্ঞাপন এক ক্লিকে চালু বা বন্ধ করতে পারেন।
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <Label className="text-sm font-bold">Enable All Ads (সব বিজ্ঞাপন চালু রাখুন)</Label>
                <p className="text-xs text-muted-foreground">বন্ধ করলে সাইটে কোনো ব্যানার বা স্ক্রিপ্ট দেখাবে না।</p>
              </div>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, enabled: val }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <Label className="text-sm font-bold">Hide Ads for VIP/Premium Users (ভিআইপিদের বিজ্ঞাপন লুকান)</Label>
                <p className="text-xs text-muted-foreground">যারা প্যাকেজ কিনেছে তাদের জন্য ব্যানার ও পপআপ বন্ধ থাকবে।</p>
              </div>
              <Switch
                checked={formData.hideForPremium}
                onCheckedChange={(val) => setFormData((prev) => ({ ...prev, hideForPremium: val }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ad Setup Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-card/80 border border-white/5 p-1 rounded-xl">
            <TabsTrigger value="monetag" className="font-bold text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-400" />
              Monetag Setup
            </TabsTrigger>
            <TabsTrigger value="banners" className="font-bold text-xs sm:text-sm">
              <Layout className="w-4 h-4 mr-1.5 text-cyan-400" />
              Banner Ads (ব্যানার)
            </TabsTrigger>
            <TabsTrigger value="scripts" className="font-bold text-xs sm:text-sm">
              <Code className="w-4 h-4 mr-1.5 text-fuchsia-400" />
              Popunder / Scripts
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MONETAG EASY SETUP */}
          <TabsContent value="monetag" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Monetag Setup (মনেট্যাগ সহজে বসান)</CardTitle>
                    <CardDescription>
                      Monetag ড্যাশবোর্ড থেকে পাওয়া Script Tag ও Zone ID নিচে পেস্ট করুন।
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={insertSampleMonetag}
                    className="text-xs"
                  >
                    নমুনা Tag বসান
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-sm">
                      Default Rewarded/Unlock Zone ID (ডিফল্ট মনেট্যাগ জোন আইডি)
                    </Label>
                    <Badge variant="outline" className="text-[10px]">অটো ভিডিও আনলক</Badge>
                  </div>
                  <Input
                    placeholder="e.g. 8912345"
                    value={formData.monetagZoneId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, monetagZoneId: e.target.value.trim() }))}
                    className="font-mono bg-black/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    যেসব পোস্টে আলাদা Zone ID দেওয়া নেই, সেগুলো স্বয়ংক্রিয়ভাবে এই ডিফল্ট Zone ID ব্যবহার করে Ad Unlock চালু করবে।
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-sm">
                      Monetag MultiTag / In-Page Push Script (মনেট্যাগ স্ক্রিপ্ট ট্যাগ)
                    </Label>
                    <span className="text-xs text-muted-foreground">&lt;script&gt; ট্যাগ সরাসরি পেস্ট করুন</span>
                  </div>
                  <Textarea
                    rows={4}
                    placeholder={'<script src="https://alwingulla.com/88/tag.min.js" data-zone="8912345" async data-cfasync="false"></script>'}
                    value={formData.headerScript}
                    onChange={(e) => setFormData((prev) => ({ ...prev, headerScript: e.target.value }))}
                    className="font-mono text-xs bg-black/30 leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Monetag সাইট থেকে পাওয়া In-Page Push, Vignette Banner বা MultiTag কোডটি এখানে দিন। এটি ব্যবহারকারীর স্ক্রিনে স্বয়ংক্রিয়ভাবে লোড হবে।
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-sm">
                    Monetag Direct Link / SmartLink URL (ডিরেক্ট লিংক)
                  </Label>
                  <Input
                    placeholder="https://otieuwai.net/4/..."
                    value={formData.directLinkUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, directLinkUrl: e.target.value.trim() }))}
                    className="font-mono bg-black/20"
                  />
                  <p className="text-xs text-muted-foreground">
                    স্মার্টলিংক বা ডিরেক্ট লিংকের URL দিলে ব্যবহারকারীরা ক্লিক করলে সরাসরি এই অ্যাড লিংকে যেতে পারবে।
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: BANNER ADS */}
          <TabsContent value="banners" className="space-y-4">
            {/* Top Banner */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layout className="w-4 h-4 text-cyan-400" />
                      Top Banner Ad (উপরের ব্যানার)
                    </CardTitle>
                    <CardDescription>
                      হোম পেজ ও পোস্ট ডিটেইল পেজের একেবারে উপরে প্রদর্শিত হবে।
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertSampleBanner("top")}
                      className="text-xs h-8"
                    >
                      নমুনা ব্যানার
                    </Button>
                    <Switch
                      checked={formData.topBannerEnabled}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, topBannerEnabled: val }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder="<!-- Paste your 728x90 or 320x50 Banner HTML/Script Tag here -->"
                  value={formData.topBanner}
                  onChange={(e) => setFormData((prev) => ({ ...prev, topBanner: e.target.value }))}
                  className="font-mono text-xs bg-black/30"
                />
              </CardContent>
            </Card>

            {/* In-Feed Banner */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      In-Feed Banner Ad (পোস্টগুলোর মাঝে ব্যানার)
                    </CardTitle>
                    <CardDescription>
                      হোম পেজে পোস্টগুলোর মাঝখানে সুন্দরভাবে ফিট হবে।
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertSampleBanner("feed")}
                      className="text-xs h-8"
                    >
                      নমুনা ব্যানার
                    </Button>
                    <Switch
                      checked={formData.feedBannerEnabled}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, feedBannerEnabled: val }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder="<!-- Paste your 300x250 or native banner HTML/Script Tag here -->"
                  value={formData.feedBanner}
                  onChange={(e) => setFormData((prev) => ({ ...prev, feedBanner: e.target.value }))}
                  className="font-mono text-xs bg-black/30"
                />
              </CardContent>
            </Card>

            {/* Bottom Sticky Banner */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layout className="w-4 h-4 text-purple-400" />
                      Bottom Banner Ad (নিচের ব্যানার)
                    </CardTitle>
                    <CardDescription>
                      পেজের নিচে বা নেভবারের উপরে স্টিকি আকারে থাকবে।
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertSampleBanner("bottom")}
                      className="text-xs h-8"
                    >
                      নমুনা ব্যানার
                    </Button>
                    <Switch
                      checked={formData.bottomBannerEnabled}
                      onCheckedChange={(val) => setFormData((prev) => ({ ...prev, bottomBannerEnabled: val }))}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder="<!-- Paste your Bottom Banner HTML/Script Tag here -->"
                  value={formData.bottomBanner}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bottomBanner: e.target.value }))}
                  className="font-mono text-xs bg-black/30"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: POPUNDER & RAW SCRIPTS */}
          <TabsContent value="scripts" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Popunder & Custom Scripts (পপআন্ডার ও কাস্টম স্ক্রিপ্ট)</CardTitle>
                <CardDescription>
                  Adsterra, Google AdSense, PropellerAds বা যেকোনো নেটওয়ার্কের পপআন্ডার কোড এখানে বসান।
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold text-sm">
                    On-Click Popunder Script Tag (পপআন্ডার স্ক্রিপ্ট ট্যাগ)
                  </Label>
                  <Textarea
                    rows={5}
                    placeholder="<script type='text/javascript' src='//your-popunder-url.js'></script>"
                    value={formData.popunderScript}
                    onChange={(e) => setFormData((prev) => ({ ...prev, popunderScript: e.target.value }))}
                    className="font-mono text-xs bg-black/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    ব্যবহারকারী পেজে কোথাও ক্লিক করলে এই পপআন্ডার স্বয়ংক্রিয়ভাবে ট্রিগার হবে।
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Live Preview Box */}
        {(formData.topBanner || formData.feedBanner || formData.bottomBanner) && (
          <Card className="border-dashed border-primary/30 bg-card/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                Live Banner Preview (ব্যানার প্রিভিউ)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.topBanner && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase mb-1 font-semibold">Top Banner Preview:</div>
                  <div
                    dangerouslySetInnerHTML={{ __html: formData.topBanner }}
                    className="rounded-xl overflow-hidden bg-black/40 p-2 border border-white/5"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save button floating / bottom */}
        <div className="flex justify-end pt-2">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saveMutation.isPending || isLoading}
            className="w-full sm:w-auto font-bold px-8 shadow-xl shadow-primary/20"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "Save All Ads (সংরক্ষণ করুন)"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
