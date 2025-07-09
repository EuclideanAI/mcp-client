"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Play, Loader2, Settings } from "lucide-react";
import { useMCPService } from "@/app/utils/mcp-client-hooks";

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<
      string,
      {
        type?: string;
        description?: string;
        enum?: string[];
        required?: boolean;
      }
    >;
    required?: string[];
  };
}

interface Parameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  enum?: string[];
}

interface ToolInterfaceProps {
  serviceId: string;
  className?: string;
  selectedTool?: MCPTool | null;
}

export function ToolInterface({
  serviceId,
  className,
  selectedTool: externalSelectedTool,
}: ToolInterfaceProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [parameterValues, setParameterValues] = useState<
    Record<string, unknown>
  >({});
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{
    content: unknown[];
    isError?: boolean;
  } | null>(null);

  // Get the MCP service for the provided service ID
  const mcpService = useMCPService(serviceId);

  // Function to fetch tools for the service (needed for full tool schema)
  const fetchTools = async () => {
    try {
      const result = await mcpService.listTools();
      if (result.success && result.tools) {
        setTools((result.tools as MCPTool[]) || []);
      }
    } catch (err) {
      // Silently handle error - tools will be fetched when needed
      console.warn("Failed to fetch tools:", err);
    }
  };

  // Parse tool parameters from schema
  const parseToolParameters = (tool: MCPTool): Parameter[] => {
    if (!tool.inputSchema?.properties) {
      return [];
    }

    const requiredFields = tool.inputSchema.required || [];
    return Object.entries(tool.inputSchema.properties).map(
      ([name, schema]) => ({
        name,
        type: schema.type || "string",
        description: schema.description,
        required: requiredFields.includes(name),
        enum: schema.enum,
      })
    );
  };

  // Handle tool selection
  const handleToolSelect = (tool: MCPTool) => {
    setSelectedTool(tool);
    const toolParams = parseToolParameters(tool);
    setParameters(toolParams);

    // Initialize parameter values
    const initialValues: Record<string, unknown> = {};
    toolParams.forEach((param) => {
      initialValues[param.name] = param.type === "boolean" ? false : "";
    });
    setParameterValues(initialValues);
    setResult(null);
    setError("");
  };

  // Handle parameter value change
  const handleParameterChange = (paramName: string, value: unknown) => {
    setParameterValues((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  // Execute the selected tool
  const executeTool = async () => {
    if (!selectedTool) return;

    setExecuting(true);
    setError("");
    setResult(null);

    try {
      // Validate required parameters
      const missingRequired = parameters
        .filter((param) => param.required)
        .filter(
          (param) =>
            !parameterValues[param.name] || parameterValues[param.name] === ""
        )
        .map((param) => param.name);

      if (missingRequired.length > 0) {
        setError(`Missing required parameters: ${missingRequired.join(", ")}`);
        return;
      }

      // Prepare arguments - only include non-empty values
      const args: Record<string, unknown> = {};
      Object.entries(parameterValues).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          // Convert types based on parameter definition
          const param = parameters.find((p) => p.name === key);
          if (param) {
            switch (param.type) {
              case "number":
                args[key] = Number(value);
                break;
              case "boolean":
                args[key] = Boolean(value);
                break;
              case "object":
                try {
                  args[key] =
                    typeof value === "string" ? JSON.parse(value) : value;
                } catch {
                  args[key] = value;
                }
                break;
              default:
                args[key] = value;
            }
          } else {
            args[key] = value;
          }
        }
      });

      const result = await mcpService.callTool(selectedTool.name, args);

      if (result.success) {
        setResult({
          content: result.content || [],
          isError: result.isError,
        });
      } else {
        setError(result.error || "Tool execution failed");
      }
    } catch (err) {
      setError(
        `Execution error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setExecuting(false);
    }
  };

  // Render input field based on parameter type
  const renderParameterInput = (param: Parameter) => {
    const value = parameterValues[param.name];

    switch (param.type) {
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) =>
              handleParameterChange(param.name, e.target.checked)
            }
            className="rounded border-border bg-background focus:ring-ring focus:border-ring"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={String(value || "")}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            placeholder={`Enter ${param.name}`}
          />
        );

      case "object":
        return (
          <textarea
            value={
              typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value || "")
            }
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            placeholder="Enter JSON object"
            rows={3}
          />
        );

      default:
        if (param.enum && param.enum.length > 0) {
          return (
            <select
              value={String(value || "")}
              onChange={(e) =>
                handleParameterChange(param.name, e.target.value)
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">Select an option</option>
              {param.enum.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }

        return (
          <input
            type="text"
            value={String(value || "")}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            placeholder={`Enter ${param.name}`}
          />
        );
    }
  };

  // Fetch tools when component mounts or serviceId changes
  useEffect(() => {
    fetchTools();
  }, [serviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle external tool selection
  useEffect(() => {
    if (externalSelectedTool && tools.length > 0) {
      const fullTool = tools.find((t) => t.name === externalSelectedTool.name);
      if (fullTool) {
        handleToolSelect(fullTool);
      }
    }
  }, [externalSelectedTool, tools]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-sm border border-border p-6",
        className
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="text-primary" size={20} />
          <h3 className="text-lg font-semibold text-foreground">
            Tool Interface
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* Tool Selection Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedTool
                ? `Selected: ${selectedTool.name}`
                : "No tool selected"}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={isCollapsed ? "Expand interface" : "Collapse interface"}
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
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive font-medium">
                  Interface Error
                </span>
              </div>
              <div className="text-sm text-destructive/90 mt-1 whitespace-pre-line">
                {error}
              </div>
            </div>
          )}

          {/* Tool Selection Status */}
          {!selectedTool && (
            <div className="mb-6 text-center py-8">
              <Settings className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Click &quot;Execute&quot; on any tool from Available Actions
                above to configure and run it here.
              </p>
            </div>
          )}

          {selectedTool && (
            <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-md">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {selectedTool.name}
                  </h4>
                  {selectedTool.description && (
                    <p className="text-xs text-muted-foreground">
                      {selectedTool.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Parameters Form */}
          {selectedTool && parameters.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Parameters{" "}
                {parameters.filter((p) => p.required).length > 0 && (
                  <span className="text-xs text-destructive ml-1">
                    (* required)
                  </span>
                )}
              </h4>
              <div className="space-y-4">
                {parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {param.name}
                      {param.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({param.type})
                      </span>
                    </label>
                    {renderParameterInput(param)}
                    {param.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execute Button */}
          {selectedTool && (
            <div className="mb-6">
              <button
                onClick={executeTool}
                disabled={executing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  executing
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {executing ? "Executing..." : "Execute Tool"}
              </button>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">
                Execution Result
                {result.isError && (
                  <span className="text-destructive ml-2">(Error Response)</span>
                )}
              </h4>
              <div
                className={cn(
                  "p-4 rounded-md border",
                  result.isError
                    ? "bg-destructive/10 border-destructive/20"
                    : "bg-green-500/10 border-green-500/20 dark:bg-green-400/10 dark:border-green-400/20"
                )}
              >
                <pre className={cn(
                  "text-sm whitespace-pre-wrap overflow-x-auto",
                  result.isError 
                    ? "text-destructive" 
                    : "text-green-700 dark:text-green-300"
                )}>
                  {typeof result.content === "string"
                    ? result.content
                    : JSON.stringify(result.content, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
