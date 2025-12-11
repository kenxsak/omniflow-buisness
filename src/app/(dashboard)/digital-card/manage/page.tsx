'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getFriendlyLoading } from '@/lib/friendly-messages';
import {
  getUserDigitalCards,
  deleteDigitalCard,
  updateCardStatus
} from '@/app/actions/digital-card-actions';
import { DigitalCard } from '@/lib/digital-card-types';
import {
  AlertCircle,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  QrCode,
  BarChart3,
  Copy,
  Share2,
  ArrowUpCircle,
  Sparkles
} from 'lucide-react';
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
import QRCodeGenerator from '@/components/digital-card/qr-code-generator';
import { getStoredPlans, getCompanyUsers } from '@/lib/saas-data';
import { Plan } from '@/types/saas';
import { 
  calculateDigitalCardLimit, 
  getDigitalCardLimitDescription,
  getDigitalCardUsagePercentage,
  getDigitalCardLimitStatus
} from '@/lib/plan-helpers';

export default function ManageDigitalCardsPage() {
  const router = useRouter();
  const { appUser, company, firebaseUser } = useAuth();

  const [cards, setCards] = useState<DigitalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    loadCards();
    loadPlanAndUsers();
  }, [appUser, company]);

  const loadPlanAndUsers = async () => {
    if (!company || !appUser) return;

    try {
      // Get all plans and find current plan
      const plans = await getStoredPlans();
      const currentPlan = plans.find(p => p.id === company.planId);
      setPlan(currentPlan || null);

      // Get user count
      const users = await getCompanyUsers(appUser.companyId);
      setUserCount(users.length);
    } catch (err) {
      console.error('Error loading plan and users:', err);
    }
  };

  const loadCards = async () => {
    if (!appUser || !company || !firebaseUser) {
      setLoading(false);
      return;
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      const result = await getUserDigitalCards({ 
        idToken, 
        companyId: company.id 
      });

      if (!result.success) {
        setError(result.error || 'Failed to load digital cards');
        setCards([]);
      } else {
        setCards(result.cards || []);
      }
    } catch (err) {
      console.error('Error loading cards:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCardId || !firebaseUser) return;

    setActionLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const result = await deleteDigitalCard({ idToken, cardId: deleteCardId });

      if (!result.success) {
        setError(result.error || 'Failed to delete card');
      } else {
        await loadCards();
      }
    } catch (err) {
      console.error('Error deleting card:', err);
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(false);
      setDeleteCardId(null);
    }
  };

  const toggleCardStatus = async (card: DigitalCard) => {
    if (!firebaseUser) return;

    setActionLoading(true);
    try {
      const newStatus = card.status === 'active' ? 'inactive' : 'active';
      const idToken = await firebaseUser.getIdToken();
      const result = await updateCardStatus({ idToken, cardId: card.id, status: newStatus });

      if (!result.success) {
        setError(result.error || 'Failed to update card status');
      } else {
        await loadCards();
      }
    } catch (err) {
      console.error('Error updating card status:', err);
      setError('An unexpected error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const copyCardUrl = (username: string) => {
    const url = `${window.location.origin}/card/${username}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(username);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const shareCard = async (username: string) => {
    const url = `${window.location.origin}/card/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out my Digital Card',
          url: url
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      copyCardUrl(username);
    }
  };

  if (!appUser || !company) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to manage your digital cards</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{getFriendlyLoading('data/loading')}</p>
        </div>
      </div>
    );
  }

  // Calculate card limits
  const maxCards = plan && userCount > 0 ? calculateDigitalCardLimit(plan, userCount) : 0;
  const currentCards = cards.length;
  const usagePercentage = getDigitalCardUsagePercentage(currentCards, maxCards);
  const limitStatus = getDigitalCardLimitStatus(currentCards, maxCards);
  const limitDescription = plan && userCount > 0 ? getDigitalCardLimitDescription(plan, userCount) : '';

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Digital Cards</h1>
          <p className="text-muted-foreground mt-2">
            Manage your digital business cards
          </p>
        </div>
        <Button onClick={() => router.push('/digital-card/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Card
        </Button>
      </div>

      {/* Card Limit Indicator */}
      {plan && userCount > 0 && (
        <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Digital Card Usage
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {limitDescription}
                </p>
                
                {/* Progress bar */}
                <div className="mb-2">
                  <Progress 
                    value={usagePercentage} 
                    className={`h-3 ${
                      limitStatus === 'limit_reached' 
                        ? 'bg-red-100' 
                        : limitStatus === 'warning' 
                          ? 'bg-yellow-100' 
                          : 'bg-blue-100'
                    }`}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <span className={`font-semibold ${
                      limitStatus === 'limit_reached' ? 'text-red-600' :
                      limitStatus === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`}>
                      {currentCards} of {maxCards}
                    </span> cards used
                    {plan.digitalCardsPerUser && plan.digitalCardsPerUser > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        • {userCount} team {userCount === 1 ? 'member' : 'members'} × {plan.digitalCardsPerUser} {plan.digitalCardsPerUser === 1 ? 'card' : 'cards'} each
                      </span>
                    )}
                  </span>
                  <span className={`font-medium ${
                    limitStatus === 'limit_reached' ? 'text-red-600' :
                    limitStatus === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {Math.round(usagePercentage)}%
                  </span>
                </div>
              </div>
              
              {limitStatus === 'limit_reached' && (
                <Button 
                  variant="default" 
                  size="sm"
                  className="ml-4"
                  onClick={() => router.push('/settings/subscription')}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              )}
            </div>
            
            {/* Pro tip when approaching limit */}
            {plan.id !== 'plan_enterprise' && limitStatus !== 'ok' && (
              <div className="mt-4 p-3 bg-white rounded-md border border-blue-200">
                <p className="text-sm text-gray-700">
                  💡 <strong>Pro tip:</strong>{' '}
                  {plan.id === 'plan_free' && 'Upgrade to Starter to add team members - each gets their own card!'}
                  {plan.id === 'plan_starter' && 'Upgrade to Pro - each team member gets 2 cards instead of 1!'}
                  {plan.id === 'plan_pro' && 'Upgrade to Enterprise for 3 cards per team member!'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">📇</div>
              <h3 className="text-xl font-semibold">No digital cards yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first digital card to share your business information with customers
              </p>
              <Button onClick={() => router.push('/digital-card/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Card
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg truncate">
                      {card.businessInfo.name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      @{card.username}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={card.status === 'active' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {card.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {card.businessInfo.tagline || card.businessInfo.description}
                </div>

                {card.analytics && (
                  <div className="grid grid-cols-3 gap-2 text-center p-3 bg-muted rounded-lg">
                    <div>
                      <div className="text-2xl font-bold">{card.analytics.views || 0}</div>
                      <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Object.values(card.analytics.linkClicks || {}).reduce((a, b) => a + b, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Clicks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {card.analytics.leadsGenerated || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/card/${card.username}`, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/digital-card/edit/${card.id}`)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCardUrl(card.username)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    {copiedUrl === card.username ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => shareCard(card.username)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <QRCodeGenerator
                    cardUrl={`${window.location.origin}/card/${card.username}`}
                    cardName={card.businessInfo.name}
                    variant="ghost"
                    size="sm"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCardStatus(card)}
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {card.status === 'active' ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteCardId(card.id)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteCardId} onOpenChange={(open) => !open && setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your digital card
              and all associated analytics data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
