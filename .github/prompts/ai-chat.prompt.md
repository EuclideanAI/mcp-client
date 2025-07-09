# AI Chat Architecture Summary

## 🏗️ High-Level Architecture

The chat system follows a modern React/Next.js architecture with the Vercel AI SDK at its core:

```
User Input → ChatPanel → useChat Hook → API Route → AI Providers → Response Stream → UI Update
```

## 🔄 End-to-End Data Flow

### 1. User Interaction (`ChatPanel`)

- User types message in textarea
- Form submission triggers `handleSubmit`
- Input is managed by AI SDK's `useChat` hook

### 2. Client-Side Processing (`useChat`)

- Wraps AI SDK's `useChat` with custom tool permissions
- Prepares tools with permission wrapper functions
- Sends request to `/api/chat` endpoint

### 3. Server-Side Processing (`/api/chat/route.ts`)

- Receives messages, model selection, and tools
- Gets appropriate model provider (Claude/Gemini)
- Calls AI SDK's `streamText` function
- Returns streaming response

### 4. Model Provider Selection (`chat-providers.ts`)

- Maps model IDs to actual AI providers
- Handles AWS Bedrock (Claude) and Google AI Studio (Gemini)
- Configures model-specific parameters

### 5. Response Streaming

- AI SDK handles streaming automatically
- Real-time UI updates as tokens arrive
- Tool calls trigger permission dialogs

## 📁 Component Architecture

### `chat-panel.tsx` - UI Layer

**Purpose**: React component for chat interface
**Features**:

- Message display with avatars
- Model selector integration
- Real-time streaming indicators
- Tool permission status
  **Key Props**: Uses `useChat` hook for all state management

### `use-chat.ts` - State Management

**Purpose**: Custom hook wrapping AI SDK's `useChat`
**Features**:

- Tool permission integration
- Model switching
- Message state management
  **Key Implementation**:

```typescript
const chat = useAIChat({
  api: "/api/chat",
  body: { model, tools },
});
```

### `/api/chat/route.ts` - API Endpoint

**Purpose**: Next.js API route handling chat requests
**Process**:

1. Extract `messages`, `model`, `tools` from request
2. Get model provider configuration
3. Convert tools to AI SDK format
4. Call `streamText` with all parameters
5. Return streaming response

### `chat-providers.ts` - Model Configuration

**Purpose**: Abstracts different AI providers
**Providers**:

- **Claude**: AWS Bedrock (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
- **Gemini**: Google AI Studio (`gemini-2.5-flash`)

## 🤖 LLM Handling with AI SDK

### Provider Configuration

```typescript
// AWS Bedrock (Claude)
model: bedrock("anthropic.claude-3-5-sonnet-20241022-v2:0");

// Google AI Studio (Gemini)
model: google("gemini-2.5-flash");
```

### Authentication

- **AWS Bedrock**: Uses AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
- **Google AI Studio**: Uses API key (GOOGLE_GENERATIVE_AI_API_KEY)

### Key Benefits of AI SDK

1. **Unified Interface**: Same API for different providers
2. **Automatic Streaming**: Built-in streaming support
3. **Tool Integration**: Native tool calling support
4. **Type Safety**: Full TypeScript support
5. **React Integration**: `useChat` hook handles all state

## 🔐 Why Custom `use-chat` Hook?

The custom `use-chat` is a **wrapper** around AI SDK's `useChat`, providing:

### Security & Permission Layer

```typescript
// Custom permission wrapper for each tool
const toolsForAI = aiTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  parameters: tool.parameters,
  execute: async (args: Record<string, unknown>) => {
    // 🛡️ Permission checking
    const approved = await requestPermission(toolCall, tool.description);
    if (!approved) {
      throw new Error("Tool execution denied by user");
    }
    return await tool.execute(args);
  },
}));
```

### MCP Integration

- **Tool Registry**: Integrates with `useToolRegistry` to get MCP tools
- **Dynamic Tools**: Tools are loaded from your MCP services at runtime
- **Service Mapping**: Each tool knows its `serviceId` for proper routing

### Custom Settings Management

- **Model Switching**: Supports switching between Claude and Gemini
- **Legacy Interface**: Maintains backward compatibility
- **Extended State**: Adds custom properties like `settings` and `sendMessage`

## 🎛️ Model Provider Usage

### Configuration & Abstraction

```typescript
export interface ModelProvider {
  id: ChatModel; // 'claude' | 'gemini'
  name: string; // Display name for UI
  description: string; // User-friendly description
  model: LanguageModelV1; // AI SDK model instance
  maxTokens: number; // Model-specific limits
  supportsToolCalling: boolean; // Capability flag
}
```

### Runtime Model Selection

```typescript
const { messages, model = "claude", tools } = await req.json();
const provider = getModelProvider(model as ChatModel);

const result = await streamText({
  model: provider.model, // ← Model instance used here
  messages,
  tools: aiTools,
  maxTokens: provider.maxTokens, // ← Model-specific config
  temperature: 0.7,
});
```

## 🛠️ Tool Format and Permission Handling

### Tool Registration Flow

```typescript
// Step 1: MCP Tool Discovery
const mcpTools = await listMCPTools(serviceId);
// Raw MCP format: { name, description, inputSchema }

// Step 2: Schema Conversion
const aiTools = mcpTools.map((tool) => convertToAISDKTool(tool));
// AI SDK format: { name, description, parameters: ZodSchema, execute }

// Step 3: Permission Wrapper
const toolsForAI = aiTools.map((tool) => ({
  ...tool,
  execute: async (args) => {
    // Permission check happens here
    const approved = await requestPermission(toolCall, tool.description);
    if (!approved) throw new Error("Tool execution denied");
    return await tool.execute(args);
  },
}));
```

### Permission System Architecture

**Multi-Level Permission Strategy:**

```typescript
interface PermissionState {
  pendingRequests: ToolPermissionRequest[]; // Active permission dialogs
  approvedTools: Set<string>; // Auto-approved tools
  deniedTools: Set<string>; // Auto-denied tools
  sessionPermissions: Map<string, boolean>; // Per-session cache
}
```

**Permission Decision Flow:**

1. **Session Cache Check**: If tool was already approved/denied in this session
2. **Auto-Approval Check**: If tool is in approved/denied lists
3. **Risk Assessment**: Determine risk level based on tool name
4. **User Prompt**: Show permission dialog with risk information
5. **Result Caching**: Store decision for session

### Risk-Based Permission System

```typescript
function determineRiskLevel(toolCall: ToolCall): "low" | "medium" | "high" {
  const { name } = toolCall;

  // High-risk: delete, create, update, modify
  if (name.includes("delete") || name.includes("create")) return "high";

  // Medium-risk: write, send, execute, run
  if (name.includes("write") || name.includes("send")) return "medium";

  // Low-risk: read-only operations
  return "low";
}
```

### Schema Transformation

**MCP → AI SDK Format:**

```typescript
// MCP Tool Format
interface MCPToolDefinition {
  name: string;
  description?: string;
  serviceId: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

// AI SDK Tool Format
interface AISDKTool {
  name: string;
  description: string;
  parameters: z.ZodSchema; // ← Converted from inputSchema
  execute: (args) => Promise<unknown>; // ← Wraps MCP call
  serviceId: string;
  riskLevel: "low" | "medium" | "high";
}
```

## 🚀 Complete Tool Execution Flow

```typescript
1. User sends message → AI decides to use tool
2. AI SDK calls tool.execute(args)
3. Permission wrapper intercepts call
4. requestPermission() shows dialog to user
5. User approves/denies
6. If approved: callMCPTool(serviceId, toolName, args)
7. MCP service executes tool
8. Result returned to AI
9. AI continues conversation with result
```

## 🔧 MCP Protocol Compliance & Tool Execution

### Current Implementation (MCP Protocol Compliant)

The current implementation follows the **MCP (Model Context Protocol)** specification where:

1. **AI generates tool calls** in the streaming response
2. **Client executes tools** via MCP connections
3. **Tool results are sent back** to the AI to continue conversation

### Key Implementation Details

**`onToolCall` Callback Mechanism:**

- The AI SDK's `useChat` hook provides an `onToolCall` callback
- This callback is triggered automatically when the AI model decides to call a tool
- The callback receives a `toolCall` object containing:
  - `toolCallId`: Unique identifier for the tool call
  - `toolName`: Name of the tool being called
  - `args`: Arguments passed to the tool (as `unknown` type)

**Tool Execution Flow:**

```typescript
onToolCall: async ({ toolCall }) => {
  // 1. Find tool configuration from registry
  const tool = aiTools.find((t) => t.name === toolCall.toolName);

  // 2. Get service configuration from localStorage
  const serviceConfig = serviceConfigs[tool.serviceId];

  // 3. Execute tool via MCP using stateless connection
  const result = await callMCPToolWithConfig(
    serviceConfig,
    toolCall.toolName,
    toolCall.args as Record<string, unknown>
  );

  // 4. Return result to AI SDK (gets sent back to AI model)
  return { result: result.content };
};
```

**Server-Side Changes:**

- API route (`/api/chat/route.ts`) now provides tools to AI SDK **without execute functions**
- Tools are registered for schema/discovery purposes only
- No server-side tool execution happens

**Client-Side Responsibility:**

- All tool execution happens in the `onToolCall` callback
- Uses `callMCPToolWithConfig` for stateless MCP connections
- Service configurations loaded from localStorage
- Tool results are automatically sent back to the AI model

This architecture ensures proper MCP protocol compliance and stateless operation.

## 🔄 Real-Time Tool Selection Updates

### localStorage Event Flow Architecture

The system uses a custom event system to ensure that tool selection changes are immediately reflected in the chat interface without requiring page refreshes.

### Event Dispatch Chain

When a user toggles a tool selection, the following chain of events occurs:

```
User toggles tool in UI
  ↓
handleToolToggle() in AvailableActions
  ↓
toggleToolSelection() in storage.ts
  ↓
saveToolSelection() in storage.ts
  ↓
window.dispatchEvent(new CustomEvent('localStorageChange', {...}))
  ↓
useChat's handleCustomStorageChange() receives the event
  ↓
refreshTools() is called (from useToolRegistry)
  ↓
useToolRegistry re-reads localStorage and filters tools
  ↓
aiTools array is updated in useToolRegistry
  ↓
useChat receives new aiTools via destructuring
  ↓
toolsForAI is recalculated
  ↓
useAIChat re-initializes with new tools (due to key change)
```

### Event Dispatch Implementation

**In `storage.ts` - Event Source:**

```typescript
export function saveToolSelection(toolSelections: ToolSelectionState): void {
  // Save to localStorage
  localStorage.setItem(TOOL_SELECTION_KEY, serialized);

  // 🔑 Dispatch custom event for same-tab communication
  window.dispatchEvent(
    new CustomEvent("localStorageChange", {
      detail: { key: TOOL_SELECTION_KEY, newValue: serialized },
    })
  );
}
```

**In `useChat.ts` - Event Listener:**

```typescript
useEffect(() => {
  // For cross-tab storage changes (built-in browser event)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === "mcp-client-tool-selection" && e.newValue !== e.oldValue) {
      refreshTools();
    }
  };

  // 🔑 For same-tab storage changes (custom event)
  const handleCustomStorageChange = (e: CustomEvent) => {
    if (e.detail?.key === "mcp-client-tool-selection") {
      refreshTools(); // Triggers useToolRegistry refresh
    }
  };

  // Listen for both types of events
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(
    "localStorageChange",
    handleCustomStorageChange as EventListener
  );

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(
      "localStorageChange",
      handleCustomStorageChange as EventListener
    );
  };
}, [refreshTools]);
```

### Why Custom Events Are Required

The browser's built-in `storage` event has a critical limitation:

- **Built-in `storage` event**: Only fires when localStorage changes in **other tabs/windows**
- **Custom `localStorageChange` event**: Fires when localStorage changes in the **same tab**

Since users typically toggle tools in the same tab where they're chatting, custom events are essential for immediate UI updates.

### Event Structure & Type Safety

**Custom Event Structure:**

```typescript
new CustomEvent("localStorageChange", {
  detail: {
    key: "mcp-client-tool-selection",
    newValue: '{"service1:tool1":true,"service1:tool2":false}',
  },
});
```

**Type-Safe Event Handling:**

```typescript
const handleCustomStorageChange = (e: CustomEvent) => {
  if (e.detail?.key === "mcp-client-tool-selection") {
    // Safe to proceed - we know this is our specific event
    refreshTools();
  }
};

// TypeScript casting needed for custom events
window.addEventListener(
  "localStorageChange",
  handleCustomStorageChange as EventListener
);
```

### Tool Registry Integration

The `useToolRegistry` hook responds to the refresh signal:

```typescript
const refreshTools = useCallback(async () => {
  // 1. Re-read tool selection from localStorage
  const toolSelection = loadToolSelection();

  // 2. Filter available tools based on selection
  const aiTools = allTools
    .filter((tool) => {
      const toolId = `${tool.serviceId}:${tool.name}`;
      const isSelected = toolSelection[toolId] ?? true;
      return isSelected;
    })
    .map((tool) => convertToAISDKTool(tool));

  // 3. Update state, triggering re-renders
  setState((prev) => ({ ...prev, aiTools }));
}, []);
```

### Performance Considerations

**Efficient Re-rendering:**

- Uses `useCallback` to prevent unnecessary re-renders
- AI SDK's `key` prop triggers re-initialization only when tools actually change
- Tool filtering happens in-memory without additional API calls

**Event Cleanup:**

- Proper event listener cleanup in `useEffect` return function
- Prevents memory leaks in single-page applications

This architecture ensures that tool selection changes are immediately reflected across the entire application while maintaining performance and type safety.
