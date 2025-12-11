
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Loader2, Send, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, UserInvitation, UserType, Role, Plan } from '@/types/saas';
import { getCompanyUsers, getStoredInvitations, getStoredPlans } from '@/lib/saas-data';
import { createAndSendInvitation, revokeInvitation } from '@/app/actions/user-invitation-actions';
import { deleteUser } from '@/app/actions/user-management-actions';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle } from '../ui/alert';
import Link from 'next/link';

export default function UserManager() {
  const { appUser, company, refreshAuthContext, isAdmin, isManager } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUserType, setInviteUserType] = useState<UserType>('office');
  const [inviteRole, setInviteRole] = useState<Role>('user');
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    if (appUser?.companyId) {
      setIsLoading(true);
      const companyUsers = await getCompanyUsers(appUser.companyId);
      const allInvitations = await getStoredInvitations();
      const companyInvitations = allInvitations.filter(inv => inv.companyId === appUser.companyId);
      const allPlans = await getStoredPlans();
      
      setUsers(companyUsers);
      setInvitations(companyInvitations);
      setPlans(allPlans);
      setIsLoading(false);
    }
  }, [appUser]);

  useEffect(() => {
    loadData();
    // This listener can help if another tab changes the users/invitations
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'omniFlowSaasUsers' || event.key === 'omniFlowSaasInvitations') {
            loadData();
            refreshAuthContext();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData, refreshAuthContext]);

  const handleInviteUser = async () => {
    if (!inviteEmail || !appUser?.companyId || !company || plans.length === 0) {
      toast({ title: "Error", description: "Email address is required and company data must be loaded.", variant: "destructive" });
      return;
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
        toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
        return;
    }

    // Plan limit enforcement
    const currentPlan = plans.find(p => p.id === company.planId);
    if (!currentPlan) {
        toast({ title: "Error", description: "Could not determine your company's subscription plan.", variant: "destructive" });
        return;
    }

    const totalUserCount = users.length + invitations.length;
    if (totalUserCount >= currentPlan.maxUsers) {
        toast({
            title: "User Limit Reached",
            description: `Your "${currentPlan.name}" plan allows a maximum of ${currentPlan.maxUsers} users. Please upgrade your plan to invite more users.`,
            variant: "destructive",
            duration: 7000,
        });
        return;
    }

    setIsInviting(true);
    
    // Get Brevo configuration from company settings (if configured)
    const brevoApiKey = company.apiKeys?.brevo?.apiKey;
    const brevoSenderEmail = company.apiKeys?.brevo?.senderEmail;
    const brevoSenderName = company.apiKeys?.brevo?.senderName;
    
    // Create invitation and send email automatically
    const result = await createAndSendInvitation({
      email: inviteEmail,
      companyId: appUser.companyId,
      companyName: company.name,
      inviterId: appUser.uid,
      inviterEmail: appUser.email,
      inviterName: appUser.name,
      type: inviteUserType,
      role: inviteRole,
      brevoApiKey,
      brevoSenderEmail,
      brevoSenderName,
    });
    
    if (result.success) {
        // Different messages based on whether email was sent
        if (result.emailSent) {
            toast({ 
                title: "✅ Invitation Sent!", 
                description: result.message || `An invitation email has been sent to ${inviteEmail}. They'll receive instructions to join your company.`,
                duration: 8000,
            });
        } else {
            toast({ 
                title: "Invitation Created", 
                description: result.message || `Invitation created for ${inviteEmail}. ${!brevoApiKey ? 'Configure Brevo API key in Settings > API Keys to enable automated emails.' : ''}`,
                variant: brevoApiKey ? "destructive" : "default",
                duration: 10000,
            });
        }
        await loadData();
        setInviteEmail('');
        setInviteUserType('office');
        setInviteRole('user');
        setIsInviteDialogOpen(false);
    } else {
        toast({ title: "Invitation Failed", description: result.message, variant: "destructive" });
    }
    setIsInviting(false);
  };
  
  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!appUser) return;
    
    const result = await revokeInvitation({
      invitationId,
      revokerUserId: appUser.uid
    });

    if (result.success) {
      toast({ 
        title: "Invitation Revoked", 
        description: result.message || `The invitation for ${email} has been deleted.`
      });
      await loadData();
    } else {
      toast({ 
        title: "Revocation Failed", 
        description: result.message, 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!appUser) return;
    
    const result = await deleteUser({
      userIdToDelete: user.uid,
      adminUserId: appUser.uid
    });

    if (result.success) {
      toast({ 
        title: "User Deleted", 
        description: result.message || `User ${user.email} has been removed from your company.`,
        duration: 8000
      });
      await loadData();
    } else {
      toast({ 
        title: "Delete Failed", 
        description: result.message, 
        variant: "destructive",
        duration: 8000
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              {isManager 
                ? "View your team and invite new users to your company." 
                : "Invite and manage users within your company."}
            </CardDescription>
          </div>
          {(() => {
            const currentPlan = plans.find(p => p.id === company?.planId);
            const isFreePlan = currentPlan?.id === 'plan_free';
            const totalUserCount = users.length + invitations.length;
            const atUserLimit = currentPlan && totalUserCount >= currentPlan.maxUsers;
            
            if (isFreePlan) {
              return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Upgrade to invite team members</span>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings?tab=subscription'}>
                    Upgrade Plan
                  </Button>
                </div>
              );
            }
            
            return (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="self-start sm:self-center" disabled={atUserLimit}>
                    <UserPlus className="mr-2 h-4 w-4" /> 
                    {atUserLimit ? 'User Limit Reached' : 'Invite New User'}
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a New User</DialogTitle>
                <DialogDescription>Send an automated invitation email to join your company.</DialogDescription>
                 <Alert variant="default" className="mt-2 text-xs">
                    <Info className="h-4 w-4"/>
                    <AlertTitle className="font-semibold">Automated Email Invitations</AlertTitle>
                    <p className="mt-1">The invited person will receive a professional email with a direct link to sign up and join your company. They must use the email address you specify here when creating their account.</p>
                    {(!company?.apiKeys?.brevo?.apiKey || !company?.apiKeys?.brevo?.senderEmail || !company?.apiKeys?.brevo?.senderName) && (
                      <p className="mt-2 text-amber-700 font-medium">⚠️ Note: Configure your Brevo API key, sender email, and sender name in Settings → API Keys to enable automated emails.</p>
                    )}
                </Alert>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input id="invite-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@example.com" required />
                </div>
                 <div>
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: Role) => setInviteRole(value)} disabled={isManager}>
                        <SelectTrigger id="invite-role">
                            <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            {isAdmin && <SelectItem value="manager">Manager</SelectItem>}
                        </SelectContent>
                    </Select>
                    {isManager && <p className="text-xs text-muted-foreground mt-1">Managers can only invite users</p>}
                </div>
                <div>
                    <Label htmlFor="invite-user-type">Type</Label>
                    <Select value={inviteUserType} onValueChange={(value: UserType) => setInviteUserType(value)}>
                        <SelectTrigger id="invite-user-type">
                            <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="office">Office Staff</SelectItem>
                            <SelectItem value="field">Field Staff</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleInviteUser} disabled={isInviting}>
                  {isInviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                  Send Invitation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            );
          })()}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium mb-2">Active Users</h3>
                <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="hidden md:table-cell">Joined On</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.length > 0 ? (
                        users.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell><Badge variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'outline' : 'secondary'} className="capitalize">{user.role}</Badge></TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{user.type}</Badge></TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{user.createdAt?.toDate ? format(user.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {(isAdmin && user.role !== 'admin' && user.role !== 'superadmin') && ( // Only admins can delete, prevent deleting owner/admin
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" title="Delete User"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently remove {user.email} from your company. They will lose access to all company data and features. This action cannot be undone.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteUser(user)} className={buttonVariants({ variant: "destructive" })}>
                                                Delete User
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">No active users found.</TableCell></TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-medium mb-2">Pending Invitations</h3>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="hidden md:table-cell">Invited On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {invitations.length > 0 ? (
                                invitations.map(inv => (
                                <TableRow key={inv.email}>
                                    <TableCell className="font-medium text-muted-foreground italic">{inv.email}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{inv.role}</Badge></TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{inv.type}</Badge></TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{inv.createdAt?.toDate ? format(inv.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        {(isAdmin || (isManager && inv.role === 'user')) && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRevokeInvitation(inv.id, inv.email)} title="Revoke Invitation"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No pending invitations.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
