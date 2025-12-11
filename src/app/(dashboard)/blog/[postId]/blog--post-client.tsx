
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getStoredSocialMediaPosts } from '@/lib/social-media-post-data';
import type { SocialMediaPost } from '@/types/social-media';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, AlertTriangle, Rss, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import NextImage from 'next/image';
import { useAuth } from '@/hooks/use-auth';

interface BlogPostClientProps {
    postId: string;
}

// Simple Markdown to HTML parser
const parseMarkdown = (text: string): string => {
  if(!text) return '';
  let html = text
    // Headings
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // List items
    .replace(/^\* (.*$)/gm, '<li class="ml-5 list-disc">$1</li>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
  // Wrap consecutive list items in <ul> tags
  html = html.replace(/((<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  
  // Wrap non-list, non-heading lines in <p> tags
  html = html.split('\n').map(line => {
      if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<li>') || line.trim() === '') return line;
      return `<p class="my-4">${line}</p>`;
  }).join('\n');

  return html;
};

export default function BlogPostClient({ postId }: BlogPostClientProps) {
  const [post, setPost] = useState<SocialMediaPost | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { appUser } = useAuth(); // Get user to access companyId

  const loadPost = useCallback(async () => {
    if (postId && appUser?.companyId) {
      const allPosts = await getStoredSocialMediaPosts(appUser.companyId);
      // Allow finding either BlogPost or SalesLandingPage
      const foundPost = allPosts.find(p => p.id === postId && (p.platform === 'BlogPost' || p.platform === 'SalesLandingPage'));
      setPost(foundPost);
    } else {
      setPost(null);
    }
    setIsLoading(false);
  }, [postId, appUser]);

  useEffect(() => {
    // Only load post if we have the user context
    if (appUser) {
        loadPost();
    }
  }, [appUser, loadPost]);

  const isSalesPage = post?.platform === 'SalesLandingPage';
  const contentToRender = isSalesPage ? post.textContent : parseMarkdown(post?.textContent || '');

  // This useEffect now runs unconditionally, satisfying the Rules of Hooks.
  // The logic inside it will only execute when the conditions are met.
  useEffect(() => {
    if (isSalesPage && contentToRender) {
      document.open();
      document.write(contentToRender);
      document.close();
    }
  }, [isSalesPage, contentToRender]);


  if (isLoading || !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If it's a sales page, we render nothing in React as the document is being replaced by the useEffect hook.
  // Returning null here prevents React from trying to render anything further for this component tree.
  if (isSalesPage) {
    return null;
  }

  if (!post) {
    return (
       <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        Content Not Found
                    </CardTitle>
                    <CardDescription>
                        The content page you are looking for could not be found or is not a valid blog post/sales page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">It might have been deleted or the link is incorrect.</p>
                </CardContent>
                 <CardFooter className="justify-center">
                    <Button asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  // Render blog posts within the app's layout
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <header className="mb-8">
            <div className="mb-4">
                <Rss className="h-8 w-8 text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Published on {format(new Date(post.createdAt), 'MMMM d, yyyy')}</p>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight md:text-5xl">
              {post.originalTopic || 'Blog Post'}
            </h1>
          </header>
          
          {post.imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden my-8">
                <NextImage 
                    src={post.imageUrl}
                    alt={post.originalTopic || 'Blog post featured image'}
                    fill
                    className="object-cover"
                    data-ai-hint={post.imageAiHint}
                />
            </div>
          )}

          <div
            className="text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: contentToRender }}
          />

        </article>
          <footer className="mt-12 pt-6 border-t">
              <Button asChild variant="outline">
                <Link href="/social-media/content-hub">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content Hub
                </Link>
              </Button>
          </footer>
      </div>
    </div>
  );
}
