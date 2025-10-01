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

// Step 1: Parsing the user's plan
const ParsedPlanSchema = z.object({
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

const ClarificationSchema = z.object({
    needs_clarification: z.boolean(),
    clarifying_questions: z.array(z.string()),
    parsed_plan: ParsedPlanSchema
});

// Step 2: Generating the final schedule
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


const parsePlanPrompt = ai.definePrompt({
    name: 'parsePlanPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: ClarificationSchema },
    prompt: `You are an expert at parsing natural language into structured data.
    
    The user said: "{{plan}}"

    Your task is to parse their natural language into a structured list of tasks and preferences.
    1.  Identify tasks with a specific time (e.g., "meeting at 10am") and add them to 'fixed_time_tasks'.
    2.  Identify tasks that are flexible (e.g., "work on the report") and add them to 'flexible_tasks'.
    3.  Estimate a reasonable duration for any task that doesn't have one.
    4.  Infer task priority based on keywords (e.g., "important", "asap" -> high). Default to medium.
    5.  Extract user preferences like wake-up time, sleep time, or meal times.
    6.  If critical information is missing to create a basic schedule (e.g., the plan is too vague like "plan my day"), you may ask clarifying questions. However, prefer to create a sensible structure first.

    If the user mentions routines (e.g., "morning workout", "weekly training"), flag those as type: "routine".
    If they mention goals (e.g., "work on my project to launch business"), flag those as type: "goal".
    
    Parse the plan now.
    `
});

const generateSchedulePrompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {schema: ParsedPlanSchema},
  output: {schema: z.object({ schedule: z.array(ScheduleEventSchema) }) },
  prompt: `You are a helpful personal assistant helping someone plan their day.

Your task is to act as a scheduler. Take the following structured tasks and preferences and create a single, flat, chronologically sorted array of schedule events for the entire day.

Fixed Tasks (must be scheduled at these times):
\`\`\`json
{{{json fixed_time_tasks}}}
\`\`\`

Flexible Tasks (schedule these in available slots):
\`\`\`json
{{{json flexible_tasks}}}
\`\`\`

User Preferences:
\`\`\`json
{{{json preferences}}}
\`\`\`

Follow these rules:
1.  Place all 'fixed_time_tasks' at their specified times.
2.  Slot the 'flexible_tasks' into the available gaps. Prioritize 'high' priority tasks earlier in the day.
3.  Add meals (breakfast, lunch, dinner) if they fit. A reasonable default is 8am, 12pm, and 6pm if not specified in preferences.
4.  If no wake-up time is provided, assume a standard 8:00 AM start for the first task.
5.  Add reasonable buffer time (5-15 mins) between tasks to make the schedule feel realistic.
6.  Ensure the final schedule is a single, chronologically ordered array of events.

Example Output:
\`\`\`json
{
  "schedule": [
    { "time": "09:00 AM", "task": "Morning Standup", "duration": "15min" },
    { "time": "09:15 AM", "task": "Work on Q2 Report", "duration": "1hr 45min" },
    { "time": "11:00 AM", "task": "Client Call with Acme Corp", "duration": "1hr" },
    { "time": "12:00 PM", "task": "Lunch", "duration": "45min" }
  ]
}
\`\`\`

Generate the final schedule now.
  `,
});


const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    // Step 1: Parse the user's plan into structured data.
    const { output: clarificationOutput } = await parsePlanPrompt(input);
    if (!clarificationOutput) {
        throw new Error("Failed to parse plan");
    }

    // If clarification is needed, return early.
    if (clarificationOutput.needs_clarification) {
      return {
        needs_clarification: true,
        clarifying_questions: clarificationOutput.clarifying_questions,
        schedule: [],
      };
    }

    // Step 2: Generate the final schedule from the structured data.
    const { output: scheduleOutput } = await generateSchedulePrompt(clarificationOutput.parsed_plan);
    if (!scheduleOutput) {
        throw new Error("Failed to generate schedule");
    }

    return {
        needs_clarification: false,
        clarifying_questions: [],
        schedule: scheduleOutput.schedule,
    };
  }
);
