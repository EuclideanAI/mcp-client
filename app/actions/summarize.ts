'use server';

import { generateText } from 'ai';
import { getModelProvider } from '@/app/utils/chat-providers';
import { ChatModel } from '@/app/types/chat-types';

interface SummarizeToolResultParams {
  originalQuestion: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  rawResult: unknown;
  model?: ChatModel;
}

export async function summarizeToolResult({
  originalQuestion,
  toolName,
  toolArgs,
  rawResult,
  model = 'claude'
}: SummarizeToolResultParams): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    const provider = getModelProvider(model);
    
    const systemPrompt = `You are an AI assistant that summarizes tool execution results for users. Your job is to take the raw output from a tool and create a clear, concise, and helpful summary that directly answers the user's original question.

Guidelines:
1. Focus on the key information that answers the user's question
2. Be concise but comprehensive
3. Use clear, natural language
4. Highlight important findings or results
5. If the tool failed or returned an error, explain what went wrong
6. If the result is complex data, extract the most relevant parts
7. Format your response in a user-friendly way

Do not just repeat the raw data - interpret it and present it in a way that's useful to the user.`;

    const userPrompt = `The user asked: "${originalQuestion}"

To answer this, I executed the tool "${toolName}" with these arguments:
${JSON.stringify(toolArgs, null, 2)}

The tool returned this raw result:
${JSON.stringify(rawResult, null, 2)}

Please provide a clear, helpful summary that answers the user's original question based on this tool result.`;

    const result = await generateText({
      model: provider.model,
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    return {
      success: true,
      summary: result.text.trim()
    };

  } catch (error) {
    console.error('Failed to summarize tool result:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during summarization'
    };
  }
}
