Design and building a custom MCP Client interface that integrates with remote MCP Servers and have LLM agent chat capabilities using Vercel AI SDK.
Functional requirements:
- Web-based interface for MCP Client
- Include Remote MCP Server integration e.g. Jira, Confluence, Github, Slack, Postgres, etc.
- LLM agent chat capabilities using Vercel AI SDK 
- Support for multiple LLMs e.g. Google AI studio, AWS Bedrock Claude
- Only need to cover remote MCP server instance, don't need to consider local MCP server instance via Standard I/O connection
- Have the ability to connect to remote MCP servers and retrieve and display a list of available tools
- Have the ability to pick a tool and execute via the interface with a form entry depending on the required parameters for each MCP tool
- LLM agent chat interface should be able to understand the user prompt and pick the right MCP tool to execute
- LLM agent should ask for user's permission before executing any MCP tool
- LLM agent chat should return the results from the tool execution and summarise where needed for the user
Non-functional requirements:
- The interface should be responsive
- Include dark mode and light mode