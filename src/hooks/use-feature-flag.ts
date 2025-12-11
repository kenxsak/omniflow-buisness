
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { getCompany, getStoredPlans, getStoredFeatures } from '@/lib/saas-data';
import type { Company, Plan, Feature } from '@/types/saas';

// A simple in-memory cache to avoid repeated DB lookups for the same feature flag within a session.
const featureFlagsCache = new Map<string, boolean>();

export const useFeatureFlag = () => {
    const { appUser } = useAuth();
    const [dataVersion, setDataVersion] = useState(0);

    const refreshData = useCallback(() => {
        featureFlagsCache.clear();
        setDataVersion(v => v + 1);
    }, []);

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'omniFlowSaasPlans' || event.key === 'omniFlowSaasFeatures' || event.key === 'omniFlowSaasCompanies') {
                refreshData();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [refreshData]);

    const isFeatureEnabled = useCallback(async (featureId: string): Promise<boolean> => {
        // Super Admins have all features enabled by default.
        if (appUser?.role === 'superadmin') {
            return true;
        }

        if (!appUser?.companyId) {
            return false;
        }

        const cacheKey = `${appUser.companyId}-${featureId}-${dataVersion}`;
        if (featureFlagsCache.has(cacheKey)) {
            return featureFlagsCache.get(cacheKey) as boolean;
        }
        
        // Asynchronous check against Firestore data
        try {
            const userCompany = await getCompany(appUser.companyId);
            if (!userCompany) {
                return false;
            }

            const allPlans = await getStoredPlans();
            const companyPlan = allPlans.find(p => p.id === userCompany.planId);
            if (!companyPlan) {
                return false;
            }
            
            const allFeatures = await getStoredFeatures();
            const masterFeature = allFeatures.find(f => f.id === featureId);
            if (!masterFeature || !masterFeature.active) {
                return false;
            }
            
            const finalIsEnabled = companyPlan.featureIds.includes(featureId);
            featureFlagsCache.set(cacheKey, finalIsEnabled);
            return finalIsEnabled;

        } catch (e) {
            console.error("Error checking feature flag:", e);
            return false;
        }

    }, [appUser, dataVersion]);

    return { isFeatureEnabled, refreshData };
};
