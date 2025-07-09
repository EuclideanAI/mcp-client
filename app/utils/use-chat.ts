'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { useCallback, useEffect, useState } from 'react';
import { ChatModel } from '@/app/types/chat-types';
import { useToolRegistry } from './tool-registry';
import { callMCPToolWithConfig } from '@/app/actions/mcp';
import { loadAllServiceConfigs, StoredMCPConfig } from './storage';
import { toast } from 'sonner';
import { summarizeToolResult } from '@/app/actions/summarize';

const MAX_TOOLS_PER_REQUEST = 30;

export function useChat(initialModel: ChatModel = 'gemini') {
  const { aiTools, refreshTools } = useToolRegistry();
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, StoredMCPConfig>>({});

  // Load service configurations for tool execution
  useEffect(() => {
    const configs = loadAllServiceConfigs();
    setServiceConfigs(configs);
  }, []);

  // Listen for localStorage changes to refresh tools when selection changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mcp-client-tool-selection' && e.newValue !== e.oldValue) {
        console.log('🔄 Tool selection changed in localStorage, refreshing tools');
        refreshTools();
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events from the same tab
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === 'mcp-client-tool-selection') {
        console.log('🔄 Tool selection changed in same tab, refreshing tools');
        refreshTools();
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [refreshTools]);

  // Prepare tools for AI SDK with permission wrapper
  const toolsForAI = aiTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    // Use JSON schema instead of Zod schema for serialization
    parameters: tool.jsonSchema,
    serviceId: tool.serviceId,
    // Don't include execute function - it will be reconstructed on the server
  }));

  // Debug logging for tool changes
  useEffect(() => {
    console.log('🔧 useChat: aiTools updated', {
      count: aiTools.length,
      tools: aiTools.map(t => `${t.serviceId}:${t.name}`),
    });
  }, [aiTools]);

  const chat = useAIChat({
    api: '/api/chat',
    initialMessages: [],
    body: {
      model: initialModel,
      tools: toolsForAI,
    },
    // Re-initialize when tools change
    key: `chat-${initialModel}-${aiTools.length}`,
    onError: (error) => {
      console.error('❌ AI SDK Chat Error:', error);
      console.error('- Error type:', error?.constructor?.name);
      console.error('- Error message:', error.message);
      console.error('- Error stack:', error.stack);
    },
    onResponse: (response) => {
      console.log('📡 AI SDK Response received:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        type: response.type,
        url: response.url,
      });
    },
    onFinish: (message) => {
      console.log('✅ AI SDK Chat finished:', {
        messageId: message.id,
        role: message.role,
        contentLength: message.content?.length || 0,
        toolInvocations: message.toolInvocations?.length || 0,
      });
    },
    // Handle tool calls client-side per MCP protocol
    onToolCall: async ({ toolCall }) => {
      console.log('🔧 Tool call received:', toolCall);
      
      // Find the tool configuration
      const tool = aiTools.find(t => t.name === toolCall.toolName);
      if (!tool) {
        console.error('❌ Tool not found:', toolCall.toolName);
        return { error: 'Tool not found' };
      }

      // Get service configuration
      const serviceConfig = serviceConfigs[tool.serviceId];
      if (!serviceConfig) {
        console.error('❌ Service configuration not found for:', tool.serviceId);
        return { error: 'Service configuration not found' };
      }

      try {
        // Execute tool via MCP
        console.log('🚀 Executing tool via MCP:', {
          toolName: toolCall.toolName,
          serviceId: tool.serviceId,
          arguments: toolCall.args,
        });

        const result = await callMCPToolWithConfig(
          serviceConfig,
          toolCall.toolName,
          toolCall.args as Record<string, unknown>
        );

        if (result.success) {
          console.log('✅ Tool execution successful:', result);
          
          // Get the original user message for context
          const lastMessage = chat.messages[chat.messages.length - 1];
          const originalQuestion = lastMessage?.content || '';
          
          // Summarize the result
          console.log('📝 Generating summary for tool result...');
          const summaryResult = await summarizeToolResult({
            originalQuestion,
            toolName: toolCall.toolName,
            toolArgs: toolCall.args as Record<string, unknown>,
            rawResult: result.content,
            model: initialModel
          });

          if (summaryResult.success && summaryResult.summary) {
            console.log('✅ Summary generated successfully');
            // Return structured result with summary information
            return { 
              result: result.content,
              summary: summaryResult.summary,
              rawResult: result.content
            };
          } else {
            console.warn('⚠️ Summary generation failed, returning raw result only');
            return { result: result.content };
          }
        } else {
          console.error('❌ Tool execution failed:', result.error);
          return { error: result.error };
        }
      } catch (error) {
        console.error('❌ Tool execution error:', error);
        return { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  });

  // Custom submit handler that checks tool limit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    console.log('🚀 Chat submit triggered');
    console.log('- Tools for AI count:', toolsForAI.length);
    console.log('- Tool names:', toolsForAI.map(t => t.name));
    console.log('- Sample tool structure:', toolsForAI[0] || 'No tools');
    
    // Check tool limit before submitting
    if (toolsForAI.length > MAX_TOOLS_PER_REQUEST) {
      console.log('❌ Tool limit exceeded, showing warning');
      toast.warning(
        `Tool limit exceeded: ${toolsForAI.length} tools available, but only ${MAX_TOOLS_PER_REQUEST} tools can be used per request. Please disable some tools in Available Actions.`,
        {
          duration: 6000,
          position: 'top-center',
          className: 'text-base font-medium',
          style: {
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
          },
        }
      );
      return; // Don't submit if too many tools
    }

    console.log('✅ Tool limit check passed, submitting to AI SDK');
    // If within limit, proceed with normal submission
    chat.handleSubmit(e);
  }, [chat, toolsForAI]);

  const updateSettings = useCallback((newSettings: { model?: ChatModel; temperature?: number; maxTokens?: number }) => {
    // For AI SDK useChat, we can update the body to include new settings
    // This is a simplified approach - in practice you might want to handle this differently
    if (newSettings.model) {
      // You might need to reinitialize the chat with new settings
      console.log('Model updated to:', newSettings.model);
    }
  }, []);

  const clearConversation = useCallback(() => {
    chat.setMessages([]);
  }, [chat]);

  return {
    messages: chat.messages,
    input: chat.input,
    handleInputChange: chat.handleInputChange,
    handleSubmit: handleSubmit, // Use our custom submit handler
    isLoading: chat.isLoading,
    isStreaming: chat.isLoading, // AI SDK uses isLoading for streaming state
    sendMessage: (content: string) => {
      chat.setInput(content);
      // Use our custom submit handler for sendMessage too
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    },
    clearConversation,
    updateSettings,
    settings: { model: initialModel, temperature: 0.7, maxTokens: 4096 },
  };
}
