// Chat model providers configuration
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { google } from '@ai-sdk/google';
import { LanguageModelV1 } from 'ai';
import { ChatModel } from '@/app/types/chat-types';

export interface ModelProvider {
  id: ChatModel;
  name: string;
  description: string;
  model: LanguageModelV1;
  maxTokens: number;
  supportsToolCalling: boolean;
}

export function createBedrockProvider(): ModelProvider {
  return {
    id: 'claude',
    name: 'Claude 3.5 Sonnet (Bedrock)',
    description: 'Anthropic Claude 3.5 Sonnet via AWS Bedrock',
    model: bedrock('anthropic.claude-3-5-sonnet-20241022-v2:0'),
    maxTokens: 4096,
    supportsToolCalling: true,
  };
}

export function createGeminiProvider(): ModelProvider {
  console.log('Creating Gemini provider...');
  console.log('- GOOGLE_GENERATIVE_AI_API_KEY available:', !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  
  try {
    // Try the most recent model name as of 2025
    const modelName = 'gemini-2.0-flash-exp';
    
    console.log('- Using model name:', modelName);
    const model = google(modelName);
    console.log('- Gemini model created successfully');
    
    return {
      id: 'gemini',
      name: 'Gemini 2.0 Flash',
      description: 'Google Gemini 2.0 Flash via AI Studio',
      model,
      maxTokens: 8192,
      supportsToolCalling: true,
    };
  } catch (error) {
    console.error('Error creating Gemini provider:', error);
    throw error;
  }
}

export function getModelProvider(modelId: ChatModel): ModelProvider {
  console.log('Getting provider for model:', modelId);
  
  try {
    switch (modelId) {
      case 'claude':
        return createBedrockProvider();
      case 'gemini':
        return createGeminiProvider();
      default:
        throw new Error(`Unknown model: ${modelId}`);
    }
  } catch (error) {
    console.error('Error in getModelProvider:', error);
    throw error;
  }
}

export function getAvailableModels(): ModelProvider[] {
  return [
    createBedrockProvider(),
    createGeminiProvider(),
  ];
}
