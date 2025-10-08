import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { WorkflowExecutionRequest, WorkflowTestRequest } from "@/types/workflows";

// POST /api/workspaces/[workspaceId]/workflows/[workflowId]/execute - Execute workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; workflowId: string }> }
) {
  try {
    const { workspaceId, workflowId } = await params;

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

    // Check user has permission to execute workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to execute workflows in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Check if workflow exists and belongs to workspace
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found in this workspace" },
        { status: 404 }
      );
    }

    // Check if workflow is active
    if (workflow.status !== 'active') {
      return NextResponse.json(
        { error: "Workflow is not active. Please activate it before executing." },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { trigger_data, test_mode = false }: WorkflowExecutionRequest = body;

    // Validate execution data
    if (trigger_data && typeof trigger_data !== 'object') {
      return NextResponse.json(
        { error: "trigger_data must be a valid object" },
        { status: 400 }
      );
    }

    // Create workflow execution record
    const { data: execution, error: executionError } = await supabaseAdmin
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: 'pending',
        started_at: new Date().toISOString(),
        trigger_data: trigger_data || {},
        test_mode,
      })
      .select()
      .single();

    if (executionError) {
      console.error("Error creating execution record:", executionError);
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
          data: trigger_data || {},
          runData: {},
          startNodes: [],
          destinationNode: null,
          executionMode: test_mode ? 'manual' : 'trigger',
        }),
      });

      if (!n8nResponse.ok) {
        // Update execution record with error
        await supabaseAdmin
          .from("workflow_executions")
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: `n8n API error: ${n8nResponse.statusText}`,
          })
          .eq("id", execution.id);

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

      // Log workflow execution
      console.log(`Workflow executed: ${workflowId} by user ${user.id}, execution: ${execution.id}`);

      return NextResponse.json({
        execution: {
          ...execution,
          n8n_execution_id: n8nExecution.data?.executionId || n8nExecution.id,
        },
        message: test_mode ? "Workflow test execution started" : "Workflow execution started",
        n8n_execution: n8nExecution,
      });

    } catch (n8nError) {
      console.error("Error executing n8n workflow:", n8nError);

      // Update execution record with error
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: `n8n execution error: ${(n8nError as Error).message}`,
        })
        .eq("id", execution.id);

      return NextResponse.json(
        { error: "Failed to execute workflow" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in workflow execution API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/workflows/[workflowId]/execute - Test workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; workflowId: string }> }
) {
  try {
    const { workspaceId, workflowId } = await params;

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

    // Check user has permission to test workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to test workflows in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Check if workflow exists and belongs to workspace
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found in this workspace" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { test_data = {} }: WorkflowTestRequest = body;

    // Validate test data
    if (test_data && typeof test_data !== 'object') {
      return NextResponse.json(
        { error: "test_data must be a valid object" },
        { status: 400 }
      );
    }

    // Test workflow via n8n API
    try {
      const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${workflow.n8n_workflow_id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: test_data,
          runData: {},
          startNodes: [],
          destinationNode: null,
        }),
      });

      if (!n8nResponse.ok) {
        return NextResponse.json(
          { error: "Failed to test workflow via n8n" },
          { status: 500 }
        );
      }

      const testResult = await n8nResponse.json();

      // Create test execution record
      const { data: testExecution, error: testExecutionError } = await supabaseAdmin
        .from("workflow_executions")
        .insert({
          workflow_id: workflowId,
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          trigger_data: test_data,
          test_mode: true,
          execution_data: testResult,
        })
        .select()
        .single();

      if (testExecutionError) {
        console.error("Error creating test execution record:", testExecutionError);
        // Don't fail the request if test execution record creation fails
      }

      // Log workflow test
      console.log(`Workflow tested: ${workflowId} by user ${user.id}`);

      return NextResponse.json({
        test_result: testResult,
        test_execution: testExecution,
        message: "Workflow test completed successfully",
      });

    } catch (n8nError) {
      console.error("Error testing n8n workflow:", n8nError);
      return NextResponse.json(
        { error: "Failed to test workflow" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in workflow test API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}