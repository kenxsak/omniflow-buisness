
"use client";

import React, { useState, type FormEvent, useEffect, useRef, useCallback } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, Copy, Film, Image as ImageIcon, Download, Info, Youtube, SearchCheck, Lightbulb, Hash, MessageCircle as ReviewIcon, SendToBack, Brain, ClipboardCopy, AlertTriangle, MessageCircle, Edit3, ClipboardList, Eye, Code, FileCode, ExternalLink, Rss } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  addStoredSocialMediaPostAction,
  getStoredSocialMediaPostsAction,
  updateStoredSocialMediaPostAction
} from '@/app/actions/social-media-actions';
import { 
  generateTrackedSocialContentAction, 
  generateTrackedHashtagAction,
  generateTrackedEnhancedPromptAction,
  generateTrackedTrendingTopicAction
} from '@/app/actions/tracked-ai-content-actions';
import { generateTrackedImageAction } from '@/app/actions/tracked-ai-media-actions';
import { generateTrackedReviewResponseAction } from '@/app/actions/tracked-ai-assistants';
import type { GenerateSocialMediaContentInput, GenerateSocialMediaContentOutput, SocialMediaPostVariation } from '@/ai/flows/generate-social-media-content-flow';
import type { GenerateHashtagSuggestionsInput } from '@/ai/flows/generate-hashtag-suggestions-flow';
import type { AiReviewResponderInput } from '@/ai/flows/ai-review-responder';
import type { GenerateEnhancedPromptInput, GenerateEnhancedPromptOutput, PromptGoal } from '@/ai/flows/generate-enhanced-prompt-flow';
import type { GetTrendingTopicSuggestionsInput, GetTrendingTopicSuggestionsOutput, ContentCreationType, PlanningHorizon } from '@/ai/flows/get-trending-topic-suggestions-flow';
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import { ScrollArea } from '@/components/ui/scroll-area';
import NextImage from 'next/image';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { SocialMediaPost } from '@/types/social-media';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { languageOptions } from '@/lib/language-options';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';
import { showAIContentReadyToast, showAIImageGeneratedToast, showAISuccessToast, showAITaskCompleteToast } from '@/lib/ai-toast-helpers';

type SocialPlatform = GenerateSocialMediaContentInput['platform'];
type SocialTone = GenerateSocialMediaContentInput['tone'];
type ImageAspectRatio = "Default" | "Square (1:1)" | "Landscape (16:9)" | "Portrait (9:16)" | "Portrait (4:5)";

interface ExtendedSocialMediaPostVariation extends SocialMediaPostVariation {
  suggestedHashtagsForVariation?: string[] | null;
  isFetchingHashtags?: boolean;
}

interface ExtendedGenerateSocialMediaContentOutput extends GenerateSocialMediaContentOutput {
  variations: ExtendedSocialMediaPostVariation[];
}

const parseAndRenderScript = (scriptText: string, useImagePromptAndGo: (promptText: string) => void) => {
  if (!scriptText) return null;
  const lines = scriptText.split('\n');
  const promptRegex = /\[IMAGE PROMPT FOR AI:\s*(.*?)\s*\]/i;

  return lines.map((line, index) => {
    const match = line.match(promptRegex);
    if (match && match[1]) {
      const extractedPrompt = match[1].trim();
      if (extractedPrompt) {
        return (
          <div key={index} className="flex items-center justify-between group my-1 p-1 bg-muted/30 rounded">
            <span className="text-sm text-purple-600 dark:text-purple-400 italic mr-2 flex-grow">
              Visual Idea: {extractedPrompt}
            </span>
            <Button
              variant="outline"
              size="xs"
              className="opacity-50 group-hover:opacity-100 transition-opacity"
              onClick={() => useImagePromptAndGo(extractedPrompt)}
              title="Use this prompt & go to Image Generator"
            >
              <Wand2 className="mr-1 h-3 w-3" /> Use for Image Gen
            </Button>
          </div>
        );
      }
    }
    return <p key={index} className="text-sm whitespace-pre-wrap font-sans my-0.5">{line || '\u00A0'}</p>; 
  });
};

export default function SocialMediaPage() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);

  const [contentInputs, setContentInputs] = useState<GenerateSocialMediaContentInput>({
    topic: '', platform: 'TwitterX', tone: 'Casual', goal: '', keywords: '', callToAction: '',
    includeHashtags: true, numVariations: 1, blogPostApproximateWords: undefined, targetLanguage: 'English',
    websiteUrl: '',
  });
  const [generatedContent, setGeneratedContent] = useState<ExtendedGenerateSocialMediaContentOutput | null>(null);

  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<ImageAspectRatio>("Default");
  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [promptForGeneratedImage, setPromptForGeneratedImage] = useState<string>('');
  const [imageGenerationGuidance, setImageGenerationGuidance] = useState<string | null>(null);

  const [trendInputs, setTrendInputs] = useState<GetTrendingTopicSuggestionsInput>({
    businessNiche: '', contentType: 'BlogPost', planningHorizon: 'Weekly', targetRegion: 'Global',
  });
  const [trendingSuggestions, setTrendingSuggestions] = useState<GetTrendingTopicSuggestionsOutput['suggestions'] | null>(null);

  const [hashtagInputs, setHashtagInputs] = useState<GenerateHashtagSuggestionsInput>({
    topicOrKeywords: '', platform: 'General', numSuggestions: 10,
  });
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[] | null>(null);

  const [reviewInput, setReviewInput] = useState<AiReviewResponderInput>({ reviewText: '', sentiment: 'neutral', businessName: '' });
  const [reviewResponse, setReviewResponse] = useState<string | null>(null);

  const [enhancedPromptInputs, setEnhancedPromptInputs] = useState<GenerateEnhancedPromptInput>({
    originalPrompt: '', promptGoal: 'ImageGeneration', desiredStyle: '', keyElements: ''
  });
  const [enhancedPromptResult, setEnhancedPromptResult] = useState<GenerateEnhancedPromptOutput | null>(null);
  
  const trendInputsRef = useRef<HTMLDivElement>(null);
  const promptEnhancerRef = useRef<HTMLDivElement>(null);
  const contentGeneratorRef = useRef<HTMLDivElement>(null);
  const imageGeneratorRef = useRef<HTMLDivElement>(null);
  const hashtagSuggesterRef = useRef<HTMLDivElement>(null);
  const reviewResponderRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const router = useRouter();


  useEffect(() => {
    if (company) {
      setReviewInput(prev => ({ ...prev, businessName: company.name || 'Your Company' }));
      setContentInputs(prev => ({ ...prev, websiteUrl: company.website || '' }));
    }
  }, [company]);
  
  const scrollToRef = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleContentInputChange = (field: keyof GenerateSocialMediaContentInput, value: string | boolean | number | undefined) => {
    setContentInputs(prev => ({ ...prev, [field]: value }));
  };
  const handleTrendInputChange = (field: keyof GetTrendingTopicSuggestionsInput, value: string) => {
    setTrendInputs(prev => ({ ...prev, [field]: value }));
  };
  const handleHashtagInputChange = (field: keyof GenerateHashtagSuggestionsInput, value: string | number | undefined) => {
    setHashtagInputs(prev => ({ ...prev, [field]: value as any }));
  };
   const handleReviewInputChange = (field: keyof AiReviewResponderInput, value: string) => {
    setReviewInput(prev => ({ ...prev, [field]: value as any }));
  };

  const handleEnhancedPromptInputChange = (field: keyof GenerateEnhancedPromptInput, value: string) => {
    setEnhancedPromptInputs(prev => ({ ...prev, [field]: value as any}));
  };
  
   useEffect(() => {
    const editPostIdQuery = searchParams.get('editPostId');
    if (editPostIdQuery && appUser?.companyId) {
      const loadPostForEditing = async () => {
        setEditingPostId(editPostIdQuery);
        const result = await getStoredSocialMediaPostsAction(appUser.uid, appUser.companyId);
        
        if (!result.success || !result.data) {
          toast({ title: 'Error', description: 'Could not fetch saved posts.', variant: 'destructive' });
          return;
        }

        const postToEdit = result.data.find((p) => p.id === editPostIdQuery);

        if (postToEdit) {
          setEditingPost(postToEdit);
          handleContentInputChange('platform', postToEdit.platform);
          handleContentInputChange('salesPageContent', postToEdit.textContent); 
          handleContentInputChange('topic', `// Edit request for the loaded content. What should I change?`);
          
          setGeneratedContent({
            variations: [{
              textContent: postToEdit.textContent,
              suggestedImagePrompt: postToEdit.suggestedImagePrompt,
              suggestedVideoScriptIdea: postToEdit.suggestedVideoScriptIdea,
              suggestedVideoTitle: postToEdit.suggestedVideoTitle,
              suggestedVideoDescription: postToEdit.suggestedVideoDescription,
              suggestedVideoKeywordsTags: postToEdit.suggestedVideoKeywordsTags,
              suggestedVideoHashtags: postToEdit.suggestedVideoHashtags,
              suggestedVideoThumbnailPrompt: postToEdit.suggestedVideoThumbnailPrompt,
              isFetchingHashtags: false,
              suggestedHashtagsForVariation: null,
            }],
          });
          
          scrollToRef(contentGeneratorRef);
          toast({ title: 'Editing Saved Content', description: 'Content loaded. Type your edit request in the prompt field.' });

          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('editPostId');
          router.replace(currentUrl.toString(), { scroll: false });
        } else {
          toast({ title: 'Error', description: 'Could not find the saved post to edit.', variant: 'destructive' });
        }
      };
      loadPostForEditing();
    }
  }, [searchParams, router, toast, scrollToRef, appUser]);


  const copyToClipboard = useCallback((text: string | string[], type: string) => {
    const textToCopy = Array.isArray(text) ? text.join(type === "Hashtags" || type === "Keywords/Tags" ? " " : "\n") : text;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast({ title: `${type} Copied!`, description: `${type} copied to clipboard.` }))
      .catch(() => toast({ title: 'Copy Failed', variant: 'destructive' }));
  }, [toast]);

  const fetchHashtagsForVariation = useCallback(async (variationIndex: number, topic: string, platform: SocialPlatform) => {
    if (!appUser) return;
    setGeneratedContent(prev => {
      if (!prev) return null;
      const newVariations = [...prev.variations];
      if (newVariations[variationIndex]) {
        newVariations[variationIndex] = { ...newVariations[variationIndex], isFetchingHashtags: true, suggestedHashtagsForVariation: null };
      }
      return { ...prev, variations: newVariations };
    });

    try {
      let hashtagPlatform: GenerateHashtagSuggestionsInput['platform'] = 'General';
      if (platform === 'Instagram') hashtagPlatform = 'Instagram';
      else if (platform === 'TwitterX') hashtagPlatform = 'Twitter/X';
      else if (platform === 'LinkedIn') hashtagPlatform = 'LinkedIn';

      const result = await generateTrackedHashtagAction(appUser.companyId, appUser.uid, {
        topicOrKeywords: topic,
        platform: hashtagPlatform,
        numSuggestions: 5,
      });

      if (!result.success || !result.data) throw new Error(result.error || 'Failed to generate hashtags.');

      setGeneratedContent(prev => {
        if (!prev) return null;
        const newVariations = [...prev.variations];
        if (newVariations[variationIndex]) {
          newVariations[variationIndex] = {
            ...newVariations[variationIndex],
            suggestedHashtagsForVariation: result.data!.hashtagSuggestions,
            isFetchingHashtags: false,
          };
        }
        return { ...prev, variations: newVariations };
      });
    } catch (error) {
      console.error(`Error fetching hashtags for variation ${variationIndex}:`, error);
      setGeneratedContent(prev => {
        if (!prev) return null;
        const newVariations = [...prev.variations];
        if (newVariations[variationIndex]) {
          newVariations[variationIndex] = { ...newVariations[variationIndex], isFetchingHashtags: false, suggestedHashtagsForVariation: ['#error'] };
        }
        return { ...prev, variations: newVariations };
      });
    }
  }, [appUser]);

  const handleSaveOrUpdatePost = useCallback(async (variation: SocialMediaPostVariation) => {
    if (!appUser?.companyId) {
        toast({ title: 'Error', description: 'Could not save, user or company info missing.', variant: 'destructive' });
        return;
    }
    
    // Construct the payload to be sent to the server action
    // When editing, preserve the existing status. When creating new, use platform-based default.
    let postStatus: 'Draft' | 'Scheduled' | 'Posted';
    if (editingPostId && editingPost) {
      // Preserve existing status when editing
      postStatus = editingPost.status;
    } else {
      // For new posts, blog posts and sales pages are instantly live
      postStatus = (contentInputs.platform === 'BlogPost' || contentInputs.platform === 'SalesLandingPage') 
        ? 'Posted'  // Blog posts and sales pages are instantly live upon creation
        : 'Draft';   // Other platforms default to draft for scheduling
    }
    
    let finalPayload: Omit<SocialMediaPost, 'id' | 'createdAt'> = {
        platform: contentInputs.platform,
        textContent: variation.textContent,
        companyId: appUser.companyId,
        originalTopic: contentInputs.topic || undefined,
        suggestedImagePrompt: variation.suggestedImagePrompt,
        imageUrl: generatedImageDataUri || undefined, // The base64 URI
        isAiGeneratedImage: !!generatedImageDataUri,
        imageAiHint: variation.suggestedImagePrompt?.split(',').slice(0, 2).join(' ') || undefined,
        status: postStatus,
        // YouTube specific
        suggestedVideoTitle: variation.suggestedVideoTitle,
        suggestedVideoDescription: variation.suggestedVideoDescription,
        suggestedVideoKeywordsTags: variation.suggestedVideoKeywordsTags,
    };
    
    try {
      if (editingPostId) {
          const result = await updateStoredSocialMediaPostAction(appUser.uid, { ...finalPayload, id: editingPostId });
           if (!result.success) throw new Error(result.error);
          toast({ title: "Content Updated", description: "Your changes have been saved to the Content Hub." });
      } else {
          const result = await addStoredSocialMediaPostAction(appUser.uid, finalPayload);
           if (!result.success || !result.data) throw new Error(result.error || 'Failed to save post');
          
          const isInstantlyLive = contentInputs.platform === 'BlogPost' || contentInputs.platform === 'SalesLandingPage';
          toast({
              title: isInstantlyLive ? "Content Published!" : "Content Saved to Hub",
              description: isInstantlyLive 
                ? (<span>Your content is now live and publicly visible! View it in the <Link href="/social-media/content-hub" className="underline font-bold">Content Hub</Link>.</span>)
                : (<span>Your content has been saved. View it in the <Link href="/social-media/content-hub" className="underline font-bold">Content Hub</Link>.</span>),
          });
      }
      setEditingPostId(null);
      setEditingPost(null);
      handleContentInputChange('salesPageContent', undefined);

    } catch (error: any) {
        console.error("Error saving post via server action:", error);
        toast({ title: 'Save Failed', description: error.message || "Could not save the post to the database.", variant: 'destructive' });
    }
  }, [contentInputs, toast, editingPostId, appUser, generatedImageDataUri]);


  const handleContentFormSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!contentInputs.topic || !appUser) {
        toast({ title: 'Missing Prompt/Topic or User Info', description: "Please describe what you want to create or edit.", variant: "destructive" });
        return;
    }
    
    setIsLoadingContent(true); 
    setGeneratedContent(null);
    try {
      const result = await generateTrackedSocialContentAction(appUser.companyId, appUser.uid, contentInputs);
      
      if (result.success && result.data) {
        const extendedResult: ExtendedGenerateSocialMediaContentOutput = {
          ...result.data,
          variations: result.data.variations.map(v => ({ ...v, suggestedHashtagsForVariation: null, isFetchingHashtags: false }))
        };
        setGeneratedContent(extendedResult);

        if ((contentInputs.platform === 'SalesLandingPage' || contentInputs.platform === 'BlogPost') && result.data.variations.length > 0) {
            handleContentInputChange('salesPageContent', result.data.variations[0].textContent);
        }
        
        showAIContentReadyToast(toast, "Social Media Post", result.quotaInfo);

        if (result.data.variations.length > 0 && contentInputs.includeHashtags && 
            ['TwitterX', 'Instagram', 'LinkedIn', 'Facebook'].includes(contentInputs.platform)) {
          result.data.variations.forEach((variation, index) => {
            const topicForHashtags = contentInputs.keywords || contentInputs.topic;
            if (topicForHashtags) {
              fetchHashtagsForVariation(index, topicForHashtags, contentInputs.platform);
            }
          });
        }
      } else {
        throw new Error(result.error || 'AI generation failed.');
      }
    } catch (error: any) {
      toast({ title: 'AI Generation Failed', description: error.message || 'Could not generate content.', variant: 'destructive' });
    } finally {
      setIsLoadingContent(false);
    }
  }, [contentInputs, fetchHashtagsForVariation, toast, appUser]);
  
  const parseAspectRatioFromPrompt = useCallback((promptText: string): ImageAspectRatio => {
    const lowerPrompt = promptText.toLowerCase();
    if (lowerPrompt.includes("square") || lowerPrompt.includes("1:1")) return "Square (1:1)";
    if (lowerPrompt.includes("16:9") || (lowerPrompt.includes("landscape") && !lowerPrompt.includes("portrait landscape"))) return "Landscape (16:9)";
    if (lowerPrompt.includes("9:16") || (lowerPrompt.includes("vertical") && !lowerPrompt.includes("horizontal vertical"))) return "Portrait (9:16)";
    if (lowerPrompt.includes("4:5") || (lowerPrompt.includes("portrait") && !lowerPrompt.includes("landscape portrait") && !lowerPrompt.includes("9:16"))) return "Portrait (4:5)";
    return "Default";
  }, []);

  const useImagePromptAndGo = useCallback((promptText: string) => {
    setImagePrompt(promptText);
    const parsedRatio = parseAspectRatioFromPrompt(promptText);
    setSelectedAspectRatio(parsedRatio);
    scrollToRef(imageGeneratorRef);
    toast({ title: "Image Prompt & Ratio Pre-filled", description: `Prompt set. Aspect ratio detected: ${parsedRatio}. Now click 'Generate Image'.`});
  }, [parseAspectRatioFromPrompt, scrollToRef, toast]);


  const handleImageGenerationSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    if (!imagePrompt || !appUser) {
      toast({ title: 'Missing Image Prompt or User Info', variant: 'destructive' }); return;
    }
    setIsGeneratingImage(true); setGeneratedImageDataUri(null); setImageGenerationGuidance(null);
    let finalPrompt = imagePrompt;
    let aspectRatio: "1:1" | "16:9" | "9:16" | "4:5" | "3:4" | "4:3" | undefined = undefined;

    if (selectedAspectRatio !== "Default") {
        const ratioMapping = {
            "Square (1:1)": "1:1",
            "Landscape (16:9)": "16:9",
            "Portrait (9:16)": "9:16",
            "Portrait (4:5)": "4:5",
        };
        const selected = selectedAspectRatio as keyof typeof ratioMapping;
        if(ratioMapping[selected]) {
            aspectRatio = ratioMapping[selected] as any;
        }
    }

    setPromptForGeneratedImage(finalPrompt);
    try {
      const result = await generateTrackedImageAction(appUser.companyId, appUser.uid, { prompt: finalPrompt, aspectRatio: aspectRatio as any });

      if (result.success && result.data?.imageDataUri) {
        setGeneratedImageDataUri(result.data.imageDataUri);
        
        if (generatedContent?.variations[0]?.textContent) {
            const placeholderRegex = /https?:\/\/placehold\.co\/[\w/.]+|https?:\/\/picsum\.photos\/seed\/[^/]+\/\d+\/\d+/g;
            const updatedHtml = generatedContent.variations[0].textContent.replace(placeholderRegex, result.data.imageDataUri);
            setGeneratedContent(prev => {
                if (!prev) return null;
                const newVariations = [...prev.variations];
                newVariations[0] = { ...newVariations[0], textContent: updatedHtml };
                return { ...prev, variations: newVariations };
            });
             handleContentInputChange('salesPageContent', updatedHtml);
        }

        showAIImageGeneratedToast(toast, result.quotaInfo);

      } else {
        throw new Error(result.error || 'Image generation failed.');
      }
    } catch (error: any) {
      toast({ title: 'Image Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [imagePrompt, selectedAspectRatio, toast, generatedContent, appUser]);

  const handleTrendFormSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!trendInputs.businessNiche || !appUser) {
      toast({ title: 'Missing Business Niche or User Info', variant: "destructive" }); return;
    }
    setIsLoadingTrends(true); setTrendingSuggestions(null);
    try {
      const result = await generateTrackedTrendingTopicAction(appUser.companyId, appUser.uid, trendInputs);
      if(!result.success || !result.data) throw new Error(result.error || 'Failed to get trends.');
      setTrendingSuggestions(result.data.suggestions);
      showAISuccessToast(toast, "Trending Topics", result.quotaInfo);
    } catch (error: any) {
      toast({ title: 'Trend Suggestion Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingTrends(false);
    }
  }, [trendInputs, toast, appUser]);

  const handleHashtagFormSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!hashtagInputs.topicOrKeywords || !appUser) {
      toast({ title: "Topic/Keywords Required", variant: "destructive" }); return;
    }
    setIsGeneratingHashtags(true); setHashtagSuggestions(null);
    try {
      const result = await generateTrackedHashtagAction(appUser.companyId, appUser.uid, hashtagInputs);
       if(!result.success || !result.data) throw new Error(result.error || 'Failed to generate hashtags.');
      setHashtagSuggestions(result.data.hashtagSuggestions);
      showAISuccessToast(toast, "Hashtags", result.quotaInfo);
    } catch (error: any) {
      toast({ title: 'Error Generating Hashtags', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingHashtags(false);
    }
  }, [hashtagInputs, toast, appUser]);

  const handleReviewSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewInput.reviewText || !reviewInput.businessName || !appUser) {
      toast({ title: "Missing Information", description: "Please provide Review Text and Business Name.", variant: "destructive" });
      return;
    }
    setIsReviewLoading(true);
    setReviewResponse(null);
    try {
      const result = await generateTrackedReviewResponseAction(appUser.companyId, appUser.uid, reviewInput);
      if(!result.success || !result.data) throw new Error(result.error || 'Failed to generate response.');
      setReviewResponse(result.data.response);
      showAITaskCompleteToast(toast, "Review response", result.quotaInfo);
    } catch (error: any) {
      console.error('Error generating review response:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate review response.', variant: 'destructive' });
    }
    setIsReviewLoading(false);
  }, [reviewInput, toast, appUser]);
  
  const handleEnhancedPromptSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!enhancedPromptInputs.originalPrompt || !appUser) {
      toast({ title: "Original Idea Required", description: "Please enter your basic idea or prompt.", variant: "destructive" });
      return;
    }
    setIsEnhancingPrompt(true);
    setEnhancedPromptResult(null);
    try {
      const result = await generateTrackedEnhancedPromptAction(appUser.companyId, appUser.uid, enhancedPromptInputs);
       if(!result.success || !result.data) throw new Error(result.error || 'Failed to enhance prompt.');
      setEnhancedPromptResult(result.data);
      showAISuccessToast(toast, "Enhanced Prompt", result.quotaInfo);
    } catch (error: any) {
      toast({ title: "Prompt Enhancement Failed", description: error.message || "Could not enhance prompt.", variant: "destructive" });
    } finally {
      setIsEnhancingPrompt(false);
    }
  }, [enhancedPromptInputs, toast, appUser]);

  const useEnhancedPrompt = useCallback((promptText: string, goal: PromptGoal) => {
    if (goal === 'ImageGeneration') {
      setImagePrompt(promptText);
      scrollToRef(imageGeneratorRef);
      toast({ title: "Image Prompt Pre-filled", description: "Enhanced prompt set for Image Generator." });
    } else if (goal === 'TextContent' || goal === 'VideoScriptIdea') {
      const platformForContent = goal === 'TextContent' ? 'BlogPost' : 'YouTubeVideoScript';
      handleContentInputChange('platform', platformForContent as SocialPlatform);
      handleContentInputChange('topic', promptText);
      scrollToRef(contentGeneratorRef);
      toast({ title: "Content Idea & Platform Pre-filled", description: `Enhanced prompt set as topic, platform set to ${platformForContent}.` });
    } else if (goal === 'SalesPageBrief') {
        handleContentInputChange('platform', 'SalesLandingPage');
        handleContentInputChange('topic', promptText);
        scrollToRef(contentGeneratorRef);
        toast({ title: "Sales Page Brief Pre-filled", description: `Enhanced prompt set for Sales Page Generator.` });
    }
  }, [scrollToRef, toast]);

  const downloadImage = useCallback(() => {
    if (!generatedImageDataUri) return;
    const link = document.createElement('a');
    link.href = generatedImageDataUri;
    const fileNamePromptPart = imagePrompt.substring(0, 20).replace(/\s+/g, '_').replace(/[^\w-]/g, '');
    link.download = `omniflow-ai-image-${fileNamePromptPart || 'generated'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Image Download Started' });
  }, [generatedImageDataUri, imagePrompt, toast]);
  
  const useTrendSuggestionForContent = useCallback((topic: string, keywords: string[]) => {
    handleContentInputChange('topic', topic);
    handleContentInputChange('keywords', keywords.join(', '));
    
    let platformToSet: SocialPlatform = 'BlogPost'; 
    if (trendInputs.contentType === 'BlogPost') {
      platformToSet = 'BlogPost';
    } else if (trendInputs.contentType === 'YouTubeVideo') {
      platformToSet = 'YouTubeVideoScript';
    }
    handleContentInputChange('platform', platformToSet);

    toast({ title: "Content Inputs Pre-filled", description: `Topic, keywords, and platform (${platformToSet}) set for Content Generator.`});
    scrollToRef(contentGeneratorRef);
  }, [trendInputs.contentType, toast, scrollToRef]);
  
  const useKeywordsForHashtagSuggester = useCallback((keywords: string[]) => {
    setHashtagInputs(prev => ({ ...prev, topicOrKeywords: keywords.join(', ') }));
    toast({ title: "Keywords Pre-filled", description: "Keywords set for Hashtag Suggester."});
    scrollToRef(hashtagSuggesterRef);
  }, [toast, scrollToRef]);
  
  const useHashtagsForHashtagSuggester = useCallback((hashtags: string[]) => {
    setHashtagInputs(prev => ({...prev, topicOrKeywords: hashtags.map(h => h.replace('#', '')).join(', ')}));
    toast({ title: "Hashtags Pre-filled", description: "Hashtags set as keywords for Hashtag Suggester."});
    scrollToRef(hashtagSuggesterRef);
  }, [toast, scrollToRef]);

  const useImagePromptForGenerator = useCallback((prompt: string) => {
    if (prompt) {
      setImagePrompt(prompt);
      setSelectedAspectRatio(parseAspectRatioFromPrompt(prompt));
      toast({ title: "Image Prompt Pre-filled", description: "Prompt set for Image Generator."});
      scrollToRef(imageGeneratorRef);
    } else {
      toast({ title: "No Prompt Provided", description: "The suggested image prompt was empty.", variant: "destructive"});
    }
  }, [parseAspectRatioFromPrompt, toast, scrollToRef]);
  
  const getPreviewHtml = (content: string, platform: SocialPlatform): string => {
    if (platform === 'SalesLandingPage' || platform === 'BlogPost') {
      return content;
    }
    return `<!DOCTYPE html><html><head><style>body { font-family: sans-serif; padding: 1rem; white-space: pre-wrap; }</style></head><body>${content}</body></html>`;
  };


  const handlePreviewInNewTab = useCallback((content: string, platform: SocialPlatform) => {
    const htmlContent = getPreviewHtml(content, platform);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }, []);

  return (
    <div className="space-y-8">
      <PageTitle title="AI Social Content Factory" description="Generate engaging text, image prompts, video ideas, images, discover trending topics, manage reviews, and plan WhatsApp messages." />
      <ContextualHelpButton pageId="social-media" />

      <div className="grid grid-cols-1 gap-6">
        
        <Card ref={trendInputsRef}>
          <CardHeader>
            <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-yellow-500" />AI Trending Topic Suggester</CardTitle>
            <CardDescription>Discover trending topics for your niche.</CardDescription>
          </CardHeader>
          <form onSubmit={handleTrendFormSubmit}>
            <CardContent className="space-y-4">
                <div><Label htmlFor="trendNiche">Business Niche *</Label><Input id="trendNiche" value={trendInputs.businessNiche} onChange={(e) => handleTrendInputChange('businessNiche', e.target.value)} placeholder="e.g., Sustainable Home Decor" required /></div>
                <div><Label htmlFor="trendContentType">Content Type *</Label><Select value={trendInputs.contentType} onValueChange={(value: ContentCreationType) => handleTrendInputChange('contentType', value)}><SelectTrigger id="trendContentType"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BlogPost">Blog Post</SelectItem><SelectItem value="YouTubeVideo">YouTube Video</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="trendHorizon">Planning Horizon *</Label><Select value={trendInputs.planningHorizon} onValueChange={(value: PlanningHorizon) => handleTrendInputChange('planningHorizon', value)}><SelectTrigger id="trendHorizon"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Daily">Daily</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Monthly">Monthly</SelectItem></SelectContent></Select></div>
                <div><Label htmlFor="trendRegion">Target Region (Optional)</Label><Input id="trendRegion" value={trendInputs.targetRegion || ''} onChange={(e) => handleTrendInputChange('targetRegion', e.target.value)} placeholder="e.g., India, USA, Global" /></div>
            </CardContent>
            <CardFooter><Button type="submit" disabled={isLoadingTrends}><SearchCheck className="mr-2 h-4 w-4" /> {isLoadingTrends ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Get Trends</Button></CardFooter>
          </form>
          {trendingSuggestions && trendingSuggestions.length > 0 && (
            <CardContent className="mt-4 border-t pt-4"><h3 className="text-md font-semibold mb-2">Topic Suggestions:</h3><Accordion type="single" collapsible className="w-full">
                {trendingSuggestions.map((s, i) => (<AccordionItem value={`trend-${i}`} key={i}><AccordionTrigger className="text-sm hover:no-underline text-left">{s.topic}</AccordionTrigger><AccordionContent className="space-y-3 pl-2 text-xs">
                    <Button variant="outline" size="xs" onClick={()=>useTrendSuggestionForContent(s.topic, s.suggestedKeywords)} title="Use this topic and keywords for content generator"><SendToBack className="mr-1 h-3 w-3"/>Use for Content Generator</Button>
                    <p><strong>Reasoning:</strong> {s.reasoning}</p>
                    <div><strong>Keywords:</strong> <div className="flex flex-wrap gap-1 mt-1">{s.suggestedKeywords.map(kw=><Badge key={kw} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10" onClick={()=>copyToClipboard(kw, "Keyword")}>{kw}</Badge>)}</div>
                        <div className="mt-1 space-x-1">
                            <Button variant="outline" size="xs" onClick={()=>copyToClipboard(s.suggestedKeywords, "Keywords")}><Copy className="mr-1 h-3 w-3"/>Copy All Keywords</Button>
                            <Button variant="outline" size="xs" onClick={()=>useKeywordsForHashtagSuggester(s.suggestedKeywords)} title="Use keywords for Hashtag Suggester"><SendToBack className="mr-1 h-3 w-3"/>Use for Hashtags</Button>
                        </div>
                    </div>
                    <div><strong>Example Titles:</strong> <ul className="list-disc list-inside ml-2 space-y-1">{s.exampleTitles.map((t, ti)=><li key={ti} className="flex justify-between items-center group">{t} <Button variant="ghost" size="xs" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={()=>useTrendSuggestionForContent(t, s.suggestedKeywords)} title="Use this title as topic for content generator"><SendToBack className="h-3 w-3"/></Button></li>)}</ul></div>
                </AccordionContent></AccordionItem>))}
            </Accordion></CardContent>)}
        </Card>

         <Card ref={promptEnhancerRef}>
          <CardHeader>
            <CardTitle className="flex items-center"><Brain className="mr-2 h-5 w-5 text-teal-500" />AI Prompt Enhancer / Creator</CardTitle>
            <CardDescription>Turn simple ideas into powerful, detailed prompts for other AI tools or to refine inputs for OmniFlow's generators.</CardDescription>
          </CardHeader>
          <form onSubmit={handleEnhancedPromptSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="originalPromptEnhancer">Your Basic Idea or Simple Prompt *</Label>
                <Textarea id="originalPromptEnhancer" value={enhancedPromptInputs.originalPrompt} onChange={(e) => handleEnhancedPromptInputChange('originalPrompt', e.target.value)} placeholder="e.g., A sales page for my SaaS company OmniFlow" required rows={3} />
              </div>
              <div>
                <Label htmlFor="promptGoalEnhancer">What kind of AI output is this prompt for? *</Label>
                <Select value={enhancedPromptInputs.promptGoal} onValueChange={(value: PromptGoal) => handleEnhancedPromptInputChange('promptGoal', value as string)}>
                  <SelectTrigger id="promptGoalEnhancer"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SalesPageBrief">Sales Page Brief</SelectItem>
                    <SelectItem value="ImageGeneration">Image Generation</SelectItem>
                    <SelectItem value="TextContent">Text Content (e.g., blog, social post, email)</SelectItem>
                    <SelectItem value="VideoScriptIdea">Video Script Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="desiredStyleEnhancer">Desired Style/Tone (Optional)</Label>
                <Input id="desiredStyleEnhancer" value={enhancedPromptInputs.desiredStyle || ''} onChange={(e) => handleEnhancedPromptInputChange('desiredStyle', e.target.value)} placeholder="e.g., photorealistic, cinematic, witty, formal" />
              </div>
              <div>
                <Label htmlFor="keyElementsEnhancer">Key Elements/Keywords to Include (Optional, comma-separated)</Label>
                <Input id="keyElementsEnhancer" value={enhancedPromptInputs.keyElements || ''} onChange={(e) => handleEnhancedPromptInputChange('keyElements', e.target.value)} placeholder="e.g., futuristic, calm, include product X" />
              </div>
            </CardContent>
            <CardFooter><Button type="submit" disabled={isEnhancingPrompt}><Wand2 className="mr-2 h-4 w-4" /> {isEnhancingPrompt ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Enhance My Prompt</Button></CardFooter>
          </form>
          {enhancedPromptResult && (
            <CardContent className="mt-4 border-t pt-4 space-y-3">
              <div>
                <Label htmlFor="enhancedPromptOutput">Enhanced Prompt:</Label>
                <Textarea id="enhancedPromptOutput" value={enhancedPromptResult.enhancedPrompt} readOnly rows={5} className="min-h-[100px] bg-muted/30" />
                <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(enhancedPromptResult.enhancedPrompt, "Enhanced Prompt")}><Copy className="mr-2 h-3 w-3" /> Copy Enhanced Prompt</Button>
                    <Button variant="default" size="sm" onClick={() => useEnhancedPrompt(enhancedPromptResult.enhancedPrompt, enhancedPromptInputs.promptGoal as PromptGoal)} title="Use this enhanced prompt in the relevant OmniFlow AI tool."><SendToBack className="mr-1 h-3 w-3"/>Use This Prompt</Button>
                </div>
              </div>
              {enhancedPromptResult.guidanceNotes && (
                <div><Label htmlFor="guidanceNotesOutput">Guidance Notes:</Label><p id="guidanceNotesOutput" className="text-xs p-2 border rounded-md bg-muted/30 text-muted-foreground">{enhancedPromptResult.guidanceNotes}</p></div>
              )}
            </CardContent>
          )}
        </Card>


        <Card ref={contentGeneratorRef}>
          <CardHeader>
              <CardTitle className="flex items-center"><FileCode className="mr-2 h-5 w-5 text-orange-500" />Content Generator</CardTitle>
              <CardDescription>AI-powered text for social posts, blogs, sales pages, and YouTube scripts.</CardDescription>
          </CardHeader>
          <form onSubmit={handleContentFormSubmit}>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label htmlFor="platform">Target Platform *</Label><Select value={contentInputs.platform} onValueChange={(value: SocialPlatform) => { handleContentInputChange('platform', value); setGeneratedContent(null); }}><SelectTrigger id="platform"><SelectValue /></SelectTrigger><SelectContent>
                        <SelectItem value="SalesLandingPage">Sales Landing Page (HTML)</SelectItem>
                        <SelectItem value="BlogPost">Blog Post (HTML)</SelectItem>
                        <SelectItem value="TwitterX">Twitter / X</SelectItem><SelectItem value="Instagram">Instagram Post</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn Post</SelectItem><SelectItem value="Facebook">Facebook Post</SelectItem>
                        <SelectItem value="YouTubeVideoScript">YouTube Video Script &amp; Metadata</SelectItem>
                      </SelectContent></Select></div>
                      <div><Label htmlFor="tone">Tone *</Label><Select value={contentInputs.tone} onValueChange={(value: SocialTone) => handleContentInputChange('tone', value)}><SelectTrigger id="tone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Formal">Formal</SelectItem><SelectItem value="Casual">Casual</SelectItem><SelectItem value="Humorous">Humorous</SelectItem><SelectItem value="Inspirational">Inspirational</SelectItem><SelectItem value="Professional">Professional</SelectItem><SelectItem value="Witty">Witty</SelectItem><SelectItem value="Urgent">Urgent</SelectItem></SelectContent></Select></div>
                  </div>
                  <div>
                    <Label htmlFor="topic">Describe What You Want *</Label>
                    <Textarea 
                        id="topic" 
                        value={contentInputs.topic} 
                        onChange={(e) => handleContentInputChange('topic', e.target.value)} 
                        placeholder="e.g., 'A blog post about the benefits of AI in marketing' OR 'Create a modern sales page for my new SaaS product called OmniFlow.' OR if editing, 'Change the main headline...'"
                        rows={5} 
                        required
                    />
                    <p className="text-xs text-muted-foreground mt-1">Provide a simple prompt to create new content, or an editing instruction for the existing content below.</p>
                  </div>
                  {(contentInputs.platform === 'SalesLandingPage' || contentInputs.platform === 'BlogPost') && (
                    <div>
                        <Label htmlFor="salesPageContent">Base Content (For Editing)</Label>
                        <Textarea 
                            id="salesPageContent" 
                            value={contentInputs.salesPageContent || ''} 
                            onChange={(e) => handleContentInputChange('salesPageContent', e.target.value)} 
                            placeholder="When creating from scratch, leave this empty. When editing a saved post, the content will be loaded here. The AI uses this as the base for your editing prompt." 
                            rows={8} 
                            className="font-mono text-xs"
                        />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="targetLanguage">Target Language</Label>
                    <Select value={contentInputs.targetLanguage || 'English'} onValueChange={(value) => handleContentInputChange('targetLanguage', value)}>
                      <SelectTrigger id="targetLanguage"><SelectValue placeholder="Select Language" /></SelectTrigger>
                      <SelectContent>
                        {languageOptions.map(lang => ( <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
              </CardContent>
              <CardFooter><Button type="submit" disabled={isLoadingContent}><Wand2 className="mr-2 h-4 w-4" /> {isLoadingContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} {editingPostId ? 'Re-Generate Content' : 'Generate Content'}</Button></CardFooter>
          </form>
        </Card>

        {generatedContent && generatedContent.variations.length > 0 && (
            <Card className="mt-0"> 
            <CardHeader><CardTitle>Generated Content Suggestions</CardTitle><CardDescription>Review & copy AI-generated content. Use "Use..." buttons for other tools. Hashtags auto-fetched for relevant platforms.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                {generatedContent.variations.map((variation, index) => {
                 const isSalesPage = contentInputs.platform === 'SalesLandingPage';
                 const isBlogPost = contentInputs.platform === 'BlogPost';
                 const isWebPage = isSalesPage || isBlogPost;

                 return (
                <Card key={index} className="p-4 bg-muted/50 shadow-sm">
                    <CardTitle className="text-lg mb-3 flex items-center justify-between">
                        <div className="flex items-center">
                            {contentInputs.platform === 'YouTubeVideoScript' ? <Youtube className="mr-2 h-5 w-5 text-red-600"/> : 
                             isSalesPage ? <FileCode className="mr-2 h-5 w-5 text-green-600"/> :
                             isBlogPost ? <Rss className="mr-2 h-5 w-5 text-orange-600"/> :
                             <Edit3 className="mr-2 h-5 w-5 text-primary"/>}
                            Variation {index + 1} for {contentInputs.platform}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleSaveOrUpdatePost(variation)}>
                            <ClipboardList className="mr-2 h-4 w-4" /> {editingPostId ? 'Update in Content Hub' : 'Save to Content Hub'}
                        </Button>
                    </CardTitle>
                    <div className="space-y-4">
                    {variation.textContent && (
                        <div>
                             {isWebPage ? (
                                <Tabs defaultValue="preview" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4"/>Preview</TabsTrigger>
                                        <TabsTrigger value="code"><Code className="mr-2 h-4 w-4"/>Code</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="preview" className="mt-2">
                                        <div className="border rounded-md p-4 bg-background">
                                           <Button className="w-full" onClick={() => handlePreviewInNewTab(variation.textContent, contentInputs.platform)}>Open Preview in New Tab</Button>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="code">
                                        <Label className="flex items-center text-base">HTML Code</Label>
                                        <ScrollArea className="h-[600px] mt-1 border rounded-md bg-background p-3">
                                             <pre className="text-sm whitespace-pre-wrap font-mono">{variation.textContent}</pre>
                                        </ScrollArea>
                                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(variation.textContent, 'HTML Code')} className="mt-2"><Copy className="mr-2 h-3 w-3" /> Copy HTML</Button>
                                    </TabsContent>
                                </Tabs>
                            ) : contentInputs.platform === 'YouTubeVideoScript' ? (
                                <>
                                 <Label className="flex items-center text-base">Video Script</Label>
                                 <ScrollArea className="h-80 mt-1 border rounded-md bg-background p-3">
                                     {parseAndRenderScript(variation.textContent, useImagePromptAndGo)}
                                 </ScrollArea>
                                </>
                            ) : (
                                <>
                                 <Label className="flex items-center text-base">Text Content</Label>
                                 <ScrollArea className="h-48 mt-1 border rounded-md bg-background p-3">
                                     <pre className="text-sm whitespace-pre-wrap font-sans">{variation.textContent}</pre>
                                 </ScrollArea>
                                </>
                            )}
                            {!isWebPage && contentInputs.platform !== 'YouTubeVideoScript' && <Button variant="outline" size="sm" onClick={() => copyToClipboard(variation.textContent, 'Text Content')} className="mt-2"><Copy className="mr-2 h-3 w-3" /> Copy Text</Button>}
                        </div>
                    )}
                    
                    {variation.suggestedHashtagsForVariation && variation.suggestedHashtagsForVariation.length > 0 && (
                        <div className="mt-2">
                            <Label className="flex items-center text-base"><Hash className="mr-2 h-4 w-4 text-blue-500"/>Auto-Suggested Hashtags</Label>
                            <div className="flex flex-wrap gap-1 mt-1 p-2 border rounded-md bg-background">
                                {variation.suggestedHashtagsForVariation.map((tag, tagIdx) => (
                                    <Badge key={tagIdx} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10" onClick={() => copyToClipboard(tag, "Hashtag")}>{tag}</Badge>
                                ))}
                            </div>
                             <div className="mt-1 space-x-1">
                                <Button variant="outline" size="xs" onClick={() => copyToClipboard(variation.suggestedHashtagsForVariation!, 'Hashtags')}><Copy className="mr-1 h-3 w-3"/>Copy All</Button>
                                <Button variant="outline" size="xs" onClick={() => useHashtagsForHashtagSuggester(variation.suggestedHashtagsForVariation!)} title="Use hashtags for Hashtag Suggester"><SendToBack className="mr-1 h-3 w-3"/>Use for Hashtags</Button>
                            </div>
                        </div>
                    )}
                    {variation.isFetchingHashtags && <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-3 w-3 animate-spin"/>Fetching hashtags...</div>}


                    {contentInputs.platform === 'YouTubeVideoScript' && ( <>
                        {variation.suggestedVideoTitle && (<div><Label className="flex items-center text-base"><Youtube className="mr-2 h-4 w-4 text-red-500"/>Suggested Video Title</Label><div className="flex items-center gap-2"><Input value={variation.suggestedVideoTitle} readOnly className="text-sm mt-1 bg-background flex-grow" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(variation.suggestedVideoTitle!, 'Video Title')} className="mt-1 shrink-0" title="Copy Video Title"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => useTrendSuggestionForContent(variation.suggestedVideoTitle!, variation.suggestedVideoKeywordsTags || [])} className="mt-1 shrink-0 text-xs" title="Use as topic for new content"><SendToBack className="mr-1 h-3 w-3"/>Use as Topic</Button></div></div>)}
                        {variation.suggestedVideoThumbnailPrompt && (<div><Label className="flex items-center text-base"><ImageIcon className="mr-2 h-4 w-4 text-orange-500"/>Suggested YouTube Thumbnail Prompt</Label><div className="flex items-center gap-2"><Input value={variation.suggestedVideoThumbnailPrompt} readOnly className="text-sm mt-1 bg-background flex-grow" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(variation.suggestedVideoThumbnailPrompt!, 'Thumbnail Prompt')} className="mt-1 shrink-0" title="Copy Thumbnail Prompt"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => useImagePromptAndGo(variation.suggestedVideoThumbnailPrompt!)} className="mt-1 shrink-0 text-xs" title="Use prompt & go to Image Generator"><Wand2 className="mr-1 h-3 w-3" />Use for Image Gen</Button></div></div>)}
                        {variation.suggestedVideoDescription && (<div><Label className="flex items-center text-base"><Info className="mr-2 h-4 w-4 text-blue-500"/>Suggested Video Description</Label><Textarea value={variation.suggestedVideoDescription} readOnly rows={5} className="text-sm mt-1 min-h-[100px] bg-background" /><Button variant="outline" size="sm" onClick={() => copyToClipboard(variation.suggestedVideoDescription!, 'Video Description')} className="mt-2"><Copy className="mr-2 h-3 w-3" /> Copy Description</Button></div>)}
                        {variation.suggestedVideoKeywordsTags && variation.suggestedVideoKeywordsTags.length > 0 && (<div><Label className="flex items-center text-base"><Hash className="mr-2 h-4 w-4 text-green-500"/>Suggested Video Keywords/Tags</Label><div className="flex flex-wrap gap-1 mt-1 p-2 border rounded-md bg-background">{variation.suggestedVideoKeywordsTags.map((tag, tagIdx) => (<Badge key={tagIdx} variant="secondary" className="cursor-pointer hover:bg-primary/10" onClick={() => copyToClipboard(tag, "Keyword/Tag")}>{tag}</Badge>))}</div><div className="mt-1 space-x-1"><Button variant="outline" size="xs" onClick={() => copyToClipboard(variation.suggestedVideoKeywordsTags!, 'Keywords/Tags')}><Copy className="mr-1 h-3 w-3"/>Copy All</Button><Button variant="outline" size="xs" onClick={() => useKeywordsForHashtagSuggester(variation.suggestedVideoKeywordsTags!)} title="Use keywords for Hashtag Suggester"><SendToBack className="mr-1 h-3 w-3"/>Use for Hashtags</Button></div></div>)}
                        {variation.suggestedVideoHashtags && variation.suggestedVideoHashtags.length > 0 && (<div><Label className="flex items-center text-base"><Hash className="mr-2 h-4 w-4 text-purple-500"/>Suggested Video Hashtags</Label><div className="flex flex-wrap gap-1 mt-1 p-2 border rounded-md bg-background">{variation.suggestedVideoHashtags.map((tag, tagIdx) => (<Badge key={tagIdx} variant="outline" className="cursor-pointer hover:bg-primary/10" onClick={() => copyToClipboard(tag, "Hashtag")}>{tag}</Badge>))}</div><div className="mt-1 space-x-1"><Button variant="outline" size="xs" onClick={() => copyToClipboard(variation.suggestedVideoHashtags!, 'Hashtags')}><Copy className="mr-1 h-3 w-3"/>Copy All</Button><Button variant="outline" size="xs" onClick={() => useHashtagsForHashtagSuggester(variation.suggestedVideoHashtags!)} title="Use hashtags for Hashtag Suggester"><SendToBack className="mr-1 h-3 w-3"/>Use for Hashtags</Button></div></div>)}
                         <Alert variant="default" className="mt-3 text-xs">
                            <Info className="h-4 w-4" />
                            <AlertTitleComponent>Using In-Script Image Prompts</AlertTitleComponent>
                            <AlertDescription>
                                The video script above may contain specific visual ideas (e.g., [IMAGE PROMPT FOR AI: ...]). Use these with an image generator for visuals.
                            </AlertDescription>
                        </Alert>
                    </>)}
                    {variation.suggestedImagePrompt && (isWebPage || (contentInputs.platform !== 'YouTubeVideoScript')) && (<div><Label className="flex items-center text-base"><ImageIcon className="mr-2 h-4 w-4 text-purple-500"/>Suggested Image Prompt (for {contentInputs.platform})</Label><div className="flex items-center gap-2"><Input value={variation.suggestedImagePrompt} readOnly className="text-sm mt-1 bg-background flex-grow" /><Button variant="outline" size="icon" onClick={() => copyToClipboard(variation.suggestedImagePrompt!, 'Image Prompt')} className="mt-1 shrink-0" title="Copy Image Prompt"><Copy className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => useImagePromptAndGo(variation.suggestedImagePrompt!)} className="mt-1 shrink-0 text-xs" title="Use prompt & go to Image Generator"><Wand2 className="mr-1 h-3 w-3" />Use for Image Gen</Button></div></div>)}
                    
                    {variation.suggestedVideoScriptIdea && contentInputs.platform !== 'YouTubeVideoScript' && (<div><Label className="flex items-center text-base"><Film className="mr-2 h-4 w-4 text-rose-500"/>Suggested Short Video Idea</Label><Textarea value={variation.suggestedVideoScriptIdea} readOnly rows={3} className="text-sm mt-1 min-h-[60px] bg-background" /><Button variant="outline" size="sm" onClick={() => copyToClipboard(variation.suggestedVideoScriptIdea!, 'Video Idea')} className="mt-2"><Copy className="mr-2 h-3 w-3" /> Copy Video Idea</Button></div>)}
                    </div>
                </Card>
                 );
                })}
            </CardContent>
            </Card>
        )}

        <Card ref={imageGeneratorRef}>
          <CardHeader>
              <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-purple-500" />AI Image Generator (Premium)</CardTitle>
              <CardDescription>Generate actual AI images with Vertex AI Imagen or get enhanced prompts for external tools like DALL-E, Midjourney, and Stable Diffusion.</CardDescription>
          </CardHeader>
          <form onSubmit={handleImageGenerationSubmit}>
              <CardContent className="space-y-4">
              <div><Label htmlFor="imagePrompt">Image Prompt * (Can be pre-filled)</Label><Textarea id="imagePrompt" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="Describe the image you want in detail (style, subject, lighting, colors...)" rows={3} required /></div>
              <div><Label htmlFor="aspectRatio">Suggested Format/Aspect Ratio</Label><Select value={selectedAspectRatio} onValueChange={(value: ImageAspectRatio) => setSelectedAspectRatio(value)}><SelectTrigger id="aspectRatio"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Default">Default (AI Decides)</SelectItem><SelectItem value="Square (1:1)">Square (1:1)</SelectItem><SelectItem value="Landscape (16:9)">Landscape (16:9)</SelectItem><SelectItem value="Portrait (9:16)">Portrait (9:16)</SelectItem><SelectItem value="Portrait (4:5)">Portrait (4:5)</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground mt-1">Hint for AI; actual output ratio may vary.</p></div>
              </CardContent>
              <CardFooter><Button type="submit" disabled={isGeneratingImage}><ImageIcon className="mr-2 h-4 w-4" /> {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Generate AI Image</Button></CardFooter>
          </form>
          {isGeneratingImage && (<CardContent><div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /><p className="text-muted-foreground">Generating AI image...</p></div></CardContent>)}
          {generatedImageDataUri && (<CardContent className="mt-4 border-t pt-4 space-y-2">
              <Label>Generated AI Image:</Label>
              <div className="border rounded-md p-2 bg-muted/30 flex justify-center items-center min-h-[200px] max-h-[400px] overflow-y-auto">
                  <NextImage src={generatedImageDataUri} alt={promptForGeneratedImage || "AI generated image"} width={300} height={300} className="rounded-md object-contain max-h-[380px]" data-ai-hint="abstract art"/>
              </div>
              {promptForGeneratedImage && (
                <div className="mt-1 space-y-1">
                  <Label htmlFor="usedImagePrompt" className="text-xs">Prompt Used:</Label>
                  <div className="flex items-center gap-1">
                    <Input id="usedImagePrompt" value={promptForGeneratedImage} readOnly className="text-xs h-8 bg-background/70 flex-grow" />
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(promptForGeneratedImage, 'Image Prompt')} title="Copy prompt used"><Copy className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
              <Button type="button" onClick={downloadImage} variant="outline" size="sm" className="mt-2"><Download className="mr-2 h-3 w-3" /> Download Image</Button>
            </CardContent>)}
            {imageGenerationGuidance && (
              <CardContent className="mt-4 border-t pt-4 space-y-2">
                <Alert variant="default" className="border-blue-300 bg-blue-50 dark:bg-blue-900/30">
                  <Info className="h-4 w-4" />
                  <AlertTitleComponent>AI Image Generation Guidance</AlertTitleComponent>
                  <AlertDescription className="mt-2">
                    <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{imageGenerationGuidance}</pre>
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
        </Card>

        <Card ref={hashtagSuggesterRef}>
            <CardHeader>
                <CardTitle className="flex items-center"><Hash className="mr-2 h-5 w-5 text-blue-500"/>AI Hashtag Suggester</CardTitle>
                <CardDescription>Find relevant hashtags for your posts. Can be pre-filled.</CardDescription>
            </CardHeader>
            <form onSubmit={handleHashtagFormSubmit}>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="hashtagTopicKeywords">Topic / Keywords *</Label><Input id="hashtagTopicKeywords" value={hashtagInputs.topicOrKeywords} onChange={(e) => handleHashtagInputChange('topicOrKeywords', e.target.value)} placeholder="e.g., Sustainable fashion, AI in marketing" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><Label htmlFor="hashtagPlatform">Platform</Label><Select value={hashtagInputs.platform || 'General'} onValueChange={(value) => handleHashtagInputChange('platform', value as GenerateHashtagSuggestionsInput['platform'])}><SelectTrigger id="hashtagPlatform"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Instagram">Instagram</SelectItem><SelectItem value="Twitter/X">Twitter/X</SelectItem><SelectItem value="LinkedIn">LinkedIn</SelectItem><SelectItem value="TikTok">TikTok</SelectItem></SelectContent></Select></div>
                        <div><Label htmlFor="numHashtags"># Hashtags</Label><Input id="numHashtags" type="number" min="3" max="20" value={hashtagInputs.numSuggestions} onChange={(e) => handleHashtagInputChange('numSuggestions', parseInt(e.target.value, 10))} /></div>
                    </div>
                </CardContent>
                <CardFooter><Button type="submit" disabled={isGeneratingHashtags}><Hash className="mr-2 h-4 w-4" />{isGeneratingHashtags ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Suggest Hashtags</Button></CardFooter>
            </form>
            {hashtagSuggestions && (<CardContent className="mt-4 border-t pt-4"><div className="flex justify-between items-center mb-2"><h3 className="text-md font-semibold">Suggestions:</h3><Button variant="outline" size="xs" onClick={()=>copyToClipboard(hashtagSuggestions, "Hashtags")}><Copy className="mr-1 h-3 w-3"/>Copy All</Button></div><div className="flex flex-wrap gap-1">{hashtagSuggestions.map((tag, i)=>(<Badge key={i} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10" onClick={()=>copyToClipboard(tag, "Hashtag")}>{tag}</Badge>))}</div></CardContent>)}
        </Card>

        <Card ref={reviewResponderRef}>
          <CardHeader>
            <CardTitle className="flex items-center"><ReviewIcon className="mr-2 h-5 w-5 text-indigo-500" />AI Review Responder</CardTitle>
            <CardDescription>Generate polite and professional responses to customer reviews.</CardDescription>
          </CardHeader>
          <form onSubmit={handleReviewSubmit}>
            <CardContent className="space-y-4">
              <div><Label htmlFor="reviewText">Customer Review Text *</Label><Textarea id="reviewText" value={reviewInput.reviewText} onChange={(e) => handleReviewInputChange('reviewText', e.target.value)} placeholder="Paste customer review here..." required rows={4} /></div>
              <div><Label htmlFor="reviewSentiment">Sentiment *</Label><Select value={reviewInput.sentiment} onValueChange={(value: AiReviewResponderInput['sentiment']) => handleReviewInputChange('sentiment', value as string)} ><SelectTrigger id="reviewSentiment"><SelectValue /></SelectTrigger><SelectContent> <SelectItem value="positive">Positive</SelectItem> <SelectItem value="negative">Negative</SelectItem> <SelectItem value="neutral">Neutral</SelectItem> </SelectContent></Select></div>
              <div><Label htmlFor="reviewBusinessName">Your Business Name * (From Settings)</Label><Input id="reviewBusinessName" value={reviewInput.businessName} onChange={(e) => handleReviewInputChange('businessName', e.target.value)} placeholder="e.g., My Awesome Cafe" required /></div>
            </CardContent>
            <CardFooter> <Button type="submit" disabled={isReviewLoading}> {isReviewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} <Wand2 className="mr-2 h-4 w-4" /> Generate Response </Button> </CardFooter>
          </form>
          {reviewResponse && (
            <CardContent className="mt-4 border-t pt-4">
              <h3 className="text-md font-semibold mb-2">Suggested Response:</h3>
              <Textarea value={reviewResponse} readOnly rows={5} className="min-h-[100px] bg-background" />
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(reviewResponse, "Review Response")}> <ClipboardCopy className="mr-2 h-3 w-3"/> Copy Response </Button>
              </div>
            </CardContent>
          )}
        </Card>
        
      </div>

        <Alert className="mt-8">
            <Info className="h-4 w-4" />
            <AlertTitleComponent>Tool Integration & Direct Posting Notes</AlertTitleComponent>
            <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    <li>**Text & Scripts:** Copy generated text/scripts for platforms like WordPress, social media, or video editors. Use the "Use..." buttons to move text between OmniFlow tools.</li>
                    <li>**Image Prompts:** Use with the AI Image Generator above or external AI image tools. Prompts within YouTube scripts now have "Use for Image Gen" buttons.</li>
                    <li>**AI-Generated Images:** Download images for your use. The prompt used for generation is shown below the image.</li>
                    <li>**Direct Posting/Editing:** Direct posting to social media or embedding full video editors requires complex backend work for future development.</li>
                    <li>**Experimental Features:** AI Image generation uses experimental models. Quality and availability may vary.</li>
                </ul>
            </AlertDescription>
        </Alert>
    </div>
  );
}
