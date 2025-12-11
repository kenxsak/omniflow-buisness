"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MessageSquarePlus, 
  Search, 
  Trash2, 
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { listChatSessions, deleteChatSession } from '@/lib/chat-session-service';
import type { ChatSession } from '@/types/chat';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
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
import { getAgentById } from '@/config/ai-agents';

interface ConversationHistorySidebarProps {
  currentSessionId?: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export default function ConversationHistorySidebar({
  currentSessionId,
  onSelectSession,
  onNewChat
}: ConversationHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const { appUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, [appUser]);

  const loadSessions = async () => {
    if (!appUser?.companyId || !appUser?.uid) return;

    setIsLoading(true);
    try {
      const chatSessions = await listChatSessions(
        appUser.companyId,
        appUser.uid,
        20
      );
      setSessions(chatSessions);
    } catch (error: any) {
      toast({
        title: 'Error loading conversations',
        description: error.message || 'Failed to load conversation history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete || !appUser?.companyId || !appUser?.uid) return;

    try {
      await deleteChatSession(sessionToDelete, appUser.companyId, appUser.uid);
      
      setSessions(prev => prev.filter(s => s.id !== sessionToDelete));
      
      if (currentSessionId === sessionToDelete) {
        onNewChat();
      }
      
      toast({
        title: 'Conversation deleted',
        description: 'The conversation has been permanently deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting conversation',
        description: error.message || 'Failed to delete conversation',
        variant: 'destructive'
      });
    } finally {
      setSessionToDelete(null);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const titleMatch = session.title?.toLowerCase().includes(query);
    const summaryMatch = session.lastMessageSummary?.toLowerCase().includes(query);
    
    return titleMatch || summaryMatch;
  });

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Timestamp 
      ? timestamp.toDate() 
      : new Date(timestamp);
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'h:mm a');
    } else if (diffInHours < 168) {
      return format(date, 'EEE h:mm a');
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="p-4 border-b space-y-3">
        <Button 
          onClick={onNewChat} 
          className="w-full"
          size="lg"
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search' : 'Start a new chat to begin'}
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const agent = session.agentId ? getAgentById(session.agentId) : null;
              const isActive = session.id === currentSessionId;
              
              return (
                <Card
                  key={session.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:bg-accent group relative",
                    isActive && "bg-accent border-primary"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <div className="flex items-start gap-2">
                    {agent && (
                      <div className={`w-8 h-8 rounded-lg ${agent.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <agent.icon className={`h-4 w-4 ${agent.color}`} />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium truncate">
                          {session.title || 'Untitled Conversation'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSessionToDelete(session.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {session.lastMessageSummary && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {session.lastMessageSummary}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(session.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
