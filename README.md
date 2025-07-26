# MCP Client

A custom Model Context Protocol (MCP) Client interface with integrated LLM agent chat capabilities built with Next.js and the Vercel AI SDK.

## Overview

This project provides a web-based interface for connecting to remote MCP servers and executing tools through both manual interaction and AI-powered chat agents. The architecture prioritizes simplicity and reliability through stateless connections and real-time tool integration.

## Features

### Core Functionality
- **Remote MCP Server Integration**: Connect to MCP servers like Jira, Confluence, GitHub, Slack, Postgres, and more
- **AI Agent Chat**: LLM-powered conversation interface using Vercel AI SDK
- **Multi-LLM Support**: Compatible with Google AI Studio (Gemini) and AWS Bedrock (Claude)
- **Tool Discovery & Execution**: Retrieve, display, and execute MCP tools with form-based interfaces
- **Permission System**: Multi-level tool execution permissions with risk assessment
- **Real-time Updates**: Instant UI updates for tool selection changes

### User Interface
- **Responsive Design**: Works across desktop and mobile devices
- **Dark/Light Mode**: Theme toggle with custom OKLCH color palette
- **Resizable Panels**: Split interface between chat and MCP control panels
- **Inline Permissions**: Tool execution approval directly within chat interface

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm/bun

### Environment Variables
Set up your AI provider credentials:

```bash
# For AWS Bedrock (Claude)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# For Google AI Studio (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key
```

### Installation & Development

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Architecture

### Stateless MCP Connection Approach

This project implements a **stateless** Model Context Protocol (MCP) client architecture, similar to typical MCP Inspectors, prioritizing simplicity and reliability over performance optimization.

#### Key Principles

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

#### Benefits of Stateless Approach

- **Simplicity**: No connection lifecycle management
- **Reliability**: Each request is independent, errors are isolated
- **Security**: No long-lived credentials or sessions
- **Scalability**: Works well in serverless and multi-tenant environments
- **Debugging**: Easy to trace and debug individual requests

#### Implementation Pattern

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

### AI Chat System Integration

The chat system uses the Vercel AI SDK with a sophisticated tool execution flow:

1. **User Input** → Chat interface processes message
2. **AI Decision** → LLM determines if tool usage is needed  
3. **Permission Check** → Multi-level permission system with risk assessment
4. **User Approval** → Inline approval dialog within chat interface
5. **Tool Execution** → Stateless MCP connection executes the tool
6. **Result Integration** → AI processes tool output and continues conversation

#### Tool Permission System

- **Risk Assessment**: Tools categorized as low/medium/high risk
  - `delete`/`create` operations = high risk
  - `write`/`send` operations = medium risk  
  - `read`/`get` operations = low risk
- **Multi-level Permissions**: Session cache, auto-approve/deny, user prompts
- **Inline Approval**: Permission requests appear directly in chat interface

### Real-Time Tool Selection

Uses a custom localStorage event system for immediate UI updates:

```typescript
// Tool selection changes trigger custom events
window.dispatchEvent(new CustomEvent("localStorageChange", {
  detail: { 
    key: "mcp-client-tool-selection",
    newValue: JSON.stringify(selections)
  }
}));
```

This ensures tool availability changes are reflected instantly across all components without requiring page refreshes.

## Project Structure

```
app/
├── actions/          # Server-side actions (MCP operations, chat)
├── api/             # API routes (chat endpoint, CopilotKit)
├── types/           # TypeScript type definitions
└── utils/           # Client hooks, storage, tool management

components/
├── ui/              # shadcn/ui components
├── chat-panel.tsx   # AI chat interface
├── service-tabs.tsx # Multi-service tab management
├── server-configuration.tsx # MCP server setup
├── available-actions.tsx    # Tool discovery & selection
└── tool-interface.tsx       # Manual tool execution

```

### Key Files

- `app/utils/mcp-client-hooks.ts`: Client-side MCP API wrappers
- `app/actions/mcp.ts`: Server-side MCP operations
- `app/utils/storage.ts`: localStorage persistence utilities
- `app/types/mcp-types.ts`: MCP configuration types
- `app/utils/tool-registry.ts`: Converts MCP tools to AI SDK format
- `app/utils/use-chat.ts`: Custom chat hook with MCP integration

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **AI Integration**: Vercel AI SDK
- **LLM Providers**: AWS Bedrock (Claude), Google AI Studio (Gemini)
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Type Safety**: TypeScript with Zod schema validation
- **State Management**: localStorage with custom event system

## Usage

### Configuring MCP Servers

1. **Add Service Tab**: Create a new tab for your MCP service
2. **Server Configuration**: 
   - Enter the HTTP/HTTPS URL for your MCP server
   - Add bearer token if authentication is required
   - Test the connection to verify setup
3. **Tool Discovery**: Browse and select available tools from the connected server
4. **Permission Setup**: Configure tool execution permissions and risk levels

### Using the Chat Interface

1. **Select AI Model**: Choose between Gemini or Claude from the model selector
2. **Natural Conversation**: Ask questions or request actions in natural language
3. **Tool Execution**: When the AI suggests using tools, approve or deny via inline dialogs
4. **Review Results**: See tool outputs integrated into the conversation flow

### Manual Tool Execution

1. **Select Tools**: Choose specific tools from the Available Actions panel
2. **Fill Parameters**: Use the form interface to provide required parameters
3. **Execute**: Run tools manually and see immediate results
4. **Review Output**: Examine detailed tool execution results

## Server Configuration Component

The MCP Client includes a dedicated Server Configuration component with:

#### Transport Types

- **HTTP/HTTPS**: Connect to MCP servers over HTTP/HTTPS endpoints

#### Configuration Options

- **URL**: HTTP/HTTPS endpoint for the MCP server
- **Bearer Token**: Optional authentication token (password-protected input)
- **Connection Testing**: Real-time validation of server connectivity

#### Features

- Real-time configuration updates
- Form validation and error handling  
- Configuration summary display
- Connection status indication
- Integration with service tabs interface

## Contributing

When contributing to this project, please follow the established architecture patterns:

1. **Stateless Connections**: Always use the stateless MCP client pattern for new operations
2. **Type Safety**: Ensure all new code includes proper TypeScript types and Zod schemas
3. **Permission System**: New tools should include appropriate risk level classification
4. **Real-time Updates**: Use the custom localStorage event system for state synchronization

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Vercel AI SDK](https://sdk.vercel.ai/docs) - AI SDK documentation and examples
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification and guides
- [shadcn/ui](https://ui.shadcn.com/) - UI component library documentation
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework

## Deployment

### Vercel (Recommended)

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import your project into Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy with automatic builds on every commit

### Environment Variables for Production

Make sure to set these in your deployment environment:

```bash
# Required for AI functionality
AWS_ACCESS_KEY_ID=your_production_aws_key
AWS_SECRET_ACCESS_KEY=your_production_aws_secret  
AWS_REGION=us-east-1
GOOGLE_GENERATIVE_AI_API_KEY=your_production_google_key

# Optional: Custom configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Other Deployment Options

This Next.js application can be deployed to any platform that supports Node.js:

- **Docker**: Use the included Dockerfile for containerized deployments
- **Railway**: Simple git-based deployments with built-in environment management
- **Netlify**: Supports Next.js with edge functions
- **AWS Amplify**: Full-stack deployment with AWS integration

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details on various deployment options.

## License

This project is open source and available under the [MIT License](LICENSE).
