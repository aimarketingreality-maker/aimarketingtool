"use client";

import React from "react";
import { cn } from "@/lib/theme";

interface ComponentLibraryProps {
  onComponentSelect: (componentType: string) => void;
  className?: string;
}

interface ComponentDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: "content" | "forms" | "media" | "social";
  recommended?: boolean;
}

const componentDefinitions: ComponentDefinition[] = [
  {
    type: "hero",
    name: "Hero Section",
    description: "Large headline with call-to-action button",
    icon: "🎯",
    category: "content",
    recommended: true
  },
  {
    type: "optin-form",
    name: "Opt-in Form",
    description: "Email capture form with customizable fields",
    icon: "📧",
    category: "forms",
    recommended: true
  },
  {
    type: "testimonials",
    name: "Testimonials",
    description: "Customer testimonials with ratings",
    icon: "⭐",
    category: "social"
  },
  {
    type: "countdown-timer",
    name: "Countdown Timer",
    description: "Creates urgency with time-limited offers",
    icon: "⏰",
    category: "content"
  },
  {
    type: "features",
    name: "Features List",
    description: "Product features with icons and descriptions",
    icon: "✨",
    category: "content"
  },
  {
    type: "pricing",
    name: "Pricing Table",
    description: "Tiered pricing with comparison features",
    icon: "💰",
    category: "content"
  }
];

const categories = [
  { id: "all", name: "All Components", color: "gray" },
  { id: "content", name: "Content", color: "blue" },
  { id: "forms", name: "Forms", color: "green" },
  { id: "media", name: "Media", color: "purple" },
  { id: "social", name: "Social", color: "yellow" }
];

export default function ComponentLibrary({ onComponentSelect, className }: ComponentLibraryProps) {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredComponents = componentDefinitions.filter(component => {
    const matchesCategory = selectedCategory === "all" || component.category === selectedCategory;
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          component.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    const categoryConfig = categories.find(cat => cat.id === category);
    return categoryConfig?.color || "gray";
  };

  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({
      type: "component",
      componentType
    }));
  };

  return (
    <div className={cn("bg-gray-900 border-r border-gray-800 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Components</h2>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                selectedCategory === category.id
                  ? "bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500 border-opacity-30"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Components List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredComponents.map(component => (
            <div
              key={component.type}
              draggable
              onDragStart={(e) => handleDragStart(e, component.type)}
              onClick={() => onComponentSelect(component.type)}
              className={cn(
                "p-3 bg-gray-800 rounded-lg border border-gray-700 cursor-move hover:border-gray-600 hover:bg-gray-750 transition-all",
                "group hover:shadow-lg"
              )}
            >
              {/* Recommended Badge */}
              {component.recommended && (
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500 border-opacity-30">
                    Recommended
                  </span>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    getCategoryColor(component.category) === "blue" && "bg-blue-500 bg-opacity-20 text-blue-400",
                    getCategoryColor(component.category) === "green" && "bg-green-500 bg-opacity-20 text-green-400",
                    getCategoryColor(component.category) === "purple" && "bg-purple-500 bg-opacity-20 text-purple-400",
                    getCategoryColor(component.category) === "yellow" && "bg-yellow-500 bg-opacity-20 text-yellow-400",
                    getCategoryColor(component.category) === "gray" && "bg-gray-500 bg-opacity-20 text-gray-400"
                  )}>
                    {categories.find(cat => cat.id === component.category)?.name}
                  </span>
                </div>
              )}

              {/* Component Info */}
              <div className="flex items-start space-x-3">
                <div className="text-2xl group-hover:scale-110 transition-transform">
                  {component.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium text-sm group-hover:text-yellow-400 transition-colors">
                    {component.name}
                  </h3>
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                    {component.description}
                  </p>
                </div>
              </div>

              {/* Drag Indicator */}
              <div className="mt-3 flex items-center justify-center">
                <div className="text-gray-600 text-xs flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                  <span>Drag to add</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredComponents.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm">
              No components found matching "{searchTerm}"
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Click or drag components to add them to your funnel
        </div>
      </div>
    </div>
  );
}