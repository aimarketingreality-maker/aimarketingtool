import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { Workflow, WorkflowUpdateRequest } from "@/types/workflows";

// GET /api/workspaces/[workspaceId]/workflows/[workflowId] - Get workflow
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
          error: "Insufficient permissions to view workflows in this workspace",
          requiredRole: "owner, admin, editor, or viewer",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get workflow with execution statistics
    const { data: workflow, error } = await supabaseAdmin
      .from("workflows")
      .select(`
        *,
        execution_stats:workflow_executions(count),
        recent_executions:workflow_executions(
          id,
          status,
          started_at,
          completed_at,
          error_message
        ),
        workspace:workspaces(id, name, slug)
      `)
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found in this workspace" },
        { status: 404 }
      );
    }

    // Get n8n workflow details
    let n8nWorkflowData = null;
    try {
      const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${workflow.n8n_workflow_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (n8nResponse.ok) {
        n8nWorkflowData = await n8nResponse.json();
      }
    } catch (n8nError) {
      console.error("Error fetching n8n workflow details:", n8nError);
      // Don't fail the request if n8n is unavailable
    }

    // Enhance workflow response
    const enhancedWorkflow = {
      ...workflow,
      execution_stats: workflow.execution_stats?.[0]?.count || 0,
      recent_executions: workflow.recent_executions?.slice(0, 10) || [],
      n8n_workflow: n8nWorkflowData
    };

    return NextResponse.json({
      workflow: enhancedWorkflow,
    });

  } catch (error) {
    console.error("Error in workflow get API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/workflows/[workflowId] - Update workflow
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

    // Check user has permission to edit workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to edit workflows in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Check if workflow exists and belongs to workspace
    const { data: existingWorkflow, error: fetchError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found in this workspace" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      n8n_workflow_id,
      trigger_component_id,
      config,
      status
    }: WorkflowUpdateRequest = body;

    // Validate n8n workflow if provided
    if (n8n_workflow_id && n8n_workflow_id !== existingWorkflow.n8n_workflow_id) {
      try {
        const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${n8n_workflow_id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!n8nResponse.ok) {
          return NextResponse.json(
            { error: "Invalid n8n workflow ID" },
            { status: 400 }
          );
        }
      } catch (n8nError) {
        console.error("Error validating n8n workflow:", n8nError);
        return NextResponse.json(
          { error: "Failed to validate n8n workflow" },
          { status: 500 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (n8n_workflow_id !== undefined) updateData.n8n_workflow_id = n8n_workflow_id;
    if (trigger_component_id !== undefined) updateData.trigger_component_id = trigger_component_id;
    if (config !== undefined) updateData.config = config;
    if (status !== undefined) updateData.status = status;

    // Update workflow
    const { data: workflow, error } = await supabaseAdmin
      .from("workflows")
      .update(updateData)
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .select(`
        *,
        execution_stats:workflow_executions(count)
      `)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update workflow", details: error.message },
        { status: 500 }
      );
    }

    // Log workflow update
    console.log(`Workflow updated: ${workflowId} by user ${user.id} in workspace ${workspaceId}`);

    return NextResponse.json({
      workflow: {
        ...workflow,
        execution_stats: workflow.execution_stats?.[0]?.count || 0
      },
      message: "Workflow updated successfully",
    });

  } catch (error) {
    console.error("Error in workflow update API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/workflows/[workflowId] - Delete workflow
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

    // Check user has permission to delete workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to delete workflows in this workspace",
          requiredRole: "owner or admin",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Check if workflow exists and belongs to workspace
    const { data: existingWorkflow, error: fetchError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found in this workspace" },
        { status: 404 }
      );
    }

    // Check if workflow has active executions
    const { data: activeExecutions } = await supabaseAdmin
      .from("workflow_executions")
      .select("id")
      .eq("workflow_id", workflowId)
      .in("status", ['pending', 'running'])
      .limit(1);

    if (activeExecutions && activeExecutions.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete workflow with active executions",
          details: "Please wait for all executions to complete or cancel them first"
        },
        { status: 400 }
      );
    }

    // Delete workflow executions first (due to foreign key constraint)
    const { error: executionDeleteError } = await supabaseAdmin
      .from("workflow_executions")
      .delete()
      .eq("workflow_id", workflowId);

    if (executionDeleteError) {
      console.error("Error deleting workflow executions:", executionDeleteError);
      return NextResponse.json(
        { error: "Failed to delete workflow executions" },
        { status: 500 }
      );
    }

    // Delete workflow
    const { error: deleteError } = await supabaseAdmin
      .from("workflows")
      .delete()
      .eq("id", workflowId)
      .eq("workspace_id", workspaceId);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete workflow", details: deleteError.message },
        { status: 500 }
      );
    }

    // Log workflow deletion
    console.log(`Workflow deleted: ${workflowId} by user ${user.id} in workspace ${workspaceId}`);

    return NextResponse.json({
      message: "Workflow deleted successfully",
    });

  } catch (error) {
    console.error("Error in workflow delete API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}