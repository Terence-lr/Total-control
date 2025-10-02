'use server';

/**
 * @fileOverview A Genkit flow for adding or modifying a task in an existing schedule.
 *
 * - addTaskToSchedule - The function that triggers the flow to modify the schedule.
 * - AddTaskToScheduleInput - The input type for the addTaskToSchedule function.
 * - AddTaskToScheduleOutput - The return type for the addTaskToSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for a single event, consistent with generate-schedule flow
const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00 AM").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event (e.g., "45min", "1hr").'),
});

const AddTaskToScheduleInputSchema = z.object({
  existingSchedule: z
    .array(ScheduleEventSchema)
    .describe('The current, chronologically ordered list of schedule events.'),
  request: z
    .string()
    .describe(
      'The user\'s request to modify the schedule. This can be adding a task ("add a 15min break"), moving a task ("move my workout to 8am"), or removing one ("cancel my 2pm meeting").'
    ),
  currentTime: z.string().optional().describe('The current time, to provide context for what can be changed (e.g., "11:30 AM").')
});
export type AddTaskToScheduleInput = z.infer<typeof AddTaskToScheduleInputSchema>;

const AddTaskToScheduleOutputSchema = z.object({
  needs_clarification: z.boolean().describe("True if the AI needs more information before it can modify the schedule."),
  clarifying_question: z.string().nullable().describe("The question the AI needs to ask the user."),
  schedule: z
    .array(ScheduleEventSchema)
    .describe('The updated, chronologically ordered list of structured events for the day.'),
  changes_summary: z.string().nullable().describe("A brief, one-sentence summary of what changed.")
});
export type AddTaskToScheduleOutput = z.infer<typeof AddTaskToScheduleOutputSchema>;


export async function addTaskToSchedule(
  input: AddTaskToScheduleInput
): Promise<AddTaskToScheduleOutput> {
  return addTaskToScheduleFlow(input);
}

const addTaskToSchedulePrompt = ai.definePrompt({
  name: 'addTaskToSchedulePrompt',
  input: {schema: AddTaskToScheduleInputSchema},
  output: {schema: AddTaskToScheduleOutputSchema},
  prompt: `You are an expert at dynamically updating schedules. Your task is to take an existing schedule and a user's request, and intelligently modify the schedule.

The current time is {{currentTime}}. Only tasks starting after this time can be moved or removed.

The existing schedule is:
\`\`\`json
{{{json existingSchedule}}}
\`\`\`

The user's request is: "{{request}}"

Follow these rules:
1.  **Analyze the Request:** Determine if the user wants to ADD, MOVE, REMOVE, or CHANGE the DURATION of a task.
2.  **Find the Target:** Identify the task to modify or the time slot to add a new task. Use the current time and user's hints (e.g., "after my next meeting", "at 3pm").
3.  **Check for Conflicts:** If the change would cause an overlap with an existing task, DO NOT proceed. Instead, set 'needs_clarification' to true and ask a question suggesting a solution. For example: "Adding that would overlap with your 3pm meeting. Should I move the meeting to 4pm instead?"
4.  **Update and Re-sequence:** If there are no conflicts, apply the change. Adjust the start times of all subsequent tasks to accommodate the modification. Ensure the final schedule remains chronologically ordered.
5.  **Summarize the Change:** Provide a brief summary of the action taken (e.g., "Added 'Call Mom' at 4pm", "Moved workout to 8am").
6.  **Return the Full Schedule:** Output the complete, updated schedule in the correct JSON format. If no changes were made due to a conflict, return the original schedule.
`,
});

const addTaskToScheduleFlow = ai.defineFlow(
  {
    name: 'addTaskToScheduleFlow',
    inputSchema: AddTaskToScheduleInputSchema,
    outputSchema: AddTaskToScheduleOutputSchema,
  },
  async input => {
    const {output} = await addTaskToSchedulePrompt(input);
    return output!;
  }
);
