"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock, Unlock, Clock, AlertTriangle } from 'lucide-react';
import { 
  claimLeadAction, 
  releaseLeadAction, 
  extendLeadClaimAction,
  getLeadClaimStatusAction 
} from '@/app/actions/enterprise-actions';
import { useToast } from '@/hooks/use-toast';
import { CLAIM_DURATION_MINUTES } from '@/types/enterprise';

interface LeadClaimIndicatorProps {
  leadId: string;
  currentUserId: string;
  onClaimChange?: (isClaimed: boolean) => void;
  compact?: boolean;
}

export function LeadClaimIndicator({ 
  leadId, 
  currentUserId, 
  onClaimChange,
  compact = false 
}: LeadClaimIndicatorProps) {
  const [claimStatus, setClaimStatus] = useState<{
    claimedBy: string | null;
    claimedByName?: string;
    claimExpiry: string | null;
    isLocked: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const { toast } = useToast();

  const fetchClaimStatus = useCallback(async () => {
    const status = await getLeadClaimStatusAction(leadId);
    setClaimStatus(status);
    onClaimChange?.(status?.isLocked || false);
  }, [leadId, onClaimChange]);

  useEffect(() => {
    fetchClaimStatus();
    const interval = setInterval(fetchClaimStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchClaimStatus]);

  useEffect(() => {
    if (!claimStatus?.claimExpiry) {
      setTimeRemaining('');
      return;
    }

    const updateTimeRemaining = () => {
      const expiry = new Date(claimStatus.claimExpiry!);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        fetchClaimStatus();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [claimStatus?.claimExpiry, fetchClaimStatus]);

  const handleClaim = async () => {
    setIsLoading(true);
    const result = await claimLeadAction(leadId);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Lead Claimed',
        description: `You have claimed this lead for ${CLAIM_DURATION_MINUTES} minutes`,
      });
      fetchClaimStatus();
    } else {
      toast({
        title: 'Cannot Claim Lead',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleRelease = async () => {
    setIsLoading(true);
    const result = await releaseLeadAction(leadId);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Lead Released',
        description: 'Other team members can now edit this lead',
      });
      fetchClaimStatus();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const handleExtend = async () => {
    setIsLoading(true);
    const result = await extendLeadClaimAction(leadId);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Claim Extended',
        description: result.message,
      });
      fetchClaimStatus();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const isClaimedByMe = claimStatus?.claimedBy === currentUserId;
  const isClaimedByOther = claimStatus?.isLocked && !isClaimedByMe;

  if (compact) {
    if (isClaimedByOther) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Being edited by {claimStatus?.claimedByName || 'another user'}</p>
              <p className="text-xs text-muted-foreground">Expires in {timeRemaining}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (isClaimedByMe) {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
          <Lock className="h-3 w-3" />
          {timeRemaining}
        </Badge>
      );
    }

    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isClaimedByOther ? (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">
            <Lock className="h-3 w-3" />
            Locked by {claimStatus?.claimedByName || 'another user'}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </span>
        </div>
      ) : isClaimedByMe ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
            <Lock className="h-3 w-3" />
            You have this lead claimed
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExtend}
            disabled={isLoading}
          >
            Extend
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRelease}
            disabled={isLoading}
          >
            <Unlock className="h-4 w-4 mr-1" />
            Release
          </Button>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClaim}
          disabled={isLoading}
        >
          <Lock className="h-4 w-4 mr-1" />
          Claim to Edit
        </Button>
      )}
    </div>
  );
}
