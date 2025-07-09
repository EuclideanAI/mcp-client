'use client';

import { 
  testMCPConnection as testMCPConnectionAction,
  connectToMCPServer as connectToMCPServerAction,
  disconnectFromMCPServer as disconnectFromMCPServerAction,
  callMCPToolWithConfig as callMCPToolWithConfigAction,
  listMCPTools as listMCPToolsAction,
  getMCPPromptWithConfig as getMCPPromptWithConfigAction,
  listMCPPrompts as listMCPPromptsAction,
  readMCPResourceWithConfig as readMCPResourceWithConfigAction,
  listMCPResources as listMCPResourcesAction,
} from '@/app/actions/mcp';
import { MCPHttpConfig } from '@/app/types/mcp-types';
import { loadServiceConfig } from '@/app/utils/storage';

// Client-side configuration types (re-export for convenience)
export type MCPClientConfig = MCPHttpConfig;

// Client-side wrapper functions
export async function testMCPConnection(
  config: MCPClientConfig
): Promise<{ success: boolean; tools?: unknown[]; error?: string }> {
  return await testMCPConnectionAction(config);
}

export async function connectToMCPServer(
  serviceId: string,
  config: MCPClientConfig
): Promise<{ success: boolean; tools?: unknown[]; error?: string }> {
  return await connectToMCPServerAction(serviceId, config);
}

export async function disconnectFromMCPServer(
  serviceId: string
): Promise<{ success: boolean; error?: string }> {
  return await disconnectFromMCPServerAction(serviceId);
}

export async function callMCPTool(
  serviceId: string,
  toolName: string,
  arguments_: Record<string, unknown> = {}
): Promise<{
  success: boolean;
  content?: unknown[];
  isError?: boolean;
  error?: string;
}> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the stateless action with the loaded config
  return await callMCPToolWithConfigAction(config, toolName, arguments_);
}

export async function listMCPTools(
  serviceId: string
): Promise<{ success: boolean; tools?: unknown[]; error?: string }> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the action with the loaded config
  return await listMCPToolsAction(serviceId, config);
}

export async function getMCPPrompt(
  serviceId: string,
  promptName: string,
  arguments_: Record<string, unknown> = {}
): Promise<{
  success: boolean;
  description?: string;
  messages?: unknown[];
  error?: string;
}> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the stateless action with the loaded config
  return await getMCPPromptWithConfigAction(config, promptName, arguments_);
}

export async function listMCPPrompts(
  serviceId: string
): Promise<{ success: boolean; prompts?: unknown[]; error?: string }> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the action with the loaded config
  return await listMCPPromptsAction(serviceId, config);
}

export async function readMCPResource(
  serviceId: string,
  uri: string
): Promise<{
  success: boolean;
  contents?: unknown[];
  error?: string;
}> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the stateless action with the loaded config
  return await readMCPResourceWithConfigAction(config, uri);
}

export async function listMCPResources(
  serviceId: string
): Promise<{ success: boolean; resources?: unknown[]; error?: string }> {
  // Load service configuration from localStorage
  const config = loadServiceConfig(serviceId);
  
  if (!config) {
    return {
      success: false,
      error: `No configuration found for service ${serviceId}. Please configure the service first.`
    };
  }
  
  // Call the action with the loaded config
  return await listMCPResourcesAction(serviceId, config);
}

// Hook for managing MCP service connections
export function useMCPService(serviceId: string) {
  const connect = async (config: MCPClientConfig) => {
    return await connectToMCPServer(serviceId, config);
  };

  const disconnect = async () => {
    return await disconnectFromMCPServer(serviceId);
  };

  const testConnection = async (config: MCPClientConfig) => {
    return await testMCPConnection(config);
  };

  const callTool = async (toolName: string, arguments_: Record<string, unknown> = {}) => {
    return await callMCPTool(serviceId, toolName, arguments_);
  };

  const listTools = async () => {
    return await listMCPTools(serviceId);
  };

  const getPrompt = async (promptName: string, arguments_: Record<string, unknown> = {}) => {
    return await getMCPPrompt(serviceId, promptName, arguments_);
  };

  const listPrompts = async () => {
    return await listMCPPrompts(serviceId);
  };

  const readResource = async (uri: string) => {
    return await readMCPResource(serviceId, uri);
  };

  const listResources = async () => {
    return await listMCPResources(serviceId);
  };

  return {
    connect,
    disconnect,
    testConnection,
    callTool,
    listTools,
    getPrompt,
    listPrompts,
    readResource,
    listResources,
  };
}