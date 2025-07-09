// Chat-related types for the LLM integration
import { Message } from 'ai';

// Extended tool invocation with summary support
export interface EnhancedToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'partial-call' | 'call' | 'result';
  result?: unknown;
  summary?: string;
  rawResult?: unknown;
}

// Extend the AI SDK Message type with our custom properties
export interface ChatMessage extends Omit<Message, 'toolInvocations'> {
  timestamp?: Date;
  toolInvocations?: EnhancedToolInvocation[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  serviceId: string;
  status: 'pending' | 'approved' | 'denied' | 'executing' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  timestamp: Date;
}

export interface ToolPermissionRequest {
  toolCall: ToolCall;
  toolDescription?: string;
  riskLevel: 'low' | 'medium' | 'high';
  onApprove: () => void;
  onDeny: () => void;
}

export type ChatModel = 'claude' | 'gemini';

export interface ChatSettings {
  model: ChatModel;
  temperature?: number;
  maxTokens?: number;
}

export interface ConversationState {
  messages: ChatMessage[];
  pendingToolCalls: ToolCall[];
  isStreaming: boolean;
  settings: ChatSettings;
}
