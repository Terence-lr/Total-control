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
  prompt: `You are an expert at creating structured schedules from unstructured text.
  
  The user has provided the following plan for their day:
  {{{plan}}}

  Convert this plan into a structured schedule of events. Each event should have a start time, a task description, and an estimated duration. Infer times and durations where not explicitly stated, based on a typical workday starting around 8-9 AM.
  
  Return the schedule as a JSON object.
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
