"use client";

import React, { useState } from "react";
import { OptInForm, OptInFormEditor, OptInFormConfig } from "@/components/marketing/OptInForm";

export default function WorkflowTestPage() {
  const [config, setConfig] = useState<OptInFormConfig>({
    headline: "Test Your Workflow Connection",
    subheadline: "Configure and test n8n workflow integration",
    buttonText: "Submit Test",
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
    successMessage: "Form submitted successfully! Workflow executed.",
    errorMessage: "Something went wrong. Please try again.",
    privacyText: "We respect your privacy. Unsubscribe at any time.",
  });

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">n8n Workflow Connection Test</h1>
          <p className="text-gray-400">
            This page demonstrates the workflow connection functionality for opt-in forms.
            Configure the form settings below, including the n8n workflow connection.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Preview */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Form Preview</h2>
            <OptInForm config={config} isPreview={true} />
          </div>

          {/* Form Editor */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Form Configuration</h2>
            <OptInFormEditor config={config} onUpdate={setConfig} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-4">How to Test the Workflow Connection</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Scroll down to the "n8n Workflow Connection" section in the form editor</li>
            <li>Click the expand arrow to reveal workflow options</li>
            <li>Select a workflow template (e.g., "Mailchimp Optin" or "Stripe Payment")</li>
            <li>Configure the workflow parameters (like Mailchimp List ID)</li>
            <li>Click "Test Workflow Connection" to verify the connection</li>
            <li>Check the test result message for success or failure</li>
            <li>The green status indicator will show when a workflow is connected</li>
          </ol>
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <h4 className="font-medium text-white mb-2">Note:</h4>
            <p className="text-sm text-gray-300">
              For the workflow connection to work properly, make sure your n8n instance is running
              and the N8N_URL and N8N_API_KEY environment variables are configured.
              The test will show a connection error if n8n is not accessible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}