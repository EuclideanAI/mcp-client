import { streamText } from 'ai';
import { getModelProvider } from '@/app/utils/chat-providers';
import { ChatModel } from '@/app/types/chat-types';
import { z } from 'zod';

// Helper function to convert JSON schema to Zod schema
function jsonSchemaToZod(jsonSchema: Record<string, unknown>): z.ZodSchema {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.object({});
  }

  if (jsonSchema.type === 'object') {
    const shape: Record<string, z.ZodSchema> = {};
    
    if (jsonSchema.properties) {
      for (const [key, prop] of Object.entries(jsonSchema.properties as Record<string, Record<string, unknown>>)) {
        if (prop.type === 'string') {
          shape[key] = z.string().optional();
        } else if (prop.type === 'number') {
          shape[key] = z.number().optional();
        } else if (prop.type === 'boolean') {
          shape[key] = z.boolean().optional();
        } else if (prop.type === 'array') {
          shape[key] = z.array(z.any()).optional();
        } else {
          shape[key] = z.any().optional();
        }
        
        // Add description if available
        if (prop.description && typeof prop.description === 'string') {
          shape[key] = shape[key].describe(prop.description);
        }
      }
    }
    
    let zodSchema = z.object(shape);
    
    // Handle required fields
    if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
      const requiredShape: Record<string, z.ZodSchema> = {};
      for (const [key, schema] of Object.entries(shape)) {
        if (jsonSchema.required.includes(key)) {
          // Remove optional() for required fields
          if (schema instanceof z.ZodOptional) {
            requiredShape[key] = schema.unwrap();
          } else {
            requiredShape[key] = schema;
          }
        } else {
          requiredShape[key] = schema;
        }
      }
      zodSchema = z.object(requiredShape);
    }
    
    return zodSchema;
  }
  
  return z.object({});
}

export async function POST(req: Request) {
  try {
    const { messages, model = 'claude', tools } = await req.json();
    
    console.log('🔍 API Route Debug:');
    console.log('- Model:', model);
    console.log('- Messages count:', messages?.length || 0);
    console.log('- Tools count:', tools?.length || 0);
    
    const provider = getModelProvider(model as ChatModel);
    console.log('- Provider:', provider.name);
    
    // Convert tools to AI SDK format for tool calling (without execute functions)
    // Per MCP protocol, tool execution happens client-side
    console.log('- Converting tools to AI SDK format for tool calling (MCP protocol)...');
    
    const aiTools = tools ? Object.fromEntries(
      tools.map((tool: { name: string; description: string; parameters: unknown; serviceId: string }) => {
        console.log(`- Processing tool: ${tool.name} (service: ${tool.serviceId})`);
        
        // Convert JSON schema to Zod schema for AI SDK compatibility
        const zodSchema = jsonSchemaToZod(tool.parameters as Record<string, unknown>);
        
        return [
          tool.name,
          {
            description: tool.description,
            parameters: zodSchema, // Use Zod schema for AI SDK
            // NO execute function - per MCP protocol, execution happens client-side
          }
        ];
      })
    ) : {};
    
    console.log('- AI Tools created:', Object.keys(aiTools).length);
    console.log('- Tool names:', Object.keys(aiTools));
    
    // Log the structure of the first tool for debugging
    if (Object.keys(aiTools).length > 0) {
      const firstToolName = Object.keys(aiTools)[0];
      const firstTool = aiTools[firstToolName];
      console.log('- Sample tool structure:', {
        name: firstToolName,
        hasDescription: !!firstTool.description,
        hasParameters: !!firstTool.parameters,
        hasExecute: typeof firstTool.execute === 'function', // Should be false now
      });
    }
    
    console.log('🚀 Calling streamText with tools (MCP protocol - no execute functions)...');
    
    const result = await streamText({
      model: provider.model,
      messages,
      tools: aiTools,
      maxTokens: provider.maxTokens,
      temperature: 0.7,
    });

    console.log('✅ StreamText successful - returning stream for client-side tool execution');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('❌ Chat API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    return Response.json(
      { 
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
