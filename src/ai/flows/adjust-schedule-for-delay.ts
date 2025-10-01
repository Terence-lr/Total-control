'use server';

/**
 * @fileOverview A Genkit flow for adjusting an existing schedule due to a delay.
 *
 * - adjustScheduleForDelay - The function that triggers the flow to modify the schedule.
 * - AdjustScheduleForDelayInput - The input type for the adjustScheduleForDelay function.
 * - AdjustScheduleForDelayOutput - The return type for the adjustScheduleForDelay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for a single event, consistent with other schedule flows
const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});

const AdjustScheduleForDelayInputSchema = z.object({
  existingSchedule: z
    .array(ScheduleEventSchema)
    .describe('The current, chronologically ordered list of schedule events.'),
  delayDuration: z
    .string()
    .describe('The duration of the delay (e.g., "15 minutes", "a half hour").'),
  currentTime: z.string().optional().describe('The current time, to provide context for which tasks to shift (e.g., "11:30 AM").')
});
export type AdjustScheduleForDelayInput = z.infer<typeof AdjustScheduleForDelayInputSchema>;

const AdjustScheduleForDelayOutputSchema = z.object({
  schedule: z
    .array(ScheduleEventSchema)
    .describe('The updated, chronologically ordered list of structured events for the day.'),
});
export type AdjustScheduleForDelayOutput = z.infer<typeof AdjustScheduleForDelayOutputSchema>;


export async function adjustScheduleForDelay(
  input: AdjustScheduleForDelayInput
): Promise<AdjustScheduleForDelayOutput> {
  return adjustScheduleForDelayFlow(input);
}

const adjustScheduleForDelayPrompt = ai.definePrompt({
  name: 'adjustScheduleForDelayPrompt',
  input: {schema: AdjustScheduleForDelayInputSchema},
  output: {schema: AdjustScheduleForDelayOutputSchema},
  prompt: `You are an expert at dynamically updating schedules. Your task is to take an existing schedule and a delay duration, and shift the schedule accordingly.

The current time is {{currentTime}}.

The existing schedule is:
\`\`\`json
{{{json existingSchedule}}}
\`\`\`

The user is running late by: "{{delayDuration}}"

Follow these rules:
1.  **Identify Future Tasks:** Based on the current time, identify all tasks in the schedule that have not yet started.
2.  **Calculate New Times:** For each future task, shift its start time forward by the specified delay duration. Do not change the times of past or currently active tasks.
3.  **Maintain Duration:** Do not alter the duration of any task.
4.  **Return the Full Schedule:** Output the complete, updated schedule in the correct JSON format, including both the unchanged past tasks and the shifted future tasks. Ensure the final schedule remains chronologically ordered.
`,
});

const adjustScheduleForDelayFlow = ai.defineFlow(
  {
    name: 'adjustScheduleForDelayFlow',
    inputSchema: AdjustScheduleForDelayInputSchema,
    outputSchema: AdjustScheduleForDelayOutputSchema,
  },
  async input => {
    const {output} = await adjustScheduleForDelayPrompt(input);
    return output!;
  }
);
