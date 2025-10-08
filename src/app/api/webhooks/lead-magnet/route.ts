import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { workflowExecutionService } from "@/lib/workflow-execution";

export interface LeadMagnetWebhookPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  formId: string;
  componentId: string;
  funnelId?: string;
  pageId?: string;
  leadMagnetType?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  consent?: boolean;
  customFields?: Record<string, any>;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  executionId?: string;
  errors?: string[];
  redirectUrl?: string;
}

// POST /api/webhooks/lead-magnet - Handle lead magnet form submissions
export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const payload: LeadMagnetWebhookPayload = body;

    // Validate required fields
    const requiredFields = ['email', 'formId', 'componentId'];
    const missingFields = requiredFields.filter(field => !payload[field as keyof LeadMagnetWebhookPayload]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          errors: [`Missing: ${missingFields.join(', ')}`]
        } as WebhookResponse,
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email address",
          errors: ["Invalid email format"]
        } as WebhookResponse,
        { status: 400 }
      );
    }

    // Get client information
    const clientInfo = {
      ipAddress: request.ip || payload.ipAddress || 'unknown',
      userAgent: request.headers.get('user-agent') || payload.userAgent || 'unknown',
      referrer: request.headers.get('referer') || payload.referrer || 'unknown',
      timestamp: new Date().toISOString()
    };

    // Extract UTM parameters from headers or payload
    const utmParams = {
      utmSource: request.headers.get('x-utm-source') || payload.utmSource,
      utmMedium: request.headers.get('x-utm-medium') || payload.utmMedium,
      utmCampaign: request.headers.get('x-utm-campaign') || payload.utmCampaign
    };

    // Find workflow associated with this component/form
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select(`
        *,
        workspace:workspaces(id, name),
        funnel:funnels(id, name, slug)
      `)
      .eq("trigger_component_id", payload.componentId)
      .eq("status", "active")
      .single();

    if (workflowError || !workflow) {
      console.error(`No active workflow found for component ${payload.componentId}:`, workflowError);

      return NextResponse.json(
        {
          success: false,
          message: "No active workflow configured for this form",
          errors: ["Workflow not found or inactive"]
        } as WebhookResponse,
        { status: 404 }
      );
    }

    // Prepare trigger data for workflow execution
    const triggerData = {
      email: payload.email,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      phone: payload.phone || '',
      formId: payload.formId,
      componentId: payload.componentId,
      funnelId: payload.funnelId || workflow.funnel?.id,
      pageId: payload.pageId,
      leadMagnetType: payload.leadMagnetType || 'pdf',
      consent: payload.consent || false,
      customFields: payload.customFields || {},
      ...clientInfo,
      ...utmParams,
      source: 'webhook',
      webhookId: `lead-magnet-${Date.now()}`
    };

    try {
      // Execute the workflow
      const execution = await workflowExecutionService.executeWorkflow(
        workflow.id,
        triggerData,
        {
          source: 'webhook',
          userId: workflow.user_id // Use workflow owner as executor
        }
      );

      // Log the submission for analytics
      await logLeadSubmission(payload, workflow.id, execution.id, clientInfo);

      // Get redirect URL from workflow config or use default
      const redirectUrl = workflow.config?.successRedirectUrl ||
                        (workflow.funnel?.slug ? `/funnels/${workflow.funnel.slug}/thank-you` : '/thank-you');

      console.log(`Lead magnet webhook processed: ${payload.email} -> workflow ${workflow.id} -> execution ${execution.id}`);

      return NextResponse.json(
        {
          success: true,
          message: "Form submitted successfully",
          executionId: execution.id,
          redirectUrl
        } as WebhookResponse,
        { status: 200 }
      );

    } catch (executionError) {
      console.error(`Error executing workflow ${workflow.id}:`, executionError);

      // Log the failed submission attempt
      await logFailedSubmission(payload, workflow.id, executionError as Error, clientInfo);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to process submission",
          errors: [(executionError as Error).message]
        } as WebhookResponse,
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in lead magnet webhook:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        errors: ["Failed to process webhook request"]
      } as WebhookResponse,
      { status: 500 }
    );
  }
}

// GET /api/webhooks/lead-magnet - Health check and webhook info
export async function GET(request: NextRequest) {
  try {
    // Check if there are any active lead magnet workflows
    const { data: activeWorkflows, error } = await supabaseAdmin
      .from("workflows")
      .select("id, name, trigger_component_id")
      .eq("status", "active")
      .not("trigger_component_id", "is", null)
      .limit(10);

    if (error) {
      console.error("Error checking active workflows:", error);
    }

    return NextResponse.json({
      status: "healthy",
      webhook: "lead-magnet",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      activeWorkflows: activeWorkflows?.length || 0,
      endpoint: "/api/webhooks/lead-magnet",
      supportedMethods: ["POST", "GET"],
      documentation: {
        description: "Webhook endpoint for lead magnet form submissions",
        requiredFields: ["email", "formId", "componentId"],
        optionalFields: [
          "firstName", "lastName", "phone", "funnelId", "pageId",
          "leadMagnetType", "consent", "customFields"
        ],
        headers: {
          "Content-Type": "application/json",
          "x-utm-source": "UTM source parameter",
          "x-utm-medium": "UTM medium parameter",
          "x-utm-campaign": "UTM campaign parameter"
        }
      }
    });

  } catch (error) {
    console.error("Error in webhook health check:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Webhook health check failed"
      },
      { status: 500 }
    );
  }
}

// Helper function to log successful lead submissions
async function logLeadSubmission(
  payload: LeadMagnetWebhookPayload,
  workflowId: string,
  executionId: string,
  clientInfo: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from("lead_submissions")
      .insert({
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        phone: payload.phone,
        form_id: payload.formId,
        component_id: payload.componentId,
        funnel_id: payload.funnelId,
        page_id: payload.pageId,
        lead_magnet_type: payload.leadMagnetType,
        workflow_id: workflowId,
        execution_id: executionId,
        ip_address: clientInfo.ipAddress,
        user_agent: clientInfo.userAgent,
        referrer: clientInfo.referrer,
        utm_source: payload.utmSource,
        utm_medium: payload.utmMedium,
        utm_campaign: payload.utmCampaign,
        consent: payload.consent || false,
        custom_fields: payload.customFields || {},
        status: 'submitted',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error("Failed to log lead submission:", error);
  }
}

// Helper function to log failed submission attempts
async function logFailedSubmission(
  payload: LeadMagnetWebhookPayload,
  workflowId: string,
  error: Error,
  clientInfo: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from("lead_submissions")
      .insert({
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        form_id: payload.formId,
        component_id: payload.componentId,
        workflow_id: workflowId,
        ip_address: clientInfo.ipAddress,
        user_agent: clientInfo.userAgent,
        status: 'failed',
        error_message: error.message,
        error_stack: error.stack,
        created_at: new Date().toISOString()
      });
  } catch (logError) {
    console.error("Failed to log failed submission:", logError);
  }
}

// Webhook authentication middleware (optional)
async function authenticateWebhook(request: NextRequest): Promise<boolean> {
  // Get webhook secret from environment
  const webhookSecret = process.env.LEAD_MAGNET_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // If no secret is configured, allow all requests (development mode)
    return true;
  }

  // Get signature from header
  const signature = request.headers.get('x-webhook-signature');
  if (!signature) {
    return false;
  }

  // Get raw body
  const body = await request.text();

  // Verify signature (using HMAC-SHA256)
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return `sha256=${expectedSignature}` === signature;
}