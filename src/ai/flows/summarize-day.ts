'use server';

/**
 * @fileOverview Summarizes the user's day, including accomplishments and learnings.
 *
 * - summarizeDay - A function that takes the day's activities and generates a summary.
 * - SummarizeDayInput - The input type for the summarizeDay function.
 * - SummarizeDayOutput - The return type for the summarizeDay function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDayInputSchema = z.object({
  activities: z
    .string()
    .describe("A detailed description of the day's activities, accomplishments, and learnings."),
});
export type SummarizeDayInput = z.infer<typeof SummarizeDayInputSchema>;

const SummarizeDayOutputSchema = z.object({
  accomplishments: z.array(z.string()).describe("A list of key accomplishments from the day."),
  learnings: z.array(z.string()).describe("A list of learnings and insights gained during the day."),
  suggestions: z.array(z.string()).describe("A list of actionable suggestions for tomorrow based on the day's activities."),
});
export type SummarizeDayOutput = z.infer<typeof SummarizeDayOutputSchema>;

export async function summarizeDay(input: SummarizeDayInput): Promise<SummarizeDayOutput> {
  return summarizeDayFlow(input);
}

const summarizeDayPrompt = ai.definePrompt({
  name: 'summarizeDayPrompt',
  input: {schema: SummarizeDayInputSchema},
  output: {schema: SummarizeDayOutputSchema},
  prompt: `You are an expert productivity coach. Your goal is to provide a clear, encouraging, and actionable summary of the user's day.

  Analyze the following description of the day's activities, which includes completed tasks and the user's personal reflections:
  
  ---
  {{{activities}}}
  ---
  
  Based on this input, generate a structured summary with the following three sections:
  
  1.  **Key Accomplishments**: Identify and list the most important tasks the user completed. Phrase these in an encouraging tone.
  2.  **Learnings & Insights**: Extract any reflections, learnings, or insights the user mentioned. If none are explicitly stated, infer potential learnings from the activities.
  3.  **Suggestions for Tomorrow**: Provide concrete, actionable suggestions for the next day. These could be follow-up tasks, ways to improve focus, or strategies to tackle any challenges mentioned.
  
  Return the output as a JSON object with 'accomplishments', 'learnings', and 'suggestions' arrays.
  `,
});

const summarizeDayFlow = ai.defineFlow(
  {
    name: 'summarizeDayFlow',
    inputSchema: SummarizeDayInputSchema,
    outputSchema: SummarizeDayOutputSchema,
  },
  async input => {
    const {output} = await summarizeDayPrompt(input);
    return output!;
  }
);
