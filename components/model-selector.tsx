"use client";

import { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import { ChatModel, ChatSettings } from "@/app/types/chat-types";
import { getAvailableModels } from "@/app/utils/chat-providers";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  settings: ChatSettings;
  onSettingsChange: (newSettings: Partial<ChatSettings>) => void;
  disabled?: boolean;
}

export function ModelSelector({
  settings,
  onSettingsChange,
  disabled,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const models = getAvailableModels();
  const currentModel = models.find((m) => m.id === settings.model);

  const handleModelChange = (modelId: ChatModel) => {
    onSettingsChange({ model: modelId });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Model Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-medium">
            {currentModel?.name || "Select Model"}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            {/* Model Options */}
            <div className="space-y-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    settings.model === model.id
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-100"
                  )}
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {model.description}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Max tokens: {model.maxTokens.toLocaleString()}
                  </div>
                </button>
              ))}
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={14} />
                Advanced Settings
                <ChevronDown
                  size={14}
                  className={cn(
                    "ml-auto transition-transform",
                    showAdvanced && "rotate-180"
                  )}
                />
              </button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="mt-2 space-y-3 px-3 pb-2">
                  {/* Temperature */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Temperature: {settings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) =>
                        onSettingsChange({
                          temperature: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="100"
                      max={currentModel?.maxTokens || 4096}
                      step="100"
                      value={settings.maxTokens}
                      onChange={(e) =>
                        onSettingsChange({
                          maxTokens: parseInt(e.target.value),
                        })
                      }
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
