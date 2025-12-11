'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Award, Star, Trophy, Target, Zap, Users, Mail, MessageSquare,
  CheckCircle2, Lock, Sparkles
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import confetti from 'canvas-confetti';

export interface TutorialBadge {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requirement: string;
}

export const TUTORIAL_BADGES: TutorialBadge[] = [
  {
    id: 'first_contact',
    title: 'First Contact',
    description: 'Added your first contact',
    icon: Users,
    color: 'bg-blue-500',
    requirement: 'Add at least 1 contact',
  },
  {
    id: 'contact_master',
    title: 'Contact Master',
    description: 'Built a solid contact base',
    icon: Star,
    color: 'bg-purple-500',
    requirement: 'Add 25+ contacts',
  },
  {
    id: 'deal_maker',
    title: 'Deal Maker',
    description: 'Created your first deal',
    icon: Target,
    color: 'bg-green-500',
    requirement: 'Create at least 1 deal',
  },
  {
    id: 'closer',
    title: 'Closer',
    description: 'Won your first deal',
    icon: Trophy,
    color: 'bg-amber-500',
    requirement: 'Win at least 1 deal',
  },
  {
    id: 'campaign_launcher',
    title: 'Campaign Launcher',
    description: 'Sent your first campaign',
    icon: Mail,
    color: 'bg-pink-500',
    requirement: 'Send 1 email campaign',
  },
  {
    id: 'multi_channel',
    title: 'Multi-Channel Pro',
    description: 'Used multiple channels',
    icon: MessageSquare,
    color: 'bg-cyan-500',
    requirement: 'Use email, SMS, or WhatsApp',
  },
  {
    id: 'ai_explorer',
    title: 'AI Explorer',
    description: 'Tried AI content generation',
    icon: Sparkles,
    color: 'bg-indigo-500',
    requirement: 'Use AI tools once',
  },
  {
    id: 'power_user',
    title: 'Power User',
    description: 'Mastered the platform',
    icon: Zap,
    color: 'bg-orange-500',
    requirement: 'Complete all tutorials',
  },
];

const BADGES_STORAGE_KEY = 'omniflow_earned_badges';

function getEarnedBadges(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(BADGES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveEarnedBadges(badges: Record<string, string[]>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(badges));
  } catch {
    console.error('Failed to save earned badges');
  }
}

interface TutorialBadgesProps {
  earnedBadgeIds?: string[];
  onBadgeEarned?: (badge: TutorialBadge) => void;
  showLocked?: boolean;
  compact?: boolean;
}

export function TutorialBadges({ 
  earnedBadgeIds: externalEarnedIds,
  onBadgeEarned, 
  showLocked = true,
  compact = false,
}: TutorialBadgesProps) {
  const { appUser } = useAuth();
  const [earnedIds, setEarnedIds] = useState<string[]>([]);

  useEffect(() => {
    if (externalEarnedIds) {
      setEarnedIds(externalEarnedIds);
    } else {
      const badges = getEarnedBadges();
      setEarnedIds(badges[appUser?.companyId || 'global'] || []);
    }
  }, [appUser?.companyId, externalEarnedIds]);

  const earnBadge = (badgeId: string) => {
    if (earnedIds.includes(badgeId)) return;
    
    const badge = TUTORIAL_BADGES.find(b => b.id === badgeId);
    if (!badge) return;

    const newEarnedIds = [...earnedIds, badgeId];
    setEarnedIds(newEarnedIds);

    if (!externalEarnedIds) {
      const badges = getEarnedBadges();
      badges[appUser?.companyId || 'global'] = newEarnedIds;
      saveEarnedBadges(badges);
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
    });

    if (onBadgeEarned) {
      onBadgeEarned(badge);
    }
  };

  const displayBadges = showLocked 
    ? TUTORIAL_BADGES 
    : TUTORIAL_BADGES.filter(b => earnedIds.includes(b.id));

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {displayBadges.map((badge) => {
            const Icon = badge.icon;
            const isEarned = earnedIds.includes(badge.id);
            
            return (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-2 rounded-full transition-all ${
                      isEarned 
                        ? `${badge.color} text-white shadow-lg` 
                        : 'bg-muted text-muted-foreground opacity-40'
                    }`}
                  >
                    {isEarned ? (
                      <Icon className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <p className="font-medium">{badge.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {isEarned ? badge.description : badge.requirement}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {displayBadges.map((badge) => {
        const Icon = badge.icon;
        const isEarned = earnedIds.includes(badge.id);
        
        return (
          <div
            key={badge.id}
            className={`relative p-4 rounded-xl border text-center transition-all ${
              isEarned 
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800/50' 
                : 'bg-muted/30 border-muted opacity-60'
            }`}
          >
            {isEarned && (
              <div className="absolute -top-1 -right-1">
                <CheckCircle2 className="h-5 w-5 text-green-500 fill-white" />
              </div>
            )}
            <div
              className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                isEarned ? badge.color : 'bg-muted'
              }`}
            >
              {isEarned ? (
                <Icon className="h-6 w-6 text-white" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <h4 className={`text-sm font-medium ${isEarned ? '' : 'text-muted-foreground'}`}>
              {badge.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isEarned ? badge.description : badge.requirement}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function useTutorialBadges() {
  const { appUser } = useAuth();
  const [earnedIds, setEarnedIds] = useState<string[]>([]);

  useEffect(() => {
    const badges = getEarnedBadges();
    setEarnedIds(badges[appUser?.companyId || 'global'] || []);
  }, [appUser?.companyId]);

  const checkAndAwardBadge = (badgeId: string): boolean => {
    if (earnedIds.includes(badgeId)) return false;
    
    const newEarnedIds = [...earnedIds, badgeId];
    setEarnedIds(newEarnedIds);

    const badges = getEarnedBadges();
    badges[appUser?.companyId || 'global'] = newEarnedIds;
    saveEarnedBadges(badges);

    return true;
  };

  const hasBadge = (badgeId: string): boolean => {
    return earnedIds.includes(badgeId);
  };

  return {
    earnedIds,
    checkAndAwardBadge,
    hasBadge,
    earnedCount: earnedIds.length,
    totalBadges: TUTORIAL_BADGES.length,
  };
}
