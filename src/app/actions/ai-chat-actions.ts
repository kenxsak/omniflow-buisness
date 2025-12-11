'use server';

import { generateSocialMediaContent } from '@/ai/flows/generate-social-media-content-flow';
import { generateEmailContent } from '@/ai/flows/generate-email-content-flow';
import { generateGoogleSearchAdCopy } from '@/ai/flows/generate-google-search-ad-copy-flow';
import { generateFacebookInstagramAdContent } from '@/ai/flows/generate-facebook-instagram-ad-content-flow';
import { generateLinkedInAdContent } from '@/ai/flows/generate-linkedin-ad-content-flow';
import { generateYouTubeAdContent } from '@/ai/flows/generate-youtube-ad-content-flow';
import { generateTiktokReelsAdContent } from '@/ai/flows/generate-tiktok-reels-ad-content-flow';
import { generateGoogleAdsKeywords } from '@/ai/flows/generate-google-ads-keywords-flow';
import { generateHashtagSuggestions } from '@/ai/flows/generate-hashtag-suggestions-flow';
import { generateImageWithAiFlow } from '@/ai/flows/generate-image-with-ai-flow';
import { getTrendingTopicSuggestions } from '@/ai/flows/get-trending-topic-suggestions-flow';
import { generateEnhancedPrompt } from '@/ai/flows/generate-enhanced-prompt-flow';
import { aiReviewResponder } from '@/ai/flows/ai-review-responder';
import { executeAIOperation } from '@/lib/ai-wrapper';
import { getGeminiApiKeyForCompany } from './ai-api-key-actions';
import { estimateTokenCount } from '@/lib/ai-cost-calculator';
import { serverDb } from '@/lib/firebase-server';
import { getDoc, doc } from 'firebase/firestore';

interface NextStepSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

interface ChatResponse {
  content: string;
  type: 'text' | 'image' | 'error';
  metadata?: any;
  creditsConsumed?: number;
  nextSteps?: NextStepSuggestion[];
}

const AUTO_ENHANCE_PROMPTS = true;

async function autoEnhancePrompt(
  originalPrompt: string,
  contentType: 'blog' | 'sales_page' | 'social_post' | 'image' | 'video_script' | 'email',
  companyId: string,
  userId: string
): Promise<{ enhancedPrompt: string; wasEnhanced: boolean }> {
  if (!AUTO_ENHANCE_PROMPTS || !originalPrompt?.trim() || originalPrompt.length > 500) {
    return { enhancedPrompt: originalPrompt, wasEnhanced: false };
  }

  try {
    const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
    
    let promptGoal: 'ImageGeneration' | 'TextContent' | 'VideoScriptIdea' | 'SalesPageBrief';
    let desiredStyle: string | undefined;
    
    switch (contentType) {
      case 'image':
        promptGoal = 'ImageGeneration';
        desiredStyle = 'photorealistic, high quality, professional';
        break;
      case 'sales_page':
        promptGoal = 'SalesPageBrief';
        desiredStyle = 'conversion-focused, persuasive, professional';
        break;
      case 'video_script':
        promptGoal = 'VideoScriptIdea';
        desiredStyle = 'engaging, story-driven, audience-focused';
        break;
      case 'blog':
      case 'social_post':
      case 'email':
      default:
        promptGoal = 'TextContent';
        desiredStyle = 'engaging, clear, professional';
        break;
    }
    
    const result = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'Auto Prompt Enhancement',
      apiKeyType,
      operation: async () => {
        const output = await generateEnhancedPrompt({
          originalPrompt,
          promptGoal,
          desiredStyle
        });

        if (!output || !output.enhancedPrompt) {
          return { success: false, error: 'Failed to enhance prompt' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(originalPrompt),
          outputTokens: estimateTokenCount(output.enhancedPrompt)
        };
      }
    });

    if (result.success && result.data?.enhancedPrompt) {
      return { 
        enhancedPrompt: result.data.enhancedPrompt, 
        wasEnhanced: true 
      };
    }
    
    return { enhancedPrompt: originalPrompt, wasEnhanced: false };
  } catch (error) {
    console.error('Auto-enhance error:', error);
    return { enhancedPrompt: originalPrompt, wasEnhanced: false };
  }
}

// Utility function to convert HTML to clean plain text
function htmlToPlainText(html: string): string {
  if (!html) return '';
  
  try {
    // Replace common HTML entities
    let text = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Remove style and script tags completely (with dotall flag via [\s\S])
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Convert headers to text with newlines (with dotall flag)
    text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n\n');
    
    // Convert paragraphs to text with newlines (with dotall flag)
    text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    
    // Convert list items (with dotall flag)
    text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n');
    
    // Convert breaks to newlines
    text = text.replace(/<br[^>]*>/gi, '\n');
    
    // Remove all other HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode any remaining HTML entities
    text = text
      .replace(/&([a-z]+);/gi, ' ')  // Replace named entities with space
      .replace(/&#(\d+);/g, ' ');     // Replace numeric entities with space
    
    // Clean up excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    text = text.trim();
    
    return text || html; // Fallback to original if result is empty
  } catch (error) {
    console.error('Error converting HTML to plain text:', error);
    return html; // Return original HTML if parsing fails
  }
}

// Get next step suggestions based on what was just created
function getNextStepSuggestions(intentType: string, metadata?: any): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = [];
  
  switch (intentType) {
    case 'blog':
      // Ensure image prompt is clean and explicit for image generation
      const blogImagePrompt = metadata?.imagePrompt || 
        `Professional featured image for blog post about ${metadata?.topic || 'this topic'}, vibrant and engaging, high quality`;
      
      suggestions.push(
        { 
          label: 'Create Featured Image', 
          prompt: `Generate image: ${blogImagePrompt}`,
          icon: '🎨'
        },
        { 
          label: 'Generate Social Media Post', 
          prompt: `Create an Instagram post to promote this blog about ${metadata?.topic || 'the topic'}`,
          icon: '📱'
        },
        {
          label: 'Create Sales Page',
          prompt: `Create a sales page for ${metadata?.topic || 'this topic'}`,
          icon: '💰'
        },
        {
          label: 'Enhance Image Prompt',
          prompt: `Enhance this prompt for image generation: ${metadata?.imagePrompt || `featured image for blog about ${metadata?.topic || 'this topic'}`}`,
          icon: '✨'
        }
      );
      break;
      
    case 'social_post':
      const socialImagePrompt = metadata?.imagePrompt || 
        `Engaging ${metadata?.platform || 'social media'} image about ${metadata?.topic || 'this topic'}, eye-catching and vibrant`;
      
      suggestions.push(
        { 
          label: 'Create Post Image', 
          prompt: `Generate image: ${socialImagePrompt}`,
          icon: '🎨'
        },
        { 
          label: 'Generate Hashtags', 
          prompt: `Generate hashtags for ${metadata?.topic || 'this post'}`,
          icon: '#️⃣'
        }
      );
      break;
      
    case 'ad_copy':
      if (metadata?.platform?.includes('Facebook') || metadata?.platform?.includes('Instagram')) {
        suggestions.push(
          { 
            label: 'Create Ad Image', 
            prompt: metadata?.adVariation?.suggestedImagePrompt || 'Create an ad image',
            icon: '🎨'
          },
          { 
            label: 'Create Video Concept', 
            prompt: `Create a video concept: ${metadata?.adVariation?.suggestedVideoConcept || 'ad video'}`,
            icon: '🎬'
          }
        );
      } else if (metadata?.platform?.includes('LinkedIn')) {
        suggestions.push(
          { 
            label: 'Create Professional Image', 
            prompt: metadata?.adVariation?.suggestedImagePrompt || 'Create a professional LinkedIn ad image',
            icon: '🎨'
          }
        );
      }
      break;
      
    case 'email':
      suggestions.push(
        { 
          label: 'Create Email Banner', 
          prompt: `Create an email header image for ${metadata?.topic || 'this campaign'}`,
          icon: '🎨'
        }
      );
      break;
      
    case 'image':
      suggestions.push(
        { 
          label: 'Create Variations', 
          prompt: `Create another variation of: ${metadata?.prompt || 'this image'}`,
          icon: '🎨'
        },
        { 
          label: 'Write Social Post', 
          prompt: `Create a social media post featuring an image about ${metadata?.prompt || 'this'}`,
          icon: '📱'
        }
      );
      break;
      
    case 'trending_topics':
      suggestions.push(
        {
          label: 'Generate Blog Post',
          prompt: `Write a blog post about ${metadata?.firstTopic || 'this trending topic'}`,
          icon: '✍️'
        },
        {
          label: 'Create Video Script',
          prompt: `Create a YouTube video script about ${metadata?.firstTopic || 'this trending topic'}`,
          icon: '🎬'
        },
        {
          label: 'Enhance This Prompt',
          prompt: `Enhance this prompt for content creation: ${metadata?.firstTopic || 'trending topic'}`,
          icon: '✨'
        }
      );
      break;
      
    case 'prompt_enhance':
      if (metadata?.promptGoal === 'ImageGeneration') {
        suggestions.push(
          {
            label: 'Generate Image',
            prompt: metadata?.enhancedPrompt || 'Create an image with enhanced prompt',
            icon: '🎨'
          }
        );
      } else if (metadata?.promptGoal === 'TextContent') {
        suggestions.push(
          {
            label: 'Create Content',
            prompt: metadata?.enhancedPrompt || 'Create content with enhanced prompt',
            icon: '✍️'
          }
        );
      } else if (metadata?.promptGoal === 'SalesPageBrief') {
        suggestions.push(
          {
            label: 'Create Sales Page',
            prompt: metadata?.enhancedPrompt || 'Create a sales page',
            icon: '💰'
          }
        );
      }
      suggestions.push(
        {
          label: 'Refine Further',
          prompt: `Enhance this prompt even more: ${metadata?.originalPrompt || 'my idea'}`,
          icon: '✨'
        }
      );
      break;
      
    case 'sales_page':
      const salesImagePrompt = metadata?.imagePrompt || 
        `Professional hero image for sales page about ${metadata?.topic || 'this product'}, modern and compelling, high quality`;
      
      suggestions.push(
        {
          label: 'Create Hero Image',
          prompt: `Generate image: ${salesImagePrompt}`,
          icon: '🎨'
        },
        {
          label: 'Enhance Sales Copy',
          prompt: `Enhance this sales page prompt: make the sales copy more compelling for ${metadata?.topic || 'this product'}`,
          icon: '✨'
        },
        {
          label: 'Generate Ad Campaign',
          prompt: `Create Facebook ad copy for ${metadata?.topic || 'this product'}`,
          icon: '📢'
        }
      );
      break;
      
    case 'video_script':
      const videoImagePrompt = metadata?.imagePrompt || 
        `YouTube thumbnail for video about ${metadata?.topic || 'this topic'}, eye-catching and professional, vibrant colors`;
      
      suggestions.push(
        {
          label: 'Create Thumbnail',
          prompt: `Generate image: ${videoImagePrompt}`,
          icon: '🎨'
        },
        {
          label: 'Generate Social Post',
          prompt: `Create an Instagram post to promote this YouTube video about ${metadata?.topic || 'the topic'}`,
          icon: '📱'
        },
        {
          label: 'Create Blog Post',
          prompt: `Write a blog post based on this video script about ${metadata?.topic || 'the topic'}`,
          icon: '✍️'
        }
      );
      break;
  }
  
  return suggestions;
}

export async function handleAIChatMessage(
  userMessage: string,
  companyId: string,
  userId: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ChatResponse> {
  try {
    // Limit conversation history to last 10 messages or ~2000 tokens
    let limitedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationHistory && conversationHistory.length > 0) {
      // Take last 10 messages
      const recentHistory = conversationHistory.slice(-10);
      
      // Estimate tokens and trim if needed
      let totalTokens = 0;
      for (let i = recentHistory.length - 1; i >= 0; i--) {
        const msgTokens = estimateTokenCount(recentHistory[i].content);
        if (totalTokens + msgTokens > 2000) {
          break;
        }
        totalTokens += msgTokens;
        limitedHistory.unshift(recentHistory[i]);
      }
    }

    // Parse intent from user message
    const intent = detectIntent(userMessage);

    switch (intent.type) {
      case 'social_post':
        return await handleSocialPost(userMessage, intent, companyId, userId);

      case 'email':
        return await handleEmail(userMessage, intent, companyId, userId);

      case 'ad_copy':
        return await handleAdCopy(userMessage, intent, companyId, userId);

      case 'image':
        return await handleImage(userMessage, intent, companyId, userId);

      case 'hashtags':
        return await handleHashtags(userMessage, intent, companyId, userId);

      case 'blog':
        return await handleBlog(userMessage, intent, companyId, userId);

      case 'video_script':
        return await handleVideoScript(userMessage, intent, companyId, userId);

      case 'trending_topics':
        return await handleTrendingTopics(userMessage, intent, companyId, userId);

      case 'prompt_enhance':
        return await handlePromptEnhancer(userMessage, intent, companyId, userId);

      case 'sales_page':
        return await handleSalesPage(userMessage, intent, companyId, userId);

      case 'review_response':
        return await handleReviewResponse(userMessage, intent, companyId, userId);

      case 'youtube_ad':
        return await handleYouTubeAd(userMessage, intent, companyId, userId);

      case 'tiktok_reels_ad':
        return await handleTikTokReelsAd(userMessage, intent, companyId, userId);

      case 'keyword_planner':
        return await handleKeywordPlanner(userMessage, intent, companyId, userId);

      default:
        return await handleGeneral(userMessage, companyId, limitedHistory);
    }
  } catch (error) {
    console.error('AI Chat Handler Error:', error);
    throw new Error('Failed to process your request. Please try again.');
  }
}

function detectIntent(message: string): { type: string; platform?: string; topic?: string; adPlatform?: string } {
  const lowerMessage = message.toLowerCase();

  // Trending topics
  if (lowerMessage.includes('trending') || lowerMessage.includes('trend') || lowerMessage.includes('popular topic') || lowerMessage.includes('what\'s hot')) {
    return { type: 'trending_topics' };
  }

  // Prompt enhancement
  if (lowerMessage.includes('enhance') || lowerMessage.includes('improve') || lowerMessage.includes('better prompt') || lowerMessage.includes('refine')) {
    return { type: 'prompt_enhance' };
  }

  // Sales page
  if (lowerMessage.includes('sales page') || lowerMessage.includes('landing page') || lowerMessage.includes('sales copy')) {
    const topic = extractTopic(message, ['sales page', 'landing page', 'for', 'about']);
    return { type: 'sales_page', topic };
  }

  // Review Response
  if (lowerMessage.includes('review response') || lowerMessage.includes('respond to review') || lowerMessage.includes('reply to review') || lowerMessage.includes('customer review')) {
    return { type: 'review_response' };
  }

  // Image generation (check BEFORE blog to ensure "create image for blog" is detected as image)
  // Enhanced detection: prioritize image-specific keywords and phrases
  const imageKeywords = [
    'image', 'picture', 'photo', 'visual', 'graphic', 'illustration',
    'create an image', 'generate an image', 'make an image',
    'featured image', 'hero image', 'thumbnail', 'banner'
  ];
  const hasImageKeyword = imageKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (hasImageKeyword) {
    const topic = extractTopic(message, ['image', 'picture', 'photo', 'visual', 'of', 'for', 'about']);
    return { type: 'image', topic };
  }

  // YouTube Ads (check BEFORE general video script to prioritize ad intent)
  if (lowerMessage.includes('youtube ad') || (lowerMessage.includes('youtube') && lowerMessage.includes('ad'))) {
    const topic = extractTopic(message, ['youtube ad', 'ad', 'for', 'about']);
    return { type: 'youtube_ad', topic };
  }

  // TikTok/Reels Ads (check BEFORE general video script)
  if (lowerMessage.includes('tiktok ad') || lowerMessage.includes('reels ad') || (lowerMessage.includes('tiktok') && lowerMessage.includes('ad')) || (lowerMessage.includes('reels') && lowerMessage.includes('ad'))) {
    const topic = extractTopic(message, ['tiktok ad', 'reels ad', 'ad', 'for', 'about']);
    return { type: 'tiktok_reels_ad', topic };
  }

  // Video script (check AFTER ad-specific intents to avoid catching ad requests)
  if (lowerMessage.includes('video script') || lowerMessage.includes('youtube script') || (lowerMessage.includes('script') && lowerMessage.includes('video'))) {
    const topic = extractTopic(message, ['video script', 'script', 'about']);
    return { type: 'video_script', topic };
  }

  // Blog post (check BEFORE general social post, but AFTER platform-specific social posts)
  // Match when user wants to CREATE a blog, but exclude when it's a social post mentioning a blog
  
  // Strong blog creation signals (these override any social mentions)
  // Only include phrases with explicit creation verbs to avoid matching "post our blog on LinkedIn"
  const hasExplicitBlogCreation = 
    lowerMessage.includes('blog post') || 
    lowerMessage.includes('blog article') || 
    lowerMessage.includes('blog content') ||
    lowerMessage.includes('write a blog') || 
    lowerMessage.includes('write blog') || 
    lowerMessage.includes('create a blog') || 
    lowerMessage.includes('create blog') || 
    lowerMessage.includes('generate a blog') || 
    lowerMessage.includes('generate blog') ||
    lowerMessage.includes('make a blog') ||
    lowerMessage.includes('make blog') ||
    lowerMessage.includes('draft a blog') ||
    lowerMessage.includes('draft blog') ||
    lowerMessage.includes('need blog') ||
    lowerMessage.includes('need a blog') ||
    lowerMessage.match(/^blog\s+about/) ||  // "Blog about..." at start only
    (lowerMessage.includes(' blog ') && (lowerMessage.includes('write') || lowerMessage.includes('draft') || lowerMessage.includes('create') || lowerMessage.includes('generate')));
  
  // Check if this is a social post mentioning a blog (platform + post comes BEFORE blog mention)
  // e.g., "Create a LinkedIn post for our blog" vs "Write a blog to share on LinkedIn"
  let isSocialMentioningBlog = false;
  if (lowerMessage.includes('blog') && !hasExplicitBlogCreation) {
    const blogIndex = lowerMessage.indexOf('blog');
    const platforms = ['instagram', 'facebook', 'linkedin', 'twitter'];
    
    for (const platform of platforms) {
      const platformIndex = lowerMessage.indexOf(platform);
      if (platformIndex !== -1 && platformIndex < blogIndex && lowerMessage.includes('post')) {
        isSocialMentioningBlog = true;
        break;
      }
    }
  }
  
  if (hasExplicitBlogCreation || (lowerMessage.includes('blog') && !isSocialMentioningBlog)) {
    const topic = extractTopic(message, ['blog', 'about']);
    return { type: 'blog', topic };
  }

  // Email
  if (lowerMessage.includes('email') || lowerMessage.includes('write to')) {
    const topic = extractTopic(message, ['email', 'about', 'to']);
    return { type: 'email', topic };
  }

  // Google Keyword Planner (check before general "ad" to catch keyword-specific intent)
  if (lowerMessage.includes('keyword') && (lowerMessage.includes('planner') || lowerMessage.includes('research') || lowerMessage.includes('suggest'))) {
    const topic = extractTopic(message, ['keyword', 'for', 'about']);
    return { type: 'keyword_planner', topic };
  }

  // Ad copy (general - after specific ad platforms)
  if (lowerMessage.includes('ad') || lowerMessage.includes('advertisement') || lowerMessage.includes('google ad') || lowerMessage.includes('facebook ad') || lowerMessage.includes('linkedin ad')) {
    const adPlatform = detectAdPlatform(lowerMessage);
    const topic = extractTopic(message, ['ad', 'for', 'about']);
    return { type: 'ad_copy', adPlatform, topic };
  }

  // Social media post (check AFTER blog and image to avoid matching "blog post" or "image for post")
  // More specific: require social media platform names or explicit "social" keyword
  if (lowerMessage.includes('instagram') || lowerMessage.includes('facebook') || lowerMessage.includes('linkedin') || lowerMessage.includes('twitter') || lowerMessage.includes('social media') || lowerMessage.includes('social post')) {
    const platform = detectPlatform(lowerMessage);
    const topic = extractTopic(message, ['post', 'about', 'for', 'on']);
    return { type: 'social_post', platform, topic };
  }

  // Generic "post" (fallback for social after all specific checks)
  if (lowerMessage.includes('post') && !lowerMessage.includes('blog')) {
    const platform = detectPlatform(lowerMessage);
    const topic = extractTopic(message, ['post', 'about', 'for', 'on']);
    return { type: 'social_post', platform, topic };
  }

  // Hashtags
  if (lowerMessage.includes('hashtag')) {
    const topic = extractTopic(message, ['hashtag', 'for']);
    return { type: 'hashtags', topic };
  }

  return { type: 'general' };
}

function detectPlatform(message: string): string {
  if (message.includes('instagram')) return 'Instagram';
  if (message.includes('facebook')) return 'Facebook';
  if (message.includes('twitter') || message.includes('x.com')) return 'TwitterX';
  if (message.includes('linkedin')) return 'LinkedIn';
  if (message.includes('tiktok')) return 'Instagram'; // Default to Instagram for TikTok-style content
  if (message.includes('blog')) return 'BlogPost';
  return 'Instagram'; // default
}

function detectAdPlatform(message: string): string {
  if (message.includes('google')) return 'google';
  if (message.includes('facebook') || message.includes('instagram')) return 'facebook';
  if (message.includes('linkedin')) return 'linkedin';
  return 'google'; // default
}

function extractTopic(message: string, keywords: string[]): string {
  // Simple extraction - find text after keywords
  for (const keyword of keywords) {
    const index = message.toLowerCase().indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = message.substring(index + keyword.length).trim();
      // Remove common prepositions
      return afterKeyword.replace(/^(about|for|on|regarding|to)\s+/i, '').trim();
    }
  }
  return message;
}

async function handleSocialPost(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const originalTopic = intent.topic || message;
  const { enhancedPrompt: topic, wasEnhanced } = await autoEnhancePrompt(
    originalTopic,
    'social_post',
    companyId,
    userId
  );
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: `${intent.platform} Post`,
    apiKeyType,
    operation: async () => {
      const output = await generateSocialMediaContent({
        topic,
        platform: intent.platform as any || 'Instagram',
        tone: 'Professional',
        includeHashtags: true,
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.variations || output.variations.length === 0) {
        return { success: false, error: 'Failed to generate social post' };
      }

      const textContent = output.variations.map(v => v.textContent).join(' ');
      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ topic: intent.topic || message })),
        outputTokens: estimateTokenCount(textContent)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate social post');
  }

  const variation = result.data.variations[0];
  
  return {
    content: `Here's your ${intent.platform} post:\n\n${variation.textContent}`,
    type: 'text',
    metadata: {
      platform: intent.platform as any,
      topic: intent.topic,
      textContent: variation.textContent
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('social_post', { platform: intent.platform, topic: intent.topic })
  };
}

async function handleBlog(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const originalTopic = intent.topic || message;
  const { enhancedPrompt: topic, wasEnhanced } = await autoEnhancePrompt(
    originalTopic,
    'blog',
    companyId,
    userId
  );
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Blog Post',
    apiKeyType,
    operation: async () => {
      const output = await generateSocialMediaContent({
        topic,
        platform: 'BlogPost',
        tone: 'Professional',
        blogPostApproximateWords: 500,
        includeHashtags: false,
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.variations || output.variations.length === 0) {
        return { success: false, error: 'Failed to generate blog post' };
      }

      const textContent = output.variations.map(v => v.textContent).join(' ');
      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ topic: intent.topic || message })),
        outputTokens: estimateTokenCount(textContent)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate blog post');
  }

  const variation = result.data.variations[0];
  
  // For blog posts, show a summary instead of trying to convert HTML
  const summary = `📝 **Blog Post Created Successfully!**

**Topic**: ${intent.topic || message}
**Format**: Complete HTML blog post with SEO optimization
**Suggested Image**: ${variation.suggestedImagePrompt || 'Featured blog image'}

✨ Use the **Preview** tab to see how your blog looks, or switch to **Code** tab to view the HTML.`;
  
  return {
    content: summary,
    type: 'text',
    metadata: {
      platform: 'BlogPost',
      topic: intent.topic,
      htmlContent: variation.textContent,  // Store HTML in metadata for future use
      suggestedImagePrompt: variation.suggestedImagePrompt,
      imagePrompt: variation.suggestedImagePrompt  // Also store as imagePrompt for compatibility
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('blog', { 
      topic: intent.topic, 
      imagePrompt: variation.suggestedImagePrompt 
    })
  };
}

async function handleVideoScript(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const originalTopic = intent.topic || message;
  const { enhancedPrompt: topic, wasEnhanced } = await autoEnhancePrompt(
    originalTopic,
    'video_script',
    companyId,
    userId
  );
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Video Script',
    apiKeyType,
    operation: async () => {
      const output = await generateSocialMediaContent({
        topic,
        platform: 'YouTubeVideoScript',
        tone: 'Professional',
        includeHashtags: false,
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.variations || output.variations.length === 0) {
        return { success: false, error: 'Failed to generate video script' };
      }

      const textContent = output.variations.map(v => v.textContent).join(' ');
      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ topic: intent.topic || message })),
        outputTokens: estimateTokenCount(textContent)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate video script');
  }

  const variation = result.data.variations[0];
  
  // Format video script output with proper structure
  let formattedContent = `🎬 **YouTube Video Script Created Successfully!**\n\n`;
  formattedContent += `**Topic**: ${intent.topic || message}\n\n`;
  
  // Add YouTube-specific metadata if available
  if (variation.suggestedVideoTitle) {
    formattedContent += `**Video Title**: ${variation.suggestedVideoTitle}\n`;
  }
  if (variation.suggestedVideoDescription) {
    formattedContent += `**Description**: ${variation.suggestedVideoDescription.substring(0, 100)}...\n`;
  }
  if (variation.suggestedVideoKeywordsTags && variation.suggestedVideoKeywordsTags.length > 0) {
    formattedContent += `**Keywords/Tags**: ${variation.suggestedVideoKeywordsTags.slice(0, 5).join(', ')}\n`;
  }
  if (variation.suggestedVideoHashtags && variation.suggestedVideoHashtags.length > 0) {
    formattedContent += `**Hashtags**: ${variation.suggestedVideoHashtags.join(' ')}\n`;
  }
  formattedContent += `\n---\n\n**Script**:\n\n${variation.textContent}`;
  
  if (variation.suggestedVideoThumbnailPrompt) {
    formattedContent += `\n\n---\n\n**Suggested Thumbnail**: ${variation.suggestedVideoThumbnailPrompt}`;
  }
  
  return {
    content: formattedContent,
    type: 'text',
    metadata: {
      platform: 'YouTubeVideoScript',
      topic: intent.topic,
      textContent: variation.textContent,
      suggestedVideoTitle: variation.suggestedVideoTitle,
      suggestedVideoDescription: variation.suggestedVideoDescription,
      suggestedVideoKeywordsTags: variation.suggestedVideoKeywordsTags,
      suggestedVideoHashtags: variation.suggestedVideoHashtags,
      suggestedImagePrompt: variation.suggestedVideoThumbnailPrompt,
      imagePrompt: variation.suggestedVideoThumbnailPrompt
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('video_script', { 
      topic: intent.topic, 
      imagePrompt: variation.suggestedVideoThumbnailPrompt 
    })
  };
}

async function handleEmail(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const originalTopic = intent.topic || message;
  const { enhancedPrompt: topic, wasEnhanced } = await autoEnhancePrompt(
    originalTopic,
    'email',
    companyId,
    userId
  );
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Email Campaign',
    apiKeyType,
    operation: async () => {
      const output = await generateEmailContent({
        campaignGoal: topic,
        targetAudience: 'Your customers',
        keyPoints: topic,
        tone: 'Friendly'
      });

      if (!output || !output.htmlContent) {
        return { success: false, error: 'Failed to generate email' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ campaignGoal: intent.topic || message })),
        outputTokens: estimateTokenCount(output.htmlContent)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate email');
  }

  // Convert HTML to plain text for display
  const textContent = htmlToPlainText(result.data.htmlContent);

  return {
    content: `Here's your email:\n\n${textContent}`,
    type: 'text',
    metadata: {
      platform: 'Email',
      htmlContent: result.data.htmlContent,
      topic: intent.topic
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('email', { topic: intent.topic })
  };
}

async function handleAdCopy(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const platform = intent.adPlatform || 'google';
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);

  if (platform === 'google') {
    const result = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'Google Ads Copy',
      apiKeyType,
      operation: async () => {
        const output = await generateGoogleSearchAdCopy({
          productOrService: intent.topic || message,
          keywords: intent.topic || message,
          uniqueSellingPoints: 'Quality, Service, Value',
          numVariations: 1,
          targetLanguage: 'English'
        });

        if (!output || !output.adVariations || output.adVariations.length === 0) {
          return { success: false, error: 'Failed to generate Google ad' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(JSON.stringify({ productOrService: intent.topic || message })),
          outputTokens: estimateTokenCount(JSON.stringify(output))
        };
      }
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to generate Google ad');
    }

    const variation = result.data.adVariations[0];
    const headlines = variation.headlines.slice(0, 3).join('\n- ');
    const descriptions = variation.descriptions.slice(0, 2).join('\n- ');

    return {
      content: `Here's your Google Search Ad:\n\n**Headlines:**\n- ${headlines}\n\n**Descriptions:**\n- ${descriptions}`,
      type: 'text',
      metadata: {
        platform: 'Google',
        adVariation: variation
      },
      creditsConsumed: result.quotaInfo?.consumed || 0,
      nextSteps: getNextStepSuggestions('ad_copy', { platform: 'Google' })
    };
  } else if (platform === 'facebook') {
    const result = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'Facebook/IG Ads',
      apiKeyType,
      operation: async () => {
        const output = await generateFacebookInstagramAdContent({
          productOrService: intent.topic || message,
          targetAudience: 'Your target customers',
          adObjective: 'Conversions',
          keyMessage: intent.topic || message,
          desiredTone: 'Friendly',
          platformFocus: 'Both',
          numVariations: 1,
          targetLanguage: 'English'
        });

        if (!output || !output.adVariations || output.adVariations.length === 0) {
          return { success: false, error: 'Failed to generate Facebook ad' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(JSON.stringify({ productOrService: intent.topic || message })),
          outputTokens: estimateTokenCount(JSON.stringify(output))
        };
      }
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to generate Facebook ad');
    }

    const variation = result.data.adVariations[0];

    return {
      content: `Here's your Facebook/Instagram Ad:\n\n**Primary Text:**\n${variation.primaryText}\n\n**Headline:**\n${variation.headline}\n\n**Call to Action:**\n${variation.callToActionText}\n\n**Image Suggestion:**\n${variation.suggestedImagePrompt}`,
      type: 'text',
      metadata: {
        platform: 'Facebook/Instagram',
        adVariation: variation
      },
      creditsConsumed: result.quotaInfo?.consumed || 0,
      nextSteps: getNextStepSuggestions('ad_copy', { platform: 'Facebook/Instagram', adVariation: variation })
    };
  } else if (platform === 'linkedin') {
    const result = await executeAIOperation({
      companyId,
      userId,
      operationType: 'text_generation',
      model: 'gemini-2.0-flash',
      feature: 'LinkedIn Ads',
      apiKeyType,
      operation: async () => {
        const output = await generateLinkedInAdContent({
          b2bProductOrService: intent.topic || message,
          adObjective: 'Lead Generation',
          valueProposition: intent.topic || message,
          desiredTone: 'Professional',
          numVariations: 1,
          targetLanguage: 'English'
        });

        if (!output || !output.adVariations || output.adVariations.length === 0) {
          return { success: false, error: 'Failed to generate LinkedIn ad' };
        }

        return {
          success: true,
          data: output,
          inputTokens: estimateTokenCount(JSON.stringify({ b2bProductOrService: intent.topic || message })),
          outputTokens: estimateTokenCount(JSON.stringify(output))
        };
      }
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to generate LinkedIn ad');
    }

    const variation = result.data.adVariations[0];

    return {
      content: `Here's your LinkedIn Ad:\n\n**Introductory Text:**\n${variation.introductoryText}\n\n**Headline:**\n${variation.headline}\n\n**Call to Action:**\n${variation.callToActionText}\n\n**Image Suggestion:**\n${variation.suggestedImagePrompt}`,
      type: 'text',
      metadata: {
        platform: 'LinkedIn',
        adVariation: variation
      },
      creditsConsumed: result.quotaInfo?.consumed || 0,
      nextSteps: getNextStepSuggestions('ad_copy', { platform: 'LinkedIn', adVariation: variation })
    };
  }

  throw new Error('Unsupported ad platform');
}

async function handleImage(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const originalPrompt = intent.topic || message;
  const { enhancedPrompt: prompt, wasEnhanced } = await autoEnhancePrompt(
    originalPrompt,
    'image',
    companyId,
    userId
  );
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'image_generation',
    model: 'imagen-4',
    feature: 'Image Generation',
    apiKeyType,
    operation: async () => {
      const output = await generateImageWithAiFlow({
        prompt,
        aspectRatio: '1:1',
        apiKey
      });

      if (!output || !output.imageDataUri) {
        return { success: false, error: output.error || 'Failed to generate image' };
      }

      return {
        success: true,
        data: output,
        imageCount: 1
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate image');
  }

  return {
    content: `I've created an image based on: "${intent.topic || message}"`,
    type: 'image',
    metadata: {
      imageUrl: result.data.imageDataUri,
      prompt: intent.topic || message
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('image', { prompt: intent.topic || message })
  };
}

async function handleHashtags(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Hashtag Suggestions',
    apiKeyType,
    operation: async () => {
      const output = await generateHashtagSuggestions({
        topicOrKeywords: intent.topic || message,
        platform: 'Instagram',
        numSuggestions: 10
      });

      if (!output || !output.hashtagSuggestions || output.hashtagSuggestions.length === 0) {
        return { success: false, error: 'Failed to generate hashtags' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ topicOrKeywords: intent.topic || message })),
        outputTokens: estimateTokenCount(output.hashtagSuggestions.join(' '))
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate hashtags');
  }

  const hashtags = result.data.hashtagSuggestions.join(' ');

  return {
    content: `Here are hashtags for "${intent.topic || message}":\n\n${hashtags}`,
    type: 'text',
    metadata: {
      hashtags: result.data.hashtagSuggestions,
      topic: intent.topic || message
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: [
      {
        label: 'Create Social Post',
        prompt: `Create an Instagram post about ${intent.topic || message}`,
        icon: '📱'
      },
      {
        label: 'Generate Post Image',
        prompt: `Create an engaging image for ${intent.topic || message}`,
        icon: '🎨'
      }
    ]
  };
}

async function handleReviewResponse(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  // Extract review text from message - look for patterns like "Review: ..." or just use the whole message
  let reviewText = message;
  const reviewMatch = message.match(/review[:\s]+["']?(.+?)["']?$/i);
  if (reviewMatch && reviewMatch[1]) {
    reviewText = reviewMatch[1].trim();
  }
  
  // Simple sentiment detection based on keywords
  const lowerReview = reviewText.toLowerCase();
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  
  const positiveKeywords = ['great', 'excellent', 'amazing', 'fantastic', 'love', 'wonderful', 'best', 'perfect', 'awesome', 'good', 'happy', 'thank'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'worst', 'hate', 'horrible', 'disappointing', 'poor', 'unhappy', 'disappointed', 'never', 'don\'t'];
  
  const hasPositive = positiveKeywords.some(word => lowerReview.includes(word));
  const hasNegative = negativeKeywords.some(word => lowerReview.includes(word));
  
  if (hasPositive && !hasNegative) {
    sentiment = 'positive';
  } else if (hasNegative && !hasPositive) {
    sentiment = 'negative';
  } else if (hasPositive && hasNegative) {
    sentiment = 'neutral';
  }
  
  // If sentiment is explicitly mentioned in the message, use that
  if (message.toLowerCase().includes('positive review')) sentiment = 'positive';
  if (message.toLowerCase().includes('negative review')) sentiment = 'negative';
  if (message.toLowerCase().includes('neutral review')) sentiment = 'neutral';
  
  // Get business name from company
  let businessName = 'Your Business'; // Default fallback
  try {
    if (serverDb) {
      const companyDoc = await getDoc(doc(serverDb, 'companies', companyId));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        businessName = companyData?.name || 'Your Business';
      }
    }
  } catch (error) {
    console.error('Error fetching company name:', error);
    // Continue with default business name
  }
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Review Responder',
    apiKeyType,
    operation: async () => {
      const output = await aiReviewResponder({
        reviewText,
        sentiment,
        businessName
      });

      if (!output || !output.response) {
        return { success: false, error: 'Failed to generate review response' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ reviewText, sentiment, businessName })),
        outputTokens: estimateTokenCount(output.response)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate review response');
  }

  return {
    content: `**Review Response** (${sentiment}):\n\n${result.data.response}`,
    type: 'text',
    metadata: {
      reviewText,
      sentiment,
      response: result.data.response
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: [
      {
        label: 'Copy Response',
        prompt: 'Copy this review response',
        icon: '📋'
      }
    ]
  };
}

async function handleTrendingTopics(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  // Extract parameters from message (with smart defaults)
  const lowerMessage = message.toLowerCase();
  const businessNiche = extractTopic(message, ['for', 'about', 'in', 'my']) || 'general business';
  const contentType = lowerMessage.includes('video') || lowerMessage.includes('youtube') ? 'YouTubeVideo' : 'BlogPost';
  const planningHorizon = lowerMessage.includes('daily') ? 'Daily' : lowerMessage.includes('monthly') ? 'Monthly' : 'Weekly';
  const targetRegion = lowerMessage.includes('india') ? 'India' : lowerMessage.includes('usa') || lowerMessage.includes('us') ? 'USA' : lowerMessage.includes('uk') ? 'UK' : 'Global';
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Trending Topics',
    apiKeyType,
    operation: async () => {
      const output = await getTrendingTopicSuggestions({
        businessNiche,
        contentType: contentType as 'BlogPost' | 'YouTubeVideo',
        planningHorizon: planningHorizon as 'Daily' | 'Weekly' | 'Monthly',
        targetRegion
      });

      if (!output || !output.suggestions || output.suggestions.length === 0) {
        return { success: false, error: 'Failed to generate trending topics' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ businessNiche, contentType, planningHorizon, targetRegion })),
        outputTokens: estimateTokenCount(JSON.stringify(output))
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate trending topics');
  }

  // Format the output nicely
  let formattedContent = `🔥 **Trending Topic Suggestions for ${businessNiche}**\n\n`;
  formattedContent += `📊 Content Type: ${contentType} | ⏰ Planning: ${planningHorizon} | 🌍 Region: ${targetRegion}\n\n`;
  
  result.data.suggestions.forEach((suggestion, idx) => {
    formattedContent += `**${idx + 1}. ${suggestion.topic}**\n`;
    formattedContent += `💡 ${suggestion.reasoning}\n\n`;
    formattedContent += `🔑 Keywords: ${suggestion.suggestedKeywords.join(', ')}\n\n`;
    formattedContent += `📝 Example Titles:\n`;
    suggestion.exampleTitles.forEach(title => {
      formattedContent += `   • ${title}\n`;
    });
    formattedContent += `\n`;
  });

  const firstTopic = result.data.suggestions[0]?.topic;

  return {
    content: formattedContent,
    type: 'text',
    metadata: {
      suggestions: result.data.suggestions,
      businessNiche,
      contentType,
      firstTopic
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('trending_topics', { firstTopic })
  };
}

async function handlePromptEnhancer(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  // Extract parameters from message
  const lowerMessage = message.toLowerCase();
  
  // Extract the original prompt (the main content after "enhance")
  const originalPrompt = extractTopic(message, ['enhance', 'improve', 'refine', 'this prompt:', 'prompt:']) || message;
  
  // Detect goal based on keywords
  let promptGoal: 'ImageGeneration' | 'TextContent' | 'VideoScriptIdea' | 'SalesPageBrief' = 'TextContent';
  if (lowerMessage.includes('image') || lowerMessage.includes('picture') || lowerMessage.includes('visual')) {
    promptGoal = 'ImageGeneration';
  } else if (lowerMessage.includes('video') || lowerMessage.includes('script')) {
    promptGoal = 'VideoScriptIdea';
  } else if (lowerMessage.includes('sales') || lowerMessage.includes('landing')) {
    promptGoal = 'SalesPageBrief';
  }
  
  // Extract style if mentioned
  const desiredStyle = lowerMessage.includes('style:') ? message.split('style:')[1]?.split(/[,\n]/)[0]?.trim() : undefined;
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Prompt Enhancement',
    apiKeyType,
    operation: async () => {
      const output = await generateEnhancedPrompt({
        originalPrompt,
        promptGoal,
        desiredStyle
      });

      if (!output || !output.enhancedPrompt) {
        return { success: false, error: 'Failed to enhance prompt' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ originalPrompt, promptGoal, desiredStyle })),
        outputTokens: estimateTokenCount(output.enhancedPrompt)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to enhance prompt');
  }

  let formattedContent = `✨ **Enhanced Prompt** (${promptGoal})\n\n`;
  formattedContent += `📝 **Original:**\n${originalPrompt}\n\n`;
  formattedContent += `🎯 **Enhanced:**\n${result.data.enhancedPrompt}\n\n`;
  
  if (result.data.guidanceNotes) {
    formattedContent += `💡 **Tips:**\n${result.data.guidanceNotes}\n`;
  }

  return {
    content: formattedContent,
    type: 'text',
    metadata: {
      originalPrompt,
      enhancedPrompt: result.data.enhancedPrompt,
      promptGoal,
      guidanceNotes: result.data.guidanceNotes
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('prompt_enhance', { 
      originalPrompt, 
      enhancedPrompt: result.data.enhancedPrompt,
      promptGoal 
    })
  };
}

async function handleSalesPage(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  // Extract parameters from message
  const originalTopic = intent.topic || extractTopic(message, ['sales page', 'landing page', 'for', 'about']) || 'your product/service';
  const lowerMessage = message.toLowerCase();
  
  const { enhancedPrompt: topic, wasEnhanced } = await autoEnhancePrompt(
    originalTopic,
    'sales_page',
    companyId,
    userId
  );
  
  // Detect tone
  let tone: 'Formal' | 'Casual' | 'Professional' | 'Urgent' = 'Professional';
  if (lowerMessage.includes('casual') || lowerMessage.includes('friendly')) {
    tone = 'Casual';
  } else if (lowerMessage.includes('formal')) {
    tone = 'Formal';
  } else if (lowerMessage.includes('urgent')) {
    tone = 'Urgent';
  }
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Sales Page',
    apiKeyType,
    operation: async () => {
      const output = await generateSocialMediaContent({
        topic,
        platform: 'SalesLandingPage',
        tone,
        goal: 'Convert visitors into customers',
        includeHashtags: false,
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.variations || output.variations.length === 0) {
        return { success: false, error: 'Failed to generate sales page' };
      }

      const textContent = output.variations.map(v => v.textContent).join(' ');
      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ topic, tone })),
        outputTokens: estimateTokenCount(textContent)
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate sales page');
  }

  const variation = result.data.variations[0];
  
  // For sales pages, show a summary instead of trying to convert HTML
  const summary = `💰 **Sales Landing Page Created Successfully!**

**Product/Service**: ${topic}
**Tone**: ${tone}
**Format**: Complete HTML sales page optimized for conversions
**Suggested Hero Image**: ${variation.suggestedImagePrompt || 'Professional hero image'}

✨ Use the **Preview** tab to see how your sales page looks, or switch to **Code** tab to view the HTML.`;
  
  return {
    content: summary,
    type: 'text',
    metadata: {
      platform: 'SalesLandingPage',
      topic,
      tone,
      htmlContent: variation.textContent,  // Store HTML in metadata for future use
      suggestedImagePrompt: variation.suggestedImagePrompt,
      imagePrompt: variation.suggestedImagePrompt  // Also store as imagePrompt for compatibility
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: getNextStepSuggestions('sales_page', { 
      topic,
      imagePrompt: variation.suggestedImagePrompt 
    })
  };
}

async function handleYouTubeAd(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'YouTube Ads',
    apiKeyType,
    operation: async () => {
      const output = await generateYouTubeAdContent({
        productOrService: intent.topic || message,
        targetAudience: 'Your target audience',
        adObjective: 'BrandAwareness',
        keyMessagePoints: intent.topic || message,
        desiredVideoStyleAndLength: 'Engaging Explainer - Skippable In-stream Ad (15-30s)',
        overallTone: 'Friendly',
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.adVariations || output.adVariations.length === 0) {
        return { success: false, error: 'Failed to generate YouTube ad' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ productOrService: intent.topic || message })),
        outputTokens: estimateTokenCount(JSON.stringify(output))
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate YouTube ad');
  }

  const variation = result.data.adVariations[0];

  return {
    content: `📺 **YouTube Ad Concept Created!**\n\n**Format:** ${variation.adFormatSuggestion}\n\n**Video Title:** ${variation.videoTitle}\n\n**Script:**\n${variation.script}\n\n**Voice-Over Tone:** ${variation.voiceOverTone}\n\n**Visual Style:** ${variation.visualStyleNotes}\n\n**CTA:** ${variation.callToActionText}\n\n**Thumbnail Prompt:** ${variation.thumbnailPrompt}`,
    type: 'text',
    metadata: {
      platform: 'YouTube',
      adVariation: variation
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: [
      {
        label: 'Generate Thumbnail',
        prompt: `Generate image: ${variation.thumbnailPrompt}`,
        icon: '🎨'
      },
      {
        label: 'Create Different Format',
        prompt: `Create a bumper ad (6s) for ${intent.topic || 'this product'}`,
        icon: '🎬'
      }
    ]
  };
}

async function handleTikTokReelsAd(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'TikTok/Reels Ads',
    apiKeyType,
    operation: async () => {
      const output = await generateTiktokReelsAdContent({
        productOrService: intent.topic || message,
        targetDemographic: 'Gen Z and Millennials interested in this product',
        adVibe: 'Funny & Relatable',
        keyMessage: intent.topic || message,
        numVariations: 1,
        targetLanguage: 'English'
      });

      if (!output || !output.adVariations || output.adVariations.length === 0) {
        return { success: false, error: 'Failed to generate TikTok/Reels ad' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ productOrService: intent.topic || message })),
        outputTokens: estimateTokenCount(JSON.stringify(output))
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate TikTok/Reels ad');
  }

  const variation = result.data.adVariations[0];
  const captions = variation.captionOptions.join('\n- ');
  const hashtags = variation.suggestedHashtags.join(' ');

  return {
    content: `🎵 **TikTok/Reels Ad Concept Created!**\n\n**Video Concept:**\n${variation.videoConcept}\n\n**Caption Options:**\n- ${captions}\n\n**Suggested Sound:** ${variation.suggestedSoundConcept}\n\n**CTA:** ${variation.callToActionText}\n\n**Hashtags:** ${hashtags}\n\n${result.data.generalTipsForPlatform ? `\n**Tips:**\n${result.data.generalTipsForPlatform.map(tip => `• ${tip}`).join('\n')}` : ''}`,
    type: 'text',
    metadata: {
      platform: 'TikTok/Reels',
      adVariation: variation
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: [
      {
        label: 'Try Different Vibe',
        prompt: `Create a TikTok ad for ${intent.topic || 'this'} with educational style`,
        icon: '🎬'
      }
    ]
  };
}

async function handleKeywordPlanner(
  message: string,
  intent: any,
  companyId: string,
  userId: string
): Promise<ChatResponse> {
  const { apiKey, type: apiKeyType } = await getGeminiApiKeyForCompany(companyId);
  
  const result = await executeAIOperation({
    companyId,
    userId,
    operationType: 'text_generation',
    model: 'gemini-2.0-flash',
    feature: 'Keyword Planner',
    apiKeyType,
    operation: async () => {
      const output = await generateGoogleAdsKeywords({
        productOrService: intent.topic || message,
        targetAudience: 'Your target customers',
        campaignGoals: 'Drive traffic and conversions',
        numSuggestionsPerCategory: 7,
        targetLanguage: 'English',
        targetCurrency: 'USD'
      });

      if (!output || !output.keywordSuggestions) {
        return { success: false, error: 'Failed to generate keywords' };
      }

      return {
        success: true,
        data: output,
        inputTokens: estimateTokenCount(JSON.stringify({ productOrService: intent.topic || message })),
        outputTokens: estimateTokenCount(JSON.stringify(output))
      };
    }
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to generate keywords');
  }

  const keywords = result.data.keywordSuggestions;
  
  let formattedContent = `🔑 **Keyword Research Results**\n\n`;
  
  if (keywords.primaryKeywords && keywords.primaryKeywords.length > 0) {
    formattedContent += `**Primary Keywords:**\n`;
    keywords.primaryKeywords.slice(0, 5).forEach(kw => {
      formattedContent += `• ${kw.keyword}${kw.estimatedCompetition ? ` (${kw.estimatedCompetition} competition)` : ''}${kw.estimatedCpcRange ? ` - ${kw.estimatedCpcRange}` : ''}\n`;
    });
    formattedContent += `\n`;
  }
  
  if (keywords.longTailKeywords && keywords.longTailKeywords.length > 0) {
    formattedContent += `**Long-Tail Keywords:**\n`;
    keywords.longTailKeywords.slice(0, 5).forEach(kw => {
      formattedContent += `• ${kw.keyword}${kw.estimatedCompetition ? ` (${kw.estimatedCompetition} competition)` : ''}\n`;
    });
  }

  return {
    content: formattedContent,
    type: 'text',
    metadata: {
      keywords: keywords
    },
    creditsConsumed: result.quotaInfo?.consumed || 0,
    nextSteps: [
      {
        label: 'Create Google Ad',
        prompt: `Create a Google ad for ${intent.topic || 'this product'} using these keywords`,
        icon: '📢'
      }
    ]
  };
}

async function handleGeneral(
  message: string,
  companyId: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ChatResponse> {
  return {
    content: `I can help you with:

📱 **Social Media Posts** - Just say "Create an Instagram post about [topic]"
✉️ **Email Campaigns** - Try "Write an email about [topic]"
📢 **Ad Copy** - Ask "Generate a Google ad for [product]"
🎨 **Images** - Say "Create an image of [description]"
✍️ **Blog Posts** - Request "Write a blog post about [topic]"
🎬 **Video Scripts** - Ask "Write a video script about [topic]"
📺 **YouTube Ads** - Try "Create a YouTube ad for [product]"
🎵 **TikTok/Reels Ads** - Ask "Generate a TikTok ad for [product]"
🔑 **Keyword Research** - Say "Suggest keywords for [product/service]"
#️⃣ **Hashtags** - Ask "Generate hashtags for [topic]"
💬 **Review Responses** - Say "Respond to this review: [review text]"
🔥 **Trending Topics** - Try "Suggest trending topics for my [niche]"
✨ **Enhance Prompts** - Say "Enhance this prompt: [your idea]"
💰 **Sales Pages** - Request "Create a sales page for [product/service]"

What would you like to create?`,
    type: 'text',
    creditsConsumed: 0,
    metadata: {}
  };
}
