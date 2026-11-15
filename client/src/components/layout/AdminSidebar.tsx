import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Tags, Link as LinkIcon, Package, CreditCard, DollarSign, Video, Settings, Users, LogOut, Menu, Images, Wrench, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAdminLogout } from "@workspace/api-client-react";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/social-links", label: "Social Links", icon: LinkIcon },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/payment-methods", label: "Payment Methods", icon: CreditCard },
  { href: "/admin/payments", label: "Pending Payments", icon: DollarSign },
  { href: "/admin/video-call", label: "Video Calls", icon: Video },
  { href: "/admin/gallery", label: "Premium Gallery", icon: Images },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/ads", label: "Ads Setup", icon: Megaphone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/operations", label: "Operations", icon: Wrench },
];

export function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const logout = useAdminLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        localStorage.removeItem("dwe_admin_token");
        setLocation("/admin");
      },
    });
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border w-64">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tighter text-primary">DWE ADMIN</h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {adminLinks.map((item) => {
            const isActive = location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-4 border-t border-border">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 z-40">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
        <span className="font-bold text-primary ml-4">DWE ADMIN</span>
      </div>
      <div className="hidden md:block fixed top-0 left-0 bottom-0 z-40">
        <NavContent />
      </div>
    </>
  );
}
