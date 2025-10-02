
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
import { setDocumentNonBlocking } from '../non-blocking-updates';

export type Task = {
    name: string;
    duration_minutes?: number;
    scheduled_time?: string;
    date?: string;
    completed: boolean;
    status: "not_started" | "in_progress" | "completed" | "skipped";
    type: "task" | "flow_task" | "routine_task";
    notes?: string;
    linked_goal_id?: string;
    linked_flow_id?: string;
    created_from: "voice" | "manual" | "flow";
    created_at: any; // Using `any` for Firestore Timestamp compatibility
    updated_at: any;
    userId: string;
};


/**
 * Creates a new task for a given user.
 * @param firestore The Firestore instance.
 * @param userId The ID of the user.
 * @param taskData The data for the new task.
 */
export async function createTask(firestore: Firestore, userId: string, taskData: Partial<Omit<Task, 'id' | 'userId' | 'created_at' | 'updated_at' | 'created_from' | 'status' | 'completed'>> & { name: string }) {
    if (!userId) {
        throw new Error('User must be logged in to create a task.');
    }
    
    const tasksCollectionRef = collection(firestore, 'users', userId, 'tasks');
    
    const newTask: Omit<Task, 'id'> = {
        name: taskData.name,
        duration_minutes: taskData.duration_minutes,
        scheduled_time: taskData.scheduled_time,
        date: taskData.date,
        notes: taskData.notes,
        type: taskData.type || 'task',
        userId,
        completed: false,
        status: 'not_started',
        created_from: 'manual', // or 'voice'/'flow' depending on context
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
