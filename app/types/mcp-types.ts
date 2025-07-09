// Shared types for MCP server configuration (HTTP only)
export interface MCPHttpConfig {
  url: string;
  bearerToken?: string;
}

export type MCPServerConfig = MCPHttpConfig;