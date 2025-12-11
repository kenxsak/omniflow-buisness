
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit3, Image as ImageIcon, Clock, Link as LinkIcon, ExternalLink, Rss, FileCode, Loader2, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { deleteStoredSocialMediaPost } from '@/lib/social-media-post-data';
import type { SocialMediaPost } from '@/types/social-media';
import { getStoredSocialMediaPostsAction, deleteStoredSocialMediaPostAction, togglePostStatusAction } from '@/app/actions/social-media-actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import SchedulePostDialog from '@/components/social-media/schedule-post-dialog';
import { useAuth } from '@/hooks/use-auth';

export default function ContentHubPage() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [postToSchedule, setPostToSchedule] = useState<SocialMediaPost | null>(null);
  const { appUser } = useAuth();

  const loadPosts = useCallback(async () => {
    if (!appUser?.companyId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    const result = await getStoredSocialMediaPostsAction(appUser.uid, appUser.companyId);
    if(result.success && result.data){
        setPosts(result.data);
    } else {
        toast({ title: 'Error', description: result.error || 'Failed to load posts.', variant: 'destructive'});
    }
    setIsLoading(false);
  }, [appUser, toast]);

  useEffect(() => {
    if (appUser) {
        loadPosts();
    }
  }, [appUser, loadPosts]);

  const handleDeletePost = async (postId: string) => {
    if (!appUser?.companyId) return;

    const result = await deleteStoredSocialMediaPostAction(appUser.uid, postId);
    if (result.success) {
        toast({ title: "Post Deleted", description: "The saved post has been removed from your content hub." });
        await loadPosts(); // Refresh the list
    } else {
        toast({ title: "Delete Failed", description: result.error, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (post: SocialMediaPost) => {
    if (!appUser?.uid) return;

    const newStatus = post.status === 'Posted' ? 'Draft' : 'Posted';
    const result = await togglePostStatusAction(appUser.uid, post.id, newStatus);
    
    if (result.success) {
        const statusMessage = newStatus === 'Posted' 
            ? "Your content is now live and publicly visible!" 
            : "Your content has been hidden from public view.";
        toast({ 
            title: `Status Changed to ${newStatus}`, 
            description: statusMessage 
        });
        await loadPosts();
    } else {
        toast({ 
            title: "Status Update Failed", 
            description: result.error, 
            variant: "destructive" 
        });
    }
  };
  
  const handleSaveSchedule = async (updatedPost: SocialMediaPost) => {
    // This should use a server action as well
    // For now, we'll assume a client-side update for demonstration, but this is not ideal.
    // await updateStoredSocialMediaPost(updatedPost);
    toast({
        title: "Post Scheduled!",
        description: `Your post has been scheduled. (Note: scheduling persistence requires server-side logic)`
    });
    await loadPosts();
    setPostToSchedule(null);
  }

  const getStatusBadgeVariant = (status: SocialMediaPost['status']) => {
    switch(status) {
      case 'Draft': return 'secondary';
      case 'Scheduled': return 'default';
      case 'Posted': return 'outline';
      default: return 'secondary';
    }
  }

  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}/blog/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        toast({ title: "Public Page URL Copied!", description: "The public link to your content page has been copied." });
    });
  };

  const getIconForPlatform = (platform: SocialMediaPost['platform']) => {
    switch (platform) {
        case 'BlogPost':
            return <Rss className="h-4 w-4 text-orange-500" />;
        case 'SalesLandingPage':
            return <FileCode className="h-4 w-4 text-green-500" />;
        default:
            return <Edit3 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle
          title="Website & Blog Content Hub"
          description="A central library for all your saved content. Blog posts and sales pages are instantly live upon creation."
        />
        <Button asChild>
          <Link href="/social-media">
            <Edit3 className="mr-2 h-4 w-4" /> Go to Content Generator
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Content</CardTitle>
          <CardDescription>
            All your saved content is stored in the database. This hub is where you manage content for social media and your public-facing pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[40%]">Content (Start)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Scheduled At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></TableCell></TableRow>
                ) : posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No saved posts yet. Go to the "Content Generator" to create and save some content.
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {getIconForPlatform(post.platform)}
                            <span>{post.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{post.textContent.substring(0, 120)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusBadgeVariant(post.status)}>{post.status}</Badge>
                          {(post.platform === 'BlogPost' || post.platform === 'SalesLandingPage') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => handleToggleStatus(post)}
                                  >
                                    {post.status === 'Posted' ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{post.status === 'Posted' ? 'Hide from public' : 'Make public'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {post.scheduledAt ? format(new Date(post.scheduledAt), 'PPp') : 'Not scheduled'}
                      </TableCell>
                      <TableCell className="text-right">
                         <TooltipProvider>
                            {(post.platform === 'BlogPost' || post.platform === 'SalesLandingPage') && (
                                <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/blog/${post.id}`} target="_blank">
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>View Public Page</p></TooltipContent>
                                </Tooltip>
                                 <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleCopyLink(post.id)}>
                                            <LinkIcon className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Copy Public Link</p></TooltipContent>
                                </Tooltip>
                                </>
                            )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setPostToSchedule(post)}>
                                    <Clock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Schedule Post</p></TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/social-media?editPostId=${post.id}`}>
                                  <Edit3 className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Edit in Generator</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this saved post.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id)} className={buttonVariants({ variant: "destructive" })}>
                                Delete Post
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {postToSchedule && (
        <SchedulePostDialog
            post={postToSchedule}
            isOpen={!!postToSchedule}
            onOpenChange={(isOpen) => !isOpen && setPostToSchedule(null)}
            onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
}
