import { NextRequest, NextResponse } from 'next/server';
import { getCompanyCampaignJobs } from '@/lib/campaign-queue';
import { adminDb } from '@/lib/firebase-admin';
import type { CampaignJob, CampaignJobProgress } from '@/types/campaign-jobs';

// Convert sent campaigns from Firebase to CampaignJob format for unified display
async function getSentCampaignsAsJobs(companyId: string): Promise<CampaignJob[]> {
  if (!adminDb) return [];

  try {
    const snapshot = await adminDb.collection('campaigns')
      .where('companyId', '==', companyId)
      .get();

    const campaigns: CampaignJob[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Only include sent campaigns (via Brevo or Sender.net)
      if (data.status && (
        data.status.includes('Sent via') || 
        data.status.includes('Sending via') ||
        data.status.includes('Failed via')
      )) {
        const recipientCount = data.recipientCount || 0;
        const progress: CampaignJobProgress = {
          total: recipientCount,
          sent: data.status.includes('Sent via') ? recipientCount : 0,
          failed: data.status.includes('Failed') ? recipientCount : 0,
          currentBatch: 1,
          totalBatches: 1,
        };

        // Determine status
        let status: CampaignJob['status'] = 'completed';
        if (data.status.includes('Sending')) {
          status = 'processing';
        } else if (data.status.includes('Failed')) {
          status = 'failed';
        }

        // Determine provider
        let provider: 'brevo' | 'sender' | 'smtp' = 'brevo';
        if (data.status.includes('Sender.net') || data.provider === 'sender') {
          provider = 'sender';
        } else if (data.provider === 'smtp') {
          provider = 'smtp';
        }

        // Get the timestamp
        let createdAt = new Date().toISOString();
        if (data.createdAt) {
          if (data.createdAt.toDate) {
            createdAt = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            createdAt = data.createdAt;
          }
        }

        let sentDate = createdAt;
        if (data.sentDate) {
          if (data.sentDate.toDate) {
            sentDate = data.sentDate.toDate().toISOString();
          } else if (typeof data.sentDate === 'string') {
            sentDate = data.sentDate;
          }
        }

        campaigns.push({
          id: `campaign-${doc.id}`,
          companyId: data.companyId,
          createdBy: '',
          jobType: 'email',
          status,
          campaignName: data.name || data.subject || 'Email Campaign',
          emailData: {
            subject: data.subject || '',
            htmlContent: data.content || '',
            senderName: data.senderName || '',
            senderEmail: data.senderEmail || '',
            provider,
          },
          recipients: [],
          progress,
          retry: { attempts: 0, maxAttempts: 3, backoffMs: 300000 },
          createdAt: sentDate || createdAt,
          updatedAt: sentDate || createdAt,
          completedAt: status === 'completed' ? sentDate : undefined,
        });
      }
    });

    return campaigns;
  } catch (error) {
    console.error('Error fetching sent campaigns:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json(
      { success: false, error: 'Company ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch both cron job campaigns and instant-sent campaigns
    const [cronJobs, sentCampaigns] = await Promise.all([
      getCompanyCampaignJobs(companyId),
      getSentCampaignsAsJobs(companyId),
    ]);

    // Combine both types of jobs
    const allJobs = [...cronJobs, ...sentCampaigns];
    
    // Sort by creation date, newest first
    const sortedJobs = allJobs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      jobs: sortedJobs,
    });
  } catch (error: any) {
    console.error('Error fetching campaign jobs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaign jobs' },
      { status: 500 }
    );
  }
}
