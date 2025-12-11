
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Copy, ClipboardCopy, ListFilter } from 'lucide-react';
import type { GenerateGoogleSearchAdCopyInput, AdCopyVariation as GoogleAdVariation } from '@/ai/flows/generate-google-search-ad-copy-flow';
import { languageOptions } from '@/lib/language-options';

interface GoogleSearchAdCopySectionProps {
  isLoading: boolean;
  inputs: GenerateGoogleSearchAdCopyInput;
  variations: GoogleAdVariation[] | null;
  onInputChange: (field: keyof GenerateGoogleSearchAdCopyInput, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  adCopyGeneratorRef: React.RefObject<HTMLDivElement>;
}

const GoogleSearchAdCopySectionComponent: React.FC<GoogleSearchAdCopySectionProps> = ({
  isLoading, inputs, variations, onInputChange, onSubmit, onCopyToClipboard, adCopyGeneratorRef
}) => {
  return (
    <Card ref={adCopyGeneratorRef}>
      <CardHeader>
        <CardTitle className="flex items-center"><ListFilter className="mr-2 h-5 w-5 text-primary" />Google Ads: Search Ad Copy Generator</CardTitle>
        <CardDescription>AI to generate compelling headlines and descriptions for Google Search ads, respecting strict character limits.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div><Label htmlFor="ga-product">Product/Service Name *</Label><Input id="ga-product" value={inputs.productOrService} onChange={e => onInputChange('productOrService', e.target.value)} placeholder="e.g., Premium Yoga Mats" required /></div>
          <div><Label htmlFor="ga-audience">Target Audience (Optional)</Label><Input id="ga-audience" value={inputs.targetAudience || ''} onChange={e => onInputChange('targetAudience', e.target.value)} placeholder="e.g., Eco-conscious yogis, Beginners" /></div>
          <div><Label htmlFor="ga-keywords">Primary Keywords * (comma-separated)</Label><Textarea id="ga-keywords" value={inputs.keywords} onChange={e => onInputChange('keywords', e.target.value)} placeholder="e.g., yoga mats, non-slip yoga mat, eco friendly mat (Pre-fills from Keyword Planner)" required rows={3} /></div>
          <div><Label htmlFor="ga-usp">Unique Selling Points/Benefits * (comma-separated, 2-3 key points)</Label><Textarea id="ga-usp" value={inputs.uniqueSellingPoints} onChange={e => onInputChange('uniqueSellingPoints', e.target.value)} placeholder="e.g., Made from recycled materials, Extra thick for comfort, Lifetime warranty" rows={3} required /></div>
          <div><Label htmlFor="ga-cta">Desired Call to Action (Optional)</Label><Input id="ga-cta" value={inputs.callToAction || ''} onChange={e => onInputChange('callToAction', e.target.value)} placeholder="e.g., Shop Now, Learn More" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label htmlFor="ga-numVariations">Number of Ad Variations (1-3)</Label><Select value={(inputs.numVariations || 1).toString()} onValueChange={(value) => onInputChange('numVariations', parseInt(value, 10) || 1)}><SelectTrigger id="ga-numVariations"><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3].map(num => <SelectItem key={num} value={num.toString()}>{num}</SelectItem>)}</SelectContent></Select></div>
            <div><Label htmlFor="ga-targetLanguage">Ad Copy Language</Label><Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}><SelectTrigger id="ga-targetLanguage"><SelectValue /></SelectTrigger><SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Ad Copy</Button>
        </CardFooter>
      </form>
      {variations && (
        <CardContent className="mt-6 border-t pt-6 space-y-4">
          <h3 className="text-lg font-semibold">Generated Ad Copy Variations:</h3>
          {variations.map((variation, index) => (
            <Card key={index} className="p-4 bg-muted/20">
              <CardTitle className="text-md mb-2">Variation {index + 1}</CardTitle>
              <div className="space-y-3">
                <div><Label className="text-sm font-medium">Headlines (Max 30 chars):</Label><ul className="list-disc list-inside pl-4 space-y-1 mt-1">{variation.headlines.map((headline: string, hIndex: number) => (<li key={hIndex} className="text-xs flex justify-between items-center group"><span>{headline} ({headline.length} chars)</span><Button variant="ghost" size="xs" onClick={() => onCopyToClipboard(headline, "Headline")} className="opacity-50 group-hover:opacity-100"><Copy className="h-3 w-3" /></Button></li>))}</ul><Button variant="outline" size="xs" className="mt-1" onClick={() => onCopyToClipboard(variation.headlines, "All Headlines")}><ClipboardCopy className="mr-1 h-3 w-3" />Copy All Headlines</Button></div>
                <div><Label className="text-sm font-medium">Descriptions (Max 90 chars):</Label><ul className="list-disc list-inside pl-4 space-y-1 mt-1">{variation.descriptions.map((desc: string, dIndex: number) => (<li key={dIndex} className="text-xs flex justify-between items-center group"><span>{desc} ({desc.length} chars)</span><Button variant="ghost" size="xs" onClick={() => onCopyToClipboard(desc, "Description")} className="opacity-50 group-hover:opacity-100"><Copy className="h-3 w-3" /></Button></li>))}</ul><Button variant="outline" size="xs" className="mt-1" onClick={() => onCopyToClipboard(variation.descriptions, "All Descriptions")}><ClipboardCopy className="mr-1 h-3 w-3" />Copy All Descriptions</Button></div>
              </div>
            </Card>
          ))}
        </CardContent>
      )}
    </Card>
  );
};

export const GoogleSearchAdCopySection = React.memo(GoogleSearchAdCopySectionComponent);
export default GoogleSearchAdCopySection;
