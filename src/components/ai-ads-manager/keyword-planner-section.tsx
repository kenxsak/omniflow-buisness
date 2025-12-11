
"use client";

import React, { type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, SendToBack, Copy, ClipboardCopy, Info, AlertTriangle, SearchCode } from 'lucide-react';
import type { GenerateGoogleAdsKeywordsInput, GenerateGoogleAdsKeywordsOutput, KeywordDetail } from '@/ai/flows/generate-google-ads-keywords-flow';
import { languageOptions } from '@/lib/language-options';

const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" }, { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" }, { value: "INR", label: "INR - Indian Rupee" },
    { value: "JPY", label: "JPY - Japanese Yen" }, { value: "AUD", label: "AUD - Australian Dollar" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
];

interface KeywordPlannerSectionProps {
  isLoading: boolean;
  inputs: GenerateGoogleAdsKeywordsInput;
  output: GenerateGoogleAdsKeywordsOutput['keywordSuggestions'] | null;
  onInputChange: (field: keyof GenerateGoogleAdsKeywordsInput, value: string | number) => void;
  onSubmit: (e: FormEvent) => Promise<void>;
  onUseKeywordsForAdCopy: () => void;
  onCopyToClipboard: (text: string | string[], type: string) => void;
  onCopyIndividualKeyword: (keywordObj: KeywordDetail) => void;
  onCopyAllKeywordsInCategory: (keywords: KeywordDetail[], categoryName: string) => void;
}

const KeywordPlannerSectionComponent: React.FC<KeywordPlannerSectionProps> = ({
  isLoading, inputs, output, onInputChange, onSubmit, onUseKeywordsForAdCopy,
  onCopyToClipboard, onCopyIndividualKeyword, onCopyAllKeywordsInCategory
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><SearchCode className="mr-2 h-5 w-5 text-primary" />AI Keyword Planner for Google Ads</CardTitle>
        <CardDescription>Generate keyword ideas for your Google Search campaigns. Includes AI-estimated competition and CPC ranges (for guidance only).</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <Alert variant="destructive" className="bg-orange-50 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700">
            <AlertTriangle className="mr-2 h-4 w-4 !text-orange-600 dark:!text-orange-400" />
            <AlertTitleComponent className="text-orange-700 dark:text-orange-300">Important Disclaimer</AlertTitleComponent>
            <AlertDescription className="text-orange-600 dark:text-orange-400 text-xs">
              The 'Estimated Competition' and 'Estimated CPC Range' are **AI-generated estimations** and **NOT live data from Google Ads**. They are for directional guidance ONLY. Use Google's official Keyword Planner tool for accurate data.
            </AlertDescription>
          </Alert>
          <div><Label htmlFor="kw-product">Product/Service Name *</Label><Input id="kw-product" value={inputs.productOrService} onChange={e => onInputChange('productOrService', e.target.value)} placeholder="e.g., Premium Yoga Mats, SaaS for Project Management" required /></div>
          <div><Label htmlFor="kw-audience">Target Audience (Optional)</Label><Input id="kw-audience" value={inputs.targetAudience || ''} onChange={e => onInputChange('targetAudience', e.target.value)} placeholder="e.g., Eco-conscious yogis, Small business owners" /></div>
          <div><Label htmlFor="kw-landingPage">Landing Page URL (Optional)</Label><Input id="kw-landingPage" type="url" value={inputs.landingPageUrl || ''} onChange={e => onInputChange('landingPageUrl', e.target.value)} placeholder="https://www.yourwebsite.com/your-product" /></div>
          <div><Label htmlFor="kw-campaignGoals">Campaign Goals (Optional)</Label><Input id="kw-campaignGoals" value={inputs.campaignGoals || ''} onChange={e => onInputChange('campaignGoals', e.target.value)} placeholder="e.g., Increase online sales, Generate qualified leads" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="kw-targetLanguage">Keywords Language</Label>
              <Select value={inputs.targetLanguage || 'English'} onValueChange={(value) => onInputChange('targetLanguage', value)}>
                <SelectTrigger id="kw-targetLanguage"><SelectValue /></SelectTrigger>
                <SelectContent>{languageOptions.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kw-targetCurrency">Target Currency for CPC</Label>
              <Select value={inputs.targetCurrency || 'USD'} onValueChange={(value) => onInputChange('targetCurrency', value)}>
                <SelectTrigger id="kw-targetCurrency"><SelectValue /></SelectTrigger>
                <SelectContent>{currencyOptions.map(curr => <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="kw-numSuggestions">Suggestions per Category (3-15)</Label>
              <Input id="kw-numSuggestions" type="number" min="3" max="15" value={inputs.numSuggestionsPerCategory || 7} onChange={(e) => onInputChange('numSuggestionsPerCategory', parseInt(e.target.value, 10) || 7)} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" /> {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generate Keyword Suggestions</Button>
        </CardFooter>
      </form>
      {output && (
        <CardContent className="mt-6 border-t pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
            <h3 className="text-lg font-semibold">Generated Keyword Ideas:</h3>
            <Button onClick={onUseKeywordsForAdCopy} size="sm" variant="default"><SendToBack className="mr-2 h-4 w-4" /> Use Keywords for Ad Copy</Button>
          </div>
          <Accordion type="multiple" defaultValue={["primaryKeywords", "longTailKeywords"]} className="w-full">
            {(Object.keys(output) as Array<keyof typeof output>).map((key) => {
              const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const keywordsList = output[key];
              if (!keywordsList || keywordsList.length === 0) return null;
              
              if (key === 'negativeKeywordIdeas') {
                const negativeKeywords = keywordsList as unknown as string[]; 
                return (
                  <AccordionItem value={key} key={key}>
                    <AccordionTrigger className="text-base hover:no-underline">{title} ({negativeKeywords.length})</AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {negativeKeywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs cursor-pointer hover:bg-destructive/10 text-red-700 border-red-300" onClick={() => onCopyToClipboard(keyword, "Negative Keyword")} title={`Copy "${keyword}"`}>{keyword}</Badge>
                        ))}
                      </div>
                      <Button variant="outline" size="xs" onClick={() => onCopyToClipboard(negativeKeywords.join('\n'), title)}><ClipboardCopy className="mr-1 h-3 w-3" />Copy All {title}</Button>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              const keywordDetailsList = keywordsList as KeywordDetail[];
              return (
                <AccordionItem value={key} key={key}>
                  <AccordionTrigger className="text-base hover:no-underline">{title} ({keywordDetailsList.length})</AccordionTrigger>
                  <AccordionContent className="space-y-2 pt-2">
                    <div className="space-y-1">
                      {keywordDetailsList.map((kwDetail, index) => (
                        <div key={index} className="flex items-center justify-between p-1.5 border rounded-md bg-muted/20 hover:bg-muted/30 text-xs">
                          <span onClick={() => onCopyIndividualKeyword(kwDetail)} className="cursor-pointer flex-grow">
                            <span className="font-medium">{kwDetail.keyword}</span>
                            {kwDetail.estimatedCompetition && <span className="ml-2 text-muted-foreground">(Comp: {kwDetail.estimatedCompetition})</span>}
                            {kwDetail.estimatedCpcRange && <span className="ml-2 text-muted-foreground">(CPC: {kwDetail.estimatedCpcRange})</span>}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onCopyIndividualKeyword(kwDetail)} title="Copy keyword details"><Copy className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="xs" onClick={() => onCopyAllKeywordsInCategory(keywordDetailsList, title)}><ClipboardCopy className="mr-1 h-3 w-3" />Copy All {title} Details</Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          <Alert variant="default" className="mt-4 text-xs border-blue-300 bg-blue-50 dark:bg-blue-900/30">
            <Info className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400"/>
            <AlertTitleComponent className="text-blue-700 dark:text-blue-300">Keyword Research Tip</AlertTitleComponent>
            <AlertDescription className="text-blue-600 dark:text-blue-400">
              These AI-generated keywords and their estimated metrics are a starting point. For best results, use Google Keyword Planner or other SEO tools to check actual search volumes, competition, and refine your list before launching campaigns.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
};

export const KeywordPlannerSection = React.memo(KeywordPlannerSectionComponent);
export default KeywordPlannerSection;
    
    