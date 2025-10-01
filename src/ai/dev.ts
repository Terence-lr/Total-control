import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-day.ts';
import '@/ai/flows/suggest-tasks-from-goal.ts';
import '@/ai/flows/generate-schedule.ts';
import '@/ai/flows/add-task-to-schedule.ts';
import '@/ai/flows/adjust-schedule-for-delay.ts';
import '@/ai/flows/get-current-time.ts';
