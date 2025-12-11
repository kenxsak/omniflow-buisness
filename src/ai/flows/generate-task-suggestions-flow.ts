
'use server';
/**
 * @fileOverview A Genkit flow for generating next task suggestions for a lead based on their status and context.
 *
 * - generateTaskSuggestions - Generates task suggestions.
 * - GenerateTaskSuggestionsInput - Input type.
 * - GenerateTaskSuggestionsOutput - Return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTaskSuggestionsInputSchema = z.object({
  leadStatus: z.enum(['New', 'Contacted', 'Qualified', 'Lost', 'Won']).describe('The current status of the lead.'),
  leadContext: z.string().optional().describe('Brief context about the lead or the last interaction (e.g., "Expressed interest in Product X," "No response to last email").'),
  numSuggestions: z.number().min(1).max(5).optional().default(3).describe('Number of task suggestions to generate (1-5).'),
});
export type GenerateTaskSuggestionsInput = z.infer<typeof GenerateTaskSuggestionsInputSchema>;

const GenerateTaskSuggestionsOutputSchema = z.object({
  taskSuggestions: z.array(z.string()).describe('An array of AI-generated actionable task suggestions.'),
});
export type GenerateTaskSuggestionsOutput = z.infer<typeof GenerateTaskSuggestionsOutputSchema>;

// The exported function that the UI calls.
export async function generateTaskSuggestions(input: GenerateTaskSuggestionsInput): Promise<GenerateTaskSuggestionsOutput> {
  // It now calls the uniquely named internal flow.
  return internalSuggestTasksFlow(input);
}

// The internal prompt, with a unique name to avoid conflicts.
const internalSuggestTasksPrompt = ai.definePrompt({
  name: 'internalSuggestTasksPrompt', // Unique name
  input: { schema: GenerateTaskSuggestionsInputSchema },
  output: { schema: GenerateTaskSuggestionsOutputSchema },
  prompt: `You are an experienced sales assistant and productivity coach.
Your goal is to suggest {{{numSuggestions}}} relevant and actionable next tasks for managing a lead.

Lead Information:
- Current Status: {{{leadStatus}}}
{{#if leadContext}}- Context / Last Interaction: {{{leadContext}}}{{else}}- Context / Last Interaction: No specific context provided.{{/if}}

Task Suggestion Guidelines:
- Tasks should be concise and actionable (e.g., "Send follow-up email," "Schedule discovery call," "Update CRM notes").
- Tailor suggestions based on the lead's status:
    - If "New": Focus on initial engagement and qualification (e.g., "Research lead's company," "Send personalized welcome email," "Attempt first contact call").
    - If "Contacted": Focus on moving towards qualification or understanding needs (e.g., "Log call/email outcome," "Send requested information," "Schedule follow-up meeting/call," "Schedule product demo if interest shown").
    - If "Qualified": Focus on proposal, closing, or deeper engagement (e.g., "Prepare and send quotation/proposal," "Schedule detailed product demo," "Discuss pricing and negotiation points," "Address specific concerns and objections").
    - If "Lost": Focus on learning and potential re-engagement (e.g., "Log reason for loss," "Add to long-term nurture list," "Request feedback if appropriate").
    - If "Won": Focus on onboarding and customer success (e.g., "Initiate onboarding process," "Send welcome kit/resources," "Schedule check-in call").
- Consider the provided 'leadContext' to make suggestions more specific if possible.
- Provide a variety of suggestions.

Provide ONLY the array of task suggestions.
`,
});

// The internal flow, with a unique name to avoid conflicts.
const internalSuggestTasksFlow = ai.defineFlow(
  {
    name: 'internalSuggestTasksFlow', // Unique name
    inputSchema: GenerateTaskSuggestionsInputSchema,
    outputSchema: GenerateTaskSuggestionsOutputSchema,
  },
  async (input) => {
    // This flow calls the uniquely named prompt.
    const { output } = await internalSuggestTasksPrompt(input);
    if (!output || !output.taskSuggestions || output.taskSuggestions.length === 0) {
      return {
        taskSuggestions: ["Failed to generate task suggestions. Please try again."]
      };
    }
    return output;
  }
);
