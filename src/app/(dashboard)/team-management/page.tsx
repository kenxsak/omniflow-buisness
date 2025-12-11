
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Loader2, User, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, AttendanceRecord } from '@/types/saas';
import { getCompanyUsers, logAttendance, getAttendanceForUser, getLastAttendanceRecord } from '@/lib/saas-data';
import { useAuth } from '@/hooks/use-auth';
import { format, formatDistanceToNow } from 'date-fns';

export default function TeamManagementPage() {
  const { appUser, isAdmin, isManager } = useAuth();
  const { toast } = useToast();
  
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);

  const loadData = useCallback(async () => {
    if (appUser?.companyId) {
      setIsLoading(true);
      const users = await getCompanyUsers(appUser.companyId);
      setTeamUsers(users);
      
      const records: Record<string, AttendanceRecord | null> = {};
      for (const user of users) {
          records[user.uid] = await getLastAttendanceRecord(user.uid);
      }
      setAttendanceRecords(records);
      setIsLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    loadData();
    // Add a listener to refresh data if it's changed in another tab
     const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'omniFlowSaasUsers' || event.key === 'omniFlowAttendance') {
            loadData();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);
  
  const handleClockInOut = async () => {
    if (!appUser) return;
    setIsClocking(true);

    const lastRecord = attendanceRecords[appUser.uid];
    const newStatus = lastRecord?.status === 'in' ? 'out' : 'in';
    
    await logAttendance(appUser.uid, newStatus);
    toast({
      title: `Successfully Clocked ${newStatus === 'in' ? 'In' : 'Out'}`,
      description: `Your status has been updated.`,
    });
    
    // Refresh data for the current user and for the admin view
    await loadData();
    setIsClocking(false);
  };
  
  const userLastRecord = appUser ? attendanceRecords[appUser.uid] : null;
  const isClockedIn = userLastRecord?.status === 'in';
  const canViewTeam = isAdmin || isManager;

  const renderAdminView = () => (
    <Card>
      <CardHeader>
        <CardTitle>Team Attendance Status</CardTitle>
        <CardDescription>View the current clock-in/out status of all users in your company.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin h-6 w-6"/></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamUsers.map(user => {
                  const record = attendanceRecords[user.uid];
                  return (
                    <TableRow key={user.uid}>
                      <TableCell>{user.name || user.email}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{user.type || 'office'}</Badge></TableCell>
                      <TableCell>
                        {record?.status === 'in' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80">Clocked In</Badge>
                        ) : (
                          <Badge variant="secondary">Clocked Out</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {record?.timestamp?.toDate ? formatDistanceToNow(record.timestamp.toDate(), { addSuffix: true }) : 'No activity yet'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const renderUserView = () => (
    <Card className="max-w-md mx-auto">
       <CardHeader className="text-center">
         <CardTitle>Your Attendance</CardTitle>
         <CardDescription>Update your work status below.</CardDescription>
       </CardHeader>
       <CardContent className="text-center space-y-4">
         <div>
            <p className="text-sm text-muted-foreground">Your current status:</p>
            <Badge className={`text-lg mt-1 ${isClockedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </Badge>
         </div>
         {userLastRecord && (
            <p className="text-xs text-muted-foreground">
                Last activity: {userLastRecord.timestamp?.toDate ? format(userLastRecord.timestamp.toDate(), 'PPpp') : 'N/A'}
            </p>
         )}
         <Button onClick={handleClockInOut} disabled={isClocking} size="lg" className="w-full">
            {isClocking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (isClockedIn ? <LogOut className="mr-2 h-5 w-5" /> : <LogIn className="mr-2 h-5 w-5" />)}
            {isClocking ? 'Updating...' : (isClockedIn ? 'Clock Out' : 'Clock In')}
         </Button>
       </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageTitle
        title="Team Management"
        description="Manage team attendance and view user activity."
      />
      {canViewTeam ? (
        <>
          {renderUserView()}
          {renderAdminView()}
        </>
      ) : (
        renderUserView()
      )}
    </div>
  );
}
