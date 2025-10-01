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

const ParsedScheduleSchema = z.object({
    fixed_time_tasks: z.array(z.object({
        name: z.string(),
        time: z.string().describe("HH:MM 24-hour format"),
        duration_minutes: z.number(),
        type: z.enum(["meeting", "appointment", "routine", "goal", "task", "flow"])
    })).describe("Tasks that have a specific start time."),
    flexible_tasks: z.array(z.object({
        name: z.string(),
        estimated_duration_minutes: z.number(),
        priority: z.enum(["high", "medium", "low"]),
        type: z.enum(["task", "flow", "routine", "goal"])
    })).describe("Tasks that can be scheduled flexibly."),
    preferences: z.object({
        wake_time: z.string().optional().describe("HH:MM 24-hour format"),
        sleep_time: z.string().optional().describe("HH:MM 24-hour format"),
        meal_times: z.array(z.string()).optional().describe("e.g., ['breakfast', 'lunch', 'dinner']")
    })
});

const GenerateScheduleOutputSchema = z.object({
  needs_clarification: z.boolean(),
  clarifying_questions: z.array(z.string()),
  parsed_schedule: ParsedScheduleSchema
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
  prompt: `You are a helpful personal assistant helping someone plan their day.

The user said: "{{plan}}"

Your task:
1. Parse their natural language into structured tasks.
2. Identify time constraints (meetings, appointments with fixed times).
3. Estimate duration for tasks without specified time.
4. Ask clarifying questions ONLY if critical information is missing for scheduling.

Extract and return JSON in the specified format.

If the user mentions routines (e.g., "morning workout", "weekly training"), flag those as type: "routine".
If they mention goals (e.g., "work on my project to launch business"), flag those as type: "goal".

Be conversational and friendly in clarifying questions.
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
