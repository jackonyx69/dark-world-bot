import { useGetAdminStats } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, Eye, Users, Home, Unlock, Lock,
  Tags, Link as LinkIcon, Crown, DollarSign 
} from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  const statCards = [
    { label: "Total Posts", value: stats?.totalPosts, icon: FileText },
    { label: "Total Views", value: stats?.totalViews, icon: Eye },
    { label: "Total Users", value: stats?.totalUsers, icon: Users },
    { label: "Home Posts", value: stats?.homePosts, icon: Home },
    { label: "Free Posts", value: stats?.freePosts, icon: Unlock },
    { label: "Paid Posts", value: stats?.paidPosts, icon: Lock },
    { label: "Categories", value: stats?.totalCategories, icon: Tags },
    { label: "Social Links", value: stats?.totalSocialLinks, icon: LinkIcon },
    { label: "Premium Users", value: stats?.premiumUsers, icon: Crown, color: "text-primary" },
    { label: "Pending Payments", value: stats?.pendingPayments, icon: DollarSign, color: "text-yellow-500" },
    { label: "Revenue", value: stats?.revenue, icon: DollarSign, color: "text-green-500" },
  ];

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of platform metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))
        ) : (
          statCards.map((stat, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                <stat.icon className={`w-6 h-6 mb-2 ${stat.color || 'text-muted-foreground'}`} />
                <div className={`text-2xl font-black ${stat.color || 'text-foreground'}`}>
                  {stat.value !== undefined ? stat.value : '-'}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
