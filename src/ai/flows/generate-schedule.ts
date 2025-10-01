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
        time: z.string().describe("HH:MM AM/PM format"),
        duration: z.string().describe("e.g., '45min', '1hr'"),
        type: z.enum(["meeting", "appointment", "routine", "goal", "task", "flow"])
    })).describe("Tasks that have a specific start time."),
    flexible_tasks: z.array(z.object({
        name: z.string(),
        duration: z.string().describe("e.g., '45min', '1hr'"),
        priority: z.enum(["high", "medium", "low"]),
        type: z.enum(["task", "flow", "routine", "goal"])
    })).describe("Tasks that can be scheduled flexibly."),
    preferences: z.object({
        wake_time: z.string().optional().describe("HH:MM AM/PM format"),
        sleep_time: z.string().optional().describe("HH:MM AM/PM format"),
        meal_times: z.array(z.string()).optional().describe("e.g., ['breakfast', 'lunch', 'dinner']")
    })
});

const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});

const GenerateScheduleOutputSchema = z.object({
  needs_clarification: z.boolean(),
  clarifying_questions: z.array(z.string()),
  schedule: z.array(ScheduleEventSchema)
    .describe('The final, chronologically ordered list of structured events for the day.')
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

Your task is to act as a scheduler.
1.  Parse their natural language into a structured list of timed events.
2.  For events with a specific time (e.g., "meeting at 10am"), create a timed event.
3.  For flexible tasks (e.g., "work on the report"), find a suitable time slot in the day.
4.  Estimate a reasonable duration for any task that doesn't have one.
5.  Order all events chronologically.
6.  If critical information is missing to create a basic schedule, you may ask clarifying questions. However, prefer to create a sensible schedule first and let the user adjust it. For example, if they don't provide a wake-up time, assume a standard 8:00 AM start.
7.  Return a single, flat, chronologically sorted array of schedule events for the entire day.

Example Output:
\`\`\`json
{
  "needs_clarification": false,
  "clarifying_questions": [],
  "schedule": [
    { "time": "09:00 AM", "task": "Morning Standup", "duration": "15min" },
    { "time": "09:15 AM", "task": "Work on Q2 Report", "duration": "1hr 45min" },
    { "time": "11:00 AM", "task": "Client Call with Acme Corp", "duration": "1hr" },
    { "time": "12:00 PM", "task": "Lunch", "duration": "45min" }
  ]
}
\`\`\`

If the user mentions routines (e.g., "morning workout", "weekly training"), create tasks for them.
If they mention goals (e.g., "work on my project to launch business"), create tasks for them.

Generate the schedule now.
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
