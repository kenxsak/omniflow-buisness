"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Download, Filter, RefreshCw, Shield, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuditLogsAction, exportAuditLogsAction } from '@/app/actions/enterprise-actions';
import type { AuditLogEntry, AuditAction } from '@/types/enterprise';
import { format, formatDistanceToNow } from 'date-fns';

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  view: 'bg-gray-100 text-gray-800',
  assign: 'bg-purple-100 text-purple-800',
  claim: 'bg-yellow-100 text-yellow-800',
  release: 'bg-orange-100 text-orange-800',
  login: 'bg-cyan-100 text-cyan-800',
  logout: 'bg-slate-100 text-slate-800',
  bulk_assign: 'bg-indigo-100 text-indigo-800',
  export: 'bg-teal-100 text-teal-800',
  import: 'bg-emerald-100 text-emerald-800',
};

const severityColors: Record<string, string> = {
  info: 'border-blue-500',
  warning: 'border-yellow-500',
  critical: 'border-red-500',
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState({
    entityType: '',
    action: '',
    search: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    const result = await getAuditLogsAction({
      entityType: filters.entityType as any || undefined,
      action: filters.action || undefined,
      limit: 100,
    });
    setLogs(result.logs);
    setTotal(result.total);
    setIsLoading(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    
    const result = await exportAuditLogsAction(thirtyDaysAgo, now);
    setIsExporting(false);

    if (result.success) {
      const blob = new Blob([JSON.stringify(result.logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: `Exported ${result.logs.length} audit log entries`,
      });
    } else {
      toast({
        title: 'Export Failed',
        description: 'Could not export audit logs',
        variant: 'destructive',
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.performedByName?.toLowerCase().includes(searchLower) ||
        log.performedByEmail?.toLowerCase().includes(searchLower) ||
        log.entityId.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <CardDescription>
              Complete history of all actions performed in your CRM
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export (30 Days)
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, action, or entity..."
                className="pl-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <Select
            value={filters.entityType || "all"}
            onValueChange={(v) => setFilters({ ...filters, entityType: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="deal">Deals</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="company">Company</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.action || "all"}
            onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="assign">Assign</SelectItem>
              <SelectItem value="claim">Claim</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="export">Export</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadLogs}>
            <Filter className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className={`border-l-4 ${severityColors[log.severity] || ''}`}
                    >
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">
                              {log.performedByName || 'Unknown'}
                            </div>
                            {log.performedByEmail && (
                              <div className="text-xs text-muted-foreground">
                                {log.performedByEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={actionColors[log.action] || 'bg-gray-100'}
                        >
                          {log.action.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <Badge variant="outline" className="mr-1">
                            {log.entityType}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            {log.entityId.substring(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {log.metadata && (
                          <div className="text-xs text-muted-foreground truncate">
                            {JSON.stringify(log.metadata).substring(0, 50)}...
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="text-xs text-muted-foreground text-right">
          Showing {filteredLogs.length} of {total} entries
        </div>
      </CardContent>
    </Card>
  );
}
