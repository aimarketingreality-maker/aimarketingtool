import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { WebhookEvent, WebhookPayload } from "@/types/workflows";

// POST /api/webhooks/workflows/[workflowId] - Webhook trigger for workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    // Get webhook secret from request headers for verification
    const webhookSignature = request.headers.get("x-webhook-signature");
    const webhookSecret = request.headers.get("x-webhook-secret");

    // Verify webhook if secret is configured
    if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
      // If signature is provided, verify it
      if (webhookSignature) {
        const body = await request.text();
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', process.env.WEBHOOK_SECRET)
          .update(body)
          .digest('hex');

        if (`sha256=${expectedSignature}` !== webhookSignature) {
          return NextResponse.json(
            { error: "Invalid webhook signature" },
            { status: 401 }
          );
        }

        // Parse the body now that we've verified the signature
        const payload = JSON.parse(body) as WebhookPayload;
        return await handleWebhookTrigger(workflowId, payload, request.headers);
      } else {
        return NextResponse.json(
          { error: "Missing webhook signature or secret" },
          { status: 401 }
        );
      }
    } else {
      // No webhook verification required, parse and proceed
      const payload = await request.json() as WebhookPayload;
      return await handleWebhookTrigger(workflowId, payload, request.headers);
    }

  } catch (error) {
    console.error("Error in webhook handler:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

async function handleWebhookTrigger(
  workflowId: string,
  payload: WebhookPayload,
  headers: Headers
): Promise<NextResponse> {
  try {
    // Get workflow details
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select(`
        *,
        workspace:workspaces(id, name, slug)
      `)
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      // Create webhook event record for failed lookup
      await createWebhookEvent(workflowId, payload, headers, false, "Workflow not found");

      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check if workflow is active
    if (workflow.status !== 'active') {
      await createWebhookEvent(workflowId, payload, headers, false, "Workflow is not active");

      return NextResponse.json(
        { error: "Workflow is not active" },
        { status: 400 }
      );
    }

    // Create webhook event record
    const webhookEvent = await createWebhookEvent(workflowId, payload, headers, true);

    // Prepare trigger data for workflow execution
    const triggerData = {
      webhook_event_id: webhookEvent.id,
      webhook_payload: payload,
      webhook_headers: Object.fromEntries(headers.entries()),
      webhook_timestamp: new Date().toISOString(),
      event_type: payload.event || 'webhook.trigger',
      source_ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    };

    // Create workflow execution
    const { data: execution, error: executionError } = await supabaseAdmin
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        started_at: new Date().toISOString(),
        trigger_data: triggerData,
        test_mode: false,
      })
      .select()
      .single();

    if (executionError) {
      console.error("Error creating execution record:", executionError);

      // Update webhook event with error
      await supabaseAdmin
        .from("webhook_events")
        .update({
          processed: false,
          error_message: "Failed to create execution record",
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      return NextResponse.json(
        { error: "Failed to create execution record" },
        { status: 500 }
      );
    }

    // Execute workflow via n8n API
    try {
      const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${workflow.n8n_workflow_id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: triggerData,
          runData: {},
          startNodes: [],
          destinationNode: null,
          executionMode: 'trigger',
        }),
      });

      if (!n8nResponse.ok) {
        // Update execution and webhook event with error
        await supabaseAdmin
          .from("workflow_executions")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `n8n API error: ${n8nResponse.statusText}`,
          })
          .eq("id", execution.id);

        await supabaseAdmin
          .from("webhook_events")
          .update({
            processed: false,
            error_message: `n8n API error: ${n8nResponse.statusText}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", webhookEvent.id);

        return NextResponse.json(
          { error: "Failed to execute workflow via n8n" },
          { status: 500 }
        );
      }

      const n8nExecution = await n8nResponse.json();

      // Update execution record with n8n execution ID
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: 'running',
          n8n_execution_id: n8nExecution.data?.executionId || n8nExecution.id,
          execution_data: n8nExecution,
        })
        .eq("id", execution.id);

      // Update webhook event as processed
      await supabaseAdmin
        .from("webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      // Log webhook trigger
      console.log(`Webhook triggered workflow: ${workflowId}, execution: ${execution.id}, event: ${webhookEvent.id}`);

      return NextResponse.json({
        success: true,
        message: "Webhook processed and workflow execution started",
        execution_id: execution.id,
        webhook_event_id: webhookEvent.id,
        workflow_id: workflowId,
        workspace: workflow.workspace,
      });

    } catch (n8nError) {
      console.error("Error executing n8n workflow:", n8nError);

      // Update execution and webhook event with error
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: `n8n execution error: ${(n8nError as Error).message}`,
        })
        .eq("id", execution.id);

      await supabaseAdmin
        .from("webhook_events")
        .update({
          processed: false,
          error_message: `n8n execution error: ${(n8nError as Error).message}`,
          processed_at: new Date().toISOString(),
        })
        .eq("id", webhookEvent.id);

      return NextResponse.json(
        { error: "Failed to execute workflow" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in handleWebhookTrigger:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

async function createWebhookEvent(
  workflowId: string,
  payload: WebhookPayload,
  headers: Headers,
  processed: boolean,
  errorMessage?: string
): Promise<WebhookEvent> {
  const headersRecord = Object.fromEntries(headers.entries());

  const { data, error } = await supabaseAdmin
    .from("webhook_events")
    .insert({
      workflow_id: workflowId,
      event_type: payload.event || 'webhook.trigger',
      payload,
      headers: headersRecord,
      processed,
      processed_at: processed || errorMessage ? new Date().toISOString() : null,
      error_message: errorMessage,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating webhook event:", error);
    throw error;
  }

  return data;
}

// GET /api/webhooks/workflows/[workflowId] - Get webhook events for workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;

    // Get the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the JWT token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Check if workflow exists and user has access
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select(`
        *,
        workspace:workspaces(id, name, slug)
      `)
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Check user permission to view workflow
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workflow.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No access to this workflow" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const processed = searchParams.get("processed");
    const eventType = searchParams.get("event_type");

    // Build query
    let query = supabaseAdmin
      .from("webhook_events")
      .select("*", { count: 'exact' })
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Add filters
    if (processed !== null) {
      query = query.eq("processed", processed === "true");
    }

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    const { data: events, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch webhook events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: events || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
      workflow: {
        id: workflow.id,
        name: workflow.name,
        workspace: workflow.workspace,
      },
    });

  } catch (error) {
    console.error("Error in webhook events API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}