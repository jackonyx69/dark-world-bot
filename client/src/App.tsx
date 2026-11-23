import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useGetPublicSettings, useGetMe, useRegisterUser } from "@workspace/api-client-react";
import { getStoredValue, setStoredValue, getBrowserUserId } from "@/lib/storage";
import NotFound from "@/pages/not-found";

// Import real pages
import Home from "@/pages/Home";
import Free from "@/pages/Free";
import Paid from "@/pages/Paid";
import PostDetail from "@/pages/PostDetail";
import Checkout from "@/pages/Checkout";
import VideoCall from "@/pages/VideoCall";
import FakeCall from "@/pages/FakeCall";
import Referral from "@/pages/Referral";
import Gallery from "@/pages/Gallery";

// Admin pages
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminPosts from "@/pages/admin/Posts";
import AdminPostForm from "@/pages/admin/PostForm";
import AdminCategories from "@/pages/admin/Categories";
import AdminSocialLinks from "@/pages/admin/SocialLinks";
import AdminPackages from "@/pages/admin/Packages";
import AdminPaymentMethods from "@/pages/admin/PaymentMethods";
import AdminPayments from "@/pages/admin/Payments";
import AdminVideoCallGirls from "@/pages/admin/VideoCallGirls";
import AdminSettings from "@/pages/admin/Settings";
import AdminUsers from "@/pages/admin/Users";
import AdminGallery from "@/pages/admin/Gallery";
import AdminOperations from "@/pages/admin/Operations";
import AdminAdsSetup from "@/pages/admin/AdsSetup";
import { AdGlobalScripts } from "@/components/AdBanner";

function UserRouter() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const startParam =
        (window.Telegram?.WebApp?.initDataUnsafe as any)?.start_param ||
        searchParams.get("tgWebAppStartParam") ||
        searchParams.get("startapp");
      if (startParam && (location === "/" || location === "")) {
        const slug = startParam.replace(/^post_/, "");
        if (slug) {
          setLocation(`/post/${slug}`);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <Switch>
      {/* User Routes */}
      <Route path="/" component={Home} />
      <Route path="/free" component={Free} />
      <Route path="/paid" component={Paid} />
      <Route path="/post/:slug" component={PostDetail} />
      <Route path="/packages" component={Paid} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/video-call" component={VideoCall} />
      <Route path="/gallery" component={Gallery} />
      <Route path="/fake-call/:girlId" component={FakeCall} />
      <Route path="/referral" component={Referral} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/posts" component={AdminPosts} />
      <Route path="/admin/posts/new" component={AdminPostForm} />
      <Route path="/admin/posts/:id/edit" component={AdminPostForm} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/social-links" component={AdminSocialLinks} />
      <Route path="/admin/packages" component={AdminPackages} />
      <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/video-call" component={AdminVideoCallGirls} />
      <Route path="/admin/gallery" component={AdminGallery} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/ads" component={AdminAdsSetup} />
      <Route path="/admin/operations" component={AdminOperations} />

      <Route component={NotFound} />
    </Switch>
  );
}

function MaintenanceGate() {
  const [location] = useLocation();
  const { data: settings } = useGetPublicSettings();

  useEffect(() => {
    if (!settings?.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;
  }, [settings?.faviconUrl]);

  if (settings?.maintenanceMode && !location.startsWith("/admin")) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-3xl">🛠️</div>
          <h1 className="text-2xl font-black text-foreground">We’ll be right back</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {settings.maintenanceMessage || "The app is temporarily unavailable for maintenance."}
          </p>
        </div>
      </main>
    );
  }

  return <UserRouter />;
}

function UserBootstrap() {
  const tgId = getStoredValue("dwe_user_tg_id") || getBrowserUserId();
  const registerUser = useRegisterUser();
  const { data: user } = useGetMe(
    { telegramId: tgId },
    { query: { enabled: !!tgId, refetchInterval: 60000 } } as any
  );

  useEffect(() => {
    if (tgId) {
      setStoredValue("dwe_user_tg_id", tgId);
      registerUser.mutate({
        data: {
          telegramId: tgId,
          username: getStoredValue("dwe_user_username") || undefined,
          firstName: getStoredValue("dwe_user_first_name") || undefined,
          referralCode: getStoredValue("dwe_referral_code") || undefined,
        },
      });
    }
  }, [tgId]);

  useEffect(() => {
    if (user) {
      const isPrem = Boolean(
        user.isPremium &&
        (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > new Date())
      );
      setStoredValue("dwe_user_is_premium", isPrem ? "true" : "false");
    }
  }, [user]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useEffect(() => {
    // Force dark mode for the premium immersive feel
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserBootstrap />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/30">
            <AdGlobalScripts />
            <MaintenanceGate />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
