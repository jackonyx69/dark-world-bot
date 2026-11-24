import { useGetAdminStats } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Eye, Users, Home, Unlock, Lock,
  Tags, Link as LinkIcon, Crown, DollarSign 
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    { label: "Total Posts", value: stats?.totalPosts, icon: FileText, href: "/admin/posts" },
    { label: "Total Views", value: stats?.totalViews, icon: Eye, href: "/admin/posts" },
    { label: "Total Users", value: stats?.totalUsers, icon: Users, href: "/admin/users" },
    { label: "Home Posts", value: stats?.homePosts, icon: Home, href: "/admin/posts?section=home" },
    { label: "Free Posts", value: stats?.freePosts, icon: Unlock, href: "/admin/posts?section=free" },
    { label: "Paid Posts", value: stats?.paidPosts, icon: Lock, href: "/admin/posts?section=paid" },
    { label: "Categories", value: stats?.totalCategories, icon: Tags, href: "/admin/categories" },
    { label: "Social Links", value: stats?.totalSocialLinks, icon: LinkIcon, href: "/admin/social-links" },
    { label: "Premium Users", value: stats?.premiumUsers, icon: Crown, color: "text-primary", href: "/admin/users?filter=premium" },
    { label: "Pending Payments", value: stats?.pendingPayments, icon: DollarSign, color: "text-yellow-500", href: "/admin/payments?status=pending" },
    { label: "Revenue", value: stats?.revenue, icon: DollarSign, color: "text-green-500", href: "/admin/payments?status=approved" },
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform metrics. Click any card to navigate.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          statCards.map((stat, i) => (
            <Link key={i} href={stat.href} className="group block focus:outline-none">
              <Card className="border-border bg-card transition-all duration-200 group-hover:border-primary/60 group-hover:shadow-lg group-hover:-translate-y-0.5 group-active:translate-y-0 cursor-pointer h-full select-none">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                  <stat.icon className={`w-6 h-6 mb-2 transition-transform duration-200 group-hover:scale-110 ${stat.color || 'text-muted-foreground'}`} />
                  <div className={`text-2xl font-black ${stat.color || 'text-foreground'}`}>
                    {stat.value !== undefined ? stat.value : '-'}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold group-hover:text-foreground/90 transition-colors">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
