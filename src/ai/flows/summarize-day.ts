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
  summary: z.string().describe('A concise and insightful summary of the day.'),
});
export type SummarizeDayOutput = z.infer<typeof SummarizeDayOutputSchema>;

export async function summarizeDay(input: SummarizeDayInput): Promise<SummarizeDayOutput> {
  return summarizeDayFlow(input);
}

const summarizeDayPrompt = ai.definePrompt({
  name: 'summarizeDayPrompt',
  input: {schema: SummarizeDayInputSchema},
  output: {schema: SummarizeDayOutputSchema},
  prompt: `Summarize the following description of the day's activities, accomplishments, and learnings into a concise and insightful overview:\n\n{{{activities}}}`,
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
