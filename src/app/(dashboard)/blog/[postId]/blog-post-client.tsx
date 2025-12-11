
"use client";

import React, { useEffect } from 'react';
import type { SocialMediaPost } from '@/types/social-media';

interface BlogPostClientProps {
    post: SocialMediaPost;
}

export default function BlogPostClient({ post }: BlogPostClientProps) {
  const isWebPage = post.platform === 'SalesLandingPage' || post.platform === 'BlogPost';
  const contentToRender = isWebPage ? post.textContent : '';

  useEffect(() => {
    if (isWebPage && contentToRender) {
      document.open();
      document.write(contentToRender);
      document.close();
    }
  }, [isWebPage, contentToRender]);

  if (isWebPage) {
    return null;
  }

  return null;
}
