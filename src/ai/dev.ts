import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-day.ts';
import '@/ai/flows/suggest-tasks-from-goal.ts';
import '@/ai/flows/generate-schedule.ts';
