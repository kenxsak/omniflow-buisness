'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Deal, DealStatus } from '@/types/crm';

export interface WeekOverWeekStats {
  currentWeek: {
    newContacts: number;
    dealsCreated: number;
    dealsWon: number;
    revenueWon: number;
    pipelineValue: number;
  };
  previousWeek: {
    newContacts: number;
    dealsCreated: number;
    dealsWon: number;
    revenueWon: number;
    pipelineValue: number;
  };
  changes: {
    newContacts: number;
    dealsCreated: number;
    dealsWon: number;
    revenueWon: number;
    pipelineValue: number;
  };
}

export interface PipelineStageConversion {
  stage: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
  conversionFromPrevious: number;
}

export interface SalesTrendData {
  week: string;
  weekLabel: string;
  deals: number;
  revenue: number;
  wonDeals: number;
  lostDeals: number;
}

export interface TeamPerformer {
  userId: string;
  userName: string;
  dealsWon: number;
  revenueWon: number;
  conversionRate: number;
  avgDealSize: number;
}

function getWeekBoundaries(weeksAgo: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToSunday = dayOfWeek;
  
  const endOfCurrentWeek = new Date(now);
  endOfCurrentWeek.setDate(now.getDate() - diffToSunday + 6 - (weeksAgo * 7));
  endOfCurrentWeek.setHours(23, 59, 59, 999);
  
  const startOfWeek = new Date(endOfCurrentWeek);
  startOfWeek.setDate(endOfCurrentWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);
  
  return { start: startOfWeek, end: endOfCurrentWeek };
}

function getWeekNumber(date: Date): string {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - startOfYear.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNumber = Math.ceil((diff + startOfYear.getDay() * 24 * 60 * 60 * 1000) / oneWeek);
  return `W${weekNumber}`;
}

export async function getWeekOverWeekStats(companyId: string): Promise<WeekOverWeekStats | null> {
  if (!serverDb || !companyId) return null;

  try {
    const currentWeekBounds = getWeekBoundaries(0);
    const previousWeekBounds = getWeekBoundaries(1);

    const leadsRef = collection(serverDb, 'leads');
    const leadsQuery = query(leadsRef, where('companyId', '==', companyId));
    const leadsSnapshot = await getDocs(leadsQuery);
    const leads = leadsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      };
    });

    const dealsRef = collection(serverDb, 'deals');
    const dealsQuery = query(dealsRef, where('companyId', '==', companyId));
    const dealsSnapshot = await getDocs(dealsQuery);
    const deals = dealsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount || 0,
        status: data.status as DealStatus,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        actualCloseDate: data.actualCloseDate ? new Date(data.actualCloseDate) : null,
      };
    });

    const currentNewContacts = leads.filter(l => 
      l.createdAt >= currentWeekBounds.start && l.createdAt <= currentWeekBounds.end
    ).length;

    const previousNewContacts = leads.filter(l => 
      l.createdAt >= previousWeekBounds.start && l.createdAt <= previousWeekBounds.end
    ).length;

    const currentDealsCreated = deals.filter(d => 
      d.createdAt >= currentWeekBounds.start && d.createdAt <= currentWeekBounds.end
    ).length;

    const previousDealsCreated = deals.filter(d => 
      d.createdAt >= previousWeekBounds.start && d.createdAt <= previousWeekBounds.end
    ).length;

    const currentWonDeals = deals.filter(d => 
      d.status === 'won' && 
      d.actualCloseDate && 
      d.actualCloseDate >= currentWeekBounds.start && 
      d.actualCloseDate <= currentWeekBounds.end
    );

    const previousWonDeals = deals.filter(d => 
      d.status === 'won' && 
      d.actualCloseDate && 
      d.actualCloseDate >= previousWeekBounds.start && 
      d.actualCloseDate <= previousWeekBounds.end
    );

    const currentRevenueWon = currentWonDeals.reduce((sum, d) => sum + d.amount, 0);
    const previousRevenueWon = previousWonDeals.reduce((sum, d) => sum + d.amount, 0);

    const openDeals = deals.filter(d => !['won', 'lost'].includes(d.status));
    const currentPipelineValue = openDeals.reduce((sum, d) => sum + d.amount, 0);

    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      currentWeek: {
        newContacts: currentNewContacts,
        dealsCreated: currentDealsCreated,
        dealsWon: currentWonDeals.length,
        revenueWon: currentRevenueWon,
        pipelineValue: currentPipelineValue,
      },
      previousWeek: {
        newContacts: previousNewContacts,
        dealsCreated: previousDealsCreated,
        dealsWon: previousWonDeals.length,
        revenueWon: previousRevenueWon,
        pipelineValue: currentPipelineValue,
      },
      changes: {
        newContacts: calcChange(currentNewContacts, previousNewContacts),
        dealsCreated: calcChange(currentDealsCreated, previousDealsCreated),
        dealsWon: calcChange(currentWonDeals.length, previousWonDeals.length),
        revenueWon: calcChange(currentRevenueWon, previousRevenueWon),
        pipelineValue: 0,
      },
    };
  } catch (error) {
    console.error('Error fetching week-over-week stats:', error);
    return null;
  }
}

export async function getPipelineStageConversion(companyId: string): Promise<PipelineStageConversion[]> {
  if (!serverDb || !companyId) return [];

  try {
    const dealsRef = collection(serverDb, 'deals');
    const dealsQuery = query(dealsRef, where('companyId', '==', companyId));
    const dealsSnapshot = await getDocs(dealsQuery);
    const deals = dealsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Deal[];

    const stages: Array<{ stage: DealStatus; label: string }> = [
      { stage: 'proposal', label: 'Proposal' },
      { stage: 'negotiation', label: 'Negotiation' },
      { stage: 'closing', label: 'Closing' },
      { stage: 'won', label: 'Won' },
    ];

    const totalDeals = deals.length;
    let previousCount = totalDeals;

    return stages.map((stageInfo, index) => {
      const stageDeals = deals.filter(d => d.status === stageInfo.stage);
      const count = stageDeals.length;
      const value = stageDeals.reduce((sum, d) => sum + d.amount, 0);
      const percentage = totalDeals > 0 ? (count / totalDeals) * 100 : 0;
      
      const conversionFromPrevious = index === 0 
        ? 100 
        : previousCount > 0 
          ? (count / previousCount) * 100 
          : 0;

      previousCount = count || 1;

      return {
        stage: stageInfo.stage,
        label: stageInfo.label,
        count,
        value,
        percentage,
        conversionFromPrevious,
      };
    });
  } catch (error) {
    console.error('Error fetching pipeline stage conversion:', error);
    return [];
  }
}

export async function getSalesTrend(companyId: string, weeks: number = 8): Promise<SalesTrendData[]> {
  if (!serverDb || !companyId) return [];

  try {
    const dealsRef = collection(serverDb, 'deals');
    const dealsQuery = query(dealsRef, where('companyId', '==', companyId));
    const dealsSnapshot = await getDocs(dealsQuery);
    const deals = dealsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount || 0,
        status: data.status as DealStatus,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        actualCloseDate: data.actualCloseDate ? new Date(data.actualCloseDate) : null,
      };
    });

    const trendData: SalesTrendData[] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const bounds = getWeekBoundaries(i);
      const weekLabel = getWeekNumber(bounds.start);
      
      const weekDeals = deals.filter(d => 
        d.createdAt >= bounds.start && d.createdAt <= bounds.end
      );

      const wonDeals = deals.filter(d => 
        d.status === 'won' && 
        d.actualCloseDate && 
        d.actualCloseDate >= bounds.start && 
        d.actualCloseDate <= bounds.end
      );

      const lostDeals = deals.filter(d => 
        d.status === 'lost' && 
        d.createdAt >= bounds.start && d.createdAt <= bounds.end
      );

      const revenue = wonDeals.reduce((sum, d) => sum + d.amount, 0);

      trendData.push({
        week: bounds.start.toISOString().split('T')[0],
        weekLabel,
        deals: weekDeals.length,
        revenue,
        wonDeals: wonDeals.length,
        lostDeals: lostDeals.length,
      });
    }

    return trendData;
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    return [];
  }
}

export async function getTopPerformers(companyId: string, limit: number = 5): Promise<TeamPerformer[]> {
  if (!serverDb || !companyId) return [];

  try {
    const dealsRef = collection(serverDb, 'deals');
    const dealsQuery = query(dealsRef, where('companyId', '==', companyId));
    const dealsSnapshot = await getDocs(dealsQuery);
    const deals = dealsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Deal[];

    const performerMap = new Map<string, {
      userName: string;
      wonDeals: number;
      lostDeals: number;
      totalDeals: number;
      revenueWon: number;
    }>();

    for (const deal of deals) {
      const userId = deal.createdBy;
      const userName = deal.createdByName || 'Unknown';
      
      if (!performerMap.has(userId)) {
        performerMap.set(userId, {
          userName,
          wonDeals: 0,
          lostDeals: 0,
          totalDeals: 0,
          revenueWon: 0,
        });
      }

      const stats = performerMap.get(userId)!;
      stats.totalDeals++;

      if (deal.status === 'won') {
        stats.wonDeals++;
        stats.revenueWon += deal.amount;
      } else if (deal.status === 'lost') {
        stats.lostDeals++;
      }
    }

    const performers: TeamPerformer[] = Array.from(performerMap.entries()).map(([userId, stats]) => {
      const closedDeals = stats.wonDeals + stats.lostDeals;
      return {
        userId,
        userName: stats.userName,
        dealsWon: stats.wonDeals,
        revenueWon: stats.revenueWon,
        conversionRate: closedDeals > 0 ? (stats.wonDeals / closedDeals) * 100 : 0,
        avgDealSize: stats.wonDeals > 0 ? stats.revenueWon / stats.wonDeals : 0,
      };
    });

    return performers
      .sort((a, b) => b.revenueWon - a.revenueWon)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return [];
  }
}

export async function getDashboardAnalytics(companyId: string) {
  const [weekOverWeek, pipelineConversion, salesTrend, topPerformers] = await Promise.all([
    getWeekOverWeekStats(companyId),
    getPipelineStageConversion(companyId),
    getSalesTrend(companyId, 8),
    getTopPerformers(companyId, 5),
  ]);

  return {
    weekOverWeek,
    pipelineConversion,
    salesTrend,
    topPerformers,
  };
}
