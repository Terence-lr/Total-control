'use server';

/**
 * @fileOverview This file defines a Genkit flow that suggests relevant tasks, flows, and routines
 *               to help users break down a goal into actionable steps.
 *
 * - suggestTasksFromGoal - The function that triggers the task suggestion flow.
 * - SuggestTasksFromGoalInput - The input type for the suggestTasksFromGoal function.
 * - SuggestTasksFromGoalOutput - The return type for the suggestTasksFromGoal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksFromGoalInputSchema = z.object({
  goal: z.string().describe('The user-defined goal to be achieved.'),
});
export type SuggestTasksFromGoalInput = z.infer<typeof SuggestTasksFromGoalInputSchema>;

const SuggestTasksFromGoalOutputSchema = z.object({
  suggestedTasks: z
    .array(z.string())
    .describe('A list of suggested tasks to achieve the goal.'),
  suggestedFlows:
    z.array(z.string()).describe('A list of suggested flows to achieve the goal.'),
  suggestedRoutines:
    z.array(z.string()).describe('A list of suggested routines to achieve the goal.'),
});
export type SuggestTasksFromGoalOutput = z.infer<typeof SuggestTasksFromGoalOutputSchema>;

export async function suggestTasksFromGoal(
  input: SuggestTasksFromGoalInput
): Promise<SuggestTasksFromGoalOutput> {
  return suggestTasksFromGoalFlow(input);
}

const suggestTasksFromGoalPrompt = ai.definePrompt({
  name: 'suggestTasksFromGoalPrompt',
  input: {schema: SuggestTasksFromGoalInputSchema},
  output: {schema: SuggestTasksFromGoalOutputSchema},
  prompt: `You are an AI assistant designed to help users break down their goals into actionable steps.

  The user has set the following goal: {{{goal}}}

  Suggest a list of tasks, flows, and routines that would help the user achieve this goal.

  Return the tasks, flows, and routines as a JSON object.
  `,
});

const suggestTasksFromGoalFlow = ai.defineFlow(
  {
    name: 'suggestTasksFromGoalFlow',
    inputSchema: SuggestTasksFromGoalInputSchema,
    outputSchema: SuggestTasksFromGoalOutputSchema,
  },
  async input => {
    const {output} = await suggestTasksFromGoalPrompt(input);
    return output!;
  }
);
