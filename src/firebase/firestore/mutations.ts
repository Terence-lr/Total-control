
'use client';

import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import type { Task } from '@/components/tasks-client';
import { setDocumentNonBlocking } from '../non-blocking-updates';

/**
 * Creates a new task for a given user.
 * @param firestore The Firestore instance.
 * @param userId The ID of the user.
 * @param taskData The data for the new task.
 */
export async function createTask(firestore: Firestore, userId: string, taskData: Omit<Task, 'id' | 'userId' | 'created_at' | 'updated_at' | 'created_from' | 'status' | 'completed'>) {
    if (!userId) {
        throw new Error('User must be logged in to create a task.');
    }
    
    const tasksCollectionRef = collection(firestore, 'users', userId, 'tasks');
    
    const newTask: Omit<Task, 'id'> = {
        ...taskData,
        userId,
        completed: false,
        status: 'not_started',
        created_from: 'manual',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
    };

    return await addDoc(tasksCollectionRef, newTask);
}


/**
 * Toggles the 'completed' status of a task.
 * @param firestore The Firestore instance.
 * @param userId The ID of the user who owns the task.
 * @param taskId The ID of the task to update.
 * @param completed The new completed status.
 */
export async function toggleTaskCompletion(firestore: Firestore, userId: string, taskId: string, completed: boolean) {
  const taskRef = doc(firestore, 'users', userId, 'tasks', taskId);
  const updateData = {
    completed,
    status: completed ? 'completed' : 'not_started',
    updated_at: serverTimestamp(),
  };
  
  // Using set with merge to be safe, but update would also work.
  // Not awaiting the result for optimistic UI updates.
  setDocumentNonBlocking(taskRef, updateData, { merge: true });
}

