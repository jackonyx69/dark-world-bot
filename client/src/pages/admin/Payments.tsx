import { useState } from "react";
import { 
  useListPendingPayments, useUpdatePendingPayment,
  getListPendingPaymentsQueryKey
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  
  const { data: payments, isLoading } = useListPendingPayments({ 
    status: statusFilter === "all" ? undefined : statusFilter 
  });
  
  const updatePayment = useUpdatePendingPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleUpdateStatus = (id: number, status: 'approved' | 'rejected') => {
    updatePayment.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: `Payment ${status}` });
          queryClient.invalidateQueries({ queryKey: getListPendingPaymentsQueryKey() });
        }
      }
    );
  };

  const filteredPayments = search 
    ? payments?.filter(p => 
        (p.transactionId && p.transactionId.toLowerCase().includes(search.toLowerCase())) || 
        (p.userName && p.userName.toLowerCase().includes(search.toLowerCase()))
      )
    : payments;

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Payments Verification</h1>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search TXN ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="border-border bg-card">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User / Transaction</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filteredPayments?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments found in this category</TableCell></TableRow>
            ) : (
              filteredPayments?.map((payment) => {
                const statusColors = {
                  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
                  approved: "bg-green-500/20 text-green-500 border-green-500/50",
                  rejected: "bg-destructive/20 text-destructive border-destructive/50"
                };
                
                return (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(payment.createdAt || Date.now()).toLocaleDateString()}<br/>
                      {new Date(payment.createdAt || Date.now()).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{payment.userName || 'Unknown'}</div>
                      <div className="text-xs font-mono text-muted-foreground">TXN: {payment.transactionId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.package?.name || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {payment.amount}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${statusColors[payment.status as keyof typeof statusColors]} capitalize`}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white" 
                            onClick={() => handleUpdateStatus(payment.id, 'approved')}
                            disabled={updatePayment.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleUpdateStatus(payment.id, 'rejected')}
                            disabled={updatePayment.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {payment.status !== 'pending' && (
                        <span className="text-xs text-muted-foreground">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </AdminLayout>
  );
}
