import { Timestamp } from 'firebase/firestore';

export interface NextStepSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  type?: 'text' | 'image' | 'error';
  metadata?: any;
  creditsConsumed?: number;
  parentMessageId?: string;
  revision?: number;
  status?: 'active' | 'superseded';
  nextSteps?: NextStepSuggestion[];
}

export interface ChatSession {
  id: string;
  companyId: string;
  userId: string;
  agentId?: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageSummary?: string;
  draftInput?: string;
}

export interface CreateChatSessionData {
  companyId: string;
  userId: string;
  agentId?: string;
  title?: string;
}

export interface UpdateChatSessionData {
  title?: string;
  lastMessageSummary?: string;
  draftInput?: string;
  updatedAt?: Timestamp;
}

export interface AddMessageData {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'error';
  metadata?: any;
  creditsConsumed?: number;
  parentMessageId?: string;
  revision?: number;
  status?: 'active' | 'superseded';
  nextSteps?: NextStepSuggestion[];
}

export interface UpdateMessageData {
  content?: string;
  type?: 'text' | 'image' | 'error';
  metadata?: any;
  status?: 'active' | 'superseded';
  nextSteps?: NextStepSuggestion[];
}
