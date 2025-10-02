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
import type { Task } from '@/supabase/database';

// Schema for a single event, consistent with generate-schedule flow
const ScheduleEventSchema = z.object({
  time: z.string().describe('The start time of the event (e.g., "09:00").'),
  task: z.string().describe('A short description of the task or event.'),
  duration: z.string().describe('The estimated duration of the event in minutes (e.g., "45", "60").'),
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
  currentDate: z.string().describe('The current date in YYYY-MM-DD format.'),
  currentTime: z.string().optional().describe('The current time, to provide context for what can be changed (e.g., "11:30").')
});
export type AddTaskToScheduleInput = z.infer<typeof AddTaskToScheduleInputSchema>;


const AddTaskToScheduleOutputSchema = z.object({
  newTasks: z.array(z.object({
    name: z.string(),
    duration_minutes: z.number().optional(),
    scheduled_time: z.string().optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
    type: z.enum(['task', 'flow_task', 'routine_task']),
  })).describe("A list of new tasks to be created."),
  // While we could support updates and deletes, for now we focus on additions
  // updatedTasks: z.array(z.any()).describe("A list of tasks to be updated."),
  // deletedTasks: z.array(z.string()).describe("A list of task IDs to be deleted."),
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
  prompt: `You are an expert at dynamically updating schedules by creating new tasks. Your task is to take a user's request and intelligently determine what new tasks should be created. Do not modify or delete existing tasks.

The current date is {{currentDate}}.
The current time is {{currentTime}}.

The existing schedule for today is:
\`\`\`json
{{{json existingSchedule}}}
\`\`\`

The user's request is: "{{request}}"

Follow these rules:
1.  **Analyze the Request:** Determine if the user wants to ADD a new task. Ignore requests to move, remove, or change existing tasks. Your only capability is to add new tasks.
2.  **Extract Task Details:** From the request, extract the task name, its duration in minutes, and its scheduled time (in HH:MM format).
3.  **Set Defaults:**
    - If a time is given, set 'scheduled_time'.
    - If a duration is given, set 'duration_minutes'.
    - The 'date' for the new task should always be today's date: {{currentDate}}.
    - Set the 'type' to 'task'.
4.  **Handle Conflicts:** If the request would cause an obvious overlap, it is acceptable to schedule it anyway. The user can resolve it manually. Your job is just to create the task as requested.
5.  **Summarize the Change:** Provide a brief summary of the action taken (e.g., "Added 'Call Mom' at 4pm").
6.  **Return New Tasks:** Output an array of the new task objects to be created in the correct JSON format. If the request was not about adding a task, return an empty array.
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
