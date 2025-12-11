'use server';

/**
 * Template Marketplace Server Actions
 * 
 * Allows users to create, share, rate, and track template usage
 */

import { serverDb } from '@/lib/firebase-server';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  Timestamp 
} from 'firebase/firestore';
import type { 
  Template, 
  CreateCustomTemplateInput, 
  TemplateRating,
  TemplateUsage 
} from '@/types/templates';
import { defaultTemplates } from '@/lib/template-data';

/**
 * Create a custom template
 */
export async function createCustomTemplate(
  companyId: string,
  userId: string,
  userName: string,
  input: CreateCustomTemplateInput
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const templatesRef = collection(serverDb, 'customTemplates');
    
    const templateData = {
      ...input,
      companyId,
      userId,
      userName,
      popularity: 0,
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
      createdBy: userId,
      createdAt: serverTimestamp(),
      isPublic: input.isPublic ?? false,
    };

    const docRef = await addDoc(templatesRef, templateData);

    return { 
      success: true, 
      templateId: docRef.id 
    };
  } catch (error: any) {
    console.error('Error creating custom template:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create template' 
    };
  }
}

/**
 * Get all templates (default + custom)
 */
export async function getAllTemplates(
  companyId: string,
  options?: {
    type?: Template['type'];
    industry?: string;
    category?: string;
    searchQuery?: string;
    includePublic?: boolean;
  }
): Promise<{ success: boolean; data?: Template[]; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get custom templates - fetch both company-specific AND public templates
    let customTemplates: Template[] = [];
    
    // Always get company-specific templates
    const companyQuery = query(
      collection(serverDb, 'customTemplates'),
      where('companyId', '==', companyId)
    );
    const companySnapshot = await getDocs(companyQuery);
    const companyTemplates = companySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
    })) as Template[];
    
    customTemplates = [...companyTemplates];
    
    // If includePublic, also fetch public templates from other companies (limit to first 100 to prevent memory overload)
    if (options?.includePublic) {
      const publicQuery = query(
        collection(serverDb, 'customTemplates'),
        where('isPublic', '==', true),
        firestoreLimit(100) // Limit public templates to prevent loading thousands into memory
      );
      const publicSnapshot = await getDocs(publicQuery);
      const publicTemplates = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data().createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
      })) as Template[];
      
      // Merge, avoiding duplicates (company's public templates are already included)
      const existingIds = new Set(customTemplates.map(t => t.id));
      const uniquePublic = publicTemplates.filter(t => !existingIds.has(t.id));
      customTemplates = [...customTemplates, ...uniquePublic];
    }

    // Combine with default templates
    let allTemplates = [...defaultTemplates, ...customTemplates];

    // Apply filters
    if (options?.type) {
      allTemplates = allTemplates.filter(t => t.type === options.type);
    }

    if (options?.industry && options.industry !== 'general') {
      allTemplates = allTemplates.filter(t => 
        t.industry.includes(options.industry as any) || 
        t.industry.includes('general')
      );
    }

    if (options?.category) {
      allTemplates = allTemplates.filter(t => t.category === options.category);
    }

    if (options?.searchQuery && options.searchQuery.trim() !== '') {
      const query = options.searchQuery.toLowerCase().trim();
      allTemplates = allTemplates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        (t.subject && t.subject.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Sort by popularity and rating
    allTemplates.sort((a, b) => {
      const aScore = (a.popularity || 0) + (a.rating || 0) * 10 + (a.usageCount || 0);
      const bScore = (b.popularity || 0) + (b.rating || 0) * 10 + (b.usageCount || 0);
      return bScore - aScore;
    });

    return { success: true, data: allTemplates };
  } catch (error: any) {
    console.error('Error getting templates:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get templates' 
    };
  }
}

/**
 * Track template usage
 */
export async function trackTemplateUsage(
  templateId: string,
  companyId: string,
  userId: string,
  type: Template['type']
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Record usage
    const usageRef = collection(serverDb, 'templateUsage');
    await addDoc(usageRef, {
      templateId,
      companyId,
      userId,
      type,
      usedAt: serverTimestamp(),
    });

    // Update usage count if it's a custom template
    const templateRef = doc(serverDb, 'customTemplates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (templateSnap.exists()) {
      await updateDoc(templateRef, {
        usageCount: increment(1),
        popularity: increment(1),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error tracking template usage:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to track usage' 
    };
  }
}

/**
 * Rate a template
 */
export async function rateTemplate(
  templateId: string,
  companyId: string,
  userId: string,
  userName: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5' };
    }

    // Check if user already rated this template
    const existingRatingQuery = query(
      collection(serverDb, 'templateRatings'),
      where('templateId', '==', templateId),
      where('userId', '==', userId)
    );
    const existingRatings = await getDocs(existingRatingQuery);

    if (!existingRatings.empty) {
      // Update existing rating
      const ratingDoc = existingRatings.docs[0];
      await updateDoc(doc(serverDb, 'templateRatings', ratingDoc.id), {
        rating,
        review,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new rating
      await addDoc(collection(serverDb, 'templateRatings'), {
        templateId,
        companyId,
        userId,
        userName,
        rating,
        review,
        createdAt: serverTimestamp(),
      });
    }

    // Recalculate average rating for the template
    const allRatingsQuery = query(
      collection(serverDb, 'templateRatings'),
      where('templateId', '==', templateId)
    );
    const allRatings = await getDocs(allRatingsQuery);
    
    const ratings = allRatings.docs.map(doc => doc.data().rating as number);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    // Update template rating
    const templateRef = doc(serverDb, 'customTemplates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (templateSnap.exists()) {
      await updateDoc(templateRef, {
        rating: avgRating,
        ratingCount: ratings.length,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error rating template:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to rate template' 
    };
  }
}

/**
 * Get template ratings
 */
export async function getTemplateRatings(
  templateId: string,
  limitCount: number = 10
): Promise<{ success: boolean; data?: TemplateRating[]; error?: string }> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const q = query(
      collection(serverDb, 'templateRatings'),
      where('templateId', '==', templateId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    const ratings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: (doc.data().createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
    })) as TemplateRating[];

    return { success: true, data: ratings };
  } catch (error: any) {
    console.error('Error getting template ratings:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get ratings' 
    };
  }
}

/**
 * Get template analytics
 */
export async function getTemplateAnalytics(
  templateId: string
): Promise<{ 
  success: boolean; 
  data?: { 
    totalUsage: number; 
    usageByType: Record<string, number>;
    averageRating: number;
    totalRatings: number;
  }; 
  error?: string 
}> {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    // Get usage count
    const usageQuery = query(
      collection(serverDb, 'templateUsage'),
      where('templateId', '==', templateId)
    );
    const usageSnapshot = await getDocs(usageQuery);
    const totalUsage = usageSnapshot.size;

    const usageByType: Record<string, number> = {};
    usageSnapshot.docs.forEach(doc => {
      const type = doc.data().type as string;
      usageByType[type] = (usageByType[type] || 0) + 1;
    });

    // Get ratings
    const ratingsQuery = query(
      collection(serverDb, 'templateRatings'),
      where('templateId', '==', templateId)
    );
    const ratingsSnapshot = await getDocs(ratingsQuery);
    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating as number);
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
      : 0;

    return {
      success: true,
      data: {
        totalUsage,
        usageByType,
        averageRating,
        totalRatings: ratings.length,
      },
    };
  } catch (error: any) {
    console.error('Error getting template analytics:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get analytics' 
    };
  }
}
