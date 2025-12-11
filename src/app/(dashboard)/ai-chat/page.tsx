"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import ChatInterface from '@/components/ai-chat/chat-interface';
import AgentCard from '@/components/ai-chat/agent-card';
import ConversationHistorySidebar from '@/components/ai-chat/conversation-history-sidebar';
import { 
  getPrimaryAgents, 
  getSecondaryAgents, 
  getGeneralAgent,
  getAgentById,
  AIAgent 
} from '@/config/ai-agents';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ContextualHelpButton } from '@/components/help/contextual-help-button';

export default function AIChatPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const primaryAgents = getPrimaryAgents();
  const secondaryAgents = getSecondaryAgents();
  const generalAgent = getGeneralAgent();
  const selectedAgent = selectedAgentId ? getAgentById(selectedAgentId) : null;

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setSelectedAgentId(null);
    setIsSidebarOpen(false);
  };

  const handleSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  if (selectedAgent || currentSessionId) {
    const showGuidedTrendingTopics = selectedAgent?.id === 'seo-expert';
    const showGuidedReviewResponder = selectedAgent?.id === 'customer-service';
    
    return (
      <div className="h-[calc(100vh-80px)] flex">
        <div className="hidden md:block w-80 flex-shrink-0">
          <ConversationHistorySidebar
            currentSessionId={currentSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="border-b bg-background p-4">
            <div className="flex items-center gap-4">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <ConversationHistorySidebar
                    currentSessionId={currentSessionId}
                    onSelectSession={handleSelectSession}
                    onNewChat={handleNewChat}
                  />
                </SheetContent>
              </Sheet>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="hidden md:flex"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {selectedAgent && (
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${selectedAgent.bgColor} flex items-center justify-center`}>
                    <selectedAgent.icon className={`h-5 w-5 ${selectedAgent.color}`} />
                  </div>
                  <div>
                    <h2 className="font-semibold">{selectedAgent.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <ChatInterface 
            initialPrompt="" 
            selectedAgent={selectedAgent || undefined}
            showGuidedTrendingTopics={showGuidedTrendingTopics}
            showGuidedReviewResponder={showGuidedReviewResponder}
            sessionId={currentSessionId || undefined}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 text-center">
        <div className="flex justify-end mb-4">
          <ContextualHelpButton pageId="ai-chat" />
        </div>
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">New AI Agent Interface</span>
        </div>
        <h1 className="text-4xl font-bold mb-3">
          OmniFlow Super AI Agent
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          Ask anything, create anything - Choose your AI agent
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your AI Specialists</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {primaryAgents.map((agent) => (
            <AgentCard 
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Additional Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {secondaryAgents.map((agent) => (
            <AgentCard 
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      </div>

      {generalAgent && (
        <Card 
          className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
          onClick={() => setSelectedAgentId(generalAgent.id)}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${generalAgent.bgColor} flex items-center justify-center`}>
                <generalAgent.icon className={`h-5 w-5 ${generalAgent.color}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{generalAgent.name}</CardTitle>
                <CardDescription>{generalAgent.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              New Agent-Based Interface
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              We've organized AI features into specialized agents for easier discovery. Your classic tools are still available!
            </p>
            <div className="flex gap-3">
              <Link href="/social-media">
                <Button variant="outline" size="sm">
                  Classic Content Factory
                </Button>
              </Link>
              <Link href="/ai-campaign-manager">
                <Button variant="outline" size="sm">
                  Classic Ad Manager
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
