
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Copy, Users as UsersIcon, Briefcase, Award, Building, Linkedin, ClipboardCopy, Mail } from 'lucide-react';
import type { GenerateLinkedInAdContentInput, GenerateLinkedInAdContentOutput } from '@/ai/flows/generate-linkedin-ad-content-flow';
import { languageOptions } from '@/lib/language-options';

interface LinkedInAdSectionProps {
  isLoading: boolean;
  inputs: GenerateLinkedInAdContentInput;
  output: GenerateLinkedInAdContentOutput | null;
  onInputChange: (field: keyof GenerateLinkedInAdContentInput, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  onUseImagePromptAndGo: (promptText?: string | null) => void;
  onUseAdForEmail: (details: { name: string; subject: string; content: string }) => void;
  linkedinAdGeneratorRef: React.RefObject<HTMLDivElement>;
}

const LinkedInAdSectionComponent: React.FC<LinkedInAdSectionProps> = ({
  isLoading, inputs, output, onInputChange, onSubmit, onCopyToClipboard, onUseImagePromptAndGo, onUseAdForEmail, linkedinAdGeneratorRef
}) => {
  return (
    <Card ref={linkedinAdGeneratorRef}>
        <CardHeader>
          <CardTitle className="flex items-center"><Linkedin className="mr-2 h-5 w-5 text-sky-700" />LinkedIn Ads Professional Suite</CardTitle>
          <CardDescription>
            AI for B2B campaign planning, professional ad copy, sponsored content ideas, and targeting suggestions for LinkedIn.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div><Label htmlFor="li-product">B2B Product/Service Name *</Label><Input id="li-product" value={inputs.b2bProductOrService} onChange={e => onInputChange('b2bProductOrService', e.target.value)} placeholder="e.g., Enterprise CRM Solution, Cybersecurity Training" required /></div>
            <div><Label htmlFor="li-valueProp">Value Proposition *</Label><Textarea id="li-valueProp" value={inputs.valueProposition} onChange={e => onInputChange('valueProposition', e.target.value)} placeholder="e.g., Streamline sales with AI-powered insights, Protect your business from advanced threats" required rows={2} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="li-targetIndustry">Target Industry (Optional)</Label><Input id="li-targetIndustry" value={inputs.targetIndustry || ''} onChange={e => onInputChange('targetIndustry', e.target.value)} placeholder="e.g., Financial Services, Healthcare IT" /></div>
              <div><Label htmlFor="li-targetRole">Target Role/Seniority (Optional)</Label><Input id="li-targetRole" value={inputs.targetRole || ''} onChange={e => onInputChange('targetRole', e.target.value)} placeholder="e.g., CTOs, Marketing Directors" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="li-adObjective">Ad Objective *</Label><Select value={inputs.adObjective} onValueChange={(value) => onInputChange('adObjective', value)}><SelectTrigger id="li-adObjective"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lead Generation">Lead Generation</SelectItem><SelectItem value="Brand Awareness">Brand Awareness</SelectItem><SelectItem value="Website Visits">Website Visits</SelectItem><SelectItem value="Engagement">Engagement</SelectItem><SelectItem value="Talent Acquisition">Talent Acquisition</SelectItem></SelectContent></Select></div>
              <div><Label htmlFor="li-desiredTone">Desired Tone *</Label><Select value={inputs.desiredTone} onValueChange={(value) => onInputChange('desiredTone', value)}><SelectTrigger id="li-desiredTone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Authoritative">Authoritative</SelectItem><SelectItem value="Insightful">Insightful</SelectItem><SelectItem value="Innovative">Innovative</SelectItem><SelectItem value="Friendly">Friendly</SelectItem><SelectItem value="Problem-solving">Problem-solving</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label htmlFor="li-numVariations"># Variations (1-3)</Label><Select value={(inputs.numVariations || 1).toString()} onValueChange={(value) => onInputChange('numVariations', parseInt(value, 10) || 1)}><SelectTrigger id="li-numVariations"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="li-targetLanguage">Ad Language</Label><Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}><SelectTrigger id="li-targetLanguage"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate LinkedIn Ad Content</Button>
          </CardFooter>
        </form>
        {output && (
          <CardContent className="mt-6 border-t pt-6 space-y-6">
            <h3 className="text-lg font-semibold">Generated LinkedIn Ad Content:</h3>
            {output.adVariations.map((variation, index) => (
              <Card key={`li-var-${index}`} className="p-4 bg-muted/20">
                <CardTitle className="text-md mb-3">Variation {index + 1}</CardTitle>
                <div className="space-y-3 text-sm">
                  <div><Label className="font-semibold">Introductory Text:</Label><Textarea value={variation.introductoryText} readOnly rows={3} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.introductoryText, "Introductory Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Headline:</Label><Input value={variation.headline} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.headline, "Headline")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Sponsored Content Outline:</Label><Textarea value={variation.sponsoredContentOutline} readOnly rows={3} className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.sponsoredContentOutline, "Sponsored Content Outline")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                  <div><Label className="font-semibold">Suggested Image Prompt:</Label><Textarea value={variation.suggestedImagePrompt} readOnly rows={2} className="mt-1 bg-background/70" /><div className="flex gap-1 mt-1"><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.suggestedImagePrompt, "Image Prompt")}><Copy className="mr-1 h-3 w-3" />Copy</Button><Button variant="default" size="xs" onClick={() => onUseImagePromptAndGo(variation.suggestedImagePrompt)}><Wand2 className="mr-1 h-3 w-3" />Use for Image Gen</Button></div></div>
                  <div><Label className="font-semibold">Call to Action Text:</Label><Input value={variation.callToActionText} readOnly className="mt-1 bg-background/70" /><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(variation.callToActionText, "CTA Text")} className="mt-1"><Copy className="mr-1 h-3 w-3" />Copy</Button></div>
                </div>
                 <div className="mt-4 pt-3 border-t">
                  <Button variant="secondary" size="sm" onClick={() => onUseAdForEmail({ name: `Email from Ad: ${inputs.b2bProductOrService}`, subject: variation.headline, content: variation.introductoryText })}>
                      <Mail className="mr-2 h-4 w-4" /> Create Email Campaign from this Ad
                  </Button>
                </div>
              </Card>
            ))}
            {output.targetingSuggestions && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-md flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary"/>AI Suggested LinkedIn Targeting:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><Label className="flex items-center mb-1"><UsersIcon className="mr-1 h-4 w-4 text-sky-600"/>Job Titles:</Label><ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground bg-muted/30 p-2 rounded-md text-xs">{output.targetingSuggestions.jobTitles.map((jt, i) => <li key={`jt-${i}`}>{jt}</li>)}</ul><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.targetingSuggestions.jobTitles, "Job Titles")} className="mt-1"><Copy className="mr-1 h-3 w-3"/>Copy</Button></div>
                    <div><Label className="flex items-center mb-1"><Award className="mr-1 h-4 w-4 text-sky-600"/>Skills:</Label><ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground bg-muted/30 p-2 rounded-md text-xs">{output.targetingSuggestions.skills.map((sk, i) => <li key={`sk-${i}`}>{sk}</li>)}</ul><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.targetingSuggestions.skills, "Skills")} className="mt-1"><Copy className="mr-1 h-3 w-3"/>Copy</Button></div>
                    <div><Label className="flex items-center mb-1"><Building className="mr-1 h-4 w-4 text-sky-600"/>Industries:</Label><ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground bg-muted/30 p-2 rounded-md text-xs">{output.targetingSuggestions.industries.map((ind, i) => <li key={`ind-${i}`}>{ind}</li>)}</ul><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.targetingSuggestions.industries, "Industries")} className="mt-1"><Copy className="mr-1 h-3 w-3"/>Copy</Button></div>
                    <div><Label className="flex items-center mb-1"><UsersIcon className="mr-1 h-4 w-4 text-sky-600"/>Company Sizes:</Label><ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground bg-muted/30 p-2 rounded-md text-xs">{output.targetingSuggestions.companySizes.map((cs, i) => <li key={`cs-${i}`}>{cs}</li>)}</ul><Button variant="outline" size="xs" onClick={() => onCopyToClipboard(output.targetingSuggestions.companySizes, "Company Sizes")} className="mt-1"><Copy className="mr-1 h-3 w-3"/>Copy</Button></div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
  );
};

export const LinkedInAdSection = React.memo(LinkedInAdSectionComponent);
export default LinkedInAdSection;
