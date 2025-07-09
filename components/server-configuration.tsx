"use client";

import { useState, useEffect } from "react";
import {
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { testMCPConnection } from "@/app/utils/mcp-client-hooks";
import { saveServiceConfig, loadServiceConfig } from "@/app/utils/storage";
import { MCPHttpConfig } from "@/app/types/mcp-types";

// Re-export for component usage
export type MCPClientConfig = MCPHttpConfig;

interface ConnectionStatus {
  isTesting: boolean;
  lastTestSuccess?: boolean;
  lastTestError?: string;
  lastTestTools?: unknown[];
}

interface ServerConfigurationProps {
  serviceId: string;
  className?: string;
}

export function ServerConfiguration({
  serviceId,
  className,
}: ServerConfigurationProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isTesting: false,
  });

  // HTTP fields
  const [url, setUrl] = useState(
    "https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp"
  );
  const [bearerToken, setBearerToken] = useState("");

  // Handle client-side mounting
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load saved configuration on mount (only on client)
  useEffect(() => {
    if (!isClient) return;

    const savedConfig = loadServiceConfig(serviceId);
    if (savedConfig) {
      setUrl(savedConfig.url);
      setBearerToken(savedConfig.bearerToken || "");
    }
  }, [serviceId, isClient]);

  // Render placeholder during server-side rendering and initial client mount
  if (!isClient) {
    return (
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 p-6",
          className
        )}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleConnect = async () => {
    setConnectionStatus({ isTesting: true });

    // Build current config
    const config: MCPClientConfig = {
      url:
        url ||
        "https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp",
      ...(bearerToken && { bearerToken }),
    };

    try {
      // Test the connection via server action (stateless)
      const result = await testMCPConnection(config);

      if (result.success) {
        // Save configuration to localStorage
        saveServiceConfig(serviceId, config);

        setConnectionStatus({
          isTesting: false,
          lastTestSuccess: true,
          lastTestTools: result.tools,
        });
      } else {
        setConnectionStatus({
          isTesting: false,
          lastTestSuccess: false,
          lastTestError: result.error || "Connection failed",
        });
      }
    } catch (error) {
      setConnectionStatus({
        isTesting: false,
        lastTestSuccess: false,
        lastTestError:
          error instanceof Error ? error.message : "Connection failed",
      });
    }
  };

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-sm border border-border p-6",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Server className="text-primary" size={20} />
          <h3 className="text-lg font-semibold text-foreground">
            Server Configuration
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {connectionStatus.isTesting ? (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              ) : connectionStatus.lastTestSuccess ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <div
                className={`w-2 h-2 rounded-full ${
                  connectionStatus.lastTestSuccess
                    ? "bg-green-500"
                    : connectionStatus.isTesting
                    ? "bg-blue-500"
                    : "bg-red-500"
                }`}
              ></div>
            </div>
            <span className="text-xs text-muted-foreground">
              {connectionStatus.isTesting
                ? "Testing..."
                : connectionStatus.lastTestSuccess
                ? `Last test: OK (${
                    connectionStatus.lastTestTools?.length || 0
                  } tools)`
                : connectionStatus.lastTestError
                ? "Last test: Failed"
                : "Not tested"}
            </span>
          </div>

          {/* Test Connection Button */}
          <button
            onClick={handleConnect}
            disabled={connectionStatus.isTesting}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              connectionStatus.isTesting
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : connectionStatus.lastTestSuccess
                ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {connectionStatus.isTesting
              ? "Testing..."
              : connectionStatus.lastTestSuccess
              ? "Test Again"
              : "Test Connection"}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={
              isCollapsed ? "Expand configuration" : "Collapse configuration"
            }
          >
            {isCollapsed ? (
              <ChevronDown className="text-muted-foreground" size={20} />
            ) : (
              <ChevronUp className="text-muted-foreground" size={20} />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Connection Error Message */}
          {connectionStatus.lastTestError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Connection Test Failed
                </span>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1 whitespace-pre-line">
                {connectionStatus.lastTestError}
              </div>
            </div>
          )}

          {/* HTTP Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                <Globe className="inline w-4 h-4 mr-1" />
                URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="https://mcp.composio.dev/composio/server/112c1d1d-1886-48d3-a64d-837c64eecdcd/mcp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Bearer Token
              </label>
              <input
                type="password"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="Enter authentication token"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Used for authentication with the HTTP server
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
