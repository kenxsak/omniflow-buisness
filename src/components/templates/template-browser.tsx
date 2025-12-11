'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { Template, TemplateType, Industry } from '@/types/templates';
import { getTemplates } from '@/app/actions/template-actions';
import TemplateCard from './template-card';
import TemplatePreview from './template-preview';
import { useAuth } from '@/hooks/use-auth';

interface TemplateBrowserProps {
  filterType?: TemplateType;
  onApply: (subject: string | undefined, content: string) => void;
}

const industryOptions: { value: Industry | 'all'; label: string }[] = [
  { value: 'all', label: 'All Industries' },
  { value: 'general', label: 'General' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'service', label: 'Service Business' },
];

export default function TemplateBrowser({ filterType, onApply }: TemplateBrowserProps) {
  const { appUser } = useAuth();
  const [selectedType, setSelectedType] = useState<TemplateType>(filterType || 'email');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (filterType) {
      setSelectedType(filterType);
    }
  }, [filterType]);

  useEffect(() => {
    loadTemplates();
  }, [selectedType, selectedIndustry, searchQuery, appUser?.companyId]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const industry = selectedIndustry === 'all' ? undefined : selectedIndustry;
      const result = await getTemplates(selectedType, industry, undefined, searchQuery, appUser?.companyId);
      setTemplates(result);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const handleApplyTemplate = (subject: string | undefined, content: string) => {
    onApply(subject, content);
    setIsPreviewOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedIndustry} onValueChange={(value) => setSelectedIndustry(value as Industry | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            {industryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!filterType && (
        <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as TemplateType)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="email">Email Templates</TabsTrigger>
            <TabsTrigger value="sms">SMS Templates</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">No templates found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
              />
            ))}
          </div>
        )}
      </div>

      <TemplatePreview
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onApply={handleApplyTemplate}
      />
    </div>
  );
}
