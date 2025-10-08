"use client";

import React from "react";
import { cn } from "@/lib/theme";

interface PropertyEditorProps {
  component: any;
  onChange: (updates: any) => void;
  onClose: () => void;
  className?: string;
}

export default function PropertyEditor({ component, onChange, onClose, className }: PropertyEditorProps) {
  const [activeTab, setActiveTab] = React.useState("content");

  if (!component) {
    return (
      <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <p className="font-medium mb-2">No Component Selected</p>
          <p className="text-sm">Select a component to edit its properties</p>
        </div>
      </div>
    );
  }

  const renderEditor = () => {
    switch (component.type) {
      case "hero":
        const { HeroSectionEditor } = require("@/components/marketing/HeroSection");
        return <HeroSectionEditor component={component} onChange={onChange} />;
      case "optin-form":
        const { OptInFormEditor } = require("@/components/marketing/OptInForm");
        return <OptInFormEditor component={component} onChange={onChange} />;
      case "testimonials":
        const { TestimonialEditor } = require("@/components/marketing/Testimonial");
        return <TestimonialEditor component={component} onChange={onChange} />;
      case "countdown-timer":
        const { CountdownTimerEditor } = require("@/components/marketing/CountdownTimer");
        return <CountdownTimerEditor component={component} onChange={onChange} />;
      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {component.type} Properties
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Type
                </label>
                <input
                  type="text"
                  value={component.type}
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Configuration (JSON)
                </label>
                <textarea
                  value={JSON.stringify(component.config, null, 2)}
                  onChange={(e) => {
                    try {
                      const newConfig = JSON.parse(e.target.value);
                      onChange({ ...component, config: newConfig });
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  rows={10}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  const tabs = [
    { id: "content", name: "Content", icon: "📝" },
    { id: "style", name: "Style", icon: "🎨" },
    { id: "advanced", name: "Advanced", icon: "⚙️" }
  ];

  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="text-lg">
            {getComponentIcon(component.type)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {getComponentName(component.type)}
            </h3>
            <p className="text-xs text-gray-500">
              Component Properties
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "content" && renderEditor()}
        {activeTab === "style" && renderStyleEditor()}
        {activeTab === "advanced" && renderAdvancedEditor()}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Component ID: {component.id}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (confirm("Reset this component to default settings?")) {
                  // Reset logic would go here
                  console.log("Reset component");
                }
              }}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this component?")) {
                  // Delete logic would go here
                  console.log("Delete component");
                }
              }}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function renderStyleEditor() {
    return (
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900">Style Settings</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={component.config?.backgroundColor || "#ffffff"}
                onChange={(e) => onChange({
                  ...component,
                  config: {
                    ...component.config,
                    backgroundColor: e.target.value
                  }
                })}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={component.config?.backgroundColor || "#ffffff"}
                onChange={(e) => onChange({
                  ...component,
                  config: {
                    ...component.config,
                    backgroundColor: e.target.value
                  }
                })}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={component.config?.textColor || "#000000"}
                onChange={(e) => onChange({
                  ...component,
                  config: {
                    ...component.config,
                    textColor: e.target.value
                  }
                })}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={component.config?.textColor || "#000000"}
                onChange={(e) => onChange({
                  ...component,
                  config: {
                    ...component.config,
                    textColor: e.target.value
                  }
                })}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Padding
            </label>
            <select
              value={component.config?.padding || "medium"}
              onChange={(e) => onChange({
                ...component,
                config: {
                  ...component.config,
                  padding: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="none">None</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>
    );
  }

  function renderAdvancedEditor() {
    return (
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900">Advanced Settings</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom CSS Classes
            </label>
            <input
              type="text"
              value={component.config?.customClasses || ""}
              onChange={(e) => onChange({
                ...component,
                config: {
                  ...component.config,
                  customClasses: e.target.value
                }
              })}
              placeholder="custom-class-1 custom-class-2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Component ID (for CSS targeting)
            </label>
            <input
              type="text"
              value={component.config?.customId || ""}
              onChange={(e) => onChange({
                ...component,
                config: {
                  ...component.config,
                  customId: e.target.value
                }
              })}
              placeholder="my-component-id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hideOnMobile"
              checked={component.config?.hideOnMobile || false}
              onChange={(e) => onChange({
                ...component,
                config: {
                  ...component.config,
                  hideOnMobile: e.target.checked
                }
              })}
              className="mr-2"
            />
            <label htmlFor="hideOnMobile" className="text-sm text-gray-700">
              Hide on mobile devices
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hideOnDesktop"
              checked={component.config?.hideOnDesktop || false}
              onChange={(e) => onChange({
                ...component,
                config: {
                  ...component.config,
                  hideOnDesktop: e.target.checked
                }
              })}
              className="mr-2"
            />
            <label htmlFor="hideOnDesktop" className="text-sm text-gray-700">
              Hide on desktop devices
            </label>
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h5>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(component, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  function getComponentIcon(type: string): string {
    const icons: Record<string, string> = {
      hero: "🎯",
      "optin-form": "📧",
      testimonials: "⭐",
      "countdown-timer": "⏰",
      features: "✨",
      pricing: "💰"
    };
    return icons[type] || "📦";
  }

  function getComponentName(type: string): string {
    const names: Record<string, string> = {
      hero: "Hero Section",
      "optin-form": "Opt-in Form",
      testimonials: "Testimonials",
      "countdown-timer": "Countdown Timer",
      features: "Features List",
      pricing: "Pricing Table"
    };
    return names[type] || type.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase());
  }
}