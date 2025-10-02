'use server';

/**
 * @fileOverview Production server for Genkit.
 * This file is used for production deployment on Vercel.
 * It imports all the AI flows without the development server setup.
 */

import '@/ai/flows/summarize-day.ts';
import '@/ai/flows/suggest-tasks-from-goal.ts';
import '@/ai/flows/generate-schedule.ts';
import '@/ai/flows/add-task-to-schedule.ts';
import '@/ai/flows/adjust-schedule-for-delay.ts';
import '@/ai/flows/get-current-time.ts';
import '@/ai/flows/extract-tasks-from-transcript.ts';
