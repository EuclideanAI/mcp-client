'use server';

import { streamText, generateId, CoreMessage } from 'ai';
import { getModelProvider } from '@/app/utils/chat-providers';
import { ChatModel, ChatMessage } from '@/app/types/chat-types';

// Legacy function - kept for backward compatibility
// The new implementation uses the /api/chat route with the AI SDK
export async function generateChatMessage(
  messages: ChatMessage[],
  model: ChatModel = 'claude'
): Promise<{
  success: boolean;
  message?: ChatMessage;
  error?: string;
}> {
  try {
    const provider = getModelProvider(model);
    
    // Convert our ChatMessage format to AI SDK format
    const coreMessages: CoreMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const result = await streamText({
      model: provider.model,
      messages: coreMessages,
      maxTokens: provider.maxTokens,
    });

    // Get the full response
    const text = await result.text;

    const responseMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: text,
      timestamp: new Date(),
    };

    return {
      success: true,
      message: responseMessage,
    };
  } catch (error) {
    console.error('Chat generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown chat error',
    };
  }
}
