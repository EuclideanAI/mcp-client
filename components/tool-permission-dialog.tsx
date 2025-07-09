"use client";

import {
  AlertTriangle,
  Check,
  X,
  Shield,
  Info,
  AlertCircle,
} from "lucide-react";
import { ToolPermissionRequest } from "@/app/types/chat-types";
import { cn } from "@/lib/utils";

interface ToolPermissionDialogProps {
  request: ToolPermissionRequest;
}

export function ToolPermissionDialog({ request }: ToolPermissionDialogProps) {
  const { toolCall, toolDescription, riskLevel, onApprove, onDeny } = request;

  const getRiskConfig = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "low":
        return {
          icon: Info,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          label: "Low Risk",
          description: "Read-only operation with minimal impact",
        };
      case "medium":
        return {
          icon: AlertCircle,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          label: "Medium Risk",
          description: "May modify data or send information",
        };
      case "high":
        return {
          icon: AlertTriangle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          label: "High Risk",
          description: "May create, modify, or delete important data",
        };
    }
  };

  const riskConfig = getRiskConfig(riskLevel);
  const RiskIcon = riskConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="text-blue-600" size={24} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Tool Permission Request
              </h2>
              <p className="text-sm text-gray-600">
                The AI wants to execute a tool on your behalf
              </p>
            </div>
          </div>
        </div>

        {/* Tool Information */}
        <div className="p-6 space-y-4">
          {/* Tool Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Tool Name
            </label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
              {toolCall.name}
            </p>
          </div>

          {/* Service */}
          <div>
            <label className="text-sm font-medium text-gray-700">Service</label>
            <p className="mt-1 text-sm text-gray-900 capitalize">
              {toolCall.serviceId}
            </p>
          </div>

          {/* Description */}
          {toolDescription && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="mt-1 text-sm text-gray-600">{toolDescription}</p>
            </div>
          )}

          {/* Risk Level */}
          <div
            className={cn(
              "p-3 rounded-lg border",
              riskConfig.bgColor,
              riskConfig.borderColor
            )}
          >
            <div className="flex items-center gap-2">
              <RiskIcon className={riskConfig.color} size={16} />
              <span className={cn("font-medium text-sm", riskConfig.color)}>
                {riskConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {riskConfig.description}
            </p>
          </div>

          {/* Parameters */}
          {Object.keys(toolCall.arguments).length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Parameters
              </label>
              <div className="mt-1 bg-gray-50 p-3 rounded text-sm font-mono overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(toolCall.arguments, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Warning for high-risk operations */}
          {riskLevel === "high" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="text-red-600 flex-shrink-0"
                  size={16}
                />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    High-Risk Operation
                  </p>
                  <p className="text-sm text-red-700">
                    This operation may make significant changes to your data.
                    Please review carefully before approving.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onDeny}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
            Deny
          </button>
          <button
            onClick={onApprove}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-md transition-colors",
              riskLevel === "high"
                ? "bg-red-600 hover:bg-red-700"
                : riskLevel === "medium"
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            <Check size={16} />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
