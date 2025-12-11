
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
import { generateTrackedWhatsappMessageAction } from '@/app/actions/tracked-ai-content-actions';
import { Loader2, Wand2, Send, ClipboardCopy } from 'lucide-react';
import { useCompanyApiKeys } from '@/hooks/use-company-api-keys';
import { useAuth } from '@/hooks/use-auth';
import { showAITaskCompleteToast } from '@/lib/ai-toast-helpers';

interface PlanWhatsappMessageDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (message: string) => void; // Callback to trigger wa.me link with the message
}

export default function PlanWhatsappMessageDialog({ lead, isOpen, onOpenChange, onSend }: PlanWhatsappMessageDialogProps) {
  const [leadContext, setLeadContext] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [suggestedMessage, setSuggestedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { companyName } = useCompanyApiKeys();
  const { appUser } = useAuth();
  
  const profileBusinessName = companyName || "Your Company";

  useEffect(() => {
    if (isOpen && lead) {
      setLeadContext(lead.source ? `Follow-up regarding ${lead.source}` : 'General follow-up');
      setDesiredOutcome('Schedule a brief chat');
      setSuggestedMessage(`Hi *${lead.name}*,\n\nI'm reaching out from ${profileBusinessName} about...\n\nBest regards,\n${profileBusinessName}`);
    } else {
      setLeadContext('');
      setDesiredOutcome('');
      setSuggestedMessage('');
    }
  }, [lead, isOpen, profileBusinessName]);

  const handleGenerateSuggestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!lead || !appUser) return;
    setIsLoading(true);
    setSuggestedMessage(''); // Clear previous suggestion

    try {
      const result = await generateTrackedWhatsappMessageAction(appUser.companyId, appUser.uid, {
        leadName: lead.name,
        leadContext: leadContext,
        desiredOutcome: desiredOutcome,
        senderBusinessName: profileBusinessName,
      });

      if(result.success && result.data){
        setSuggestedMessage(result.data.suggestedMessage);
        showAITaskCompleteToast(toast, "WhatsApp message planned", result.quotaInfo);
      } else {
        throw new Error(result.error || 'Failed to generate message.');
      }
    } catch (error: any) {
      toast({ title: 'AI Generation Failed', description: error.message || 'Could not generate message.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!suggestedMessage) {
        toast({ title: 'Nothing to Copy', description: 'Generate a message first.', variant: 'destructive'});
        return;
    }
    navigator.clipboard.writeText(suggestedMessage)
      .then(() => toast({ title: 'Message Copied!', description: 'WhatsApp message copied to clipboard.' }))
      .catch(() => toast({ title: 'Copy Failed', description: 'Could not copy message.', variant: 'destructive' }));
  };

  const handleTriggerSend = () => {
    if (!suggestedMessage) {
        toast({ title: 'No Message to Send', description: 'Generate or type a message first.', variant: 'destructive'});
        return;
    }
    onSend(suggestedMessage); // Call the prop to open wa.me link
    onOpenChange(false); // Close dialog after initiating send
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan WhatsApp Message for {lead.name}</DialogTitle>
          <DialogDescription>Let AI help you draft a compelling WhatsApp message.</DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <form onSubmit={handleGenerateSuggestion} className="space-y-4">
            <div>
                <Label htmlFor="wa-lead-context">Context/Reason for Contacting</Label>
                <Input 
                id="wa-lead-context" 
                value={leadContext} 
                onChange={(e) => setLeadContext(e.target.value)} 
                placeholder="e.g., Follow up on website inquiry for Product X"
                required 
                />
            </div>
            <div>
                <Label htmlFor="wa-desired-outcome">Desired Outcome</Label>
                <Input 
                id="wa-desired-outcome" 
                value={desiredOutcome} 
                onChange={(e) => setDesiredOutcome(e.target.value)} 
                placeholder="e.g., Schedule a 15-min call"
                required 
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate AI Suggestion
            </Button>
            </form>

            {suggestedMessage && (
            <div className="space-y-2 mt-4 pt-4 border-t">
                <Label htmlFor="wa-suggested-message">AI Suggested Message (Editable)</Label>
                <Textarea 
                id="wa-suggested-message"
                value={suggestedMessage}
                onChange={(e) => setSuggestedMessage(e.target.value)}
                rows={6}
                className="min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground">Review and edit the message. WhatsApp formatting like *bold* is supported.</p>
            </div>
            )}
        </div>

        <DialogFooter className="pt-0">
            <Button type="button" variant="outline" onClick={handleCopyToClipboard} disabled={!suggestedMessage}>
                <ClipboardCopy className="mr-2 h-4 w-4" /> Copy Message
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancel
                </Button>
                <Button type="button" onClick={handleTriggerSend} disabled={isLoading || !suggestedMessage}>
                <Send className="mr-2 h-4 w-4" /> Send via WhatsApp
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
