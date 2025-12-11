"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Copy, Download, ThumbsUp, RefreshCw, Sparkles, Coins, Eye, Code, ImagePlus, Calendar, Edit, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { handleAIChatMessage } from '@/app/actions/ai-chat-actions';
import { addStoredSocialMediaPostAction } from '@/app/actions/social-media-actions';
import Image from 'next/image';
import type { SocialPlatform } from '@/types/social-media';
import GuidedTrendingTopics from './guided-trending-topics';
import GuidedReviewResponder from './guided-review-responder';
import ContentWorkflowActions from './content-workflow-actions';
import Link from 'next/link';
import { AIAgent } from '@/config/ai-agents';
import { 
  createChatSession, 
  addMessage, 
  getMessages,
  updateChatSession,
  updateMessage 
} from '@/lib/chat-session-service';

interface NextStepSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'image' | 'error';
  metadata?: any;
  creditsConsumed?: number;
  nextSteps?: NextStepSuggestion[];
  isEdited?: boolean;
  versions?: Array<{
    content: string;
    timestamp: Date;
    metadata?: any;
    nextSteps?: NextStepSuggestion[];
  }>;
  currentVersionIndex?: number;
}

interface ChatInterfaceProps {
  initialPrompt?: string;
  showGuidedTrendingTopics?: boolean;
  showGuidedReviewResponder?: boolean;
  selectedAgent?: AIAgent;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export default function ChatInterface({ 
  initialPrompt = '', 
  showGuidedTrendingTopics = false,
  showGuidedReviewResponder = false,
  selectedAgent,
  sessionId: initialSessionId,
  onSessionCreated
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [pendingSaveMessage, setPendingSaveMessage] = useState<Message | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showGuidedFlow, setShowGuidedFlow] = useState(showGuidedTrendingTopics || showGuidedReviewResponder);
  const [guidedFlowType, setGuidedFlowType] = useState<'trending' | 'review' | null>(
    showGuidedTrendingTopics ? 'trending' : showGuidedReviewResponder ? 'review' : null
  );
  const [lastGeneratedContent, setLastGeneratedContent] = useState<Message | null>(null);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [imageGeneratedFor, setImageGeneratedFor] = useState<Set<string>>(new Set());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { appUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (selectedAgent && messages.length === 0 && !currentSessionId) {
      const introMessage: Message = {
        id: 'agent-intro',
        role: 'assistant',
        content: selectedAgent.introMessage,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages([introMessage]);
    }
  }, [selectedAgent, currentSessionId]);

  useEffect(() => {
    const loadSessionMessages = async () => {
      if (!initialSessionId || !appUser?.companyId || !appUser?.uid) return;
      
      setIsLoadingSession(true);
      try {
        const sessionMessages = await getMessages(
          initialSessionId,
          appUser.companyId,
          appUser.uid
        );
        
        const convertedMessages: Message[] = sessionMessages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(),
          type: msg.type,
          metadata: msg.metadata,
          creditsConsumed: msg.creditsConsumed,
          nextSteps: msg.nextSteps
        }));
        
        setMessages(convertedMessages);
        setCurrentSessionId(initialSessionId);
      } catch (error: any) {
        toast({
          title: 'Error loading conversation',
          description: error.message || 'Failed to load conversation history',
          variant: 'destructive'
        });
      } finally {
        setIsLoadingSession(false);
      }
    };
    
    loadSessionMessages();
  }, [initialSessionId, appUser]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Error',
        description: 'Please sign in to use AI chat',
        variant: 'destructive'
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;
      
      if (!sessionId) {
        setIsSavingMessage(true);
        const title = selectedAgent 
          ? `${selectedAgent.name} - ${userMessage.content.substring(0, 50)}...`
          : userMessage.content.substring(0, 50) + '...';
        
        sessionId = await createChatSession(
          appUser.companyId,
          appUser.uid,
          selectedAgent?.id,
          title
        );
        
        setCurrentSessionId(sessionId);
        
        if (onSessionCreated) {
          onSessionCreated(sessionId);
        }
        
        if (selectedAgent) {
          const introMsg = messages.find(m => m.id === 'agent-intro');
          if (introMsg) {
            await addMessage(sessionId, appUser.companyId, appUser.uid, {
              role: 'assistant',
              content: introMsg.content,
              type: 'text'
            });
          }
        }
      }

      setIsSavingMessage(true);
      await addMessage(sessionId, appUser.companyId, appUser.uid, {
        role: 'user',
        content: userMessage.content,
        type: 'text'
      });

      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await handleAIChatMessage(
        userMessage.content, 
        appUser.companyId, 
        appUser.uid,
        conversationHistory
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        type: result.type,
        metadata: result.metadata,
        creditsConsumed: result.creditsConsumed,
        nextSteps: result.nextSteps
      };

      setMessages(prev => [...prev, aiMessage]);

      await addMessage(sessionId, appUser.companyId, appUser.uid, {
        role: 'assistant',
        content: aiMessage.content,
        type: aiMessage.type,
        metadata: aiMessage.metadata,
        creditsConsumed: aiMessage.creditsConsumed,
        nextSteps: aiMessage.nextSteps
      });

      if (result.creditsConsumed && result.creditsConsumed > 0) {
        toast({
          title: '✨ AI Credits Used',
          description: `${result.creditsConsumed} credits consumed for this request`,
          duration: 3000
        });
      }

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process your request',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setIsSavingMessage(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    });
  };

  const getPreviewHtml = (content: string): string => {
    // For blog posts and sales pages, the content is already a complete HTML document
    return content;
  };

  const handlePreviewInNewTab = (content: string) => {
    const htmlContent = getPreviewHtml(content);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSaveToContentHub = async (message: Message, generatedImageUrl?: string) => {
    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Error',
        description: 'Please sign in to save content',
        variant: 'destructive'
      });
      return;
    }

    // Determine platform from explicit metadata (reliable)
    // Fall back to Instagram only if no metadata is provided
    let platform: SocialPlatform = message.metadata?.platform || 'Instagram';

    // Extract suggested image prompt from next steps if available
    let suggestedImagePrompt = message.metadata?.imagePrompt || message.metadata?.suggestedImagePrompt;
    if (!suggestedImagePrompt && message.nextSteps) {
      // Look for image creation prompt in next steps
      const imageStep = message.nextSteps.find(step => 
        step.label.toLowerCase().includes('image') || 
        step.label.toLowerCase().includes('hero') ||
        step.label.toLowerCase().includes('featured')
      );
      if (imageStep) {
        suggestedImagePrompt = imageStep.prompt;
      }
    }

    // Use generated image if provided, otherwise use existing image from metadata
    const finalImageUrl = generatedImageUrl || message.metadata?.imageUrl;

    // Prepare post data
    // Use htmlContent for blog posts/sales pages, textContent for social posts, or fall back to message content
    const contentToSave = message.metadata?.htmlContent || message.metadata?.textContent || message.content;
    
    // Blog posts and sales pages are published immediately (status: 'Posted')
    // Social media posts are saved as drafts (status: 'Draft')
    const isPublicContent = platform === 'BlogPost' || platform === 'SalesLandingPage';
    
    const postData: any = {
      companyId: appUser.companyId,
      platform,
      textContent: contentToSave,
      status: isPublicContent ? 'Posted' : 'Draft',
      originalTopic: message.metadata?.topic || 'AI Generated Content',
      originalTone: message.metadata?.tone || 'Professional',
      suggestedImagePrompt: suggestedImagePrompt,
      imageAiHint: message.metadata?.imagePrompt || message.metadata?.topic || 'AI generated content',
      isAiGeneratedImage: finalImageUrl ? finalImageUrl.startsWith('data:image') : false,
    };

    // Only include imageUrl if it exists (Firestore doesn't accept undefined)
    if (finalImageUrl) {
      postData.imageUrl = finalImageUrl;
    }

    try {
      const result = await addStoredSocialMediaPostAction(appUser.uid, postData);
      
      if (result.success) {
        setSavedMessageIds(prev => new Set(prev).add(message.id));
        toast({
          title: '✅ Saved to Content Hub',
          description: `Your ${platform} has been saved as a draft${generatedImageUrl ? ' with generated image' : ''}. You can schedule it from the Content Factory.`,
          duration: 5000
        });
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save content',
        variant: 'destructive'
      });
    }
  };

  const handleSaveClick = async (message: Message) => {
    // Check if this message has a suggested image prompt and no image yet
    const hasSuggestedImage = message.nextSteps?.some(step => 
      step.label.toLowerCase().includes('image') || 
      step.label.toLowerCase().includes('hero') ||
      step.label.toLowerCase().includes('featured')
    );

    const hasImage = !!message.metadata?.imageUrl;

    if (hasSuggestedImage && !hasImage && (message.metadata?.htmlContent)) {
      // Show dialog to ask if user wants to generate image
      setPendingSaveMessage(message);
      setShowImageDialog(true);
    } else {
      // Save directly without image
      await handleSaveToContentHub(message);
    }
  };

  const handleGenerateAndSave = async () => {
    if (!pendingSaveMessage || !appUser?.companyId || !appUser?.uid) return;
    
    setShowImageDialog(false);
    setIsGeneratingImage(true);

    try {
      // Find the image prompt from next steps
      const imageStep = pendingSaveMessage.nextSteps?.find(step => 
        step.label.toLowerCase().includes('image') || 
        step.label.toLowerCase().includes('hero') ||
        step.label.toLowerCase().includes('featured')
      );

      if (!imageStep) {
        throw new Error('No image prompt found');
      }

      // Generate the image
      const result = await handleAIChatMessage(
        imageStep.prompt,
        appUser.companyId,
        appUser.uid
      );

      if (result.type === 'image' && result.metadata?.imageUrl) {
        // Save with the generated image
        await handleSaveToContentHub(pendingSaveMessage, result.metadata.imageUrl);
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error: any) {
      toast({
        title: 'Error generating image',
        description: error.message || 'Failed to generate image. Saving without image...',
        variant: 'destructive'
      });
      // Save without image on error
      await handleSaveToContentHub(pendingSaveMessage);
    } finally {
      setIsGeneratingImage(false);
      setPendingSaveMessage(null);
    }
  };

  const handleSaveWithoutImage = async () => {
    if (!pendingSaveMessage) return;
    setShowImageDialog(false);
    await handleSaveToContentHub(pendingSaveMessage);
    setPendingSaveMessage(null);
  };

  const handleReviewResponseGenerated = async (response: string, reviewText: string) => {
    setShowGuidedFlow(false);
    setGuidedFlowType(null);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Help me respond to this customer review: "${reviewText}"`,
      timestamp: new Date()
    };

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `**Review Response:**\n\n${response}`,
      timestamp: new Date(),
      type: 'text',
      metadata: {
        reviewText,
        response
      }
    };

    setMessages([userMessage, aiMessage]);
    setLastGeneratedContent(aiMessage);

    toast({
      title: 'Response Generated',
      description: 'Your review response is ready!',
    });
  };

  const handleContentGenerated = (userMessage: Message, assistantMessage: Message) => {
    setShowGuidedFlow(false);
    setGuidedFlowType(null);
    
    setMessages([userMessage, assistantMessage]);
    setLastGeneratedContent(assistantMessage);
  };

  const handleCreateImage = async (message: Message) => {
    if (!appUser?.companyId || !appUser?.uid) {
      toast({
        title: 'Error',
        description: 'Please sign in to generate images',
        variant: 'destructive'
      });
      return;
    }

    const imageStep = message.nextSteps?.find(step => 
      step.label.toLowerCase().includes('image') || 
      step.label.toLowerCase().includes('hero') ||
      step.label.toLowerCase().includes('featured')
    );

    if (!imageStep) {
      toast({
        title: 'No image prompt found',
        description: 'Could not find image generation prompt',
        variant: 'destructive'
      });
      return;
    }

    setIsGeneratingImage(true);
    
    try {
      // Generate the image using the AI handler
      const result = await handleAIChatMessage(
        imageStep.prompt,
        appUser.companyId,
        appUser.uid
      );

      if (result.type === 'image' && result.metadata?.imageUrl) {
        // Mark image as generated for this message
        setImageGeneratedFor(prev => new Set(prev).add(message.id));
        
        // Replace placeholder images in the HTML content if it exists
        if (message.metadata?.htmlContent) {
          const placeholderRegex = /https?:\/\/placehold\.co\/[\w/.]+|https?:\/\/picsum\.photos\/seed\/[^/]+\/\d+\/\d+/g;
          const updatedHtml = message.metadata.htmlContent.replace(placeholderRegex, result.metadata.imageUrl);
          
          // Update the message with the new HTML content
          setMessages(prev => prev.map(msg => 
            msg.id === message.id 
              ? { 
                  ...msg, 
                  metadata: { 
                    ...msg.metadata, 
                    htmlContent: updatedHtml,
                    imageUrl: result.metadata.imageUrl 
                  } 
                }
              : msg
          ));
        }

        // Add the image result as a new message in the chat
        const imageMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✨ Image generated successfully! The placeholder images in your ${message.metadata?.platform || 'content'} have been replaced.`,
          timestamp: new Date(),
          type: 'image',
          metadata: {
            imageUrl: result.metadata.imageUrl,
            prompt: imageStep.prompt
          },
          creditsConsumed: result.creditsConsumed
        };

        setMessages(prev => [...prev, imageMessage]);

        toast({
          title: '✨ Image Generated',
          description: 'Placeholder images have been replaced with your AI-generated image',
          duration: 5000
        });
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate image',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedContent(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const handleSaveEdit = async (message: Message) => {
    if (!editedContent.trim() || !appUser?.companyId || !appUser?.uid || !currentSessionId) return;
    
    if (editedContent === message.content) {
      handleCancelEdit();
      return;
    }

    try {
      setIsSavingMessage(true);

      // Update message in local state
      setMessages(prev => prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, content: editedContent, isEdited: true }
          : msg
      ));

      // Update message in Firestore
      await updateMessage(
        message.id,
        currentSessionId,
        appUser.companyId,
        appUser.uid,
        { content: editedContent }
      );

      toast({
        title: '✅ Message Updated',
        description: 'Regenerating AI responses with updated context...',
      });

      // Find the index of the edited message
      const messageIndex = messages.findIndex(m => m.id === message.id);
      
      // Get all messages before and including the edited message
      const contextMessages = messages.slice(0, messageIndex + 1).map(m => 
        m.id === message.id ? { ...m, content: editedContent } : m
      );

      // Remove all subsequent messages
      const subsequentMessages = messages.slice(messageIndex + 1);
      setMessages(contextMessages);

      // Regenerate AI response if there were subsequent messages
      if (subsequentMessages.length > 0) {
        setIsLoading(true);
        
        // Build conversation history
        const conversationHistory = contextMessages.map(m => ({
          role: m.role,
          content: m.content
        }));

        const result = await handleAIChatMessage(
          editedContent,
          appUser.companyId,
          appUser.uid,
          conversationHistory
        );

        const aiMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.content,
          timestamp: new Date(),
          type: result.type,
          metadata: result.metadata,
          creditsConsumed: result.creditsConsumed,
          nextSteps: result.nextSteps
        };

        setMessages(prev => [...prev, aiMessage]);

        await addMessage(currentSessionId, appUser.companyId, appUser.uid, {
          role: 'assistant',
          content: aiMessage.content,
          type: aiMessage.type,
          metadata: aiMessage.metadata,
          creditsConsumed: aiMessage.creditsConsumed,
          nextSteps: aiMessage.nextSteps
        });

        setIsLoading(false);
      }

      handleCancelEdit();

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update message',
        variant: 'destructive'
      });
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleRegenerateResponse = async (message: Message, messageIndex: number) => {
    if (!appUser?.companyId || !appUser?.uid || !currentSessionId) return;
    
    // Find the previous user message to regenerate from
    const previousMessages = messages.slice(0, messageIndex);
    const previousUserMessage = [...previousMessages].reverse().find(m => m.role === 'user');
    
    if (!previousUserMessage) {
      toast({
        title: 'Error',
        description: 'Cannot find the user message to regenerate from',
        variant: 'destructive'
      });
      return;
    }

    try {
      setRegeneratingMessageId(message.id);

      // Build conversation history
      const conversationHistory = previousMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const result = await handleAIChatMessage(
        previousUserMessage.content,
        appUser.companyId,
        appUser.uid,
        conversationHistory
      );

      // Initialize versions array if it doesn't exist
      const currentVersions = message.versions || [];
      
      // Add current content as a version if it's the first regeneration
      if (currentVersions.length === 0) {
        currentVersions.push({
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata,
          nextSteps: message.nextSteps
        });
      }

      // Add new version
      currentVersions.push({
        content: result.content,
        timestamp: new Date(),
        metadata: result.metadata,
        nextSteps: result.nextSteps
      });

      // Update message with new version
      const updatedMessage = {
        ...message,
        content: result.content,
        metadata: result.metadata,
        nextSteps: result.nextSteps,
        versions: currentVersions,
        currentVersionIndex: currentVersions.length - 1
      };

      setMessages(prev => prev.map(msg => 
        msg.id === message.id ? updatedMessage : msg
      ));

      // Update in Firestore
      await updateMessage(
        message.id,
        currentSessionId,
        appUser.companyId,
        appUser.uid,
        {
          content: result.content,
          metadata: {
            ...result.metadata,
            versions: currentVersions,
            currentVersionIndex: currentVersions.length - 1
          },
          nextSteps: result.nextSteps
        }
      );

      toast({
        title: '✨ Response Regenerated',
        description: 'Use the arrows to cycle between versions',
        duration: 4000
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate response',
        variant: 'destructive'
      });
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  const handleCycleVersion = async (message: Message, direction: 'prev' | 'next') => {
    if (!message.versions || message.versions.length === 0 || !currentSessionId || !appUser) return;

    const currentIndex = message.currentVersionIndex ?? message.versions.length - 1;
    let newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    // Wrap around
    if (newIndex < 0) newIndex = message.versions.length - 1;
    if (newIndex >= message.versions.length) newIndex = 0;

    const selectedVersion = message.versions[newIndex];

    const updatedMessage = {
      ...message,
      content: selectedVersion.content,
      metadata: selectedVersion.metadata,
      nextSteps: selectedVersion.nextSteps,
      currentVersionIndex: newIndex
    };

    setMessages(prev => prev.map(msg => 
      msg.id === message.id ? updatedMessage : msg
    ));

    try {
      await updateMessage(
        message.id,
        currentSessionId,
        appUser.companyId,
        appUser.uid,
        {
          content: selectedVersion.content,
          metadata: {
            ...selectedVersion.metadata,
            versions: message.versions,
            currentVersionIndex: newIndex
          },
          nextSteps: selectedVersion.nextSteps
        }
      );
    } catch (error: any) {
      console.error('Failed to update version in Firestore:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Guided Flows */}
      {showGuidedFlow && guidedFlowType === 'trending' && (
        <div className="flex-1 overflow-y-auto">
          <GuidedTrendingTopics
            onContentGenerated={handleContentGenerated}
            onBack={() => {
              setShowGuidedFlow(false);
              setGuidedFlowType(null);
            }}
          />
        </div>
      )}

      {showGuidedFlow && guidedFlowType === 'review' && (
        <div className="flex-1 overflow-y-auto">
          <GuidedReviewResponder
            onResponseGenerated={handleReviewResponseGenerated}
            onBack={() => {
              setShowGuidedFlow(false);
              setGuidedFlowType(null);
            }}
          />
        </div>
      )}

      {/* Messages Area */}
      {!showGuidedFlow && (
        <>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-lg text-muted-foreground mb-4">
                👋 Hi! I'm your AI assistant.
              </p>
              <div className="max-w-md mx-auto text-sm text-muted-foreground space-y-2">
                <p>Just tell me what you need in plain English:</p>
                <div className="text-left space-y-1 mt-4">
                  <p>• "Create an Instagram post about my new product"</p>
                  <p>• "Write an email to thank my customers"</p>
                  <p>• "Generate ad copy for my coaching program"</p>
                  <p>• "Make a blog post about coffee brewing tips"</p>
                </div>
              </div>
            </div>
          )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-4',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AI
                </AvatarFallback>
              </Avatar>
            )}

            <div className={cn(
              'flex flex-col gap-2 max-w-[80%]',
              message.role === 'user' && 'items-end'
            )}>
              <Card
                className={cn(
                  'p-4',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-muted'
                )}
              >
                {/* Display image if type is image and imageUrl exists */}
                {message.type === 'image' && message.metadata?.imageUrl ? (
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.metadata.imageUrl.startsWith('data:') ? (
                      <div className="relative w-full aspect-square max-w-md rounded-lg overflow-hidden border-2 border-border bg-muted">
                        <Image
                          src={message.metadata.imageUrl}
                          alt={message.metadata.prompt || 'Generated image'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          Image generated but preview unavailable. The image has been saved.
                        </p>
                      </div>
                    )}
                  </div>
                ) : message.type === 'error' ? (
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="whitespace-pre-wrap text-sm text-destructive">{message.content}</p>
                  </div>
                ) : message.metadata?.htmlContent ? (
                  /* Display HTML content (blog posts, sales pages) with Preview/Code tabs */
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-sm font-medium">{message.content}</p>
                    <Tabs defaultValue="preview" className="w-full mt-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview" className="gap-2">
                          <Eye className="h-4 w-4" />
                          <span>Preview</span>
                        </TabsTrigger>
                        <TabsTrigger value="code" className="gap-2">
                          <Code className="h-4 w-4" />
                          <span>HTML Code</span>
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="preview" className="mt-2">
                        <div className="space-y-2">
                          <div className="border-2 rounded-lg overflow-hidden bg-white shadow-sm">
                            <iframe
                              srcDoc={message.metadata.htmlContent}
                              className="w-full h-[600px] border-0"
                              title="Content Preview"
                              sandbox="allow-same-origin"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => handlePreviewInNewTab(message.metadata.htmlContent)}
                              variant="outline"
                              size="sm"
                            >
                              <Eye className="mr-2 h-3 w-3" />
                              Open in New Tab
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleCopy(message.metadata.htmlContent)} 
                              className="flex-1"
                            >
                              <Copy className="mr-2 h-3 w-3" /> Copy HTML
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="code">
                        <ScrollArea className="h-[400px] mt-1 border rounded-md bg-muted p-4">
                          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{message.metadata.htmlContent}</pre>
                        </ScrollArea>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCopy(message.metadata.htmlContent)} 
                          className="mt-2 w-full"
                        >
                          <Copy className="mr-2 h-3 w-3" /> Copy HTML Code
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : editingMessageId === message.id && message.role === 'user' ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[100px] text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(message)}
                        disabled={!editedContent.trim() || isSavingMessage}
                      >
                        {isSavingMessage ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    {message.isEdited && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Edited</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Workflow Actions for Blog Posts and Sales Pages */}
              {message.role === 'assistant' && message.metadata?.htmlContent && (
                message.metadata.platform === 'BlogPost' || message.metadata.platform === 'SalesLandingPage'
              ) && (
                <div className="mt-3">
                  <ContentWorkflowActions
                    onCreateImage={() => handleCreateImage(message)}
                    onSave={() => handleSaveClick(message)}
                    hasImage={imageGeneratedFor.has(message.id) || !!message.metadata?.imageUrl}
                    isSaved={savedMessageIds.has(message.id)}
                    isGeneratingImage={isGeneratingImage}
                    contentType={message.metadata.platform === 'BlogPost' ? 'blog' : 'sales_page'}
                  />
                </div>
              )}

              {/* Credits consumed indicator */}
              {message.creditsConsumed && message.creditsConsumed > 0 && message.role === 'assistant' && (
                <div className="flex items-center gap-1 px-2 text-xs text-muted-foreground">
                  <Coins className="h-3 w-3" />
                  <span>{message.creditsConsumed} credits used</span>
                </div>
              )}

              {/* Next step suggestions */}
              {message.nextSteps && message.nextSteps.length > 0 && message.role === 'assistant' && (
                <div className="flex flex-col gap-2 px-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground">Next steps:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.nextSteps.map((step, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(step.prompt)}
                        className="text-xs h-7"
                      >
                        <span className="mr-1">{step.icon}</span>
                        {step.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-muted-foreground">
                  {format(message.timestamp, 'h:mm a')}
                </span>

                {message.role === 'assistant' ? (
                  <>
                    {/* Version cycling arrows */}
                    {message.versions && message.versions.length > 1 && (
                      <div className="flex items-center gap-1 mr-1 border-r pr-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCycleVersion(message, 'prev')}
                          title="Previous version"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {(message.currentVersionIndex ?? message.versions.length - 1) + 1}/{message.versions.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCycleVersion(message, 'next')}
                          title="Next version"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Save to Content Hub"
                      onClick={() => handleSaveClick(message)}
                      disabled={isGeneratingImage}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Good response"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Regenerate"
                      onClick={() => handleRegenerateResponse(message, messages.findIndex(m => m.id === message.id))}
                      disabled={regeneratingMessageId === message.id}
                    >
                      {regeneratingMessageId === message.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </>
                ) : (
                  /* User message actions */
                  editingMessageId !== message.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleEditMessage(message)}
                      title="Edit message"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )
                )}
              </div>
            </div>

            {message.role === 'user' && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>
                  {appUser?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

          {isLoading && (
            <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Creating your content...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-background p-6">
          <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything, create anything..."
                className="min-h-[80px] resize-none text-base"
                disabled={isLoading}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="lg"
              className="h-[80px] px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Quick Suggestions */}
          {selectedAgent && selectedAgent.quickActions.length > 0 && messages.length <= 1 ? (
            <div className="mt-4">
              <p className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {selectedAgent.quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                    className="justify-start text-left h-auto py-2"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : !selectedAgent ? (
            <div className="flex gap-2 mt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Create a social media post about ')}
                disabled={isLoading}
              >
                📱 Social Post
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Write an email campaign about ')}
                disabled={isLoading}
              >
                ✉️ Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Generate ad copy for ')}
                disabled={isLoading}
              >
                📢 Ad Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Write a blog post about ')}
                disabled={isLoading}
              >
                ✍️ Blog
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('Generate an image of ')}
                disabled={isLoading}
              >
                🎨 Image
              </Button>
            </div>
          ) : null}
          </div>
        </div>
        </>
      )}

      {/* Image Generation Dialog */}
      <AlertDialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Featured Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This blog post/sales page can have a featured image. Would you like to generate one now using AI before saving? This will consume additional credits but will give you a complete package.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSaveWithoutImage}>
              Skip & Save
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateAndSave} disabled={isGeneratingImage}>
              {isGeneratingImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Generate & Save
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
