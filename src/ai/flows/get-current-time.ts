'use server';

/**
 * @fileOverview A simple utility flow to get the current server time.
 *
 * - getCurrentTime - A function that returns the current time.
 * - GetCurrentTimeOutput - The return type for the getCurrentTime function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetCurrentTimeOutputSchema = z.object({
  time: z.string().describe('The current time in HH:mm:ss format.'),
  hours: z.number(),
  minutes: z.number(),
});
export type GetCurrentTimeOutput = z.infer<typeof GetCurrentTimeOutputSchema>;

export async function getCurrentTime(): Promise<GetCurrentTimeOutput> {
  return getCurrentTimeFlow();
}

const getCurrentTimeFlow = ai.defineFlow(
  {
    name: 'getCurrentTimeFlow',
    outputSchema: GetCurrentTimeOutputSchema,
  },
  async () => {
    const now = new Date();
    return {
      time: now.toLocaleTimeString('en-US', { hour12: false }),
      hours: now.getHours(),
      minutes: now.getMinutes(),
    };
  }
);
