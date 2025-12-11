'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Search, DollarSign, IndianRupee, CheckCircle2, XCircle, Clock, RefreshCw, Eye, Edit2, CreditCard, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getPaymentTransactions, getTransactionStats, updateTransactionStatus, TransactionWithCompany } from '@/app/actions/payment-transactions-actions';
import StatCard from '@/components/dashboard/stat-card';
import type { PaymentStatus } from '@/types/payment';

const formatCurrency = (amount: number, currency: string) => {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const getStatusBadge = (status: PaymentStatus) => {
  switch (status) {
    case 'succeeded':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
    case 'pending':
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    case 'canceled':
      return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getGatewayBadge = (gateway: 'stripe' | 'razorpay') => {
  if (gateway === 'stripe') {
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><CreditCard className="w-3 h-3 mr-1" /> Stripe</Badge>;
  }
  return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CreditCard className="w-3 h-3 mr-1" /> Razorpay</Badge>;
};

export default function TransactionsPage() {
  const { appUser, isSuperAdmin, getIdToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<TransactionWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterGateway, setFilterGateway] = useState<'stripe' | 'razorpay' | 'all'>('all');
  const [stats, setStats] = useState<{ total: number; succeeded: number; failed: number; pending: number; totalRevenue: { USD: number; INR: number } } | null>(null);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithCompany | null>(null);
  const [newStatus, setNewStatus] = useState<PaymentStatus>('pending');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSuperAdmin) return;
    
    setIsLoading(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        toast({ title: 'Error', description: 'Authentication failed', variant: 'destructive' });
        return;
      }

      const [transactionsResult, statsResult] = await Promise.all([
        getPaymentTransactions({ 
          idToken, 
          status: filterStatus,
          gateway: filterGateway,
          searchTerm: searchTerm || undefined
        }),
        getTransactionStats({ idToken })
      ]);

      if (transactionsResult.success && transactionsResult.transactions) {
        setTransactions(transactionsResult.transactions);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({ title: 'Error', description: 'Failed to load transactions', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [isSuperAdmin, getIdToken, filterStatus, filterGateway, searchTerm, toast]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    loadData();
  }, [isSuperAdmin, router, loadData]);

  const handleUpdateStatus = async () => {
    if (!selectedTransaction) return;
    
    setIsUpdating(true);
    try {
      const idToken = await getIdToken();
      if (!idToken) {
        toast({ title: 'Error', description: 'Authentication failed', variant: 'destructive' });
        return;
      }

      const result = await updateTransactionStatus({
        idToken,
        transactionId: selectedTransaction.id,
        newStatus,
        notes: reviewNotes
      });

      if (result.success) {
        toast({ title: 'Success', description: 'Transaction status updated successfully' });
        setEditDialogOpen(false);
        setSelectedTransaction(null);
        setReviewNotes('');
        loadData();
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update status', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = (transaction: TransactionWithCompany) => {
    setSelectedTransaction(transaction);
    setNewStatus(transaction.status);
    setReviewNotes('');
    setEditDialogOpen(true);
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Payment Transactions" 
        description="View and manage all payment transactions across all companies. Monitor revenue and handle manual verifications."
      />

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard title="Total Transactions" value={stats.total.toString()} icon={CreditCard} change="" />
          <StatCard title="Successful" value={stats.succeeded.toString()} icon={CheckCircle2} change="" />
          <StatCard title="Failed" value={stats.failed.toString()} icon={XCircle} change="" negativeChange={stats.failed > 0} />
          <StatCard title="Revenue (USD)" value={formatCurrency(stats.totalRevenue.USD, 'USD')} icon={DollarSign} change="" />
          <StatCard title="Revenue (INR)" value={formatCurrency(stats.totalRevenue.INR, 'INR')} icon={IndianRupee} change="" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>View all payment transactions from Stripe (global) and Razorpay (India). Click on a transaction to view details or manually update status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, email, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PaymentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGateway} onValueChange={(v) => setFilterGateway(v as 'stripe' | 'razorpay' | 'all')}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Transactions will appear here once customers make payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {transaction.createdAt ? format(new Date(transaction.createdAt), 'PP p') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.companyName}</p>
                          <p className="text-xs text-muted-foreground">{transaction.companyEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getGatewayBadge(transaction.gateway)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>{transaction.planName || transaction.description}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {transaction.gatewayTransactionId?.slice(0, 20)}...
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(transaction)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Transaction</DialogTitle>
            <DialogDescription>
              Review and manually update the status of this transaction if needed.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedTransaction.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gateway</p>
                  <p className="font-medium capitalize">{selectedTransaction.gateway}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <code className="text-xs">{selectedTransaction.gatewayTransactionId}</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as PaymentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Review Notes (Optional)</Label>
                <Textarea 
                  placeholder="Add notes about this manual review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
