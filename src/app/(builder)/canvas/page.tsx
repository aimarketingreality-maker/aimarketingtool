
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/db";
import { cn } from "@/lib/theme";
import { HeroSection, HeroSectionEditor } from "@/components/marketing/HeroSection";
import { OptInForm, OptInFormEditor } from "@/components/marketing/OptInForm";

interface Funnel {
  id: string;
  name: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: string;
  funnel_id: string;
  name: string;
  slug: string;
  components: Component[];
}

interface Component {
  id: string;
  type: string;
  order: number;
  config: Record<string, any>;
}

interface DragItem {
  type: "component";
  componentType: string;
  id?: string;
}

export default function CanvasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const funnelId = searchParams.get("funnel");

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const availableComponents = [
    {
      type: "hero",
      name: "Hero Section",
      description: "Main headline and call-to-action",
      icon: "🎯",
    },
    {
      type: "optin-form",
      name: "Opt-in Form",
      description: "Email capture form",
      icon: "📧",
    },
  ];

  useEffect(() => {
    if (user && funnelId) {
      loadFunnel();
    } else if (user && !funnelId) {
      // Redirect to templates if no funnel ID
      router.push("/builder/templates");
    }
  }, [user, funnelId]);

  const loadFunnel = async () => {
    if (!funnelId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load funnel details
      const funnelResponse = await fetch(`/api/funnels/${funnelId}/pages`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (funnelResponse.ok) {
        const data = await funnelResponse.json();
        setPages(data.pages || []);

        if (data.pages && data.pages.length > 0) {
          setSelectedPage(data.pages[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load funnel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    setIsDragging(true);
    setDraggedItem({ type: "component", componentType });
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedItem(null);
  };

  const handleDrop = async (e: React.DragEvent, dropZone?: "after" | "before", componentId?: string) => {
    e.preventDefault();
    setIsDragging(false);

    if (!draggedItem || !selectedPage) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine the order for the new component
      let newOrder = 0;
      if (componentId && selectedPage.components) {
        const targetComponent = selectedPage.components.find(c => c.id === componentId);
        if (targetComponent) {
          newOrder = dropZone === "after" ? targetComponent.order + 1 : targetComponent.order;

          // Update orders of existing components
          if (dropZone === "before") {
            await Promise.all(
              selectedPage.components
                .filter(c => c.order >= newOrder)
                .map(c => updateComponentOrder(c.id, c.order + 1))
            );
          }
        }
      } else {
        // Add to the end
        const maxOrder = Math.max(...selectedPage.components.map(c => c.order), -1);
        newOrder = maxOrder + 1;
      }

      // Create new component with default config
      let defaultConfig = {};
      if (draggedItem.componentType === "hero") {
        defaultConfig = {
          headline: "Your Headline Here",
          subheadline: "Your subheadline goes here",
          backgroundColor: "#1f2937",
          textColor: "#ffffff",
          ctaButton: {
            text: "Get Started",
            url: "#",
            style: "primary",
          },
          alignment: "center",
        };
      } else if (draggedItem.componentType === "optin-form") {
        defaultConfig = {
          headline: "Get Updates",
          buttonText: "Subscribe",
          buttonStyle: "primary",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email Address",
              placeholder: "Enter your email",
              required: true,
              width: "full",
            },
          ],
          backgroundColor: "#111827",
          textColor: "#ffffff",
          successMessage: "Thank you for subscribing!",
          errorMessage: "Something went wrong. Please try again.",
        };
      }

      const response = await fetch(`/api/pages/${selectedPage.id}/components`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: draggedItem.componentType,
          config: defaultConfig,
          order: newOrder,
        }),
      });

      if (response.ok) {
        await loadFunnel(); // Reload the page
      }
    } catch (error) {
      console.error("Failed to add component:", error);
    }

    setDraggedItem(null);
  };

  const updateComponentOrder = async (componentId: string, newOrder: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`/api/components/${componentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ order: newOrder }),
      });
    } catch (error) {
      console.error("Failed to update component order:", error);
    }
  };

  const updateComponentConfig = async (componentId: string, config: Record<string, any>) => {
    if (!selectedPage) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsSaving(true);

      const response = await fetch(`/api/components/${componentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ config }),
      });

      if (response.ok) {
        await loadFunnel();
      }
    } catch (error) {
      console.error("Failed to update component:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteComponent = async (componentId: string) => {
    if (!selectedPage) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/components/${componentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await loadFunnel();
        setSelectedComponent(null);
      }
    } catch (error) {
      console.error("Failed to delete component:", error);
    }
  };

  const publishFunnel = async () => {
    if (!funnelId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsSaving(true);

      const response = await fetch(`/api/funnels/${funnelId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await loadFunnel();
      }
    } catch (error) {
      console.error("Failed to publish funnel:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderComponent = (component: Component) => {
    switch (component.type) {
      case "hero":
        return (
          <HeroSection
            key={component.id}
            config={component.config}
            isPreview={true}
            onUpdate={(config) => updateComponentConfig(component.id, config)}
          />
        );
      case "optin-form":
        return (
          <OptInForm
            key={component.id}
            config={component.config}
            isPreview={true}
            onUpdate={(config) => updateComponentConfig(component.id, config)}
          />
        );
      default:
        return (
          <div key={component.id} className="p-4 bg-gray-800 rounded-lg border-2 border-dashed border-gray-600">
            <p className="text-gray-400">Unknown component type: {component.type}</p>
          </div>
        );
    }
  };

  const renderComponentEditor = (component: Component) => {
    switch (component.type) {
      case "hero":
        return (
          <HeroSectionEditor
            config={component.config}
            onUpdate={(config) => updateComponentConfig(component.id, config)}
          />
        );
      case "optin-form":
        return (
          <OptInFormEditor
            config={component.config}
            onUpdate={(config) => updateComponentConfig(component.id, config)}
          />
        );
      default:
        return (
          <div className="p-6 bg-gray-800 rounded-lg">
            <p className="text-gray-400">No editor available for: {component.type}</p>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!funnelId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Funnel Selected</h2>
          <button
            onClick={() => router.push("/builder/templates")}
            className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400"
          >
            Select a Template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar - Component Library */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Components</h2>
          <div className="space-y-3">
            {availableComponents.map((component) => (
              <div
                key={component.type}
                draggable
                onDragStart={(e) => handleDragStart(e, component.type)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "p-4 bg-gray-800 rounded-lg cursor-move border-2 border-dashed border-gray-600",
                  "hover:border-yellow-500 hover:bg-gray-700 transition-colors"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{component.icon}</span>
                  <div>
                    <h3 className="font-medium text-white">{component.name}</h3>
                    <p className="text-sm text-gray-400">{component.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pages */}
        {pages.length > 0 && (
          <div className="p-6 border-t border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Pages</h2>
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => setSelectedPage(page)}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-lg transition-colors",
                    selectedPage?.id === page.id
                      ? "bg-yellow-500 bg-opacity-20 text-yellow-400 border border-yellow-500"
                      : "text-gray-300 hover:bg-gray-800"
                  )}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">
                {selectedPage?.name || "Select a page"}
              </h1>
              <div className="flex space-x-3">
                <button
                  onClick={publishFunnel}
                  disabled={isSaving}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-colors",
                    "bg-green-500 text-white hover:bg-green-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isSaving ? "Saving..." : "Publish Funnel"}
                </button>
              </div>
            </div>

            {selectedPage && (
              <div
                className={cn(
                  "min-h-screen bg-white rounded-lg overflow-hidden",
                  isDragging && "ring-4 ring-yellow-500 ring-opacity-50"
                )}
                onDrop={(e) => handleDrop(e)}
                onDragOver={(e) => e.preventDefault()}
              >
                {selectedPage.components && selectedPage.components.length > 0 ? (
                  <div>
                    {selectedPage.components
                      .sort((a, b) => a.order - b.order)
                      .map((component) => (
                        <div
                          key={component.id}
                          className="group relative"
                          onClick={() => setSelectedComponent(component)}
                        >
                          {renderComponent(component)}

                          {/* Component Controls */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedComponent(component);
                                }}
                                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteComponent(component.id);
                                }}
                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Drop zones */}
                          <div
                            className="h-2 border-2 border-dashed border-transparent hover:border-yellow-500 transition-colors"
                            onDrop={(e) => handleDrop(e, "after", component.id)}
                            onDragOver={(e) => e.preventDefault()}
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "min-h-[400px] flex items-center justify-center border-4 border-dashed rounded-lg",
                      isDragging ? "border-yellow-500 bg-yellow-50" : "border-gray-300"
                    )}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎯</div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Start Building Your Funnel
                      </h3>
                      <p className="text-gray-500">
                        Drag components from the sidebar to begin
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedComponent && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Properties</h2>
                <button
                  onClick={() => setSelectedComponent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {renderComponentEditor(selectedComponent)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
