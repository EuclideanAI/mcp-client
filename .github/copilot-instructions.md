# MCP Client Architecture Summary

## Stateless MCP Connection Approach

This project implements a **stateless** Model Context Protocol (MCP) client architecture, similar to typical MCP Inspectors.

### Key Principles

1. **No Persistent Connections**: Each MCP operation (testConnection, callTool, listTools, etc.) creates a fresh connection, performs the action, and disconnects immediately.

2. **Configuration Management**:

   - MCP server configurations (URL, bearer token) are stored in localStorage per service
   - No server-side connection pools or session management
   - Each request passes the current config to establish a new connection

3. **Component Architecture**:
   - **ServiceTabs**: Manages UI tab state only, no connection state
   - **ServerConfiguration**: Handles test connection results only (not persistent connections)
   - **MCP Client Hooks**: Provides complete API interface for all MCP operations
   - **MCP Actions**: Server-side functions that create temporary connections for each operation

### Benefits of Stateless Approach

- **Simplicity**: No connection lifecycle management
- **Reliability**: Each request is independent, errors are isolated
- **Security**: No long-lived credentials or sessions
- **Scalability**: Works well in serverless and multi-tenant environments
- **Debugging**: Easy to trace and debug individual requests

### Implementation Pattern

```typescript
// Each MCP operation follows this pattern:
export async function someMCPOperation(serviceId: string, ...args) {
  const config = loadServiceConfig(serviceId); // Get config from localStorage
  const client = new MCPServerClient(config); // Create new client
  await client.connect(); // Connect
  const result = await client.doSomething(); // Perform operation
  await client.disconnect(); // Disconnect
  return result;
}
```

### File Structure

- `components/service-tabs.tsx`: Multi-service UI with tab navigation
- `components/server-configuration.tsx`: MCP server config UI per service
- `app/utils/mcp-client-hooks.ts`: Client-side MCP API wrappers
- `app/actions/mcp.ts`: Server-side MCP operations
- `app/utils/storage.ts`: localStorage persistence utilities
- `app/types/mcp-types.ts`: MCP configuration types

This architecture prioritizes simplicity and reliability over performance optimization, making it ideal for developer tools and inspection interfaces.
