
"use client";

import type { Task } from '@/types/task';
import { db } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';

// --- Task Functions (Firestore) ---

export async function getStoredTasks(companyId?: string): Promise<Task[]> {
  if (!db || !companyId) return [];
  try {
    const tasksCol = collection(db, 'tasks');
    const q = query(
      tasksCol, 
      where('companyId', '==', companyId)
    );
    const taskSnapshot = await getDocs(q);
    if (taskSnapshot.empty) {
        return [];
    }
    const tasks = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    // Sort client-side temporarily until Firestore indexes are deployed
    return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
}

export async function addStoredTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' >): Promise<Task> {
  if (!db) throw new Error("Firestore is not initialized.");
  
  let leadName: string | undefined = undefined;
  if (taskData.leadId) {
      const leadSnap = await getDoc(doc(db, 'leads', taskData.leadId));
      if(leadSnap.exists()) {
          leadName = leadSnap.data().name;
      }
  }

  let appointmentTitle: string | undefined = undefined;
  if (taskData.appointmentId) {
      const appointmentSnap = await getDoc(doc(db, 'appointments', taskData.appointmentId));
      if(appointmentSnap.exists()) {
          appointmentTitle = appointmentSnap.data().title;
      }
  }

  const taskPayload = {
    ...taskData,
    leadName,
    appointmentTitle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'tasks'), taskPayload);
  const docSnap = await getDoc(docRef);
  return { id: docSnap.id, ...docSnap.data() } as Task;
}

export async function updateStoredTask(updatedData: Partial<Task> & {id: string}): Promise<void> {
  if (!db) return;
  const { id, ...dataToUpdate } = updatedData;
  const taskRef = doc(db, 'tasks', id);
  
  let leadName: string | undefined = updatedData.leadName;
  if (updatedData.leadId && updatedData.leadId !== '_NONE_') {
      const leadSnap = await getDoc(doc(db, 'leads', updatedData.leadId));
      if(leadSnap.exists()) {
          leadName = leadSnap.data().name;
      }
  } else if (updatedData.leadId === '_NONE_') {
      leadName = undefined;
  }

  let appointmentTitle: string | undefined = updatedData.appointmentTitle;
  if (updatedData.appointmentId && updatedData.appointmentId !== '_NONE_') {
      const appointmentSnap = await getDoc(doc(db, 'appointments', updatedData.appointmentId));
      if(appointmentSnap.exists()) {
          appointmentTitle = appointmentSnap.data().title;
      }
  } else if (updatedData.appointmentId === '_NONE_') {
      appointmentTitle = undefined;
  }

  await updateDoc(taskRef, {
      ...dataToUpdate,
      leadName,
      appointmentTitle,
      updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, 'tasks', taskId));
}
