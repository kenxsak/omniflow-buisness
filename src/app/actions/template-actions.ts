'use server';

import { defaultTemplates } from '@/lib/template-data';
import type { Template, TemplateType, Industry, TemplateCategory, ApplyTemplateInput, ApplyTemplateOutput } from '@/types/templates';
import { getAllTemplates } from './template-marketplace-actions';

export async function getTemplates(
  type?: TemplateType,
  industry?: Industry,
  category?: TemplateCategory,
  searchQuery?: string,
  companyId?: string
): Promise<Template[]> {
  // If companyId is provided, get all templates including custom ones
  if (companyId) {
    const result = await getAllTemplates(companyId, {
      type,
      industry,
      category,
      searchQuery,
      includePublic: true
    });
    
    if (result.success && result.data) {
      return result.data;
    }
  }
  
  // Fallback to default templates only
  let filtered = [...defaultTemplates];

  if (type) {
    filtered = filtered.filter(t => t.type === type);
  }

  if (industry && industry !== 'general') {
    filtered = filtered.filter(t => t.industry.includes(industry) || t.industry.includes('general'));
  }

  if (category) {
    filtered = filtered.filter(t => t.category === category);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.content.toLowerCase().includes(query) ||
      (t.subject && t.subject.toLowerCase().includes(query))
    );
  }

  return filtered.sort((a, b) => b.popularity - a.popularity);
}

export async function applyTemplate(
  input: ApplyTemplateInput,
  companyId?: string
): Promise<ApplyTemplateOutput | null> {
  // First check default templates
  let template = defaultTemplates.find(t => t.id === input.templateId);

  // If not found and companyId is provided, check custom templates
  if (!template && companyId) {
    const customTemplateResult = await getTemplateById(input.templateId, companyId);
    if (customTemplateResult) {
      template = customTemplateResult;
    }
  }

  if (!template) {
    return null;
  }

  let content = template.content;
  let subject = template.subject;

  for (const [key, value] of Object.entries(input.variableValues)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    content = content.replace(regex, value);
    if (subject) {
      subject = subject.replace(regex, value);
    }
  }

  return {
    subject,
    content,
  };
}

export async function getTemplateById(
  templateId: string,
  companyId?: string
): Promise<Template | null> {
  // First check default templates
  const template = defaultTemplates.find(t => t.id === templateId);
  if (template) {
    return template;
  }

  // If not found and companyId is provided, check Firestore custom templates
  if (companyId) {
    const { serverDb } = await import('@/lib/firebase-server');
    const { doc, getDoc, Timestamp } = await import('firebase/firestore');
    
    if (!serverDb) {
      return null;
    }

    try {
      const docRef = doc(serverDb, 'customTemplates', templateId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const timestamp = data.createdAt;
        return {
          id: docSnap.id,
          ...data,
          createdAt: (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp)
            ? timestamp.toDate().toISOString() 
            : new Date().toISOString(),
        } as Template;
      }
    } catch (error) {
      console.error('Error fetching custom template by ID:', error);
    }
  }

  return null;
}
