"use client";

import React, { useState, useRef } from "react";
import { cn } from "@/lib/theme";

interface DragDropCanvasProps {
  components: any[];
  selectedComponent: any;
  onComponentSelect: (component: any) => void;
  onComponentUpdate: (componentId: string, updates: any) => void;
  onComponentDelete: (componentId: string) => void;
  onComponentReorder: (fromIndex: number, toIndex: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  className?: string;
}

interface DragItem {
  type: "component" | "existing";
  componentType?: string;
  componentId?: string;
  index?: number;
}

export default function DragDropCanvas({
  components,
  selectedComponent,
  onComponentSelect,
  onComponentUpdate,
  onComponentDelete,
  onComponentReorder,
  onDrop,
  className
}: DragDropCanvasProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, component: any, index: number) => {
    setDraggedItem({
      type: "existing",
      componentId: component.id,
      index
    });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItem?.type === "existing" ? "move" : "copy";
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the canvas
    if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedItem?.type === "existing" && draggedItem.index !== undefined) {
      // Reorder existing component
      if (draggedItem.index !== index) {
        onComponentReorder(draggedItem.index, index);
      }
    } else {
      // Add new component
      onDrop(e, index);
    }

    setDraggedItem(null);
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedItem?.type !== "existing") {
      // Drop at the end of canvas
      onDrop(e, components.length);
    }

    setDraggedItem(null);
  };

  const renderComponent = (component: any, index: number) => {
    const isSelected = selectedComponent?.id === component.id;
    const isDraggedOver = dragOverIndex === index;

    // Dynamically import the component based on type
    let ComponentElement = null;
    try {
      switch (component.type) {
        case "hero":
          const { HeroSection } = require("@/components/marketing/HeroSection");
          ComponentElement = <HeroSection config={component.config} />;
          break;
        case "optin-form":
          const { OptInForm } = require("@/components/marketing/OptInForm");
          ComponentElement = <OptInForm config={component.config} />;
          break;
        case "testimonials":
          const { Testimonial } = require("@/components/marketing/Testimonial");
          ComponentElement = <Testimonial config={component.config} />;
          break;
        case "countdown-timer":
          const { CountdownTimer } = require("@/components/marketing/CountdownTimer");
          ComponentElement = <CountdownTimer config={component.config} />;
          break;
        default:
          ComponentElement = (
            <div className="p-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-center">
              <div className="text-gray-500">
                {component.type} component
              </div>
            </div>
          );
      }
    } catch (error) {
      ComponentElement = (
        <div className="p-4 bg-gray-100 border-2 border-dashed border-red-300 rounded-lg text-center">
          <div className="text-red-500">
            Error loading {component.type} component
          </div>
        </div>
      );
    }

    return (
      <div
        key={component.id}
        draggable
        onDragStart={(e) => handleDragStart(e, component, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onClick={() => onComponentSelect(component)}
        className={cn(
          "relative group cursor-move transition-all",
          isSelected && "ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-50",
          isDraggedOver && "border-t-4 border-t-yellow-500"
        )}
      >
        {/* Component Controls */}
        <div className={cn(
          "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",
          "flex space-x-1 z-10"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComponentSelect(component);
            }}
            className="p-1 bg-white rounded shadow hover:bg-gray-100"
            title="Edit component"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Delete this component?")) {
                onComponentDelete(component.id);
              }
            }}
            className="p-1 bg-white rounded shadow hover:bg-red-100"
            title="Delete component"
          >
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Component Wrapper */}
        <div className={cn(
          "border-2 rounded-lg overflow-hidden",
          isSelected ? "border-yellow-500" : "border-transparent hover:border-gray-300"
        )}>
          {ComponentElement}
        </div>

        {/* Component Label */}
        <div className="mt-2 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 text-center">
          {component.type.replace("-", " ")}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "bg-white rounded-lg border-2 border-dashed border-gray-300",
        "min-h-[600px] p-6 space-y-6 overflow-y-auto",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (dragOverIndex === null) {
          e.dataTransfer.dropEffect = draggedItem?.type === "existing" ? "move" : "copy";
        }
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleCanvasDrop}
    >
      {/* Canvas Header */}
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Funnel Canvas</h3>
        <p className="text-gray-500 text-sm">
          Drag components from the library to build your funnel
        </p>
      </div>

      {/* Components */}
      {components.length === 0 ? (
        // Empty State
        <div className="text-center py-16">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium mb-2">
            No components yet
          </p>
          <p className="text-gray-400 text-sm">
            Drag components from the library to get started
          </p>
        </div>
      ) : (
        // Render Components
        components.map((component, index) => (
          <div key={component.id}>
            {renderComponent(component, index)}
            {/* Drop Zone Between Components */}
            <div
              className={cn(
                "h-2 border-2 border-dashed rounded transition-all",
                dragOverIndex === index
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-transparent hover:border-gray-300"
              )}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            />
          </div>
        ))
      )}

      {/* Drop Zone at End */}
      {components.length > 0 && (
        <div
          className={cn(
            "h-16 border-2 border-dashed rounded-lg flex items-center justify-center transition-all",
            dragOverIndex === components.length
              ? "border-yellow-500 bg-yellow-50"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          )}
          onDragOver={(e) => handleDragOver(e, components.length)}
          onDrop={(e) => handleDrop(e, components.length)}
        >
          <div className="text-gray-500 text-center">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm">
              Drop component here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}