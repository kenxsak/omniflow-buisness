"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Plus, Info, ExternalLink, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addMSG91TemplateAction, type MSG91Template } from '@/app/actions/msg91-actions';
import { parseTemplateVariables } from '@/lib/sms-templates-sync';
import Link from 'next/link';

interface AddTemplateDialogProps {
  idToken: string;
  onTemplateAdded: () => void;
  trigger?: React.ReactNode;
}

export function AddTemplateDialog({ idToken, onTemplateAdded, trigger }: AddTemplateDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [dltId, setDltId] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [templateType, setTemplateType] = useState<'promotional' | 'transactional'>('transactional');
  
  const [existingTemplate, setExistingTemplate] = useState<MSG91Template | null>(null);
  const [showDuplicateOptions, setShowDuplicateOptions] = useState(false);

  const detectedVariables = useMemo(() => {
    if (!templateText) return { count: 0, positions: [] };
    return parseTemplateVariables(templateText, 'msg91');
  }, [templateText]);

  const highlightedText = useMemo(() => {
    if (!templateText) return '';
    
    let result = templateText;
    const pattern = /##[^#]+##/g;
    
    result = result.replace(pattern, (match) => {
      return `<span class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded font-medium">${match}</span>`;
    });
    
    return result;
  }, [templateText]);

  const resetForm = () => {
    setTemplateName('');
    setTemplateId('');
    setDltId('');
    setTemplateText('');
    setTemplateType('transactional');
    setExistingTemplate(null);
    setShowDuplicateOptions(false);
  };

  const handleSubmit = async (forceUpdate = false) => {
    if (!templateName.trim()) {
      toast({
        title: 'Template Name Required',
        description: 'Please enter a name for this template',
        variant: 'destructive',
      });
      return;
    }

    if (!templateId.trim()) {
      toast({
        title: 'MSG91 Template ID Required',
        description: 'Please enter the MSG91 Template ID from your MSG91 dashboard',
        variant: 'destructive',
      });
      return;
    }

    if (!dltId.trim()) {
      toast({
        title: 'DLT Template ID Required',
        description: 'Please enter the DLT Template ID (TRAI approval ID)',
        variant: 'destructive',
      });
      return;
    }

    if (!templateText.trim()) {
      toast({
        title: 'Template Text Required',
        description: 'Please enter the template text exactly as registered with DLT',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addMSG91TemplateAction({
        idToken,
        template: {
          templateId: templateId.trim(),
          dltId: dltId.trim(),
          name: templateName.trim(),
          text: templateText.trim(),
          type: templateType,
        },
        upsert: forceUpdate,
      });

      if (result.success) {
        toast({
          title: result.isUpdate ? 'Template Updated' : 'Template Added',
          description: result.isUpdate 
            ? `"${templateName}" has been updated` 
            : `"${templateName}" has been added to your templates`,
        });
        resetForm();
        setOpen(false);
        onTemplateAdded();
      } else if (result.existingTemplate) {
        setExistingTemplate(result.existingTemplate);
        setShowDuplicateOptions(true);
      } else {
        toast({
          title: 'Failed to Add Template',
          description: result.error || 'An error occurred while adding the template',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add template',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseExisting = () => {
    toast({
      title: 'Using Existing Template',
      description: `Template "${existingTemplate?.name}" is ready for use`,
    });
    resetForm();
    setOpen(false);
    onTemplateAdded();
  };

  const handleUpdateExisting = async () => {
    await handleSubmit(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add MSG91 Template</DialogTitle>
          <DialogDescription>
            Add an approved DLT template for use in SMS campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              placeholder="e.g., Welcome Message, OTP Template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name to identify this template
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateId">MSG91 Template ID</Label>
              <Input
                id="templateId"
                placeholder="e.g., 12345678"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in MSG91 Dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dltId">DLT Template ID</Label>
              <Input
                id="dltId"
                placeholder="e.g., 1107xxxxx"
                value={dltId}
                onChange={(e) => setDltId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                TRAI DLT approval ID
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateType">Template Type</Label>
            <Select value={templateType} onValueChange={(v) => setTemplateType(v as 'promotional' | 'transactional')}>
              <SelectTrigger id="templateType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactional">Transactional (OTPs, Alerts)</SelectItem>
                <SelectItem value="promotional">Promotional (Offers, Marketing)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="templateText">Template Text</Label>
              {detectedVariables.count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {detectedVariables.count} variable{detectedVariables.count > 1 ? 's' : ''} detected
                </Badge>
              )}
            </div>
            <Textarea
              id="templateText"
              placeholder="Dear ##name##, your OTP is ##otp##. Valid for 10 minutes."
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the exact template text as registered with DLT. Use <code className="bg-muted px-1 rounded">##variable##</code> format for variables.
            </p>
          </div>

          {templateText && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview with highlighted variables:</p>
              <div 
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: highlightedText }}
              />
            </div>
          )}

          {showDuplicateOptions && existingTemplate ? (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">Template Already Exists</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  A template with this Template ID or DLT ID already exists:
                </p>
                <div className="p-2 bg-white dark:bg-amber-900/40 rounded border border-amber-200 dark:border-amber-700">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{existingTemplate.name}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Template ID: {existingTemplate.templateId} | DLT ID: {existingTemplate.dltId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUseExisting}
                    className="border-green-500 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Use Existing
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateExisting}
                    disabled={isSubmitting}
                    className="border-blue-500 text-blue-700 hover:bg-blue-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Update Template
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDuplicateOptions(false);
                      setExistingTemplate(null);
                    }}
                  >
                    Edit Details
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <p className="text-sm font-medium mb-1">Where to find Template IDs?</p>
                <ul className="text-xs space-y-1 list-disc ml-4">
                  <li><strong>MSG91 Template ID:</strong> MSG91 Dashboard → Templates</li>
                  <li><strong>DLT Template ID:</strong> Your telecom provider's DLT portal</li>
                </ul>
                <Link 
                  href="https://msg91.com" 
                  target="_blank" 
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                >
                  Open MSG91 Dashboard <ExternalLink className="h-3 w-3" />
                </Link>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {!showDuplicateOptions && (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
