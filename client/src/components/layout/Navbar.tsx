import { Link, useLocation } from "wouter";
import { Flame, Zap, Crown, Images, Gift, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Flame },
  { href: "/free", label: "Free", icon: Zap },
  { href: "/gallery", label: "Demo", icon: Images },
  { href: "/video-call", label: "Calls", icon: Phone },
  { href: "/paid", label: "Premium", icon: Crown },
  { href: "/referral", label: "Refer", icon: Gift },
];

export function Navbar() {
  const [location] = useLocation();

  if (location.startsWith("/admin") || location.startsWith("/fake-call")) {
    return null;
  }

  return (
    <div className="pb-16 md:pb-0 md:pl-20">
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-auto md:w-20 md:h-screen md:flex md:flex-col md:border-r md:border-border/60"
        style={{ background: "linear-gradient(180deg, hsl(240 10% 6%) 0%, hsl(240 10% 4%) 100%)" }}>
        {/* Glassy overlay */}
        <div className="absolute inset-0 backdrop-blur-xl border-t border-white/5 md:border-t-0 md:border-r md:border-white/5" />
        
        <div className="relative flex justify-around items-center h-16 md:h-full md:flex-col md:justify-start md:pt-8 md:gap-2 px-2 md:px-0">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "relative flex flex-col items-center justify-center w-full md:w-full h-full md:h-auto md:py-4 space-y-1 transition-all duration-200 group",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-primary shadow-[0_0_10px_rgba(220,38,38,0.9)] md:bottom-auto md:left-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:w-0.5 md:h-8" />}
                <div className={cn(
                   "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-primary/15 shadow-[0_0_15px_rgba(220,38,38,0.25)]"
                    : "group-hover:bg-white/5"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(220,38,38,0.7)]")} />
                </div>
                <span className={cn("text-[10px] font-semibold tracking-wider uppercase", isActive ? "text-primary" : "")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
