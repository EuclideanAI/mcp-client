// Tool permission and execution management
'use client';

import { useState, useCallback } from 'react';
import { ToolCall, ToolPermissionRequest } from '@/app/types/chat-types';

export interface PermissionState {
  pendingRequests: ToolPermissionRequest[];
  approvedTools: Set<string>; // Tool names that are auto-approved
  deniedTools: Set<string>; // Tool names that are auto-denied
  sessionPermissions: Map<string, boolean>; // Per-session tool permissions
}

export function useToolPermissions() {
  const [state, setState] = useState<PermissionState>({
    pendingRequests: [],
    approvedTools: new Set(),
    deniedTools: new Set(),
    sessionPermissions: new Map(),
  });

  const requestPermission = useCallback(
    (toolCall: ToolCall, toolDescription?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        // Check if we already have a session permission for this tool
        const sessionPermission = state.sessionPermissions.get(toolCall.name);
        if (sessionPermission !== undefined) {
          resolve(sessionPermission);
          return;
        }

        // Check if tool is auto-approved or auto-denied
        if (state.approvedTools.has(toolCall.name)) {
          setState(prev => ({
            ...prev,
            sessionPermissions: new Map(prev.sessionPermissions).set(toolCall.name, true),
          }));
          resolve(true);
          return;
        }

        if (state.deniedTools.has(toolCall.name)) {
          setState(prev => ({
            ...prev,
            sessionPermissions: new Map(prev.sessionPermissions).set(toolCall.name, false),
          }));
          resolve(false);
          return;
        }

        // Determine risk level based on tool name and parameters
        const riskLevel = determineRiskLevel(toolCall);

        // Create permission request
        const request: ToolPermissionRequest = {
          toolCall,
          toolDescription,
          riskLevel,
          onApprove: () => {
            setState(prev => ({
              ...prev,
              pendingRequests: prev.pendingRequests.filter(r => r.toolCall.id !== toolCall.id),
              sessionPermissions: new Map(prev.sessionPermissions).set(toolCall.name, true),
            }));
            resolve(true);
          },
          onDeny: () => {
            setState(prev => ({
              ...prev,
              pendingRequests: prev.pendingRequests.filter(r => r.toolCall.id !== toolCall.id),
              sessionPermissions: new Map(prev.sessionPermissions).set(toolCall.name, false),
            }));
            resolve(false);
          },
        };

        // Add to pending requests
        setState(prev => ({
          ...prev,
          pendingRequests: [...prev.pendingRequests, request],
        }));
      });
    },
    [state.sessionPermissions, state.approvedTools, state.deniedTools]
  );

  const setAutoApprove = useCallback((toolName: string, approved: boolean) => {
    setState(prev => {
      const newApproved = new Set(prev.approvedTools);
      const newDenied = new Set(prev.deniedTools);

      if (approved) {
        newApproved.add(toolName);
        newDenied.delete(toolName);
      } else {
        newDenied.add(toolName);
        newApproved.delete(toolName);
      }

      return {
        ...prev,
        approvedTools: newApproved,
        deniedTools: newDenied,
      };
    });
  }, []);

  const clearSessionPermissions = useCallback(() => {
    setState(prev => ({
      ...prev,
      sessionPermissions: new Map(),
      pendingRequests: [],
    }));
  }, []);

  return {
    pendingRequests: state.pendingRequests,
    requestPermission,
    setAutoApprove,
    clearSessionPermissions,
    approvedTools: state.approvedTools,
    deniedTools: state.deniedTools,
  };
}

function determineRiskLevel(toolCall: ToolCall): 'low' | 'medium' | 'high' {
  const { name } = toolCall;

  // High-risk operations
  if (
    name.includes('delete') ||
    name.includes('remove') ||
    name.includes('destroy') ||
    name.includes('create') ||
    name.includes('update') ||
    name.includes('modify')
  ) {
    return 'high';
  }

  // Medium-risk operations
  if (
    name.includes('write') ||
    name.includes('send') ||
    name.includes('execute') ||
    name.includes('run') ||
    name.includes('upload')
  ) {
    return 'medium';
  }

  // Low-risk operations (read-only, search, etc.)
  return 'low';
}
