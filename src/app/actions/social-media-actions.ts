
'use server';

import type { SocialMediaPost } from '@/types/social-media';
import { serverDb } from '@/lib/firebase-server';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  getDoc,
  orderBy
} from 'firebase/firestore';
import { uploadImageToImgBB } from '@/lib/imgbb-upload';

interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

async function verifyUserBelongsToCompany(
  userId: string, 
  companyId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!serverDb) {
    return { valid: false, error: 'Database not initialized' };
  }

  if (!userId) {
    return { valid: false, error: 'User not authenticated' };
  }

  if (!companyId) {
    return { valid: false, error: 'Company ID is required' };
  }

  try {
    const userDoc = await getDoc(doc(serverDb, 'users', userId));
    
    if (!userDoc.exists()) {
      return { valid: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    if (userData.companyId !== companyId) {
      return { valid: false, error: 'Unauthorized: User does not belong to this company' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying user company:', error);
    return { valid: false, error: 'Error verifying user permissions' };
  }
}

function convertTimestampToString(timestamp: any): string | null {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate().toISOString();
  if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp).toISOString();
  return null;
}

function serializePost(post: any): SocialMediaPost {
  return {
    ...post,
    createdAt: convertTimestampToString(post.createdAt),
    updatedAt: convertTimestampToString(post.updatedAt),
    scheduledAt: convertTimestampToString(post.scheduledAt),
    imageGeneratedAt: convertTimestampToString(post.imageGeneratedAt),
  };
}


export async function getSocialPostByIdAction(
  postId: string
): Promise<ActionResult<SocialMediaPost>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  if (!postId) {
    return { success: false, error: 'Post ID is required' };
  }

  try {
    const postRef = doc(serverDb, 'socialPosts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found' };
    }

    const postData = { id: postSnap.id, ...postSnap.data() } as any;
    
    // Security: Only allow public access to published blog posts and sales pages
    const allowedPlatforms = ['BlogPost', 'SalesLandingPage'];
    if (!allowedPlatforms.includes(postData.platform)) {
      return { success: false, error: 'Post not found' };
    }
    
    // Only show posts that are marked as Posted (not drafts)
    if (postData.status !== 'Posted') {
      return { success: false, error: 'Post not found' };
    }

    const serializedPost = serializePost(postData);

    return { success: true, data: serializedPost };
  } catch (error) {
    console.error("Error fetching social media post:", error);
    return { success: false, error: 'Failed to fetch social media post' };
  }
}

export async function getStoredSocialMediaPostsAction(
  userId: string,
  companyId: string
): Promise<ActionResult<SocialMediaPost[]>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  const verification = await verifyUserBelongsToCompany(userId, companyId);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  try {
    const postsCol = collection(serverDb, 'socialPosts');
    const q = query(postsCol, where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    const postSnapshot = await getDocs(q);
    
    if (postSnapshot.empty) {
      return { success: true, data: [] };
    }

    const posts = postSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as any));

    const serializedPosts = posts.map(serializePost);

    return { success: true, data: serializedPosts };
  } catch (error) {
    console.error("Error fetching social media posts:", error);
    return { success: false, error: 'Failed to fetch social media posts' };
  }
}

export async function addStoredSocialMediaPostAction(
  userId: string,
  postData: Omit<SocialMediaPost, 'id' | 'createdAt'>
): Promise<ActionResult<SocialMediaPost>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  if (!postData.companyId) {
    return { success: false, error: 'Company ID is required' };
  }

  const verification = await verifyUserBelongsToCompany(userId, postData.companyId);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  try {
    let cleanedData = { ...postData };
    const base64ImageUri = cleanedData.imageUrl;
    let finalImageUrl = cleanedData.imageUrl;
    
    // Only upload if it's a new AI-generated image (in base64 format)
    // NOTE: Credit deduction is handled by the `generateTrackedImageAction`, not here.
    if (cleanedData.isAiGeneratedImage && base64ImageUri && base64ImageUri.startsWith('data:image')) {
      console.log('Uploading base64 image to ImgBB...');
      try {
        const publicUrl = await uploadImageToImgBB(base64ImageUri);
        finalImageUrl = publicUrl;
        
        // Replace placeholder in HTML content
        if (cleanedData.textContent) {
          const placeholderOrBase64Regex = /(https?:\/\/placehold\.co\/[\w/.]+)|(data:image\/[a-zA-Z]+;base64,[^"')\s]+)/g;
          cleanedData.textContent = cleanedData.textContent.replace(placeholderOrBase64Regex, publicUrl);
        }
        
        cleanedData.imageGeneratedAt = new Date().toISOString();

      } catch (uploadError: any) {
        console.error('Failed to upload image to ImgBB:', uploadError);
        return { success: false, error: `Failed to upload image: ${uploadError.message}` };
      }
    }
    
    const postPayload: any = {
      ...cleanedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Only include imageUrl if it exists (Firestore doesn't accept undefined)
    if (finalImageUrl) {
      postPayload.imageUrl = finalImageUrl;
    }
    
    const docRef = await addDoc(collection(serverDb, 'socialPosts'), postPayload);
    const docSnap = await getDoc(docRef);
    
    const newPost = serializePost({ id: docSnap.id, ...docSnap.data() });

    return { success: true, data: newPost };
  } catch (error) {
    console.error("Error adding social media post:", error);
    return { success: false, error: 'Failed to add social media post' };
  }
}

export async function updateStoredSocialMediaPostAction(
  userId: string,
  updatedData: Partial<SocialMediaPost> & { id: string }
): Promise<ActionResult> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  const { id, ...dataToUpdate } = updatedData;

  if (!id) {
    return { success: false, error: 'Post ID is required' };
  }

  try {
    const postRef = doc(serverDb, 'socialPosts', id);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found' };
    }

    const postData = postSnap.data() as SocialMediaPost;
    
    const verification = await verifyUserBelongsToCompany(userId, postData.companyId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    let finalDataToUpdate = { ...dataToUpdate };
    const base64ImageUri = finalDataToUpdate.imageUrl;
    
    // Only upload if it's a *new* base64 image being provided for an update
    if (finalDataToUpdate.isAiGeneratedImage && base64ImageUri && base64ImageUri.startsWith('data:image')) {
      console.log('Uploading new base64 image to ImgBB for update...');
      try {
        const publicUrl = await uploadImageToImgBB(base64ImageUri);
        finalDataToUpdate.imageUrl = publicUrl;
        
        if (finalDataToUpdate.textContent) {
          const placeholderOrOldUrlRegex = /(https?:\/\/placehold\.co\/[\w/.]+)|(data:image\/[a-zA-Z]+;base64,[^"')\s]+)|(https?:\/\/i\.ibb\.co\/[\w/.]+)/g;
          finalDataToUpdate.textContent = finalDataToUpdate.textContent.replace(placeholderOrOldUrlRegex, publicUrl);
        }
        
        finalDataToUpdate.imageGeneratedAt = new Date().toISOString();

      } catch (uploadError: any) {
        console.error('Failed to upload image to ImgBB during update:', uploadError);
        return { success: false, error: `Failed to upload image: ${uploadError.message}` };
      }
    }
    
    const updatePayload = {
      ...finalDataToUpdate,
      updatedAt: serverTimestamp()
    };

    await updateDoc(postRef, updatePayload);
    return { success: true };
  } catch (error) {
    console.error("Error updating social media post:", error);
    return { success: false, error: 'Failed to update social media post' };
  }
}


export async function deleteStoredSocialMediaPostAction(
  userId: string,
  postId: string
): Promise<ActionResult> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  if (!postId) {
    return { success: false, error: 'Post ID is required' };
  }

  try {
    const postRef = doc(serverDb, 'socialPosts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found' };
    }

    const postData = postSnap.data() as SocialMediaPost;
    
    const verification = await verifyUserBelongsToCompany(userId, postData.companyId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    await deleteDoc(postRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting social media post:", error);
    return { success: false, error: 'Failed to delete social media post' };
  }
}

export async function togglePostStatusAction(
  userId: string,
  postId: string,
  newStatus: 'Draft' | 'Posted'
): Promise<ActionResult> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  if (!postId) {
    return { success: false, error: 'Post ID is required' };
  }

  try {
    const postRef = doc(serverDb, 'socialPosts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      return { success: false, error: 'Post not found' };
    }

    const postData = postSnap.data() as SocialMediaPost;
    
    const verification = await verifyUserBelongsToCompany(userId, postData.companyId);
    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    await updateDoc(postRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling post status:", error);
    return { success: false, error: 'Failed to update post status' };
  }
}

export async function migrateBlogPostsToPostedStatus(
  userId: string,
  companyId: string
): Promise<ActionResult<{ updated: number }>> {
  if (!serverDb) {
    return { success: false, error: 'Database not initialized' };
  }

  const verification = await verifyUserBelongsToCompany(userId, companyId);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  try {
    const postsCol = collection(serverDb, 'socialPosts');
    const q = query(
      postsCol, 
      where('companyId', '==', companyId),
      where('status', '==', 'Draft')
    );
    const querySnapshot = await getDocs(q);
    
    let updatedCount = 0;
    const updatePromises: Promise<void>[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Only update BlogPost and SalesLandingPage
      if (data.platform === 'BlogPost' || data.platform === 'SalesLandingPage') {
        const postRef = doc(serverDb!, 'socialPosts', docSnap.id);
        const updatePromise = updateDoc(postRef, {
          status: 'Posted',
          updatedAt: serverTimestamp()
        });
        updatePromises.push(updatePromise);
        updatedCount++;
      }
    });

    await Promise.all(updatePromises);

    return { 
      success: true, 
      data: { updated: updatedCount }
    };
  } catch (error) {
    console.error("Error migrating blog posts:", error);
    return { success: false, error: 'Failed to migrate blog posts' };
  }
}
