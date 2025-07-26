
# MCP Client & AI Chat Architecture

## Stateless MCP Client

- **No persistent connections:** Each MCP operation (testConnection, callTool, listTools, etc.) creates a new connection, performs the action, and disconnects.
- **Config management:** MCP server configs (URL, bearer token) are stored in localStorage per service. No server-side session management.
- **Each request:** Loads config, creates client, connects, performs action, disconnects.

**Folder structure:**
`app/` - Next.js app directory 
`app/actions` - Server-side actions
`app/types` - Type definitions
`app/utils` - Client-side hooks, utilities, and storage management
`components/` - UI components

**Component structure:**
- `ServiceTabs`: UI tab state only
- `ServerConfiguration`: Test connection results only
- `mcp-client-hooks.ts`: Client-side MCP API wrappers
- `actions/mcp.ts`: Server-side MCP operations
- `storage.ts`: localStorage utilities
- `mcp-types.ts`: MCP config types

**Benefits:**
- Simplicity: No connection lifecycle
- Reliability: Isolated requests
- Security: No long-lived credentials
- Scalability: Serverless/multi-tenant friendly
- Debugging: Easy to trace

**Pattern:**
```typescript
export async function someMCPOperation(serviceId: string, ...args) {
  const config = loadServiceConfig(serviceId);
  const client = new MCPServerClient(config);
  await client.connect();
  const result = await client.doSomething();
  await client.disconnect();
  return result;
}
```

---

## AI Chat System (Vercel AI SDK)

**Data flow:**
```
User Input → ChatPanel → useChat Hook → /api/chat → streamText (AI Provider) → Tool Call Stream
                ↓                                                                    ↓
         onToolCall Handler ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
                ↓
    Permission Check (requestPermission)
                ↓
    User Approval (inline in chat)
                ↓
    executeChatTool (server action)
                ↓
    callMCPTool (stateless connection)
                ↓
    MCP Server Execution
                ↓
    Result → AI SDK → Response Stream → UI Update
```

**Key files/components:**
- `chat-panel.tsx`: Chat UI with inline permission dialogs and tool execution status
- `use-chat.ts`: Custom hook wrapping AI SDK's `useChat` with MCP tool integration
- `/app/api/chat/route.ts`: API route that calls `streamChat` server action
- `/app/actions/chat.ts`: Server-side action (`streamChat`, `executeChatTool`)
- `chat-providers.ts`: AI SDK provider configuration (AWS Bedrock, Google AI Studio)
- `tool-registry.ts`: Converts MCP tools to AI SDK format with real-time updates
- `permissions.ts`: Multi-level permission system with risk assessment

**Provider config:**
```typescript
// Claude
model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0");
// Gemini
model: google("gemini-2.5-flash");
```
**Auth:**
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- Google: `GOOGLE_GENERATIVE_AI_API_KEY`

**Tool registry:**
- Tools loaded from MCP services at runtime
- Each tool knows its `serviceId` for routing

**Permission system:**
- Multi-level: session cache, auto-approve/deny, risk assessment, user prompt, result caching
- Risk: `delete`/`create` = high, `write`/`send` = medium, else low

**MCP → AI SDK tool format conversion:**
```typescript
// MCP Tool Registry Format
interface MCPToolRegistry {
  function: {
    name: string;
    description: string;
    parameters: z.ZodSchema;
  };
  serviceId: string;
  riskLevel: "low" | "medium" | "high";
}

// Server-side tools sent to AI SDK (no execute function)
interface ServerSideTools {
  [toolName: string]: {
    description: string;
    parameters: z.ZodSchema;
    // No execute function - handled client-side via onToolCall
  };
}

// Client-side tool execution via useChat hook
const { onToolCall } = useChat({
  // Tools passed in body to server for AI model
  body: { modelId, tools: mcpTools },
  
  // Client-side execution handler
  onToolCall: async ({ toolCall }) => {
    // Permission → Execution → Result flow
  }
})
```

**Tool execution flow:**
1. User sends message → AI decides to use tool
2. AI SDK streams tool call request via `onToolCall` callback
3. Client-side `useChat` hook receives tool call
4. Permission system checks: `requestPermission(toolName, serviceId, riskLevel, description, parameters)`
5. User approves/denies in inline chat interface
6. If approved: `executeChatTool(serviceId, toolName, parameters)` server action
7. Server action calls `callMCPTool()` with stateless connection
8. MCP service executes tool and returns result
9. Result returned to AI SDK as tool call response
10. AI continues conversation with tool result

**Client-side tool call handling:**
```typescript
onToolCall: async ({ toolCall }) => {
  const { toolName, args } = toolCall
  
  // Find tool metadata for permission checking
  const tool = mcpTools.find(t => t.function.name === toolName)
  
  // Request permission with risk assessment
  const approved = await requestPermission(
    toolName, tool.serviceId, tool.riskLevel, 
    tool.description, args
  )
  
  if (!approved) {
    return { error: 'Tool execution denied by user' }
  }
  
  // Execute via server action
  const result = await executeChatTool(tool.serviceId, toolName, args)
  return result.success ? result.result : { error: result.error }
}
```

**MCP protocol compliance:**
- All tool execution is client-side in `onToolCall` callback
- Uses stateless MCP connection per call via `executeChatTool` server action
- Service configs loaded from localStorage in server action
- Tool results sent back to AI model via AI SDK's tool call response mechanism

**Current Implementation Status:**
- ✅ Stateless MCP client with server actions
- ✅ Client-side MCP hooks and tool registry
- ✅ Real-time tool selection with localStorage events
- ✅ AI chat with streaming responses (Gemini/Claude)
- ✅ Tool registry converts MCP → AI SDK format
- ✅ Permission system with risk assessment
- 🔄 Client-side tool execution via `onToolCall`
- 🔄 Inline permission dialogs in chat interface

**Dependencies:**
- `@ai-sdk/amazon-bedrock` - Claude via AWS Bedrock
- `@ai-sdk/google` - Gemini via Google AI Studio
- `ai` ^4.3.17 - Vercel AI SDK core
- `zod` - Schema validation for tool parameters

---

## Real-Time Tool Selection (localStorage Events)

**Immediate UI updates:**
- Custom event system ensures tool selection changes are reflected instantly

**Event chain:**
```
User toggles tool in UI
  ↓
handleToolToggle (AvailableActions)
  ↓
toggleToolSelection (storage.ts)
  ↓
saveToolSelection (storage.ts)
  ↓
window.dispatchEvent('localStorageChange')
  ↓
useChat's handleCustomStorageChange
  ↓
refreshTools (useToolRegistry)
  ↓
useToolRegistry re-reads localStorage
  ↓
aiTools updated
  ↓
useChat receives new aiTools
  ↓
toolsForAI recalculated
  ↓
useAIChat re-initializes
```

**Why custom events?**
- Browser `storage` event only fires for other tabs
- Custom `localStorageChange` event fires in same tab

**Type-safe event structure:**
```typescript
new CustomEvent("localStorageChange", {
  detail: {
    key: "mcp-client-tool-selection",
    newValue: '{"service1:tool1":true,"service1:tool2":false}',
  },
});
```

**Efficient re-rendering:**
- Uses `useCallback` to avoid unnecessary updates
- AI SDK's `key` prop triggers re-init only when tools change
- Tool filtering is in-memory
- Proper event cleanup in `useEffect`

---

**Summary:**
- Stateless, reliable MCP client
- AI chat with real-time tool integration and permission system
- Immediate UI updates via custom localStorage events
