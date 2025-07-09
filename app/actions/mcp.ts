'use server';

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MCPHttpConfig } from "@/app/types/mcp-types";

// Server-side MCP client manager
class MCPServerClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnected = false;

  constructor(private config: MCPHttpConfig) {
    this.client = new Client({
      name: "mcp-client",
      version: "1.0.0"
    });
  }

  private createTransport(): StreamableHTTPClientTransport {
    const requestInit: RequestInit = {};
    
    if (this.config.bearerToken) {
      requestInit.headers = {
        'Authorization': `Bearer ${this.config.bearerToken}`,
      };
    }

    return new StreamableHTTPClientTransport(
      new URL(this.config.url),
      { requestInit }
    );
  }

  async connect(): Promise<void> {
    try {
      this.transport = this.createTransport();
      await this.client.connect(this.transport);
      this.isConnected = true;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw new Error(`MCP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        this.isConnected = false;
      }
    } catch (error) {
      console.error("Error during MCP disconnect:", error);
    }
  }

  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error("MCP Client is not connected. Call connect() first.");
    }
  }

  async listTools(): Promise<unknown[]> {
    this.ensureConnected();
    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      console.error("Failed to list tools:", error);
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async callTool(request: { name: string; arguments?: Record<string, unknown> }): Promise<{
    content: unknown[];
    isError?: boolean;
  }> {
    this.ensureConnected();
    try {
      const response = await this.client.callTool({
        name: request.name,
        arguments: request.arguments as { [key: string]: string } || {}
      });

      return {
        content: Array.isArray(response.content) ? response.content : [],
        isError: typeof response.isError === 'boolean' ? response.isError : false
      };
    } catch (error) {
      console.error(`Failed to call tool "${request.name}":`, error);
      throw new Error(`Failed to call tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listPrompts(): Promise<unknown[]> {
    this.ensureConnected();
    try {
      const response = await this.client.listPrompts();
      return response.prompts || [];
    } catch (error) {
      console.error("Failed to list prompts:", error);
      throw new Error(`Failed to list prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPrompt(request: { name: string; arguments?: Record<string, unknown> }): Promise<{
    description?: string;
    messages?: unknown[];
  }> {
    this.ensureConnected();
    try {
      const response = await this.client.getPrompt({
        name: request.name,
        arguments: request.arguments as { [key: string]: string } || {}
      });
      return response;
    } catch (error) {
      console.error(`Failed to get prompt "${request.name}":`, error);
      throw new Error(`Failed to get prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listResources(): Promise<unknown[]> {
    this.ensureConnected();
    try {
      const response = await this.client.listResources();
      return response.resources || [];
    } catch (error) {
      console.error("Failed to list resources:", error);
      throw new Error(`Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async readResource(request: { uri: string }): Promise<{
    contents: unknown[];
  }> {
    this.ensureConnected();
    try {
      const response = await this.client.readResource({
        uri: request.uri
      });
      return response;
    } catch (error) {
      console.error(`Failed to read resource "${request.uri}":`, error);
      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Client connection pool for managing multiple service connections
const clientPool = new Map<string, MCPServerClient>();

// Server Actions
export async function testMCPConnection(config: MCPHttpConfig): Promise<{
  success: boolean;
  tools?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    console.log('Testing MCP connection with config:', config);
    
    // Validate HTTP configuration
    if (!config.url || config.url.trim() === '') {
      return {
        success: false,
        error: 'URL is required for HTTP transport'
      };
    }

    try {
      new URL(config.url);
    } catch {
      return {
        success: false,
        error: `Invalid URL format: ${config.url}`
      };
    }
    
    // Create and connect client
    client = new MCPServerClient(config);
    await client.connect();
    
    console.log('MCP client connected, testing tools...');
    
    // Test connection by listing tools
    const tools = await client.listTools();
    
    console.log('Connection test successful, found tools:', tools);
    
    return {
      success: true,
      tools: tools
    };

  } catch (error) {
    console.error('Connection test failed:', error);
    
    let errorMessage = 'Unknown connection error';
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = `Cannot reach server at ${config.url}. Please check:
        • Server is running and accessible
        • URL is correct (including protocol)
        • No CORS restrictions
        • Network connectivity`;
      } else if (error.message.includes('CORS')) {
        errorMessage = `CORS error: The server needs to allow requests from this domain.`;
      } else if (error.message.includes('NetworkError')) {
        errorMessage = `Network error: Cannot connect to ${config.url}. Check if the server is running.`;
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  } finally {
    // Always disconnect test client
    if (client) {
      try {
        await client.disconnect();
      } catch (disconnectError) {
        console.warn('Error disconnecting test client:', disconnectError);
      }
    }
  }
}

export async function connectToMCPServer(serviceId: string, config: MCPHttpConfig): Promise<{
  success: boolean;
  tools?: unknown[];
  error?: string;
}> {
  try {
    // Disconnect existing client if any
    const existingClient = clientPool.get(serviceId);
    if (existingClient) {
      await existingClient.disconnect();
      clientPool.delete(serviceId);
    }

    // Create new client
    const client = new MCPServerClient(config);
    await client.connect();
    
    // Store in pool
    clientPool.set(serviceId, client);
    
    // Get tools to confirm connection
    const tools = await client.listTools();
    
    return {
      success: true,
      tools: tools
    };
  } catch (error) {
    console.error(`Failed to connect service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export async function disconnectFromMCPServer(serviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = clientPool.get(serviceId);
    if (client) {
      await client.disconnect();
      clientPool.delete(serviceId);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to disconnect service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Disconnect failed'
    };
  }
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
  try {
    // For stateless operation, we need the config to be passed or loaded
    // First try to get from client pool (legacy), then create new connection
    const clientFromPool = clientPool.get(serviceId);
    
    if (clientFromPool) {
      // Use existing connection if available
      const result = await clientFromPool.callTool({
        name: toolName,
        arguments: arguments_
      });
      
      return {
        success: true,
        content: result.content,
        isError: result.isError
      };
    }

    // If no pooled connection, we need to create a stateless connection
    // This requires the config to be passed - for now, return error asking for connection
    return {
      success: false,
      error: `No active connection for service ${serviceId}. Please test connection first or use the stateless callMCPToolWithConfig function.`
    };

  } catch (error) {
    console.error(`Failed to call tool ${toolName} for service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool call failed'
    };
  }
}

// Add a new stateless version that takes config
export async function callMCPToolWithConfig(
  config: MCPHttpConfig,
  toolName: string,
  arguments_: Record<string, unknown> = {}
): Promise<{
  success: boolean;
  content?: unknown[];
  isError?: boolean;
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // Create and connect client
    client = new MCPServerClient(config);
    await client.connect();
    
    const result = await client.callTool({
      name: toolName,
      arguments: arguments_
    });
    
    return {
      success: true,
      content: result.content,
      isError: result.isError
    };

  } catch (error) {
    console.error(`Failed to call tool ${toolName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool call failed'
    };
  } finally {
    // Always disconnect stateless client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
}

export async function listMCPTools(serviceId: string, config?: MCPHttpConfig): Promise<{
  success: boolean;
  tools?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // If config is provided, use stateless approach (create fresh connection)
    if (config) {
      console.log(`Creating fresh connection for ${serviceId} to list tools`);
      
      // Validate configuration
      if (!config.url || config.url.trim() === '') {
        return {
          success: false,
          error: 'URL is required for HTTP transport'
        };
      }

      try {
        new URL(config.url);
      } catch {
        return {
          success: false,
          error: `Invalid URL format: ${config.url}`
        };
      }

      // Create fresh client and connect
      client = new MCPServerClient(config);
      await client.connect();
      
      // List tools
      const tools = await client.listTools();
      
      return {
        success: true,
        tools: tools
      };
    }

    // Fallback to connection pool approach (for backward compatibility)
    const poolClient = clientPool.get(serviceId);
    if (!poolClient) {
      return {
        success: false,
        error: `No configuration provided and no active connection for service ${serviceId}`
      };
    }

    const tools = await poolClient.listTools();
    
    return {
      success: true,
      tools: tools
    };
  } catch (error) {
    console.error(`Failed to list tools for service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List tools failed'
    };
  } finally {
    // Always disconnect the fresh client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
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
  // This function needs to be updated to be stateless
  // For now, return error asking for a stateless version
  console.log(`getMCPPrompt called for ${serviceId}, ${promptName}`, arguments_);
  return {
    success: false,
    error: `getMCPPrompt not yet converted to stateless. Use getMCPPromptWithConfig instead.`
  };
}

// Add stateless version
export async function getMCPPromptWithConfig(
  config: MCPHttpConfig,
  promptName: string,
  arguments_: Record<string, unknown> = {}
): Promise<{
  success: boolean;
  description?: string;
  messages?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // Create and connect client
    client = new MCPServerClient(config);
    await client.connect();

    const result = await client.getPrompt({
      name: promptName,
      arguments: arguments_
    });
    
    return {
      success: true,
      description: result.description,
      messages: result.messages
    };
  } catch (error) {
    console.error(`Failed to get prompt ${promptName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Get prompt failed'
    };
  } finally {
    // Always disconnect stateless client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
}

export async function listMCPPrompts(serviceId: string, config?: MCPHttpConfig): Promise<{
  success: boolean;
  prompts?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // If config is provided, use stateless approach
    if (config) {
      console.log(`Creating fresh connection for ${serviceId} to list prompts`);
      
      // Validate configuration
      if (!config.url || config.url.trim() === '') {
        return {
          success: false,
          error: 'URL is required for HTTP transport'
        };
      }

      // Create fresh client and connect
      client = new MCPServerClient(config);
      await client.connect();
      
      // List prompts
      const prompts = await client.listPrompts();
      
      return {
        success: true,
        prompts: prompts
      };
    }

    // Fallback to connection pool approach (for backward compatibility)
    const poolClient = clientPool.get(serviceId);
    if (!poolClient) {
      return {
        success: false,
        error: `No configuration provided and no active connection for service ${serviceId}`
      };
    }

    const prompts = await poolClient.listPrompts();
    
    return {
      success: true,
      prompts: prompts
    };
  } catch (error) {
    console.error(`Failed to list prompts for service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List prompts failed'
    };
  } finally {
    // Always disconnect the fresh client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
}

export async function readMCPResource(
  serviceId: string,
  uri: string
): Promise<{
  success: boolean;
  contents?: unknown[];
  error?: string;
}> {
  // This function needs to be updated to be stateless
  // For now, return error asking for a stateless version
  console.log(`readMCPResource called for ${serviceId}, ${uri}`);
  return {
    success: false,
    error: `readMCPResource not yet converted to stateless. Use readMCPResourceWithConfig instead.`
  };
}

// Add stateless version
export async function readMCPResourceWithConfig(
  config: MCPHttpConfig,
  uri: string
): Promise<{
  success: boolean;
  contents?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // Create and connect client
    client = new MCPServerClient(config);
    await client.connect();

    const result = await client.readResource({ uri });
    
    return {
      success: true,
      contents: result.contents
    };
  } catch (error) {
    console.error(`Failed to read resource ${uri}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Read resource failed'
    };
  } finally {
    // Always disconnect stateless client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
}

export async function listMCPResources(serviceId: string, config?: MCPHttpConfig): Promise<{
  success: boolean;
  resources?: unknown[];
  error?: string;
}> {
  let client: MCPServerClient | null = null;

  try {
    // If config is provided, use stateless approach
    if (config) {
      console.log(`Creating fresh connection for ${serviceId} to list resources`);
      
      // Validate configuration
      if (!config.url || config.url.trim() === '') {
        return {
          success: false,
          error: 'URL is required for HTTP transport'
        };
      }

      // Create fresh client and connect
      client = new MCPServerClient(config);
      await client.connect();
      
      // List resources
      const resources = await client.listResources();
      
      return {
        success: true,
        resources: resources
      };
    }

    // Fallback to connection pool approach (for backward compatibility)
    const poolClient = clientPool.get(serviceId);
    if (!poolClient) {
      return {
        success: false,
        error: `No configuration provided and no active connection for service ${serviceId}`
      };
    }

    const resources = await poolClient.listResources();
    
    return {
      success: true,
      resources: resources
    };
  } catch (error) {
    console.error(`Failed to list resources for service ${serviceId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'List resources failed'
    };
  } finally {
    // Always disconnect the fresh client
    if (client) {
      try {
        await client.disconnect();
      } catch (error) {
        console.error('Error disconnecting client:', error);
      }
    }
  }
}
