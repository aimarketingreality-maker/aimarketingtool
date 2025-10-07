
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/db";
import { n8nClient } from "@/lib/n8n";
import { cn } from "@/lib/theme";

interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead-magnet" | "sales-funnel" | "webinar" | "product-launch";
  preview: string;
  components: TemplateComponent[];
  workflow?: string; // n8n workflow template ID
}

interface TemplateComponent {
  type: "hero" | "optin-form" | "features" | "testimonials" | "pricing";
  config: Record<string, any>;
  order: number;
}

const templates: FunnelTemplate[] = [
  {
    id: "lead-magnet-funnel",
    name: "Lead Magnet Funnel",
    description: "Perfect for collecting email leads and delivering free content. Includes hero section and opt-in form with Mailchimp integration.",
    category: "lead-magnet",
    preview: "/templates/lead-magnet-preview.jpg",
    workflow: "mailchimp-optin",
    components: [
      {
        type: "hero",
        config: {
          headline: "Get Your Free Marketing Guide",
          subheadline: "Learn the 7 secrets to doubling your conversion rate in 30 days",
          backgroundColor: "#1f2937",
          textColor: "#ffffff",
          ctaButton: {
            text: "Download Free Guide",
            url: "#optin-form",
            style: "primary",
          },
          alignment: "center",
        },
        order: 0,
      },
      {
        type: "optin-form",
        config: {
          headline: "Enter Your Details Below",
          subheadline: "Get instant access to your free guide + bonus templates",
          buttonText: "Get Free Access",
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
            {
              id: "firstName",
              type: "name",
              label: "First Name",
              placeholder: "Enter your first name",
              required: false,
              width: "half",
            },
            {
              id: "lastName",
              type: "name",
              label: "Last Name",
              placeholder: "Enter your last name",
              required: false,
              width: "half",
            },
          ],
          backgroundColor: "#111827",
          textColor: "#ffffff",
          successMessage: "Great! Check your email for your free guide.",
          errorMessage: "Something went wrong. Please try again.",
          privacyText: "We respect your privacy. Unsubscribe at any time.",
          n8nWorkflowId: "", // Will be populated when workflow is created
        },
        order: 1,
      },
    ],
  },
  {
    id: "sales-funnel",
    name: "Product Sales Funnel",
    description: "Complete sales funnel with product showcase, testimonials, and payment integration.",
    category: "sales-funnel",
    preview: "/templates/sales-funnel-preview.jpg",
    workflow: "stripe-payment",
    components: [
      {
        type: "hero",
        config: {
          headline: "Transform Your Business Today",
          subheadline: "The complete marketing automation system that grows your business while you sleep",
          backgroundColor: "#1f2937",
          textColor: "#ffffff",
          ctaButton: {
            text: "Start Free Trial",
            url: "#pricing",
            style: "primary",
          },
          alignment: "center",
        },
        order: 0,
      },
      {
        type: "optin-form",
        config: {
          headline: "Get Started Today",
          subheadline: "Join 10,000+ businesses using our platform",
          buttonText: "Start Free Trial",
          buttonStyle: "primary",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Work Email",
              placeholder: "Enter your work email",
              required: true,
              width: "full",
            },
            {
              id: "company",
              type: "text",
              label: "Company",
              placeholder: "Enter your company name",
              required: true,
              width: "full",
            },
          ],
          backgroundColor: "#111827",
          textColor: "#ffffff",
          successMessage: "Welcome! Check your email to get started.",
          errorMessage: "Something went wrong. Please try again.",
          privacyText: "14-day free trial. No credit card required.",
          n8nWorkflowId: "", // Will be populated when workflow is created
        },
        order: 1,
      },
    ],
  },
];

export default function TemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [userFunnels, setUserFunnels] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadUserFunnels();
    }
  }, [user]);

  const loadUserFunnels = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch("/api/funnels", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserFunnels(data.funnels || []);
      }
    } catch (error) {
      console.error("Failed to load funnels:", error);
    }
  };

  const filteredTemplates = selectedCategory === "all"
    ? templates
    : templates.filter(template => template.category === selectedCategory);

  const createFunnelFromTemplate = async (template: FunnelTemplate) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Create the funnel
      const funnelResponse = await fetch("/api/funnels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          template: template.id,
        }),
      });

      if (!funnelResponse.ok) {
        throw new Error("Failed to create funnel");
      }

      const funnelData = await funnelResponse.json();
      const funnel = funnelData.funnel;

      // Create the landing page
      const pageResponse = await fetch(`/api/funnels/${funnel.id}/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: "Landing Page",
          slug: "landing",
        }),
      });

      if (!pageResponse.ok) {
        throw new Error("Failed to create landing page");
      }

      const pageData = await pageResponse.json();
      const page = pageData.page;

      // Create components for the page
      for (const templateComponent of template.components) {
        let n8nWorkflowId = "";

        // Create n8n workflow if specified
        if (template.workflow && templateComponent.type === "optin-form") {
          try {
            const workflowDefinition = await n8nClient.getWorkflowTemplate(template.workflow);
            if (workflowDefinition) {
              const n8nWorkflow = await n8nClient.createWorkflow(
                `${template.name} - ${page.name}`,
                workflowDefinition,
                ["marketing-funnel"]
              );
              n8nWorkflowId = n8nWorkflow.id;
            }
          } catch (error) {
            console.error("Failed to create n8n workflow:", error);
            // Continue without workflow creation
          }
        }

        // Update component config with workflow ID
        const componentConfig = { ...templateComponent.config };
        if (n8nWorkflowId && templateComponent.type === "optin-form") {
          componentConfig.n8nWorkflowId = n8nWorkflowId;
        }

        // Create the component
        await fetch(`/api/pages/${page.id}/components`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: templateComponent.type,
            config: componentConfig,
            order: templateComponent.order,
          }),
        });
      }

      // Reload user funnels
      await loadUserFunnels();

      // Redirect to the canvas
      router.push(`/builder/canvas?funnel=${funnel.id}`);
    } catch (error) {
      console.error("Failed to create funnel:", error);
      alert("Failed to create funnel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { id: "all", name: "All Templates" },
    { id: "lead-magnet", name: "Lead Magnets" },
    { id: "sales-funnel", name: "Sales Funnels" },
    { id: "webinar", name: "Webinars" },
    { id: "product-launch", name: "Product Launch" },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Funnel Template
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start with a proven template and customize it to fit your brand and goals
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2 bg-gray-800 rounded-lg p-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedCategory === category.id
                    ? "bg-yellow-500 text-gray-900"
                    : "text-gray-300 hover:text-white hover:bg-gray-700"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Funnels */}
        {userFunnels.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">Your Recent Funnels</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {userFunnels.slice(0, 3).map((funnel) => (
                <div
                  key={funnel.id}
                  onClick={() => router.push(`/builder/canvas?funnel=${funnel.id}`)}
                  className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">{funnel.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Created {new Date(funnel.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      funnel.published
                        ? "bg-green-500 bg-opacity-20 text-green-400"
                        : "bg-yellow-500 bg-opacity-20 text-yellow-400"
                    )}>
                      {funnel.published ? "Published" : "Draft"}
                    </span>
                    <button className="text-yellow-500 hover:text-yellow-400 text-sm font-medium">
                      Edit →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-all duration-200"
            >
              {/* Template Preview */}
              <div className="h-48 bg-gradient-to-br from-yellow-500 to-orange-600 relative">
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl mb-2">🎯</div>
                    <h3 className="text-xl font-bold">{template.name}</h3>
                  </div>
                </div>
                {template.workflow && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    n8n Integration
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-gray-400 mb-4 text-sm">{template.description}</p>

                {/* Template Features */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {template.components.map((component, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-md"
                      >
                        {component.type.replace("-", " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => createFunnelFromTemplate(template)}
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-lg font-medium transition-all duration-200",
                    "bg-yellow-500 text-gray-900 hover:bg-yellow-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isLoading ? "Creating..." : "Use This Template"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">
              No templates found for this category.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
