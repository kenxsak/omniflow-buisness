'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Eye } from 'lucide-react';
import type { Template } from '@/types/templates';

interface TemplateCardProps {
  template: Template;
  onPreview: (template: Template) => void;
}

const categoryColors: Record<string, string> = {
  welcome: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  promotional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  followup: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  reminder: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  abandoned_cart: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  special_offer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const categoryLabels: Record<string, string> = {
  welcome: 'Welcome',
  promotional: 'Promotional',
  followup: 'Follow-up',
  reminder: 'Reminder',
  abandoned_cart: 'Abandoned Cart',
  special_offer: 'Special Offer',
};

const industryLabels: Record<string, string> = {
  general: 'General',
  restaurant: 'Restaurant',
  ecommerce: 'E-commerce',
  realestate: 'Real Estate',
  salon: 'Salon',
  coaching: 'Coaching',
  service: 'Service',
};

export default function TemplateCard({ template, onPreview }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {template.type === 'email' ? (
              <Mail className="h-4 w-4 text-muted-foreground" />
            ) : (
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant="outline" className={categoryColors[template.category]}>
              {categoryLabels[template.category]}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex flex-wrap gap-1 mb-4">
          {template.industry.map((ind) => (
            <Badge key={ind} variant="secondary" className="text-xs">
              {industryLabels[ind]}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => onPreview(template)} 
            className="flex-1"
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview & Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
