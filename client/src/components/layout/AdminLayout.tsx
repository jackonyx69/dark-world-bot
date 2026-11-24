import { useEffect } from "react";
import { useLocation } from "wouter";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("dwe_admin_token");
    if (!token && location !== "/admin") {
      setLocation("/admin");
    }
  }, [location, setLocation]);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="md:pl-64 pt-14 md:pt-0">
        <main className="p-4 md:p-8 max-w-6xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
