import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useAdminLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { data: { password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("dwe_admin_token", data.token);
          setLocation("/admin/dashboard");
        },
        onError: (err: any) => {
          const message =
            err?.data?.error ||
            (err?.status === 401
              ? "পাসওয়ার্ড ভুল হয়েছে (Invalid admin password)"
              : "সার্ভারের সাথে সংযোগ পাওয়া যায়নি! নিশ্চিত করুন ব্যাকগ্রাউন্ডে সার্ভারটি চালু আছে (Server is not running)।");
          toast({
            title: "লগইন ব্যর্থ হয়েছে",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-border bg-card shadow-2xl">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-black text-primary tracking-tighter">DARK WOULD EXPOSE</CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-widest text-xs font-bold">Admin Panel</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background border-border text-center tracking-widest"
                autoComplete="current-password"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full font-bold uppercase tracking-wider" 
              disabled={!password || login.isPending}
            >
              {login.isPending ? "AUTHENTICATING..." : "ENTER"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
