/**
 * Migration Script: Dual Credit System
 * Migrates existing companies from old credit system to new dual system
 * 
 * Run this ONCE to initialize aiCreditBalance for all companies
 * 
 * Free users: 20 lifetime credits (one-time)
 * Paid users: Monthly credits based on plan
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function getCurrentMonth(): Promise<string> {
  return new Date().toISOString().slice(0, 7);
}

async function migrateCompanyCreditBalance(companyId: string, companyData: any) {
  const planRef = db.collection('plans').doc(companyData.planId);
  const planDoc = await planRef.get();
  
  if (!planDoc.exists) {
    console.log(`⚠️  Plan not found for company ${companyId}, skipping...`);
    return;
  }
  
  const plan = planDoc.data();
  if (!plan) return;
  
  const currentMonth = await getCurrentMonth();
  
  // Check if already migrated
  if (companyData.aiCreditBalance) {
    console.log(`✅ Company ${companyId} already migrated`);
    return;
  }
  
  // Determine credit allocation based on plan (NO FALLBACK)
  const lifetimeAllocated = plan.aiLifetimeCredits || 0;
  const monthlyAllocated = plan.aiMonthlyCredits || 0; // Only use explicit monthly credits
  
  // Get existing usage (if any)
  let lifetimeUsed = 0;
  let monthlyUsed = 0;
  
  // Check old quota system for existing usage
  const quotaRef = db.collection('aiQuotas').doc(`${companyId}_${currentMonth}`);
  const quotaDoc = await quotaRef.get();
  
  if (quotaDoc.exists) {
    const quotaData = quotaDoc.data();
    const creditsUsed = quotaData?.creditsUsed || 0;
    
    // Assign to appropriate bucket
    if (lifetimeAllocated > 0) {
      lifetimeUsed = Math.min(creditsUsed, lifetimeAllocated);
    } else {
      monthlyUsed = creditsUsed;
    }
  }
  
  // Create new credit balance
  const creditBalance = {
    lifetimeAllocated,
    lifetimeUsed,
    monthlyAllocated,
    monthlyUsed,
    currentMonth,
    lastResetAt: new Date().toISOString(),
  };
  
  // Update company document
  await db.collection('companies').doc(companyId).update({
    aiCreditBalance: creditBalance,
  });
  
  console.log(`✅ Migrated company ${companyId}:`, {
    plan: plan.name || companyData.planId,
    lifetime: `${lifetimeUsed}/${lifetimeAllocated}`,
    monthly: `${monthlyUsed}/${monthlyAllocated}`,
  });
}

async function runMigration() {
  console.log('🚀 Starting dual credit system migration...\n');
  
  try {
    const companiesSnapshot = await db.collection('companies').get();
    
    console.log(`📊 Found ${companiesSnapshot.size} companies to migrate\n`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of companiesSnapshot.docs) {
      try {
        const companyData = doc.data();
        
        if (companyData.aiCreditBalance) {
          skippedCount++;
          continue;
        }
        
        await migrateCompanyCreditBalance(doc.id, companyData);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Error migrating company ${doc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✨ Migration complete!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { runMigration, migrateCompanyCreditBalance };
