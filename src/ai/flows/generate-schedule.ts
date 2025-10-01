'use server';

/**
 * @fileOverview A Genkit flow that generates a structured schedule from a user's unstructured plan.
 *
 * - generateSchedule - The function that triggers the schedule generation flow.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateScheduleInputSchema = z.object({
  plan: z.string().describe("The user's unstructured plan for the day."),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;

const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z
    .array(ScheduleEventSchema)
    .describe('A list of structured events for the day.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

const generateSchedulePrompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: GenerateScheduleInputSchema},
  output: {schema: GenerateScheduleOutputSchema},
  prompt: `You are an expert at creating structured schedules from unstructured text. Your task is to convert a user's daily plan into a well-organized schedule of events.

  The user has provided the following plan:
  "{{{plan}}}"

  Carefully analyze the text to identify all tasks, meetings, and activities. For each item, you must:
  1.  **Determine the Task:** Extract the core activity (e.g., "Finish report," "Team meeting," "Go for a run").
  2.  **Assign a Start Time:** If a time is mentioned (e.g., "at 10am," "around 2 PM"), use it. If not, infer a logical start time based on a standard workday (starting around 8:00 AM or 9:00 AM) and the sequence of tasks.
  3.  **Estimate the Duration:** If a duration is provided (e.g., "for 45 minutes," "1-hour call"), use it. If not, make a reasonable estimation based on the nature of the task (e.g., a standard meeting might be 30-60 minutes, a focused work block might be 90 minutes).

  Present the final output as a JSON object containing a 'schedule' array, where each object in the array represents a single event with 'time', 'task', and 'duration' properties. Ensure the schedule is chronologically ordered.
  `,
});

const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async input => {
    const {output} = await generateSchedulePrompt(input);
    return output!;
  }
);
