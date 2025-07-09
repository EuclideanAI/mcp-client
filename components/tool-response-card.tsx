import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ToolResponseCardProps {
  toolName: string;
  args: Record<string, unknown>;
  rawResult?: unknown;
  summary?: string;
  status: "call" | "result" | "error";
  error?: string;
  isCollapsible?: boolean;
  className?: string;
}

export function ToolResponseCard({
  toolName,
  args,
  rawResult,
  summary,
  status,
  error,
  isCollapsible = true,
  className,
}: ToolResponseCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    if (isCollapsible) {
      console.log(
        "Toggling expanded state from",
        isExpanded,
        "to",
        !isExpanded
      );
      setIsExpanded(!isExpanded);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "call":
        return "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950";
      case "result":
        return "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950";
      case "error":
        return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950";
      default:
        return "border-border bg-muted";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "call":
        return (
          <Wrench size={16} className="text-blue-600 dark:text-blue-400" />
        );
      case "result":
        return (
          <FileText size={16} className="text-green-600 dark:text-green-400" />
        );
      case "error":
        return (
          <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
        );
      default:
        return <Wrench size={16} className="text-muted-foreground" />;
    }
  };

  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const truncateJson = (jsonStr: string, maxLength: number = 200) => {
    if (jsonStr.length <= maxLength) return jsonStr;
    return jsonStr.substring(0, maxLength) + "...";
  };

  // Helper functions to render sections safely
  const renderErrorMessage = () => {
    if (!error || status !== "error") return null;
    return (
      <div className="px-3 pb-2 w-full overflow-hidden">
        <div className="text-sm text-red-700 dark:text-red-300 break-words whitespace-pre-wrap">
          {String(error)}
        </div>
      </div>
    );
  };

  const renderCollapsibleContent = () => {
    if (!isExpanded && isCollapsible) return null;

    const rawResultSection =
      rawResult && status === "result" ? (
        <div className="p-3 w-full">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Raw Result
          </div>
          <div className="bg-muted p-2 rounded text-xs font-mono w-full max-h-64 overflow-y-auto overflow-hidden">
            <pre className="whitespace-pre-wrap break-all">
              {formatJson(rawResult)}
            </pre>
          </div>
        </div>
      ) : null;

    return (
      <div className="border-t border-border bg-card w-full overflow-hidden">
        <div className="p-3 border-b border-border w-full">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Arguments
          </div>
          <div className="bg-muted p-2 rounded text-xs font-mono w-full overflow-hidden">
            <pre className="whitespace-pre-wrap break-all overflow-hidden">
              {formatJson(args)}
            </pre>
          </div>
        </div>
        {rawResultSection}
      </div>
    );
  };

  const renderCollapsedPreview = () => {
    if (isExpanded || !isCollapsible || !rawResult || status !== "result")
      return null;

    return (
      <div className="px-3 pb-2 w-full overflow-hidden">
        <div className="text-xs text-muted-foreground bg-card p-2 rounded border border-border font-mono w-full overflow-hidden">
          <div className="break-all">
            {truncateJson(formatJson(rawResult))}
            <span className="text-primary ml-2 font-sans">Click to expand</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden w-full max-w-full",
        getStatusColor(),
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-3 flex items-center justify-between transition-colors",
          isCollapsible
            ? "cursor-pointer hover:bg-muted/50 active:bg-muted"
            : ""
        )}
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getStatusIcon()}
          <span className="font-medium text-sm truncate">{toolName}</span>
          {status === "call" && (
            <span className="text-xs text-muted-foreground bg-card px-2 py-1 rounded">
              Executing...
            </span>
          )}
        </div>

        {isCollapsible && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Summary (always visible for results) */}
      {summary && status === "result" && (
        <div className="px-3 pb-2 w-full overflow-hidden">
          <div className="text-sm text-foreground prose prose-sm max-w-none w-full">
            <ReactMarkdown
              components={{
                // Ensure code blocks don't overflow
                code: ({ children, className, ...props }) => (
                  <code
                    className={`bg-muted px-1 py-0.5 rounded text-xs break-all ${
                      className || ""
                    }`}
                    {...props}
                  >
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre
                    className="bg-muted p-2 rounded text-xs overflow-hidden w-full"
                    {...props}
                  >
                    <code className="break-all whitespace-pre-wrap">
                      {children}
                    </code>
                  </pre>
                ),
                // Ensure paragraphs don't have too much margin
                p: ({ children, ...props }) => (
                  <p
                    className="mb-2 leading-relaxed break-words w-full"
                    {...props}
                  >
                    {children}
                  </p>
                ),
                // Handle lists properly
                ul: ({ children, ...props }) => (
                  <ul className="list-disc pl-4 mb-2 break-words" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="list-decimal pl-4 mb-2 break-words" {...props}>
                    {children}
                  </ol>
                ),
                // Ensure tables are responsive
                table: ({ children, ...props }) => (
                  <div className="overflow-x-auto w-full">
                    <table className="min-w-full table-auto text-xs" {...props}>
                      {children}
                    </table>
                  </div>
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {renderErrorMessage()}

      {renderCollapsibleContent()}

      {renderCollapsedPreview()}
    </div>
  );
}
