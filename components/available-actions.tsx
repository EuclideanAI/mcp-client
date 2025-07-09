"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  List,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { useMCPService } from "@/app/utils/mcp-client-hooks";
import { isToolSelected, toggleToolSelection } from "@/app/utils/storage";
import { useToolRegistry } from "@/app/utils/tool-registry";

interface MCPTool {
  name: string;
  description?: string;
}

interface AvailableActionsProps {
  serviceId: string;
  className?: string;
  onToolSelect?: (tool: MCPTool) => void;
}

export function AvailableActions({
  serviceId,
  className,
  onToolSelect,
}: AvailableActionsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [toolSelections, setToolSelections] = useState<Record<string, boolean>>(
    {}
  );

  // Get the MCP service for the provided service ID
  const mcpService = useMCPService(serviceId);
  const { refreshTools: refreshToolRegistry } = useToolRegistry();

  // Load tool selection state
  useEffect(() => {
    const loadSelections = () => {
      const selections: Record<string, boolean> = {};
      tools.forEach((tool) => {
        selections[tool.name] = isToolSelected(serviceId, tool.name);
      });
      setToolSelections(selections);
    };

    if (tools.length > 0) {
      loadSelections();
    }
  }, [tools, serviceId]);

  // Handle tool selection toggle
  const handleToolToggle = (toolName: string) => {
    console.log("🔧 AvailableActions: toggling tool", { serviceId, toolName });
    toggleToolSelection(serviceId, toolName);
    setToolSelections((prev) => ({
      ...prev,
      [toolName]: !prev[toolName],
    }));
    // Refresh tool registry to update chat tools
    console.log("🔄 AvailableActions: refreshing tool registry");
    refreshToolRegistry();
  };

  // Handle select all/deselect all
  const handleSelectAll = () => {
    const allSelected = tools.every(
      (tool) => toolSelections[tool.name] ?? true
    );
    const newState = !allSelected;

    // Update each tool's selection state
    tools.forEach((tool) => {
      const currentSelection = isToolSelected(serviceId, tool.name);
      if (currentSelection !== newState) {
        toggleToolSelection(serviceId, tool.name);
      }
    });

    // Update local state
    const newSelections: Record<string, boolean> = {};
    tools.forEach((tool) => {
      newSelections[tool.name] = newState;
    });
    setToolSelections(newSelections);

    // Refresh tool registry to update chat tools
    refreshToolRegistry();
  };

  // Check if all tools are selected
  const allToolsSelected =
    tools.length > 0 &&
    tools.every((tool) => toolSelections[tool.name] ?? true);
  const selectedCount = tools.filter(
    (tool) => toolSelections[tool.name] ?? true
  ).length;

  // Function to fetch tools for the service
  const fetchTools = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await mcpService.listTools();

      if (result.success && result.tools) {
        setTools((result.tools as MCPTool[]) || []);
      } else {
        setError(result.error || "Failed to fetch tools");
      }
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch tools when component mounts or serviceId changes
  useEffect(() => {
    fetchTools();
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-sm border border-border p-6",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <List className="text-primary" size={20} />
          <h3 className="text-lg font-semibold text-foreground">
            Available Actions
          </h3>
          {tools.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({selectedCount}/{tools.length} selected)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Select All/Deselect All Button */}
          {tools.length > 0 && !isCollapsed && (
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors font-medium flex items-center gap-1"
              title={
                allToolsSelected ? "Deselect all tools" : "Select all tools"
              }
            >
              {allToolsSelected ? (
                <>
                  <Square size={14} />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  Select All
                </>
              )}
            </button>
          )}
          {/* Tools Count Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {loading
                ? "Loading..."
                : error
                ? "Error loading tools"
                : `${tools.length} tool${
                    tools.length !== 1 ? "s" : ""
                  } available`}
            </span>
            {loading && (
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchTools}
            disabled={loading}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              loading
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand actions" : "Collapse actions"}
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
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">
                  Failed to Load Tools
                </span>
              </div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1 whitespace-pre-line">
                {error}
              </div>
            </div>
          )}

          {/* Tools List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading tools...
                </span>
              </div>
            ) : tools.length > 0 ? (
              tools.map((tool: MCPTool, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-muted border border-border rounded-md hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        id={`tool-${serviceId}-${tool.name}`}
                        checked={toolSelections[tool.name] ?? true}
                        onChange={() => handleToolToggle(tool.name)}
                        className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring focus:ring-2"
                      />
                    </div>

                    {/* Tool Info */}
                    <div className="flex-1">
                      <label
                        htmlFor={`tool-${serviceId}-${tool.name}`}
                        className="cursor-pointer"
                      >
                        <h4 className="text-sm font-medium text-foreground">
                          {tool.name || `Tool ${index + 1}`}
                        </h4>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tool.description}
                          </p>
                        )}
                      </label>
                    </div>

                    {/* Select Button */}
                    <button
                      onClick={() => {
                        onToolSelect?.(tool);
                        setIsCollapsed(true);
                      }}
                      className="ml-3 px-2 py-1 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                      title={`Execute ${tool.name}`}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <List className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No tools available. Make sure the service is configured
                  correctly.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
