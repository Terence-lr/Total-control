'use server';

/**
 * @fileOverview A Genkit flow for extracting structured tasks from a real-time, partial transcript.
 *
 * - extractTasksFromTranscript - The function that triggers the flow.
 * - ExtractTasksFromTranscriptInput - The input type for the function.
 * - ExtractTasksFromTranscriptOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSchema = z.object({
  name: z.string().describe('The name of the task.'),
  time: z.string().nullable().describe('The specific time of the task (e.g., "2:00 PM"), if mentioned.'),
  duration: z.string().nullable().describe('The duration of the task (e.g., "45min", "1hr"), if mentioned.'),
  status: z.enum(['complete', 'needs_info']).describe('Whether the task has all necessary info or needs more details.'),
});

const ExtractTasksFromTranscriptInputSchema = z.object({
  transcript: z.string().describe("The user's partial or complete spoken transcript."),
});
export type ExtractTasksFromTranscriptInput = z.infer<typeof ExtractTasksFromTranscriptInputSchema>;

const ExtractTasksFromTranscriptOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe('An array of tasks identified from the transcript.'),
});
export type ExtractTasksFromTranscriptOutput = z.infer<typeof ExtractTasksFromTranscriptOutputSchema>;

export async function extractTasksFromTranscript(
  input: ExtractTasksFromTranscriptInput
): Promise<ExtractTasksFromTranscriptOutput> {
  return extractTasksFlow(input);
}

const extractTasksPrompt = ai.definePrompt({
  name: 'extractTasksPrompt',
  input: {schema: ExtractTasksFromTranscriptInputSchema},
  output: {schema: ExtractTasksFromTranscriptOutputSchema},
  // Use a faster model for real-time performance
  model: 'googleai/gemini-1.5-flash', 
  prompt: `You are an expert at parsing natural language into structured tasks in real-time. The user is still speaking, so the transcript may be incomplete.

  Transcript so far: "{{transcript}}"

  Your task is to extract tasks from the transcript.
  1.  Identify tasks, events, or appointments.
  2.  Extract any specific time (e.g., "2pm", "noon") or duration (e.g., "45 minutes", "2 hours").
  3.  If a task has a name but is missing a time or duration, its status is 'needs_info'. Otherwise, it's 'complete'.
  4.  Do not invent details. If the user doesn't specify something, leave it as null.
  5.  Return an array of task objects. It's okay to return an empty array if no tasks are clearly identified yet.
  
  Return ONLY the JSON object.
  `,
});

const extractTasksFlow = ai.defineFlow(
  {
    name: 'extractTasksFlow',
    inputSchema: ExtractTasksFromTranscriptInputSchema,
    outputSchema: ExtractTasksFromTranscriptOutputSchema,
  },
  async input => {
    if (!input.transcript.trim()) {
        return { tasks: [] };
    }
    const {output} = await extractTasksPrompt(input);
    return output!;
  }
);
