/**
 * Utility functions for localStorage management of MCP configurations
 */

import { MCPHttpConfig } from '@/app/types/mcp-types';

const STORAGE_PREFIX = 'mcp-client';

// Since we only support HTTP now, stored config is the same as the base config
export type StoredMCPConfig = MCPHttpConfig;

/**
 * Get storage key for a specific service
 */
function getStorageKey(serviceId: string): string {
  return `${STORAGE_PREFIX}-${serviceId}`;
}

/**
 * Save MCP configuration for a specific service
 */
export function saveServiceConfig(serviceId: string, config: StoredMCPConfig): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const key = getStorageKey(serviceId);
    localStorage.setItem(key, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save service config:', error);
  }
}

/**
 * Load MCP configuration for a specific service
 */
export function loadServiceConfig(serviceId: string): StoredMCPConfig | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const key = getStorageKey(serviceId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as StoredMCPConfig;
    }
  } catch (error) {
    console.error('Failed to load service config:', error);
  }
  return null;
}

/**
 * Remove MCP configuration for a specific service
 */
export function removeServiceConfig(serviceId: string): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const key = getStorageKey(serviceId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove service config:', error);
  }
}

/**
 * Get all saved service configurations
 */
export function getAllServiceConfigs(): Record<string, StoredMCPConfig> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return {};
  }
  
  const configs: Record<string, StoredMCPConfig> = {};
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const serviceId = key.replace(`${STORAGE_PREFIX}-`, '');
        const config = loadServiceConfig(serviceId);
        if (config) {
          configs[serviceId] = config;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all service configs:', error);
  }
  
  return configs;
}

/**
 * Load all service configurations
 */
export function loadAllServiceConfigs(): Record<string, StoredMCPConfig> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    const configs: Record<string, StoredMCPConfig> = {};
    
    // Iterate through all localStorage keys to find MCP configs
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX + '-') && !key.includes('-tool-selection')) {
        const serviceId = key.replace(STORAGE_PREFIX + '-', '');
        const stored = localStorage.getItem(key);
        if (stored) {
          configs[serviceId] = JSON.parse(stored) as StoredMCPConfig;
        }
      }
    }
    
    return configs;
  } catch (error) {
    console.error('Failed to load all service configs:', error);
    return {};
  }
}

/**
 * Get all service IDs that have saved configurations
 */
export function getServiceIds(): string[] {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return [];
  }
  
  const serviceIds: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const serviceId = key.replace(`${STORAGE_PREFIX}-`, '');
        serviceIds.push(serviceId);
      }
    }
  } catch (error) {
    console.error('Failed to get service IDs:', error);
  }
  
  return serviceIds;
}

/**
 * Clear all saved configurations
 */
export function clearAllConfigs(): void {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear all configs:', error);
  }
}

/**
 * Tool selection state management
 */
const TOOL_SELECTION_KEY = `${STORAGE_PREFIX}-tool-selection`;

export interface ToolSelectionState {
  [toolId: string]: boolean; // toolId format: "serviceId:toolName"
}

/**
 * Save tool selection state
 */
export function saveToolSelection(toolSelections: ToolSelectionState): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const serialized = JSON.stringify(toolSelections);
    localStorage.setItem(TOOL_SELECTION_KEY, serialized);
    console.log('💾 saveToolSelection: saved to localStorage', {
      key: TOOL_SELECTION_KEY,
      value: serialized,
      toolSelections,
    });
    
    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent('localStorageChange', {
      detail: { key: TOOL_SELECTION_KEY, newValue: serialized }
    }));
    console.log('📡 saveToolSelection: dispatched localStorageChange event');
  } catch (error) {
    console.error('Failed to save tool selection:', error);
  }
}

/**
 * Load tool selection state
 */
export function loadToolSelection(): ToolSelectionState {
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    const stored = localStorage.getItem(TOOL_SELECTION_KEY);
    if (stored) {
      return JSON.parse(stored) as ToolSelectionState;
    }
  } catch (error) {
    console.error('Failed to load tool selection:', error);
  }
  
  return {};
}

/**
 * Toggle tool selection for a specific tool
 */
export function toggleToolSelection(serviceId: string, toolName: string): void {
  const toolId = `${serviceId}:${toolName}`;
  const currentSelection = loadToolSelection();
  const currentValue = currentSelection[toolId] ?? true; // Default to true if not set
  const newSelection = {
    ...currentSelection,
    [toolId]: !currentValue, // Toggle the current value
  };
  console.log('🔧 toggleToolSelection:', {
    toolId,
    currentValue,
    newValue: !currentValue,
    currentSelection,
    newSelection,
  });
  saveToolSelection(newSelection);
}

/**
 * Check if a tool is selected
 */
export function isToolSelected(serviceId: string, toolName: string): boolean {
  const toolId = `${serviceId}:${toolName}`;
  const selection = loadToolSelection();
  return selection[toolId] ?? true; // Default to true (selected) if not set
}

/**
 * Set tool selection for a specific tool
 */
export function setToolSelection(serviceId: string, toolName: string, selected: boolean): void {
  const toolId = `${serviceId}:${toolName}`;
  const currentSelection = loadToolSelection();
  const newSelection = {
    ...currentSelection,
    [toolId]: selected,
  };
  saveToolSelection(newSelection);
}
