"use client";

import { MessageCircle, Send, Bot, User, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/app/utils/use-chat";
import { useToolPermissions } from "@/app/utils/tool-permissions";
import { ToolPermissionDialog } from "./tool-permission-dialog";
import { ModelSelector } from "./model-selector";
import { ToolResponseCard } from "./tool-response-card";

export function ChatPanel() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isStreaming,
    settings,
    updateSettings,
    clearConversation,
  } = useChat();
  const { pendingRequests } = useToolPermissions();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      handleSubmit(e);
    }
  };

  const handleClearConversation = () => {
    if (window.confirm("Are you sure you want to clear the conversation?")) {
      clearConversation();
    }
  };

  return (
    <>
      <div className="h-full bg-background border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="text-primary" size={20} />
              <h2 className="font-semibold text-foreground">LLM Chat</h2>
            </div>
            <button
              onClick={handleClearConversation}
              disabled={isStreaming || messages.length === 0}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Model Selector */}
          <div className="mt-3">
            <ModelSelector
              settings={settings}
              onSettingsChange={updateSettings}
              disabled={isStreaming}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              <MessageCircle
                size={48}
                className="mx-auto mb-4 text-muted-foreground/50"
              />
              <p>Start a conversation with the LLM</p>
              <p className="text-xs mt-2">
                Ask questions or request tool assistance
              </p>
              <div className="mt-4 text-xs bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="font-medium text-primary mb-1">
                  Available Tools:
                </p>
                <p className="text-primary/80">
                  The AI can access your configured MCP services and execute
                  tools with your permission.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[90%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Content */}
                <div
                  className={cn(
                    "p-3 rounded-lg",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Tool Invocations */}
                  {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                    <div className="mt-2 space-y-2 w-full overflow-hidden">
                      {msg.toolInvocations.map((invocation, index) => {
                        // Handle both standard ToolInvocation and our enhanced type
                        const result =
                          "result" in invocation
                            ? invocation.result
                            : undefined;

                        // Check if result contains our enhanced structure
                        let rawResult = result;
                        let summary = undefined;

                        if (
                          result &&
                          typeof result === "object" &&
                          "raw" in result &&
                          "summary" in result
                        ) {
                          rawResult = result.raw;
                          summary = result.summary;
                        }

                        return (
                          <ToolResponseCard
                            key={index}
                            toolName={invocation.toolName}
                            args={invocation.args}
                            rawResult={rawResult}
                            summary={summary}
                            status={
                              invocation.state === "partial-call"
                                ? "call"
                                : result
                                ? "result"
                                : "error"
                            }
                            error={
                              invocation.state === "partial-call"
                                ? undefined
                                : result
                                ? undefined
                                : "No result received"
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-border bg-card"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={isStreaming}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              {isStreaming ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>

      {/* Tool Permission Dialogs */}
      {pendingRequests.map((request, index) => (
        <ToolPermissionDialog key={index} request={request} />
      ))}
    </>
  );
}
