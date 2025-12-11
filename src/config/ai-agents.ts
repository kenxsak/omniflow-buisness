import { 
  FileText, BarChart, Image as ImageIcon, Search, 
  MessageCircle, Video, Sparkles, LucideIcon 
} from 'lucide-react';

export interface AgentQuickAction {
  label: string;
  prompt: string;
  icon: string;
}

export interface AIAgent {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  description: string;
  longDescription: string;
  capabilities: string[];
  introMessage: string;
  quickActions: AgentQuickAction[];
  category: 'primary' | 'secondary' | 'general';
}

export const aiAgents: AIAgent[] = [
  {
    id: 'content-writer',
    name: 'Content Writer',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'Create amazing content that engages',
    longDescription: 'I specialize in creating SEO-optimized blog posts, sales pages, email campaigns, and social media content.',
    capabilities: [
      'Blog Posts (SEO-optimized)',
      'Sales Landing Pages',
      'Email Campaigns',
      'Social Media Posts (all platforms)'
    ],
    introMessage: "Hi! I'm your Content Writer AI assistant. I can help you create professional, engaging content for any platform. What would you like to write today?",
    quickActions: [
      { label: '📝 Write Blog Post', prompt: 'Write a blog post about ', icon: 'FileText' },
      { label: '💰 Create Sales Page', prompt: 'Create a sales page for ', icon: 'DollarSign' },
      { label: '✉️ Email Campaign', prompt: 'Write an email to my customers about ', icon: 'Mail' },
      { label: '📱 Social Post', prompt: 'Create a social media post about ', icon: 'MessageSquare' }
    ],
    category: 'primary'
  },
  {
    id: 'ad-strategist',
    name: 'Ad Strategist',
    icon: BarChart,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    description: 'Plan winning ad campaigns that convert',
    longDescription: 'I create high-converting ad campaigns for Google, Facebook, Instagram, LinkedIn, YouTube, and TikTok.',
    capabilities: [
      'Google Ads (Search & Display)',
      'Facebook & Instagram Ads',
      'LinkedIn Sponsored Content',
      'YouTube Video Ads',
      'TikTok & Reels Ads'
    ],
    introMessage: "Hi! I'm your Ad Strategist AI. I specialize in creating ad campaigns that convert. Tell me about your product or campaign goal!",
    quickActions: [
      { label: '🔍 Keyword Research', prompt: 'Research keywords for ', icon: 'Search' },
      { label: '📊 Google Ads', prompt: 'Create Google ads for ', icon: 'BarChart' },
      { label: '📱 Social Ads', prompt: 'Create Facebook/Instagram ads for ', icon: 'MessageSquare' },
      { label: '🎥 Video Ads', prompt: 'Create a YouTube ad for ', icon: 'Youtube' }
    ],
    category: 'primary'
  },
  {
    id: 'visual-designer',
    name: 'Visual Designer',
    icon: ImageIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    description: 'Generate stunning visuals',
    longDescription: 'I create AI-generated images for blogs, social media, ads, thumbnails, and more.',
    capabilities: [
      'Blog Hero Images',
      'Social Media Graphics',
      'Ad Creatives',
      'YouTube Thumbnails',
      'Product Images'
    ],
    introMessage: "Hi! I'm your Visual Designer AI. I can create stunning AI-generated images for any purpose. What do you need?",
    quickActions: [
      { label: '🖼️ Blog Hero Image', prompt: 'Generate a hero image for a blog about ', icon: 'Image' },
      { label: '📱 Social Graphic', prompt: 'Create a social media image for ', icon: 'MessageSquare' },
      { label: '🎬 Video Thumbnail', prompt: 'Design a YouTube thumbnail for ', icon: 'Youtube' },
      { label: '🏷️ Product Image', prompt: 'Generate a product image of ', icon: 'Package' }
    ],
    category: 'primary'
  },
  {
    id: 'seo-expert',
    name: 'SEO Expert',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    description: 'Optimize for search and trends',
    longDescription: 'I help with keyword research, trending topics, hashtags, and SEO optimization.',
    capabilities: [
      'Keyword Research',
      'Trending Topics Discovery',
      'Hashtag Suggestions',
      'SEO Analysis'
    ],
    introMessage: "Hi! I'm your SEO Expert AI. I can help you discover trending topics, research keywords, and optimize your content for search.",
    quickActions: [
      { label: '🔍 Keywords', prompt: 'Research keywords for ', icon: 'Search' },
      { label: '💡 Trending Topics', prompt: 'Show me trending topics for ', icon: 'Lightbulb' },
      { label: '# Hashtags', prompt: 'Generate hashtags for ', icon: 'Hash' }
    ],
    category: 'secondary'
  },
  {
    id: 'customer-service',
    name: 'Customer Service AI',
    icon: MessageCircle,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    description: 'Respond to customers professionally',
    longDescription: 'I help you respond to customer reviews, messages, and support requests with professionalism.',
    capabilities: [
      'Review Responses (positive & negative)',
      'Customer Support Messages',
      'Professional Communication'
    ],
    introMessage: "Hi! I'm your Customer Service AI. I can help you respond to reviews and customer messages professionally.",
    quickActions: [
      { label: '⭐ Respond to Review', prompt: 'Help me respond to this review: ', icon: 'Star' },
      { label: '💬 Support Message', prompt: 'Write a support response for: ', icon: 'MessageCircle' }
    ],
    category: 'secondary'
  },
  {
    id: 'video-producer',
    name: 'Video Producer',
    icon: Video,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    description: 'Create video scripts and concepts',
    longDescription: 'I create video scripts, concepts, and storyboards for YouTube, TikTok, and social media.',
    capabilities: [
      'Video Scripts (YouTube, TikTok)',
      'Concept Development',
      'Scene Breakdowns',
      'Storyboard Ideas'
    ],
    introMessage: "Hi! I'm your Video Producer AI. I can create engaging video scripts and concepts for any platform.",
    quickActions: [
      { label: '🎬 Video Script', prompt: 'Write a video script about ', icon: 'Video' },
      { label: '💡 Video Concept', prompt: 'Suggest a video concept for ', icon: 'Lightbulb' }
    ],
    category: 'secondary'
  },
  {
    id: 'general-assistant',
    name: 'General AI Assistant',
    icon: Sparkles,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    description: 'Ask me anything about marketing and content',
    longDescription: 'I can help with anything related to marketing, content creation, or business strategy.',
    capabilities: [
      'General Advice',
      'Strategy Discussions',
      'Brainstorming',
      'Any Marketing Questions'
    ],
    introMessage: "Hi! I'm your General AI Assistant. Ask me anything about marketing, content, or business strategy!",
    quickActions: [],
    category: 'general'
  }
];

export function getAgentById(id: string): AIAgent | undefined {
  return aiAgents.find(agent => agent.id === id);
}

export function getPrimaryAgents(): AIAgent[] {
  return aiAgents.filter(agent => agent.category === 'primary');
}

export function getSecondaryAgents(): AIAgent[] {
  return aiAgents.filter(agent => agent.category === 'secondary');
}

export function getGeneralAgent(): AIAgent | undefined {
  return aiAgents.find(agent => agent.category === 'general');
}
