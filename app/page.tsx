"use client";

import { ChatPanel } from "@/components/chat-panel";
import { ServiceTabs } from "@/components/service-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-foreground">MCP Client</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Model Context Protocol Interface
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Resizable Layout */}
      <div className="h-[calc(100vh-64px)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Chat Panel */}
          <ResizablePanel
            defaultSize={25}
            minSize={20}
            maxSize={40}
            className="min-w-[300px]"
          >
            <ChatPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main Content Panel */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="h-full bg-background flex flex-col">
              <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 flex flex-col">
                {/* Welcome Section */}
                <div className="bg-card p-6 rounded-lg shadow-sm border border-border mb-6">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to MCP Client
                  </h2>
                  <p className="text-muted-foreground">
                    Connect and interact with various services through the Model
                    Context Protocol. Use the chat interface on the left to
                    communicate with LLMs or manage services directly through
                    the tabs below.
                  </p>
                </div>

                {/* Service Tabs */}
                <div className="h-[calc(100vh-250px)]">
                  <ServiceTabs />
                </div>
              </main>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
