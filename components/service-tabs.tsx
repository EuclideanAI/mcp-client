"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaGithub, FaSlack, FaDatabase, FaCloud } from "react-icons/fa";
import { SiJira, SiConfluence } from "react-icons/si";
import { ServerConfiguration } from "./server-configuration";
import { AvailableActions } from "./available-actions";
import { ToolInterface } from "./tool-interface";

// Add interface for MCPTool to match the one in available-actions
interface MCPTool {
  name: string;
  description?: string;
}

const services = [
  {
    id: "jira",
    name: "Jira",
    icon: SiJira,
    color: "bg-blue-500",
    description: "Project management and issue tracking",
  },
  {
    id: "confluence",
    name: "Confluence",
    icon: SiConfluence,
    color: "bg-blue-600",
    description: "Team collaboration and documentation",
  },
  {
    id: "github",
    name: "GitHub",
    icon: FaGithub,
    color: "bg-gray-800",
    description: "Version control and code collaboration",
  },
  {
    id: "slack",
    name: "Slack",
    icon: FaSlack,
    color: "bg-purple-600",
    description: "Team communication and messaging",
  },
  {
    id: "database",
    name: "Database",
    icon: FaDatabase,
    color: "bg-green-600",
    description: "Database management and queries",
  },
  {
    id: "cloud",
    name: "Cloud Services",
    icon: FaCloud,
    color: "bg-orange-500",
    description: "Cloud infrastructure management",
  },
];

interface ServiceTabsProps {
  className?: string;
}

export function ServiceTabs({ className }: ServiceTabsProps) {
  const [activeTab, setActiveTab] = useState("jira");
  const [selectedToolForExecution, setSelectedToolForExecution] =
    useState<MCPTool | null>(null);

  const activeService = services.find((service) => service.id === activeTab);

  // Handle tool selection from AvailableActions
  const handleToolSelect = (tool: MCPTool) => {
    setSelectedToolForExecution(tool);
  };

  return (
    <div
      className={cn(
        "bg-card rounded-lg shadow-sm border border-border h-full flex flex-col",
        className
      )}
    >
      {/* Tab Navigation */}
      <div className="border-b border-border sticky top-0 bg-card z-20">
        <nav className="flex space-x-8 px-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                onClick={() => setActiveTab(service.id)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === service.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="w-4 h-4" />
                {service.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {activeService && (
          <div className="space-y-6">
            {/* Service Header */}
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-lg", activeService.color)}>
                <activeService.icon className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {activeService.name}
                </h2>
                <p className="text-muted-foreground">
                  {activeService.description}
                </p>
              </div>
            </div>

            {/* Server Configuration */}
            <ServerConfiguration serviceId={activeService.id} />

            {/* Available Actions */}
            <AvailableActions
              serviceId={activeService.id}
              onToolSelect={handleToolSelect}
            />

            {/* Tool Interface */}
            <ToolInterface
              serviceId={activeService.id}
              selectedTool={selectedToolForExecution}
            />

            {/* Service Content */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6"></div>
          </div>
        )}
      </div>
    </div>
  );
}
