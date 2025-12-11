
"use client";

import type { RecentActivityItemProps, ActivityType } from "@/components/dashboard/recent-activity-item";
import { formatDistanceToNow } from 'date-fns';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where } from 'firebase/firestore';


export interface ActivityLogEntry {
    id?: string;
    description: string;
    type: ActivityType;
    companyId: string;
    timestamp: any; // Firestore Timestamp
}

function formatRelativeTime(timestamp: any): string {
    if (!timestamp || !timestamp.toDate) return 'Just now';
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
}

export async function getRecentActivities(companyId: string, count: number = 5): Promise<RecentActivityItemProps[]> {
    if (!db || !companyId) {
        return [];
    }
    
    try {
        const logCol = collection(db, 'activityLog');
        const q = query(
            logCol, 
            where('companyId', '==', companyId), 
            limit(count)
        );
        const logSnapshot = await getDocs(q);

        if (logSnapshot.empty) {
            return [];
        }

        const activities = logSnapshot.docs.map(doc => {
            const entry = doc.data() as ActivityLogEntry;
            return {
                ...entry,
                time: formatRelativeTime(entry.timestamp),
            };
        });
        
        return activities.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.()?.getTime() || 0;
            const timeB = b.timestamp?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });

    } catch (error) {
        console.error("Error reading activity log from Firestore:", error);
        return [];
    }
}

export async function logActivity(activity: Omit<ActivityLogEntry, 'timestamp' | 'id'>): Promise<void> {
     if (!db || !activity.companyId) {
        console.warn("Could not log activity: missing db instance or companyId");
        return;
    };

    try {
        const newEntry = {
            ...activity,
            timestamp: serverTimestamp(),
        };
        await addDoc(collection(db, 'activityLog'), newEntry);
    } catch (error) {
        console.error("Error writing to activity log:", error);
    }
}
