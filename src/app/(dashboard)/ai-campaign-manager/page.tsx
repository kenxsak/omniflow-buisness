
"use client";

import React, { useState, type FormEvent, useRef, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { Lightbulb, ExternalLink, Info, Wand2, Loader2, Copy, ClipboardCopy, Facebook, Instagram, Linkedin, Youtube, Film, Users as UsersIcon, Briefcase, Award, Building, MessageCircle, Sparkles as TiktokIcon, BarChartBig, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { showAISuccessToast } from '@/lib/ai-toast-helpers';

import { KeywordPlannerSection } from '@/components/ai-ads-manager/keyword-planner-section';
import { GoogleSearchAdCopySection } from '@/components/ai-ads-manager/google-search-ad-copy-section';
import { FacebookInstagramAdSection } from '@/components/ai-ads-manager/facebook-instagram-ad-section';
import { LinkedInAdSection } from '@/components/ai-ads-manager/linkedin-ad-section';
import { YouTubeAdSection } from '@/components/ai-ads-manager/youtube-ad-section';
import { TiktokReelsAdSection } from '@/components/ai-ads-manager/tiktok-reels-ad-section';

import {
  generateTrackedGoogleAdsKeywordsAction,
  generateTrackedGoogleSearchAdCopyAction,
  generateTrackedFacebookAdAction,
  generateTrackedLinkedInAdAction,
  generateTrackedYouTubeAdAction,
  generateTrackedTiktokReelsAdAction
} from '@/app/actions/tracked-ai-ads-actions';

import type { GenerateGoogleAdsKeywordsInput, GenerateGoogleAdsKeywordsOutput, KeywordDetail } from '@/ai/flows/generate-google-ads-keywords-flow';
import type { GenerateGoogleSearchAdCopyInput, AdCopyVariation as GoogleAdVariation } from '@/ai/flows/generate-google-search-ad-copy-flow';
import type { GenerateFacebookInstagramAdContentInput, GenerateFacebookInstagramAdContentOutput } from '@/ai/flows/generate-facebook-instagram-ad-content-flow';
import type { GenerateLinkedInAdContentInput, GenerateLinkedInAdContentOutput } from '@/ai/flows/generate-linkedin-ad-content-flow';
import type { GenerateYouTubeAdContentInput, GenerateYouTubeAdContentOutput } from '@/ai/flows/generate-youtube-ad-content-flow';
import type { GenerateTiktokReelsAdContentInput, GenerateTiktokReelsAdContentOutput } from '@/ai/flows/generate-tiktok-reels-ad-content-flow';

export default function AiAdsManagerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { appUser } = useAuth();

  const adCopyGeneratorRef = useRef<HTMLDivElement>(null);
  const facebookAdGeneratorRef = useRef<HTMLDivElement>(null);
  const linkedinAdGeneratorRef = useRef<HTMLDivElement>(null);
  const youtubeAdsGeneratorRef = useRef<HTMLDivElement>(null);
  const tiktokReelsAdGeneratorRef = useRef<HTMLDivElement>(null);


  // State for Google Ads Keyword Planner
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [keywordInputs, setKeywordInputs] = useState<GenerateGoogleAdsKeywordsInput>({
    productOrService: '',
    targetAudience: '',
    landingPageUrl: '',
    campaignGoals: '',
    targetLanguage: 'English',
    numSuggestionsPerCategory: 7,
    targetCurrency: 'USD',
  });
  const [generatedKeywordsOutput, setGeneratedKeywordsOutput] = useState<GenerateGoogleAdsKeywordsOutput['keywordSuggestions'] | null>(null);

  // State for Google Ads Copy Generator
  const [isGeneratingGoogleAds, setIsGeneratingGoogleAds] = useState(false);
  const [googleAdsInput, setGoogleAdsInput] = useState<GenerateGoogleSearchAdCopyInput>({
    productOrService: '',
    targetAudience: '',
    keywords: '',
    uniqueSellingPoints: '',
    callToAction: '',
    numVariations: 1,
    targetLanguage: 'English',
  });
  const [googleAdCopyVariations, setGoogleAdCopyVariations] = useState<GoogleAdVariation[] | null>(null);

  // State for Facebook/Instagram Ad Generator
  const [isGeneratingFacebookAds, setIsGeneratingFacebookAds] = useState(false);
  const [facebookAdsInput, setFacebookAdsInput] = useState<GenerateFacebookInstagramAdContentInput>({
    productOrService: '',
    targetAudience: '',
    adObjective: 'Website Traffic',
    keyMessage: '',
    desiredTone: 'Friendly',
    platformFocus: 'Both',
    numVariations: 1,
    targetLanguage: 'English',
  });
  const [facebookAdContentOutput, setFacebookAdContentOutput] = useState<GenerateFacebookInstagramAdContentOutput | null>(null);

  // State for LinkedIn Ad Generator
  const [isGeneratingLinkedInAds, setIsGeneratingLinkedInAds] = useState(false);
  const [linkedInAdsInput, setLinkedInAdsInput] = useState<GenerateLinkedInAdContentInput>({
    b2bProductOrService: '',
    targetIndustry: '',
    targetRole: '',
    adObjective: 'Lead Generation',
    valueProposition: '',
    desiredTone: 'Professional',
    numVariations: 1,
    targetLanguage: 'English',
  });
  const [linkedInAdContentOutput, setLinkedInAdContentOutput] = useState<GenerateLinkedInAdContentOutput | null>(null);

  // State for YouTube Ad Generator
  const [isGeneratingYouTubeAds, setIsGeneratingYouTubeAds] = useState(false);
  const [youtubeAdsInput, setYoutubeAdsInput] = useState<Omit<GenerateYouTubeAdContentInput, 'desiredVideoStyleAndLength'> & { videoFormat: string; videoStyle: string }>({
    productOrService: '',
    targetAudience: '',
    adObjective: 'BrandAwareness',
    keyMessagePoints: '',
    videoFormat: 'Skippable In-stream Ad (15-30s)',
    videoStyle: 'Animated Explainer',
    overallTone: 'Friendly',
    numVariations: 1,
    targetLanguage: 'English',
  });
  const [youtubeAdContentOutput, setYoutubeAdContentOutput] = useState<GenerateYouTubeAdContentOutput | null>(null);

  // State for TikTok/Reels Ad Generator
  const [isGeneratingTiktokReelsAds, setIsGeneratingTiktokReelsAds] = useState(false);
  const [tiktokReelsAdsInput, setTiktokReelsAdsInput] = useState<GenerateTiktokReelsAdContentInput>({
    productOrService: '',
    targetDemographic: '',
    adVibe: 'Funny & Relatable',
    keyMessage: '',
    numVariations: 1,
    targetLanguage: 'English',
  });
  const [tiktokReelsAdContentOutput, setTiktokReelsAdContentOutput] = useState<GenerateTiktokReelsAdContentOutput | null>(null);

  const handleInputChange = useCallback((setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: string | number) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  const handleKeywordInputChange = (field: keyof GenerateGoogleAdsKeywordsInput, value: string | number) => handleInputChange(setKeywordInputs, field, value);
  const handleGoogleAdsInputChange = (field: keyof GenerateGoogleSearchAdCopyInput, value: string | number) => handleInputChange(setGoogleAdsInput, field, value);
  const handleFacebookAdsInputChange = (field: keyof GenerateFacebookInstagramAdContentInput, value: string | number) => handleInputChange(setFacebookAdsInput, field, value);
  const handleLinkedInAdsInputChange = (field: keyof GenerateLinkedInAdContentInput, value: string | number) => handleInputChange(setLinkedInAdsInput, field, value);
  const handleYouTubeAdsInputChange = (field: string, value: string | number) => handleInputChange(setYoutubeAdsInput, field, value);
  const handleTiktokReelsAdsInputChange = (field: keyof GenerateTiktokReelsAdContentInput, value: string | number) => handleInputChange(setTiktokReelsAdsInput, field, value);

  // Centralized AI handler using tracked actions
  const callTrackedAI = useCallback(async (
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setResult: React.Dispatch<React.SetStateAction<any>>,
    trackedAction: (companyId: string, userId: string, payload: any) => Promise<any>,
    payload: any,
    featureName: string,
    resultAccessor: (data: any) => any
  ) => {
    if (!appUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to use AI features.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const response = await trackedAction(appUser.companyId, appUser.uid, payload);
      
      if (response.success && response.data) {
        setResult(resultAccessor(response.data));
        showAISuccessToast(toast, featureName, response.quotaInfo);
      } else {
        throw new Error(response.error || 'AI generation failed.');
      }
    } catch (error: any) {
      // Extract user-friendly error message from Genkit errors
      let errorMessage = error.message || 'An unknown error occurred.';
      
      // Parse Genkit validation errors for better UX
      if (errorMessage.includes('Schema validation failed')) {
        const match = errorMessage.match(/Parse Errors:\s*-\s*([^\n]+)/);
        if (match && match[1]) {
          errorMessage = `Validation error: ${match[1]}`;
        } else {
          errorMessage = 'The AI generated content that doesn\'t meet requirements. Please try again.';
        }
      }
      
      toast({ title: `AI for ${featureName} Failed`, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [appUser, toast]);

  const handleGenerateKeywordsSubmit = async (e: FormEvent) => { e.preventDefault(); await callTrackedAI(setIsGeneratingKeywords, setGeneratedKeywordsOutput, generateTrackedGoogleAdsKeywordsAction, keywordInputs, "Keywords", (data) => data.keywordSuggestions); };
  const handleGenerateGoogleAdCopySubmit = async (e: FormEvent) => { e.preventDefault(); await callTrackedAI(setIsGeneratingGoogleAds, setGoogleAdCopyVariations, generateTrackedGoogleSearchAdCopyAction, googleAdsInput, "Google Ad Copy", (data) => data.adVariations); };
  const handleGenerateFacebookAdContentSubmit = async (e: FormEvent) => { e.preventDefault(); await callTrackedAI(setIsGeneratingFacebookAds, setFacebookAdContentOutput, generateTrackedFacebookAdAction, facebookAdsInput, "Facebook/IG Ads", (data) => data); };
  const handleGenerateLinkedInAdContentSubmit = async (e: FormEvent) => { e.preventDefault(); await callTrackedAI(setIsGeneratingLinkedInAds, setLinkedInAdContentOutput, generateTrackedLinkedInAdAction, linkedInAdsInput, "LinkedIn Ads", (data) => data); };
  const handleGenerateTiktokReelsAdContentSubmit = async (e: FormEvent) => { e.preventDefault(); await callTrackedAI(setIsGeneratingTiktokReelsAds, setTiktokReelsAdContentOutput, generateTrackedTiktokReelsAdAction, tiktokReelsAdsInput, "TikTok/Reels Ads", (data) => data); };

  const handleGenerateYouTubeAdContentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const combinedVideoStyleAndLength = `${youtubeAdsInput.videoStyle} - ${youtubeAdsInput.videoFormat}`;
    const payload: GenerateYouTubeAdContentInput = {
      ...youtubeAdsInput,
      desiredVideoStyleAndLength: combinedVideoStyleAndLength,
    };
    await callTrackedAI(setIsGeneratingYouTubeAds, setYoutubeAdContentOutput, generateTrackedYouTubeAdAction, payload, "YouTube Ads", (data) => data);
  };

  const scrollToRef = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const useKeywordsForAdCopy = useCallback(() => {
    if (generatedKeywordsOutput) {
      const keywordsToUse = [
        ...generatedKeywordsOutput.primaryKeywords.map(kw => kw.keyword), 
        ...generatedKeywordsOutput.longTailKeywords.map(kw => kw.keyword)
      ].filter(Boolean).join(', ');
      handleGoogleAdsInputChange('keywords', keywordsToUse);
      toast({ title: "Keywords Pre-filled", description: "Keywords populated in Google Ad Copy Generator." });
      if (adCopyGeneratorRef.current) {
        scrollToRef(adCopyGeneratorRef);
      }
    } else {
      toast({ title: "No Keywords Generated", description: "Please generate keywords first.", variant: "destructive" });
    }
  }, [generatedKeywordsOutput, handleGoogleAdsInputChange, scrollToRef, toast]);

  const copyToClipboard = useCallback((text: string | string[], type: string) => {
    const textToCopy = Array.isArray(text) ? text.join(type === "Hashtags" ? " " : '\n') : text;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: `${type} Copied!`, description: `${type} copied to clipboard.` }))
      .catch(() => toast({ title: 'Copy Failed', variant: 'destructive' }));
  }, [toast]);

  const copyIndividualKeyword = useCallback((keywordObj: KeywordDetail) => {
     const text = `${keywordObj.keyword}${keywordObj.estimatedCompetition ? ` [Comp: ${keywordObj.estimatedCompetition}]` : ''}${keywordObj.estimatedCpcRange ? ` [CPC: ${keywordObj.estimatedCpcRange}]` : ''}`;
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: `Keyword Data Copied!`, description: `"${text}" copied to clipboard.` }))
      .catch(() => toast({ title: 'Copy Failed', variant: 'destructive' }));
  }, [toast]);
  
  const copyAllKeywordsInCategory = useCallback((keywords: KeywordDetail[], categoryName: string) => {
    const textToCopy = keywords.map(kw => `${kw.keyword}${kw.estimatedCompetition ? ` [Comp: ${kw.estimatedCompetition}]` : ''}${kw.estimatedCpcRange ? ` [CPC: ${kw.estimatedCpcRange}]` : ''}`).join('\n');
    copyToClipboard(textToCopy, `All ${categoryName} Details`);
  }, [copyToClipboard]);
  
  const useImagePromptAndGo = useCallback((promptText?: string | null) => {
    if (!promptText) {
      toast({ title: "No Prompt", description: "Cannot use an empty image prompt.", variant: "destructive" });
      return;
    }
    const socialMediaAiPageUrl = '/social-media'; 
    navigator.clipboard.writeText(promptText)
      .then(() => {
        toast({
          title: "Image Prompt Copied!",
          description: (
            <span>
              Image prompt copied. Go to the{" "}
              <Link href={socialMediaAiPageUrl} className="underline">Social Media AI</Link> page to use the AI Image Generator.
            </span>
          ),
          duration: 7000,
        });
      })
      .catch(() => toast({ title: "Copy Failed", variant: 'destructive' }));
  }, [toast]);

  const handleUseAdForEmail = useCallback((details: { name: string; subject: string; content: string }) => {
    const htmlContent = `<h1>Hi {{ contact.FIRSTNAME }},</h1>\n\n<p>${details.content.replace(/\n/g, '<br />')}</p>\n\n<p>Best regards,</p>\n<p>[Your Company Name]</p>`;
    const query = new URLSearchParams({
        name: details.name,
        subject: details.subject,
        content: htmlContent,
    });
    router.push(`/email-marketing/create-campaign?${query.toString()}`);
  }, [router]);


  return (
    <div className="space-y-8">
      <PageTitle
        title="AI Ads Manager"
        description="Leverage AI for ad campaign planning and creative generation across various platforms."
      />

      <Alert variant="default" className="border-blue-300 bg-blue-50 dark:bg-blue-900/30">
        <Lightbulb className="mr-2 h-5 w-5 text-blue-500" />
        <AlertTitleComponent className="font-semibold text-blue-700 dark:text-blue-300">Comprehensive Ad Assistance</AlertTitleComponent>
        <AlertDescription className="text-sm text-blue-600 dark:text-blue-400 space-y-2">
          <p>
            This AI Ads Manager helps you plan and generate creatives for various ad platforms. Start with keyword planning for Google Ads, then generate ad copy. For other platforms, use the dedicated tools to get tailored content suggestions.
          </p>
          <p>
             Tools on the <Link href="/social-media" className="font-medium underline hover:text-blue-700">Social Media AI</Link> page can also be adapted for ad creatives.
          </p>
        </AlertDescription>
      </Alert>

      {/* Google Ads Keyword Planner */}
      <KeywordPlannerSection
        isLoading={isGeneratingKeywords}
        inputs={keywordInputs}
        output={generatedKeywordsOutput}
        onInputChange={handleKeywordInputChange}
        onSubmit={handleGenerateKeywordsSubmit}
        onUseKeywordsForAdCopy={useKeywordsForAdCopy}
        onCopyToClipboard={copyToClipboard}
        onCopyIndividualKeyword={copyIndividualKeyword}
        onCopyAllKeywordsInCategory={copyAllKeywordsInCategory}
      />

      {/* Google Ads Search Ad Copy Generator */}
      <GoogleSearchAdCopySection
        isLoading={isGeneratingGoogleAds}
        inputs={googleAdsInput}
        variations={googleAdCopyVariations}
        onInputChange={handleGoogleAdsInputChange}
        onSubmit={handleGenerateGoogleAdCopySubmit}
        onCopyToClipboard={copyToClipboard}
        adCopyGeneratorRef={adCopyGeneratorRef}
      />

      {/* Facebook & Instagram Ads Strategist */}
      <FacebookInstagramAdSection
        isLoading={isGeneratingFacebookAds}
        inputs={facebookAdsInput}
        output={facebookAdContentOutput}
        onInputChange={handleFacebookAdsInputChange}
        onSubmit={handleGenerateFacebookAdContentSubmit}
        onCopyToClipboard={copyToClipboard}
        onUseImagePromptAndGo={useImagePromptAndGo}
        onUseAdForEmail={handleUseAdForEmail}
        facebookAdGeneratorRef={facebookAdGeneratorRef}
      />

      {/* LinkedIn Ads Professional Suite */}
      <LinkedInAdSection
        isLoading={isGeneratingLinkedInAds}
        inputs={linkedInAdsInput}
        output={linkedInAdContentOutput}
        onInputChange={handleLinkedInAdsInputChange}
        onSubmit={handleGenerateLinkedInAdContentSubmit}
        onCopyToClipboard={copyToClipboard}
        onUseImagePromptAndGo={useImagePromptAndGo}
        onUseAdForEmail={handleUseAdForEmail}
        linkedinAdGeneratorRef={linkedinAdGeneratorRef}
      />

      {/* YouTube Ads Campaign & Script Generator */}
      <YouTubeAdSection
        isLoading={isGeneratingYouTubeAds}
        inputs={youtubeAdsInput}
        output={youtubeAdContentOutput}
        onInputChange={handleYouTubeAdsInputChange}
        onSubmit={handleGenerateYouTubeAdContentSubmit}
        onCopyToClipboard={copyToClipboard}
        onUseImagePromptAndGo={useImagePromptAndGo}
        youtubeAdsGeneratorRef={youtubeAdsGeneratorRef}
      />

      {/* TikTok & Reels Ad Catalyst */}
      <TiktokReelsAdSection
        isLoading={isGeneratingTiktokReelsAds}
        inputs={tiktokReelsAdsInput}
        output={tiktokReelsAdContentOutput}
        onInputChange={handleTiktokReelsAdsInputChange}
        onSubmit={handleGenerateTiktokReelsAdContentSubmit}
        onCopyToClipboard={copyToClipboard}
        tiktokReelsAdGeneratorRef={tiktokReelsAdGeneratorRef}
      />


      <Alert variant="default" className="mt-8">
        <ExternalLink className="mr-2 h-4 w-4" />
        <AlertTitleComponent>Using Existing Tools for Ad Creatives</AlertTitleComponent>
        <AlertDescription>
          While these specialized tools are being developed, remember that many features on the <Link href="/social-media" className="font-medium underline">Social Media AI page</Link> (like the content generator, image prompt generator, and hashtag suggester) can be effectively used to create components for your ads right now.
        </AlertDescription>
      </Alert>
    </div>
  );
}
