'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { createCustomTemplate } from '@/app/actions/template-marketplace-actions';
import type { TemplateType, Industry, TemplateCategory } from '@/types/templates';

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'service', label: 'Service Business' },
];

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
  { value: 'special_offer', label: 'Special Offer' },
];

export default function CreateTemplateDialog() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'email' as TemplateType,
    name: '',
    description: '',
    subject: '',
    content: '',
    industry: ['general'] as Industry[],
    category: 'promotional' as TemplateCategory,
    isPublic: false,
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');

  const extractVariables = (text: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.slice(1, -1))));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create templates',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name || !formData.description || !formData.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const variables = extractVariables(formData.content + ' ' + (formData.subject || ''));
      
      const result = await createCustomTemplate(
        appUser.companyId,
        appUser.uid,
        appUser.name || 'Unknown User',
        {
          type: formData.type,
          name: formData.name,
          description: formData.description,
          subject: formData.type === 'email' ? formData.subject : undefined,
          content: formData.content,
          industry: formData.industry,
          category: formData.category,
          variables,
          isPublic: formData.isPublic,
          tags: formData.tags,
        }
      );

      if (result.success) {
        toast({
          title: '✅ Template Created',
          description: 'Your custom template has been saved successfully!',
        });
        
        // Reset form
        setFormData({
          type: 'email',
          name: '',
          description: '',
          subject: '',
          content: '',
          industry: ['general'],
          category: 'promotional',
          isPublic: false,
          tags: [],
        });
        
        setOpen(false);
      } else {
        throw new Error(result.error || 'Failed to create template');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag),
    });
  };

  const toggleIndustry = (industry: Industry) => {
    const currentIndustries = formData.industry;
    if (currentIndustries.includes(industry)) {
      setFormData({
        ...formData,
        industry: currentIndustries.filter(i => i !== industry),
      });
    } else {
      setFormData({
        ...formData,
        industry: [...currentIndustries, industry],
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Custom Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template for your emails and SMS messages. Use {'{'}variable{'}'} syntax for dynamic content.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Type */}
          <div className="space-y-2">
            <Label>Template Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: TemplateType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Template</SelectItem>
                <SelectItem value="sms">SMS Template</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Name */}
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Holiday Sale Announcement"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of when to use this template"
              required
            />
          </div>

          {/* Subject (Email only) */}
          {formData.type === 'email' && (
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., {'{'}name{'}'}, Check Out Our Holiday Sale! 🎉"
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label>Content *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={formData.type === 'email' 
                ? "Hi {name},\n\nWelcome to {business}!\n\nBest regards,\n{sender_name}"
                : "Hi {name}, your appointment at {business} is tomorrow at {time}. See you then!"
              }
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use {'{'}variable{'}'} syntax for dynamic content (e.g., {'{'}name{'}'}, {'{'}business{'}'})
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value: TemplateCategory) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label>Industries (Select all that apply)</Label>
            <div className="grid grid-cols-2 gap-2">
              {INDUSTRIES.map(ind => (
                <div key={ind.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`industry-${ind.value}`}
                    checked={formData.industry.includes(ind.value)}
                    onCheckedChange={() => toggleIndustry(ind.value)}
                  />
                  <label
                    htmlFor={`industry-${ind.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {ind.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add tags for easier searching"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Public Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked as boolean })}
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Make this template public (Share with other OmniFlow users)
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
