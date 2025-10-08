import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { WorkflowExecutionListResponse } from "@/types/workflows";

// GET /api/workspaces/[workspaceId]/workflows/[workflowId]/status - Get workflow execution status
export async function GET(
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

    // Check user has permission to view workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor', 'viewer']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to view workflow status in this workspace",
          requiredRole: "owner, admin, editor, or viewer",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("execution_id");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    // If specific execution ID is requested
    if (executionId) {
      const { data: execution, error } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .eq("workflow_id", workflowId)
        .single();

      if (error || !execution) {
        return NextResponse.json(
          { error: "Execution not found" },
          { status: 404 }
        );
      }

      // If execution is still running, check n8n for updated status
      if (execution.status === 'running' && execution.n8n_execution_id) {
        try {
          const n8nResponse = await fetch(
            `${process.env.N8N_API_URL}/executions/${execution.n8n_execution_id}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (n8nResponse.ok) {
            const n8nExecution = await n8nResponse.json();

            // Update execution status based on n8n status
            let newStatus = execution.status;
            let completedAt = execution.completed_at;
            let errorMessage = execution.error_message;

            if (n8nExecution.finished) {
              if (n8nExecution.stoppedAt) {
                newStatus = 'completed';
                completedAt = n8nExecution.stoppedAt;
              } else if (n8nExecution.mode === 'error') {
                newStatus = 'failed';
                completedAt = n8nExecution.stoppedAt;
                errorMessage = n8nExecution.data?.resultData?.error?.message || 'Execution failed';
              }
            }

            // Update execution record if status changed
            if (newStatus !== execution.status) {
              await supabaseAdmin
                .from("workflow_executions")
                .update({
                  status: newStatus,
                  completed_at: completedAt,
                  error_message: errorMessage,
                  execution_data: n8nExecution,
                })
                .eq("id", executionId);

              execution.status = newStatus;
              execution.completed_at = completedAt;
              execution.error_message = errorMessage;
              execution.execution_data = n8nExecution;
            }
          }
        } catch (n8nError) {
          console.error("Error checking n8n execution status:", n8nError);
          // Don't fail the request if n8n status check fails
        }
      }

      return NextResponse.json({
        execution,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
        }
      });
    }

    // Get workflow statistics
    const { data: stats, error: statsError } = await supabaseAdmin
      .from("workflow_executions")
      .select("status")
      .eq("workflow_id", workflowId);

    const statistics = {
      totalExecutions: stats?.length || 0,
      successfulExecutions: stats?.filter(e => e.status === 'completed').length || 0,
      failedExecutions: stats?.filter(e => e.status === 'failed').length || 0,
      runningExecutions: stats?.filter(e => e.status === 'running').length || 0,
      pendingExecutions: stats?.filter(e => e.status === 'pending').length || 0,
    };

    const lastExecution = stats?.sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )[0];

    // Get recent executions
    let query = supabaseAdmin
      .from("workflow_executions")
      .select("*", { count: 'exact' })
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if specified
    if (status) {
      query = query.eq("status", status);
    }

    const { data: executions, error: executionsError, count } = await query;

    if (executionsError) {
      console.error("Database error:", executionsError);
      return NextResponse.json(
        { error: "Failed to fetch execution history" },
        { status: 500 }
      );
    }

    const response: WorkflowExecutionListResponse = {
      executions: executions || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    };

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        status: workflow.status,
        n8n_workflow_id: workflow.n8n_workflow_id,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at,
      },
      statistics: {
        ...statistics,
        averageExecutionTime: 0, // Could be calculated from completed executions
        lastExecutionStatus: lastExecution?.status || 'none',
        lastExecutionAt: lastExecution?.started_at,
      },
      executions: response,
    });

  } catch (error) {
    console.error("Error in workflow status API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/workflows/[workflowId]/status - Cancel running execution
export async function DELETE(
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

    // Check user has permission to manage workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to cancel workflow executions in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const executionId = searchParams.get("execution_id");

    if (!executionId) {
      return NextResponse.json(
        { error: "execution_id is required to cancel a specific execution" },
        { status: 400 }
      );
    }

    // Check if execution exists and belongs to workflow
    const { data: execution, error: executionError } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .eq("workflow_id", workflowId)
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Check if execution can be cancelled
    if (!['pending', 'running'].includes(execution.status)) {
      return NextResponse.json(
        { error: `Cannot cancel execution with status: ${execution.status}` },
        { status: 400 }
      );
    }

    // Cancel execution in n8n if it has an n8n execution ID
    if (execution.n8n_execution_id) {
      try {
        const n8nResponse = await fetch(
          `${process.env.N8N_API_URL}/executions/${execution.n8n_execution_id}/cancel`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!n8nResponse.ok) {
          console.error("Failed to cancel n8n execution:", n8nResponse.statusText);
          // Don't fail the request if n8n cancellation fails, just update local status
        }
      } catch (n8nError) {
        console.error("Error cancelling n8n execution:", n8nError);
        // Don't fail the request if n8n cancellation fails, just update local status
      }
    }

    // Update execution status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("workflow_executions")
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (updateError) {
      console.error("Error updating execution status:", updateError);
      return NextResponse.json(
        { error: "Failed to update execution status" },
        { status: 500 }
      );
    }

    // Log execution cancellation
    console.log(`Execution cancelled: ${executionId} by user ${user.id}`);

    return NextResponse.json({
      message: "Execution cancelled successfully",
      execution: {
        ...execution,
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error("Error in workflow status cancel API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}