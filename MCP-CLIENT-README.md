# MCP Client for TypeScript

A comprehensive TypeScript client for the Model Context Protocol (MCP) that supports both STDIO and HTTP transport layers.

## Features

- ✅ **STDIO Transport** - Connect to MCP servers via standard input/output
- ✅ **HTTP Transport** - Connect to MCP servers via StreamableHTTP
- ✅ **Type Safety** - Full TypeScript support with proper interfaces
- ✅ **Error Handling** - Comprehensive error catching and meaningful error messages
- ✅ **Connection Management** - Proper connection lifecycle management
- ✅ **Reconnection Support** - Configurable reconnection options for HTTP transport

## Installation

The MCP SDK is already included in your project dependencies:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.15.0"
  }
}
```

## Usage

### STDIO Transport

Use STDIO transport to connect to MCP servers running as command-line processes:

```typescript
import {
  createMCPClient,
  TransportType,
  disconnectMCPClient,
} from "./app/utils/mcp-client";

const client = await createMCPClient({
  name: "my-stdio-client",
  version: "1.0.0",
  transportType: TransportType.STDIO,
  command: "node",
  args: ["path/to/your/mcp-server.js"],
});

// Use the client...
await disconnectMCPClient(client);
```

### HTTP Transport

Use HTTP transport to connect to MCP servers over HTTP with Server-Sent Events:

```typescript
import {
  createMCPClient,
  TransportType,
  disconnectMCPClient,
} from "./app/utils/mcp-client";

const client = await createMCPClient({
  name: "my-http-client",
  version: "1.0.0",
  transportType: TransportType.HTTP,
  url: "http://localhost:8080/mcp",
  reconnectionOptions: {
    maxReconnectionDelay: 30000,
    initialReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 5,
  },
});

// Use the client...
await disconnectMCPClient(client);
```

## API Reference

### Client Methods

#### Connection Management

- `connect()` - Connect to the MCP server
- `disconnect()` - Disconnect from the MCP server
- `connected` - Check if client is connected

#### MCP Operations

- `listPrompts()` - Get all available prompts
- `getPrompt(request)` - Execute a specific prompt
- `listResources()` - Get all available resources
- `readResource(request)` - Read content from a resource
- `listTools()` - Get all available tools
- `callTool(request)` - Execute a specific tool
- `getCapabilities()` - Get server capabilities
- `executeSequence(operations)` - Run multiple operations sequentially

### Configuration Types

#### STDIO Configuration

```typescript
interface MCPStdioConfig {
  name: string;
  version: string;
  transportType: TransportType.STDIO;
  command: string; // Command to execute (e.g., "node", "python")
  args: string[]; // Arguments for the command
}
```

#### HTTP Configuration

```typescript
interface MCPHttpConfig {
  name: string;
  version: string;
  transportType: TransportType.HTTP;
  url: string; // Server URL
  authProvider?: OAuthClientProvider; // Optional auth provider
  requestInit?: RequestInit; // Custom request options
  sessionId?: string; // Session identifier
  reconnectionOptions?: {
    // Reconnection settings
    maxReconnectionDelay: number;
    initialReconnectionDelay: number;
    reconnectionDelayGrowFactor: number;
    maxRetries: number;
  };
}
```

## Examples

### Basic Operations

```typescript
const client = await createMCPClient({
  name: "example-client",
  version: "1.0.0",
  transportType: TransportType.STDIO,
  command: "node",
  args: ["server.js"],
});

try {
  // List available prompts
  const prompts = await client.listPrompts();
  console.log("Available prompts:", prompts);

  // Execute a prompt
  if (prompts.length > 0) {
    const prompt = prompts[0] as { name: string };
    const result = await client.getPrompt({
      name: prompt.name,
      arguments: { input: "Hello MCP!" },
    });
    console.log("Prompt result:", result);
  }

  // List and call tools
  const tools = await client.listTools();
  if (tools.length > 0) {
    const tool = tools[0] as { name: string };
    const toolResult = await client.callTool({
      name: tool.name,
      arguments: { input: "Test data" },
    });
    console.log("Tool result:", toolResult);
  }

  // Read resources
  const resources = await client.listResources();
  if (resources.length > 0) {
    const resource = resources[0] as { uri: string };
    const content = await client.readResource({
      uri: resource.uri,
    });
    console.log("Resource content:", content);
  }
} finally {
  await disconnectMCPClient(client);
}
```

### Error Handling

```typescript
try {
  const client = await createMCPClient(config);

  try {
    const result = await client.callTool({
      name: "example-tool",
      arguments: { input: "test" },
    });

    if (result.isError) {
      console.error("Tool returned error:", result.content);
    } else {
      console.log("Tool succeeded:", result.content);
    }
  } catch (toolError) {
    console.error("Tool call failed:", toolError);
  }
} catch (connectionError) {
  console.error("Failed to connect:", connectionError);
} finally {
  if (client) {
    await disconnectMCPClient(client);
  }
}
```

### Sequence Operations

```typescript
// Execute multiple operations in sequence with error handling
const results = await client.executeSequence([
  () => client.listPrompts(),
  () => client.listResources(),
  () => client.listTools(),
]);

console.log("Sequence results:", results);
```

## Transport Comparison

| Feature                | STDIO           | HTTP             |
| ---------------------- | --------------- | ---------------- |
| **Use Case**           | Local processes | Remote servers   |
| **Protocol**           | Standard I/O    | HTTP + SSE       |
| **Reconnection**       | Process restart | Automatic        |
| **Authentication**     | Not applicable  | OAuth support    |
| **Session Management** | Not applicable  | Session IDs      |
| **Scalability**        | Single process  | Multiple clients |

## Running Examples

### Command Line Interface

The examples now support command line arguments for choosing which example to run:

```bash
# Show usage information
npx tsx example-usage.ts

# Run specific examples
npx tsx example-usage.ts stdio       # STDIO transport example
npx tsx example-usage.ts http        # HTTP transport example
npx tsx example-usage.ts advanced    # Advanced error handling example
npx tsx example-usage.ts all         # Run all examples sequentially
```

### Using npm scripts

For convenience, you can also use the predefined npm scripts:

```bash
npm run example                  # Show usage information
npm run example:stdio           # STDIO transport example
npm run example:http            # HTTP transport example
npm run example:advanced        # Advanced error handling example
npm run example:all             # Run all examples sequentially
```

### What the examples demonstrate

- **STDIO Example**: Local process connection with command-line MCP server
- **HTTP Example**: Remote server connection with reconnection options
- **Advanced Example**: Error handling patterns and retry logic
- **All Examples**: Sequential execution of all example types

## Error Types

The client handles various error scenarios:

- **Connection Errors** - Network or process startup failures
- **Authentication Errors** - OAuth or permission issues (HTTP only)
- **Protocol Errors** - MCP protocol violations
- **Tool Errors** - Tool execution failures
- **Resource Errors** - Resource access failures

## Best Practices

1. **Always disconnect** - Use `disconnectMCPClient()` in finally blocks
2. **Handle errors gracefully** - Check `isError` flag in tool results
3. **Use appropriate transport** - STDIO for local, HTTP for remote
4. **Configure reconnection** - Set sensible retry policies for HTTP
5. **Type assertions** - Cast results to expected types when needed

## License

This MCP client implementation follows the same license terms as your project.
