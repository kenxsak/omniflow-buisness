import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/firebase-server';

export async function GET() {
  const timestamp = new Date().toISOString();
  const nodeEnv = process.env.NODE_ENV || 'development';

  const healthStatus = {
    status: 'healthy',
    timestamp,
    environment: nodeEnv,
    services: {
      firebase: false,
    },
    optional: {
      encryption: false,
      cron: false,
    },
    uptime: process.uptime(),
  };

  try {
    if (serverDb) {
      const { collection, getDocs, limit, query } = await import('firebase/firestore');
      const testQuery = query(collection(serverDb, 'companies'), limit(1));
      await getDocs(testQuery);
      healthStatus.services.firebase = true;
    }
  } catch (error) {
    console.warn('Firebase health check failed:', error);
    healthStatus.services.firebase = false;
  }

  if (process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_ENCRYPTION_KEY) {
    healthStatus.optional.encryption = true;
  }

  if (process.env.CRON_SECRET) {
    healthStatus.optional.cron = true;
  }

  const criticalServicesHealthy = healthStatus.services.firebase;

  if (!criticalServicesHealthy) {
    healthStatus.status = 'unhealthy';
  }

  const statusCode = criticalServicesHealthy ? 200 : 503;

  return NextResponse.json(healthStatus, { status: statusCode });
}
