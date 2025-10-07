"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/theme";
import { n8nClient } from "@/lib/n8n";

export interface OptInFormConfig {
  headline: string;
  subheadline?: string;
  buttonText: string;
  buttonStyle: "primary" | "secondary";
  fields: OptInFormField[];
  backgroundColor?: string;
  textColor?: string;
  successMessage: string;
  errorMessage: string;
  n8nWorkflowId?: string;
  n8nWorkflowConfig?: Record<string, any>;
  privacyText?: string;
}

export interface OptInFormField {
  id: string;
  type: "email" | "text" | "name" | "phone";
  label: string;
  placeholder: string;
  required: boolean;
  width?: "full" | "half";
}

interface OptInFormProps {
  config: OptInFormConfig;
  isPreview?: boolean;
  onUpdate?: (config: OptInFormConfig) => void;
  className?: string;
}

const defaultConfig: OptInFormConfig = {
  headline: "Get Your Free Guide",
  subheadline: "Join thousands of marketers who have transformed their business",
  buttonText: "Download Now",
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
  backgroundColor: "#1f2937",
  textColor: "#ffffff",
  successMessage: "Thank you! Check your email for your free guide.",
  errorMessage: "Something went wrong. Please try again.",
  privacyText: "We respect your privacy. Unsubscribe at any time.",
};

export function OptInForm({ config, isPreview = false, onUpdate, className }: OptInFormProps) {
  const formConfig = { ...defaultConfig, ...config };
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setMessage("");

    try {
      // Validate required fields
      const requiredFields = formConfig.fields.filter(field => field.required);
      const missingFields = requiredFields.filter(field => !formData[field.id]?.trim());

      if (missingFields.length > 0) {
        setSubmitStatus("error");
        setMessage("Please fill in all required fields.");
        setIsSubmitting(false);
        return;
      }

      // Submit to n8n workflow if configured
      if (formConfig.n8nWorkflowId) {
        const workflowData = {
          ...formData,
          timestamp: new Date().toISOString(),
          source: "opt-in-form",
          ...formConfig.n8nWorkflowConfig,
        };
        await n8nClient.executeWorkflow(formConfig.n8nWorkflowId, workflowData);
      }

      // For demo purposes, we'll simulate a successful submission
      // In a real implementation, you would handle the n8n response appropriately

      setSubmitStatus("success");
      setMessage(formConfig.successMessage);
      setFormData({}); // Clear form
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitStatus("error");
      setMessage(formConfig.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldClasses = () => {
    const baseClasses = "px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-yellow-500 focus:border-yellow-500 transition-colors";
    return baseClasses;
  };

  const getButtonClasses = () => {
    const baseClasses = "px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    return formConfig.buttonStyle === "secondary"
      ? `${baseClasses} bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900`
      : `${baseClasses} bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg hover:shadow-xl`;
  };

  if (isPreview) {
    return (
      <div
        className={cn(
          "relative p-8 rounded-lg border-2 border-dashed border-gray-600",
          className
        )}
        style={{
          backgroundColor: formConfig.backgroundColor,
          color: formConfig.textColor,
        }}
      >
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Opt-in Form
        </div>

        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">{formConfig.headline}</h2>
          {formConfig.subheadline && (
            <p className="text-center mb-6 opacity-90">{formConfig.subheadline}</p>
          )}

          <form className="space-y-4">
            {formConfig.fields.map((field) => (
              <div key={field.id} className={field.width === "half" ? "inline-block w-1/2 pr-2" : ""}>
                <label className="block text-sm font-medium mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className={getFieldClasses()}
                  disabled
                />
              </div>
            ))}

            <button type="button" className={getButtonClasses()} disabled>
              {formConfig.buttonText}
            </button>

            {formConfig.privacyText && (
              <p className="text-xs text-center opacity-75 mt-4">{formConfig.privacyText}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn("py-16", className)}
      style={{
        backgroundColor: formConfig.backgroundColor,
        color: formConfig.textColor,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{formConfig.headline}</h2>
          {formConfig.subheadline && (
            <p className="text-center mb-8 text-lg opacity-90">{formConfig.subheadline}</p>
          )}

          {submitStatus === "success" ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {formConfig.fields.map((field) => (
                  <div
                    key={field.id}
                    className={field.width === "half" ? "col-span-1 md:col-span-1" : "col-span-1"}
                  >
                    <label htmlFor={field.id} className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      required={field.required}
                      value={formData[field.id] || ""}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className={cn(getFieldClasses(), "w-full")}
                    />
                  </div>
                ))}
              </div>

              {submitStatus === "error" && (
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
                  <p className="text-red-200">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(getButtonClasses(), "w-full")}
              >
                {isSubmitting ? "Submitting..." : formConfig.buttonText}
              </button>

              {formConfig.privacyText && (
                <p className="text-xs text-center opacity-75 mt-4">{formConfig.privacyText}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// Workflow connection editor component
function WorkflowConnectionEditor({
  config,
  onUpdate
}: {
  config: OptInFormConfig;
  onUpdate: (config: OptInFormConfig) => void;
}) {
  const [availableWorkflows, setAvailableWorkflows] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Load available workflow templates
    const templates = ["mailchimp-optin", "stripe-payment"];
    setAvailableWorkflows(templates);
  }, []);

  const handleWorkflowSelect = (workflowId: string) => {
    const newConfig = {
      ...config,
      n8nWorkflowId: workflowId || undefined,
      n8nWorkflowConfig: workflowId ? {} : undefined
    };
    onUpdate(newConfig);
    setTestResult(null);
  };

  const handleConfigUpdate = (key: string, value: any) => {
    const newConfig = {
      ...config,
      n8nWorkflowConfig: {
        ...config.n8nWorkflowConfig,
        [key]: value,
      },
    };
    onUpdate(newConfig);
  };

  const testWorkflow = async () => {
    if (!config.n8nWorkflowId) return;

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Test n8n connection
      const isHealthy = await n8nClient.healthCheck();
      if (!isHealthy) {
        setTestResult({
          success: false,
          message: "Cannot connect to n8n server. Please check your n8n instance.",
        });
        return;
      }

      // Test workflow execution with sample data
      const sampleData = {
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        timestamp: new Date().toISOString(),
        source: "test",
        ...config.n8nWorkflowConfig,
      };

      await n8nClient.executeWorkflow(config.n8nWorkflowId, sampleData);

      setTestResult({
        success: true,
        message: "Workflow test completed successfully!",
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Workflow test failed: ${error.message}`,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getWorkflowDescription = (workflowId: string) => {
    const descriptions: Record<string, string> = {
      "mailchimp-optin": "Add subscribers to Mailchimp lists with opt-in confirmation",
      "stripe-payment": "Process Stripe payments and grant access to digital products",
    };
    return descriptions[workflowId] || "Custom workflow integration";
  };

  const getWorkflowConfigFields = (workflowId: string) => {
    const fields: Record<string, Array<{ key: string; label: string; type: string; placeholder?: string }>> = {
      "mailchimp-optin": [
        { key: "listId", label: "Mailchimp List ID", type: "text", placeholder: "Enter your Mailchimp list ID" },
        { key: "tag", label: "Optional Tag", type: "text", placeholder: "e.g., newsletter-signup" },
      ],
      "stripe-payment": [
        { key: "priceId", label: "Stripe Price ID", type: "text", placeholder: "Enter your Stripe price ID" },
        { key: "successUrl", label: "Success URL", type: "text", placeholder: "https://yoursite.com/success" },
      ],
    };
    return fields[workflowId] || [];
  };

  const workflowConfigFields = config.n8nWorkflowId ? getWorkflowConfigFields(config.n8nWorkflowId) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-medium text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          n8n Workflow Connection
        </h4>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white"
        >
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            config.n8nWorkflowId ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm text-gray-300">
            {config.n8nWorkflowId ? 'Connected to workflow' : 'No workflow connected'}
          </span>
        </div>
        {config.n8nWorkflowId && (
          <button
            type="button"
            onClick={() => handleWorkflowSelect('')}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Disconnect
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Workflow Template
            </label>
            <select
              value={config.n8nWorkflowId || ""}
              onChange={(e) => handleWorkflowSelect(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="">Select a workflow...</option>
              {availableWorkflows.map((workflow) => (
                <option key={workflow} value={workflow}>
                  {workflow.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Workflow Description */}
          {config.n8nWorkflowId && (
            <div className="p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">
                {getWorkflowDescription(config.n8nWorkflowId)}
              </p>
            </div>
          )}

          {/* Workflow Configuration */}
          {workflowConfigFields.length > 0 && (
            <div className="space-y-3 p-4 bg-gray-700 rounded-lg">
              <h5 className="text-sm font-medium text-white">Workflow Configuration</h5>
              {workflowConfigFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-gray-400 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={config.n8nWorkflowConfig?.[field.key] || ""}
                    onChange={(e) => handleConfigUpdate(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Test Connection */}
          {config.n8nWorkflowId && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={testWorkflow}
                disabled={isTestingConnection}
                className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-md text-sm font-medium hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingConnection ? 'Testing...' : 'Test Workflow Connection'}
              </button>

              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  testResult.success
                    ? 'bg-green-900 bg-opacity-30 border border-green-700 text-green-300'
                    : 'bg-red-900 bg-opacity-30 border border-red-700 text-red-300'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Editor component for configuring the Opt-in Form
export function OptInFormEditor({ config, onUpdate }: { config: OptInFormConfig; onUpdate: (config: OptInFormConfig) => void }) {
  const [localConfig, setLocalConfig] = React.useState<OptInFormConfig>({ ...defaultConfig, ...config });

  const handleChange = (field: keyof OptInFormConfig, value: any) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onUpdate(newConfig);
  };

  const addField = () => {
    const newField: OptInFormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      placeholder: "Enter value",
      required: false,
      width: "full",
    };
    handleChange("fields", [...localConfig.fields, newField]);
  };

  const updateField = (index: number, field: OptInFormField) => {
    const newFields = [...localConfig.fields];
    newFields[index] = field;
    handleChange("fields", newFields);
  };

  const removeField = (index: number) => {
    const newFields = localConfig.fields.filter((_, i) => i !== index);
    handleChange("fields", newFields);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Opt-in Form Settings</h3>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Headline
        </label>
        <input
          type="text"
          value={localConfig.headline}
          onChange={(e) => handleChange("headline", e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Subheadline
        </label>
        <textarea
          value={localConfig.subheadline || ""}
          onChange={(e) => handleChange("subheadline", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-300">Form Fields</label>
          <button
            type="button"
            onClick={addField}
            className="px-3 py-1 bg-yellow-500 text-gray-900 rounded-md text-sm font-medium hover:bg-yellow-400"
          >
            Add Field
          </button>
        </div>

        <div className="space-y-4">
          {localConfig.fields.map((field, index) => (
            <div key={field.id} className="p-4 bg-gray-700 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Field {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(index, { ...field, label: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, { ...field, type: e.target.value as any })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value="email">Email</option>
                    <option value="text">Text</option>
                    <option value="name">Name</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => updateField(index, { ...field, placeholder: e.target.value })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Width</label>
                  <select
                    value={field.width}
                    onChange={(e) => updateField(index, { ...field, width: e.target.value as "full" | "half" })}
                    className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  >
                    <option value="full">Full</option>
                    <option value="half">Half</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`required-${field.id}`}
                  checked={field.required}
                  onChange={(e) => updateField(index, { ...field, required: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor={`required-${field.id}`} className="text-sm text-gray-300">
                  Required field
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Button Text
        </label>
        <input
          type="text"
          value={localConfig.buttonText}
          onChange={(e) => handleChange("buttonText", e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Button Style
        </label>
        <select
          value={localConfig.buttonStyle}
          onChange={(e) => handleChange("buttonStyle", e.target.value as "primary" | "secondary")}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="primary">Primary (Yellow)</option>
          <option value="secondary">Secondary (Outlined)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Success Message
        </label>
        <textarea
          value={localConfig.successMessage}
          onChange={(e) => handleChange("successMessage", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Privacy Text
        </label>
        <textarea
          value={localConfig.privacyText || ""}
          onChange={(e) => handleChange("privacyText", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      {/* Workflow Connection Section */}
      <div className="border-t border-gray-700 pt-6">
        <WorkflowConnectionEditor
          config={localConfig}
          onUpdate={(newConfig) => {
            setLocalConfig(newConfig);
            onUpdate(newConfig);
          }}
        />
      </div>
    </div>
  );
}