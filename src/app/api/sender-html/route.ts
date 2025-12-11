'use server';

import { NextRequest, NextResponse } from 'next/server';

const htmlContentStore = new Map<string, { content: string; createdAt: number }>();

const CONTENT_EXPIRY_MS = 5 * 60 * 1000;

function cleanupExpiredContent() {
  const now = Date.now();
  for (const [id, data] of htmlContentStore.entries()) {
    if (now - data.createdAt > CONTENT_EXPIRY_MS) {
      htmlContentStore.delete(id);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { htmlContent, contentId } = await request.json();
    
    if (!htmlContent || !contentId) {
      return NextResponse.json(
        { error: 'htmlContent and contentId are required' },
        { status: 400 }
      );
    }
    
    cleanupExpiredContent();
    
    htmlContentStore.set(contentId, {
      content: htmlContent,
      createdAt: Date.now(),
    });
    
    console.log(`[Sender HTML Store] Stored content with ID: ${contentId}, length: ${htmlContent.length}`);
    
    return NextResponse.json({ success: true, contentId });
  } catch (error: any) {
    console.error('[Sender HTML Store] Error storing content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store content' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('id');
    
    if (!contentId) {
      return new NextResponse('Content ID is required', { status: 400 });
    }
    
    const data = htmlContentStore.get(contentId);
    
    if (!data) {
      console.log(`[Sender HTML Store] Content not found for ID: ${contentId}`);
      return new NextResponse('Content not found or expired', { status: 404 });
    }
    
    console.log(`[Sender HTML Store] Serving content for ID: ${contentId}, length: ${data.content.length}`);
    
    return new NextResponse(data.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Sender HTML Store] Error serving content:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
