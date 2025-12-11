
export type SocialPlatform = 'BlogPost' | 'TwitterX' | 'Instagram' | 'LinkedIn' | 'Facebook' | 'YouTubeVideoScript' | 'SalesLandingPage' | 'Email';

export interface SocialMediaPost {
  id: string;
  companyId: string;
  platform: SocialPlatform;
  textContent: string;
  status: 'Draft' | 'Scheduled' | 'Posted';
  createdAt: string | null;
  scheduledAt?: string | null; 
  
  // Generation details
  originalTopic?: string;
  originalGoal?: string;
  originalTone?: string;
  
  // Main content parts
  suggestedImagePrompt?: string;
  imageUrl?: string; // To store the Data URI of the generated image
  imageAiHint?: string; // To store keywords for the image
  isAiGeneratedImage?: boolean; // To track if the image was AI-generated
  imageGeneratedAt?: string | null; // Timestamp when AI generated the image
  suggestedVideoScriptIdea?: string;

  // YouTube Specific fields
  suggestedVideoTitle?: string;
  suggestedVideoDescription?: string;
  suggestedVideoKeywordsTags?: string[];
  suggestedVideoHashtags?: string[];
  suggestedVideoThumbnailPrompt?: string;
}
