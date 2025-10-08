# n8n Workflow Connection Feature

This document explains how to use the n8n workflow connection feature in the Marketing Funnel Builder.

## Overview

The OptInForm component can be connected to n8n workflows to automate marketing processes. When a user submits an opt-in form, the data is automatically sent to a configured n8n workflow for processing.

## Available Workflow Templates

### 1. Mailchimp Opt-in (`mailchimp-optin`)
- **Purpose**: Add subscribers to Mailchimp lists with opt-in confirmation
- **Required Configuration**:
  - `listId`: Your Mailchimp list ID
  - `tag` (optional): Tag to apply to subscribers

### 2. Stripe Payment (`stripe-payment`)
- **Purpose**: Process Stripe payments and grant access to digital products
- **Required Configuration**:
  - `priceId`: Your Stripe price ID
  - `successUrl`: URL to redirect after successful payment

## Setup Instructions

### 1. Configure n8n

1. Install and run n8n (if not already running):
   ```bash
   npm install n8n -g
   n8n
   ```

2. Generate an API key in n8n settings
   - Go to n8n web interface
   - Click on "Settings" (gear icon)
   - Find "API" section
   - Generate and copy your API key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your values:
   ```
   N8N_URL=http://localhost:5678
   N8N_API_KEY=your-actual-api-key
   ```

3. Restart your development server

### 3. Configure Workflow Connection

1. In the OptInForm editor, scroll to the "n8n Workflow Connection" section
2. Click the expand arrow to reveal workflow options
3. Select a workflow template from the dropdown
4. Configure the required workflow parameters
5. Click "Test Workflow Connection" to verify everything works
6. Save your form configuration

## Testing the Workflow

1. Use the test page at `/workflow-test` to experiment with workflow connections
2. Configure a workflow in the form editor
3. Click "Test Workflow Connection" to verify the connection
4. Check the test result message for success or failure

## Troubleshooting

### Connection Errors
- Verify n8n is running and accessible at the configured URL
- Check that your API key is correct and has sufficient permissions
- Ensure no firewall is blocking the connection

### Workflow Execution Errors
- Verify the workflow template exists in your n8n instance
- Check that all required parameters are configured
- Review n8n execution logs for detailed error information

### Form Submission Issues
- Ensure the workflow ID is correctly saved in the form configuration
- Check that the n8n server is running when the form is submitted
- Verify the form data matches the expected workflow input format

## Adding New Workflow Templates

To add a new workflow template:

1. Update the `getWorkflowTemplate` method in `src/lib/n8n.ts`
2. Add the workflow definition to the `templates` object
3. Update the `getWorkflowDescription` and `getWorkflowConfigFields` functions in `src/components/marketing/OptInForm.tsx`
4. Add the new template to the `availableWorkflows` array in the `WorkflowConnectionEditor` component

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive configuration
- Implement proper input validation in your n8n workflows
- Consider using webhook authentication for additional security
- Regularly rotate your n8n API keys

## Data Flow

```
OptInForm → Form Submission → n8n Workflow → External Service (Mailchimp/Stripe/etc.)
    ↓              ↓                    ↓                     ↓
User Input → Form Validation → Workflow Execution → Action Execution
```