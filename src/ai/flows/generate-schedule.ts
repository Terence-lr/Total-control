'use server';

/**
 * @fileOverview A Genkit flow that generates a structured schedule from a user's unstructured plan,
 *               handling multi-turn clarifications.
 *
 * - generateSchedule - The function that triggers the schedule generation flow.
 * - GenerateScheduleInput - The input type for the generateSchedule function.
 * - GenerateScheduleOutput - The return type for the generateSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { Task } from '@/components/tasks-client';


const GenerateScheduleInputSchema = z.object({
  plan: z.string().describe("The user's unstructured plan for the day."),
  currentDate: z.string().describe("The current date in YYYY-MM-DD format."),
  conversationHistory: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional().describe("A history of clarifying questions and user answers.")
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const ScheduleEventSchema = z.object({
  name: z.string().describe("The name of the task."),
  duration_minutes: z.number().optional().describe("The estimated duration in minutes."),
  scheduled_time: z.string().optional().describe("The scheduled start time in HH:MM format."),
  notes: z.string().optional().describe("Any additional notes."),
  type: z.enum(['task', 'flow_task', 'routine_task']).default('task'),
});

const GenerateScheduleOutputSchema = z.object({
  needs_clarification: z.boolean(),
  clarifying_questions: z.array(z.string()),
  tasks: z.array(ScheduleEventSchema)
    .describe('The list of structured tasks for the day.')
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  return generateScheduleFlow(input);
}

// This internal-only prompt first parses the free-form text into a structured, but still messy, plan.
const parsePlanPrompt = ai.definePrompt({
    name: 'internalParsePlanPrompt',
    input: { schema: GenerateScheduleInputSchema },
    output: { schema: GenerateScheduleOutputSchema },
    prompt: `You are an expert at parsing natural language into a structured list of tasks for today, "{{currentDate}}".

    {{#if conversationHistory}}
    You are in a conversation to clarify a user's plan.
    The user initially said: "{{plan}}"
    
    Here is the conversation so far:
    {{#each conversationHistory}}
    You asked: "{{this.question}}"
    User answered: "{{this.answer}}"
    {{/each}}
    Now, re-evaluate the entire conversation and parse the complete plan.
    {{else}}
    The user said: "{{plan}}"
    {{/if}}

    Your task is to parse their natural language into a structured list of tasks.
    1.  Identify tasks, events, or appointments.
    2.  For each task, extract:
        - A concise 'name'.
        - A 'duration_minutes' (e.g., "45 minutes" -> 45, "1 hour" -> 60).
        - A 'scheduled_time' in HH:MM format (e.g., "2pm" -> "14:00").
    3.  If critical information is missing (e.g., "plan my day" is too vague), set 'needs_clarification' to true and provide clarifying questions. Prefer to create a sensible structure first.
    4.  If not enough information is available for clarification, return an empty task list.
    
    Parse the plan now into a list of tasks.
    `
});

// This flow uses the prompt to either get tasks or ask for clarification.
const generateScheduleFlow = ai.defineFlow(
  {
    name: 'generateScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await parsePlanPrompt(input);
    if (!output) {
        throw new Error("Failed to parse plan");
    }
    return output;
  }
);
