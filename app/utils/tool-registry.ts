// Tool registry that bridges MCP tools with AI SDK tool definitions
'use client';

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { listMCPTools, callMCPTool } from '@/app/utils/mcp-client-hooks';
import { loadServiceConfig, getServiceIds, loadToolSelection } from '@/app/utils/storage';

export interface MCPToolDefinition {
  name: string;
  description?: string;
  serviceId: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface AISDKTool {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  // Add JSON schema for serialization
  jsonSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
  serviceId: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ToolRegistryState {
  tools: MCPToolDefinition[];
  aiTools: AISDKTool[];
  isLoading: boolean;
  error?: string;
  lastUpdated?: Date;
}

export function useToolRegistry() {
  const [state, setState] = useState<ToolRegistryState>({
    tools: [],
    aiTools: [],
    isLoading: false,
  });

  const refreshTools = useCallback(async () => {
    console.log('🔄 useToolRegistry: refreshTools called');
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const serviceIds = getServiceIds();
      const allTools: MCPToolDefinition[] = [];

      // Fetch tools from all configured services
      for (const serviceId of serviceIds) {
        const config = loadServiceConfig(serviceId);
        if (!config) continue;

        try {
          const result = await listMCPTools(serviceId);
          if (result.success && result.tools) {
            const serviceTools = (result.tools as unknown[]).map(tool => {
              const t = tool as {
                name: string;
                description?: string;
                inputSchema?: {
                  type: string;
                  properties?: Record<string, unknown>;
                  required?: string[];
                };
              };
              return {
                name: t.name,
                description: t.description,
                serviceId,
                inputSchema: t.inputSchema,
              };
            });
            allTools.push(...serviceTools);
          }
        } catch (error) {
          console.warn(`Failed to load tools from service ${serviceId}:`, error);
        }
      }

      // Convert to AI SDK compatible tools and filter by selection state
      const toolSelection = loadToolSelection();
      console.log('🔧 useToolRegistry: tool selection state', toolSelection);
      
      const aiTools = allTools
        .filter(tool => {
          const toolId = `${tool.serviceId}:${tool.name}`;
          const isSelected = toolSelection[toolId] ?? true; // Default to selected if not set
          return isSelected;
        })
        .map(tool => convertToAISDKTool(tool));

      console.log('🔧 useToolRegistry: filtered tools', {
        total: allTools.length,
        selected: aiTools.length,
        selectedTools: aiTools.map(t => `${t.serviceId}:${t.name}`),
      });

      setState(prev => ({
        ...prev,
        tools: allTools,
        aiTools,
        isLoading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      console.error('Failed to refresh tools:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load tools',
      }));
    }
  }, []);

  const getToolByName = useCallback((name: string): AISDKTool | undefined => {
    return state.aiTools.find(tool => tool.name === name);
  }, [state.aiTools]);

  const getToolsByService = useCallback((serviceId: string): AISDKTool[] => {
    return state.aiTools.filter(tool => tool.serviceId === serviceId);
  }, [state.aiTools]);

  // Auto-refresh tools when component mounts
  useEffect(() => {
    refreshTools();
  }, [refreshTools]);

  return {
    tools: state.tools,
    aiTools: state.aiTools,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refreshTools,
    getToolByName,
    getToolsByService,
  };
}

function convertToAISDKTool(mcpTool: MCPToolDefinition): AISDKTool {
  // Convert MCP input schema to Zod schema
  const parameters = convertToZodSchema(mcpTool.inputSchema);
  
  // Convert to JSON schema for serialization
  const jsonSchema = convertToJsonSchema(mcpTool.inputSchema);
  
  // Determine risk level based on tool name
  const riskLevel = determineToolRiskLevel(mcpTool.name);

  return {
    name: mcpTool.name,
    description: mcpTool.description || 'MCP tool',
    parameters,
    jsonSchema,
    serviceId: mcpTool.serviceId,
    riskLevel,
    execute: async (args: Record<string, unknown>) => {
      const result = await callMCPTool(mcpTool.serviceId, mcpTool.name, args);
      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }
      return result.content;
    },
  };
}

function convertToZodSchema(inputSchema?: MCPToolDefinition['inputSchema']): z.ZodSchema {
  if (!inputSchema || inputSchema.type !== 'object') {
    return z.object({});
  }

  const properties = inputSchema.properties || {};
  const required = inputSchema.required || [];
  
  const zodFields: Record<string, z.ZodSchema> = {};

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as {
      type?: string;
      description?: string;
      items?: unknown;
    };
    let zodType: z.ZodSchema;

    switch (propSchema.type) {
      case 'string':
        zodType = z.string();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'number':
        zodType = z.number();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'boolean':
        zodType = z.boolean();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      case 'array':
        zodType = z.array(z.unknown());
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
        break;
      default:
        zodType = z.unknown();
        if (propSchema.description) {
          zodType = zodType.describe(propSchema.description);
        }
    }

    // Make optional if not required
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }

    zodFields[key] = zodType;
  }

  return z.object(zodFields);
}

function convertToJsonSchema(inputSchema?: MCPToolDefinition['inputSchema']): {
  type: string;
  properties: Record<string, unknown>;
  required: string[];
} {
  if (!inputSchema || inputSchema.type !== 'object') {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }

  const properties = inputSchema.properties || {};
  const required = inputSchema.required || [];
  
  const jsonProperties: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(properties)) {
    const propSchema = prop as {
      type?: string;
      description?: string;
      items?: unknown;
    };

    switch (propSchema.type) {
      case 'string':
        jsonProperties[key] = {
          type: 'string',
          description: propSchema.description,
        };
        break;
      case 'number':
        jsonProperties[key] = {
          type: 'number',
          description: propSchema.description,
        };
        break;
      case 'boolean':
        jsonProperties[key] = {
          type: 'boolean',
          description: propSchema.description,
        };
        break;
      case 'array':
        jsonProperties[key] = {
          type: 'array',
          items: { type: 'string' }, // Default to string items
          description: propSchema.description,
        };
        break;
      default:
        jsonProperties[key] = {
          type: 'string', // Default to string
          description: propSchema.description,
        };
    }
  }

  return {
    type: 'object',
    properties: jsonProperties,
    required,
  };
}

function determineToolRiskLevel(toolName: string): 'low' | 'medium' | 'high' {
  const name = toolName.toLowerCase();

  // High-risk operations
  if (
    name.includes('delete') ||
    name.includes('remove') ||
    name.includes('destroy') ||
    name.includes('create') ||
    name.includes('update') ||
    name.includes('modify') ||
    name.includes('merge') ||
    name.includes('close') ||
    name.includes('approve')
  ) {
    return 'high';
  }

  // Medium-risk operations
  if (
    name.includes('write') ||
    name.includes('send') ||
    name.includes('execute') ||
    name.includes('run') ||
    name.includes('upload') ||
    name.includes('post') ||
    name.includes('put') ||
    name.includes('patch') ||
    name.includes('comment') ||
    name.includes('assign')
  ) {
    return 'medium';
  }

  // Low-risk operations (read-only, search, etc.)
  return 'low';
}
