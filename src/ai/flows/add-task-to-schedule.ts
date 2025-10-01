'use server';

/**
 * @fileOverview A Genkit flow for adding a new task to an existing schedule.
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
  newTask: z
    .string()
    .describe(
      'The new task to add. This can be a simple description like "Call mom" or include timing hints like "add a 15min break after my next meeting".'
    ),
  currentTime: z.string().optional().describe('The current time, to provide context for where to insert the new task (e.g., "11:30 AM").')
});
export type AddTaskToScheduleInput = z.infer<typeof AddTaskToScheduleInputSchema>;

const AddTaskToScheduleOutputSchema = z.object({
  schedule: z
    .array(ScheduleEventSchema)
    .describe('The updated, chronologically ordered list of structured events for the day.'),
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
  prompt: `You are an expert at dynamically updating schedules. Your task is to take an existing schedule, a new task, and intelligently insert the new task into the schedule.

The current time is {{currentTime}}.

The existing schedule is:
\`\`\`json
{{{json existingSchedule}}}
\`\`\`

The user wants to add the following new task: "{{newTask}}"

Follow these rules:
1.  **Analyze the New Task:** Determine the task's details (what it is, estimated duration, and any timing hints). If no duration is given, estimate a reasonable one.
2.  **Find the Insertion Point:** Based on the current time and any hints in the new task description (e.g., "after my next meeting", "in 20 minutes"), find the most logical place to add it. If no hints are provided, a good default is to place it after the currently active or next upcoming task.
3.  **Update and Re-sequence:** Insert the new task. You may need to adjust the start times of subsequent tasks to accommodate the new entry. Ensure the final schedule remains chronologically ordered.
4.  **Return the Full Schedule:** Output the complete, updated schedule in the correct JSON format. Do not just return the new task; return the entire list of events.
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
