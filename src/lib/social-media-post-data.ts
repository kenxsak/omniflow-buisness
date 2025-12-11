
"use client";

import type { SocialMediaPost } from '@/types/social-media';
import { auth } from './firebase';
import {
  getStoredSocialMediaPostsAction,
  addStoredSocialMediaPostAction,
  updateStoredSocialMediaPostAction,
  deleteStoredSocialMediaPostAction,
} from '@/app/actions/social-media-actions';

export async function getStoredSocialMediaPosts(companyId?: string): Promise<SocialMediaPost[]> {
  if (!companyId) return [];
  
  const userId = auth?.currentUser?.uid;
  if (!userId) {
    console.error('User not authenticated');
    return [];
  }

  try {
    const result = await getStoredSocialMediaPostsAction(userId, companyId);
    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('Error fetching posts:', result.error);
      return [];
    }
  } catch (error) {
    console.error("Error fetching social media posts:", error);
    return [];
  }
}

export async function addStoredSocialMediaPost(postData: Omit<SocialMediaPost, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: SocialMediaPost; error?: string; }> {
  const userId = auth?.currentUser?.uid;
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const result = await addStoredSocialMediaPostAction(userId, postData);
    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error || 'Failed to add social media post' };
    }
  } catch (error: any) {
    console.error("Error adding social media post:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStoredSocialMediaPost(updatedData: Partial<SocialMediaPost> & { id: string }): Promise<{ success: boolean; error?: string; }> {
  const userId = auth?.currentUser?.uid;
  if (!userId) {
    return { success: false, error: 'User not authenticated' };
  }

  try {
    const result = await updateStoredSocialMediaPostAction(userId, updatedData);
    if (!result.success) {
       return { success: false, error: result.error || 'Failed to update social media post' };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error updating social media post:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStoredSocialMediaPost(postId: string): Promise<void> {
  const userId = auth?.currentUser?.uid;
  if (!userId) {
    console.error('User not authenticated');
    return;
  }

  try {
    const result = await deleteStoredSocialMediaPostAction(userId, postId);
    if (!result.success) {
      console.error('Error deleting post:', result.error);
      throw new Error(result.error || 'Failed to delete social media post');
    }
  } catch (error) {
    console.error("Error deleting social media post:", error);
    throw error;
  }
}
