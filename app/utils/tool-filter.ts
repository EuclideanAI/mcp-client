// Tool filtering utility to manage large numbers of tools
'use client';

import { AISDKTool } from './tool-registry';

// Maximum number of tools to send to AI (most providers limit to 10-20)
const MAX_TOOLS_PER_REQUEST = 15;

// Tool categories for smart filtering
const TOOL_CATEGORIES = {
  // High priority - commonly used tools
  essential: [
    'search', 'get', 'list', 'read', 'view', 'show', 'find'
  ],
  // Medium priority - creation and modification
  creation: [
    'create', 'add', 'new', 'make', 'generate', 'build'
  ],
  // Medium priority - updates and changes
  modification: [
    'update', 'edit', 'modify', 'change', 'set', 'configure'
  ],
  // Lower priority - destructive actions
  destructive: [
    'delete', 'remove', 'destroy', 'drop', 'clear'
  ]
};

/**
 * Analyzes a message to determine which tool categories are most relevant
 */
function analyzeMessageIntent(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const relevantCategories: string[] = [];
  
  // Check for essential operations (always include some)
  if (lowerMessage.includes('show') || lowerMessage.includes('get') || 
      lowerMessage.includes('list') || lowerMessage.includes('find') ||
      lowerMessage.includes('search') || lowerMessage.includes('what')) {
    relevantCategories.push('essential');
  }
  
  // Check for creation intent
  if (lowerMessage.includes('create') || lowerMessage.includes('make') ||
      lowerMessage.includes('add') || lowerMessage.includes('new') ||
      lowerMessage.includes('generate') || lowerMessage.includes('build')) {
    relevantCategories.push('creation');
  }
  
  // Check for modification intent
  if (lowerMessage.includes('update') || lowerMessage.includes('edit') ||
      lowerMessage.includes('modify') || lowerMessage.includes('change') ||
      lowerMessage.includes('fix') || lowerMessage.includes('configure')) {
    relevantCategories.push('modification');
  }
  
  // Check for destructive intent
  if (lowerMessage.includes('delete') || lowerMessage.includes('remove') ||
      lowerMessage.includes('destroy') || lowerMessage.includes('clear')) {
    relevantCategories.push('destructive');
  }
  
  // If no specific intent detected, include essential tools
  if (relevantCategories.length === 0) {
    relevantCategories.push('essential');
  }
  
  return relevantCategories;
}

/**
 * Scores a tool based on its relevance to the message and categories
 */
function scoreToolRelevance(tool: AISDKTool, message: string, relevantCategories: string[]): number {
  let score = 0;
  const toolName = tool.name.toLowerCase();
  const toolDescription = tool.description.toLowerCase();
  const messageWords = message.toLowerCase().split(/\s+/);
  
  // Base score for category matching
  for (const category of relevantCategories) {
    const categoryWords = TOOL_CATEGORIES[category as keyof typeof TOOL_CATEGORIES];
    for (const word of categoryWords) {
      if (toolName.includes(word) || toolDescription.includes(word)) {
        score += 10;
        break; // Only count once per category
      }
    }
  }
  
  // Bonus for exact word matches in message
  for (const word of messageWords) {
    if (word.length > 3) { // Only consider meaningful words
      if (toolName.includes(word)) {
        score += 5;
      }
      if (toolDescription.includes(word)) {
        score += 3;
      }
    }
  }
  
  // Bonus for essential tools (always useful)
  const essentialWords = TOOL_CATEGORIES.essential;
  for (const word of essentialWords) {
    if (toolName.includes(word)) {
      score += 2;
    }
  }
  
  // Penalty for risky tools unless specifically requested
  if (tool.riskLevel === 'high' && !relevantCategories.includes('destructive')) {
    score -= 5;
  }
  
  return score;
}

/**
 * Filters tools based on message context, keeping only the most relevant ones
 */
export function filterToolsForMessage(
  tools: AISDKTool[], 
  message: string,
  maxTools: number = MAX_TOOLS_PER_REQUEST
): AISDKTool[] {
  if (tools.length <= maxTools) {
    return tools; // No filtering needed
  }
  
  console.log(`🔧 Filtering ${tools.length} tools down to ${maxTools} for message:`, message.substring(0, 100));
  
  const relevantCategories = analyzeMessageIntent(message);
  console.log('- Relevant categories:', relevantCategories);
  
  // Score all tools
  const scoredTools = tools.map(tool => ({
    tool,
    score: scoreToolRelevance(tool, message, relevantCategories)
  }));
  
  // Sort by score (highest first) and take top N
  const selectedTools = scoredTools
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTools)
    .map(item => item.tool);
  
  console.log('- Selected tools:', selectedTools.map(t => `${t.name} (${scoredTools.find(s => s.tool === t)?.score})`));
  
  return selectedTools;
}

/**
 * Gets a default set of essential tools when no specific context is available
 */
export function getEssentialTools(tools: AISDKTool[], maxTools: number = MAX_TOOLS_PER_REQUEST): AISDKTool[] {
  const essentialWords = TOOL_CATEGORIES.essential;
  
  const essentialTools = tools.filter(tool => {
    const toolName = tool.name.toLowerCase();
    return essentialWords.some(word => toolName.includes(word)) || 
           tool.riskLevel === 'low';
  });
  
  return essentialTools.slice(0, maxTools);
}
