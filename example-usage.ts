import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Example of how to use the MCP Client with HTTP transport
 * This demonstrates the direct usage of the MCP SDK without hooks
 */

/**
 * Example of how to use the MCP Client with HTTP transport
 */
async function httpExample() {
  let client: Client | null = null;

  try {
    console.log("🚀 Creating MCP Client with HTTP transport...");
    
    // Create transport
    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp"), 
      {
        reconnectionOptions: {
          maxReconnectionDelay: 30000,
          initialReconnectionDelay: 1000,
          reconnectionDelayGrowFactor: 1.5,
          maxRetries: 5,
        }
      }
    );
    
    // Create and connect client
    client = new Client(
      {
        name: "http-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
    console.log("✅ Connected to MCP server via HTTP");

    // Perform operations
    await performOperations(client);

  } catch (error) {
    console.error("❌ Error during HTTP example:", error);
  } finally {
    // Clean up
    if (client) {
      try {
        await client.close();
        console.log("🔌 Disconnected from MCP server");
      } catch (error) {
        console.error("❌ Error disconnecting:", error);
      }
    }
  }
}

/**
 * Check if an error is a "Method not found" MCP error
 */
function isMethodNotFoundError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: number };
    return err.message?.includes('Method not found') || 
           err.message?.includes('-32601') ||
           err.code === -32601;
  }
  return false;
}

/**
 * Common operations to perform with any MCP client
 */
async function performOperations(client: Client) {
  console.log("\n🔍 Testing MCP operations...");

  try {
    // Test 1: List tools
    console.log("\n📋 Listing available tools...");
    try {
      const toolsResult = await client.listTools();
      if (toolsResult.tools && toolsResult.tools.length > 0) {
        console.log(`✅ Found ${toolsResult.tools.length} tools:`);
        toolsResult.tools.forEach((tool, index) => {
          console.log(`   ${index + 1}. ${tool.name}: ${tool.description || 'No description'}`);
        });
      } else {
        console.log("⚠️  No tools available");
      }
    } catch (error) {
      if (isMethodNotFoundError(error)) {
        console.log("⚠️  listTools not supported by this server");
      } else {
        console.error("❌ Error listing tools:", error);
      }
    }

    // Test 2: List prompts
    console.log("\n📝 Listing available prompts...");
    try {
      const promptsResult = await client.listPrompts();
      if (promptsResult.prompts && promptsResult.prompts.length > 0) {
        console.log(`✅ Found ${promptsResult.prompts.length} prompts:`);
        promptsResult.prompts.forEach((prompt, index) => {
          console.log(`   ${index + 1}. ${prompt.name}: ${prompt.description || 'No description'}`);
        });
      } else {
        console.log("⚠️  No prompts available");
      }
    } catch (error) {
      if (isMethodNotFoundError(error)) {
        console.log("⚠️  listPrompts not supported by this server");
      } else {
        console.error("❌ Error listing prompts:", error);
      }
    }

    // Test 3: List resources
    console.log("\n📁 Listing available resources...");
    try {
      const resourcesResult = await client.listResources();
      if (resourcesResult.resources && resourcesResult.resources.length > 0) {
        console.log(`✅ Found ${resourcesResult.resources.length} resources:`);
        resourcesResult.resources.forEach((resource, index) => {
          console.log(`   ${index + 1}. ${resource.name || resource.uri}: ${resource.description || 'No description'}`);
        });
      } else {
        console.log("⚠️  No resources available");
      }
    } catch (error) {
      if (isMethodNotFoundError(error)) {
        console.log("⚠️  listResources not supported by this server");
      } else {
        console.error("❌ Error listing resources:", error);
      }
    }

    // Test 4: Try to call a tool (if available)
    console.log("\n🔧 Testing tool call...");
    try {
      const toolsResult = await client.listTools();
      if (toolsResult.tools && toolsResult.tools.length > 0) {
        const firstTool = toolsResult.tools[0];
        console.log(`🎯 Attempting to call tool: ${firstTool.name}`);
        
        // Simple call with empty arguments - most tools should handle this gracefully
        const toolResult = await client.callTool({
          name: firstTool.name,
          arguments: {}
        });

        console.log("✅ Tool call successful!");
        console.log("   Result:", JSON.stringify(toolResult, null, 2));
      } else {
        console.log("⚠️  No tools available to test");
      }
    } catch (error) {
      console.log("⚠️  Tool call failed (expected for many tools):", (error as Error).message);
    }

  } catch (error) {
    console.error("❌ Error during operations:", error);
  }
}

/**
 * Advanced example showing more detailed usage
 */
async function advancedExample() {
  let client: Client | null = null;

  try {
    console.log("🚀 Advanced MCP Client Example...");
    
    // Create transport with custom options
    const transport = new StreamableHTTPClientTransport(
      new URL("https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp"), 
      {
        reconnectionOptions: {
          maxReconnectionDelay: 60000,
          initialReconnectionDelay: 2000,
          reconnectionDelayGrowFactor: 2.0,
          maxRetries: 10,
        },
        sessionId: "advanced-example-session"
      }
    );
    
    // Create client with capabilities
    client = new Client(
      {
        name: "advanced-client",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {
            subscribe: true,
            listChanged: true
          }
        },
      }
    );

    await client.connect(transport);
    console.log("✅ Connected with advanced configuration");

    // Get server info (if available)
    console.log("📊 Server information:");
    try {
      const serverVersion = client.getServerVersion();
      console.log("   Server name:", serverVersion || "Unknown");
    } catch {
      console.log("   Server version not available");
    }

    // Demonstrate error handling
    console.log("\n🧪 Testing error handling...");
    try {
      await client.callTool({
        name: "nonexistent-tool",
        arguments: {}
      });
    } catch (error) {
      console.log("✅ Error handling works:", (error as Error).message);
    }

    // Test prompts with arguments
    console.log("\n📝 Testing prompts...");
    try {
      const promptsResult = await client.listPrompts();
      if (promptsResult.prompts && promptsResult.prompts.length > 0) {
        const firstPrompt = promptsResult.prompts[0];
        console.log(`🎯 Testing prompt: ${firstPrompt.name}`);
        
        const promptResult = await client.getPrompt({
          name: firstPrompt.name,
          arguments: {}
        });
        
        console.log("✅ Prompt retrieved successfully!");
        console.log("   Messages count:", promptResult.messages?.length || 0);
      }
    } catch (error) {
      console.log("⚠️  Prompt test failed:", (error as Error).message);
    }

  } catch (error) {
    console.error("❌ Advanced example error:", error);
  } finally {
    if (client) {
      try {
        await client.close();
        console.log("🔌 Advanced client disconnected");
      } catch (error) {
        console.error("❌ Error disconnecting advanced client:", error);
      }
    }
  }
}

/**
 * Multiple clients example
 */
async function multipleClientsExample() {
  console.log("🚀 Multiple Clients Example...");
  
  const clients: Client[] = [];

  try {
    // Create multiple clients (simulating different services)
    for (let i = 0; i < 2; i++) {
      const transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp"), 
        {
          sessionId: `client-${i + 1}`,
          reconnectionOptions: {
            maxReconnectionDelay: 30000,
            initialReconnectionDelay: 1000,
            reconnectionDelayGrowFactor: 1.5,
            maxRetries: 3
          }
        }
      );
      
      const client = new Client(
        {
          name: `multi-client-${i + 1}`,
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      clients.push(client);
      console.log(`✅ Client ${i + 1} connected`);
    }

    // Use all clients
    console.log(`\n🔄 Using ${clients.length} clients simultaneously...`);
    const promises = clients.map(async (client, index) => {
      try {
        const toolsResult = await client.listTools();
        console.log(`📋 Client ${index + 1}: Found ${toolsResult.tools?.length || 0} tools`);
      } catch (error) {
        console.log(`⚠️  Client ${index + 1}: Error listing tools`);
      }
    });

    await Promise.all(promises);
    console.log("✅ All clients operated successfully");

  } catch (error) {
    console.error("❌ Multiple clients example error:", error);
  } finally {
    // Clean up all clients
    console.log("\n🧹 Cleaning up clients...");
    const closePromises = clients.map(async (client, index) => {
      try {
        await client.close();
        console.log(`🔌 Client ${index + 1} disconnected`);
      } catch {
        console.error(`❌ Error disconnecting client ${index + 1}`);
      }
    });

    await Promise.all(closePromises);
  }
}

/**
 * Main function to run examples
 */
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || 'http';

  console.log("🌟 MCP Client Examples");
  console.log("=".repeat(50));

  switch (example.toLowerCase()) {
    case 'http':
      await httpExample();
      break;
    case 'advanced':
      await advancedExample();
      break;
    case 'multiple':
      await multipleClientsExample();
      break;
    case 'all':
      await httpExample();
      console.log("\n" + "=".repeat(50));
      await advancedExample();
      console.log("\n" + "=".repeat(50));
      await multipleClientsExample();
      break;
    default:
      console.log("Usage: npm run example [http|advanced|multiple|all]");
      console.log("  http     - Basic HTTP transport example");
      console.log("  advanced - Advanced usage with detailed configuration");
      console.log("  multiple - Multiple clients example");
      console.log("  all      - Run all examples");
      process.exit(1);
  }

  console.log("\n✨ Example completed!");
}

// Run the examples
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
