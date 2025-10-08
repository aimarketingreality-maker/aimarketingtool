import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { Workflow, WorkflowCreateRequest, WorkflowListResponse } from "@/types/workflows";
import { Database } from "@/types/database";

// GET /api/workspaces/[workspaceId]/workflows - List workflows
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = searchParams.get("search");

    // Build query
    let query = supabaseAdmin
      .from("workflows")
      .select(`
        *,
        execution_stats:workflow_executions(count),
        last_execution:workflow_execitions(
          id,
          status,
          started_at,
          completed_at
        )
      `, { count: 'exact' })
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if specified
    if (status) {
      query = query.eq("status", status);
    }

    // Add search filter if specified
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: workflows, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch workflows" },
        { status: 500 }
      );
    }

    // Enhance workflows with execution statistics
    const enhancedWorkflows = (workflows || []).map((workflow: any) => ({
      ...workflow,
      execution_stats: workflow.execution_stats?.[0]?.count || 0,
      last_execution: workflow.last_execution?.[0] || null
    }));

    const response: WorkflowListResponse = {
      workflows: enhancedWorkflows as Workflow[],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in workflow list API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/workflows - Create workflow
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

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

    // Check user has permission to create workflows in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to create workflows in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
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
      status = 'draft'
    }: WorkflowCreateRequest = body;

    // Validate required fields
    if (!n8n_workflow_id) {
      return NextResponse.json(
        { error: "n8n_workflow_id is required" },
        { status: 400 }
      );
    }

    // Validate n8n workflow exists and is accessible
    try {
      const n8nResponse = await fetch(`${process.env.N8N_API_URL}/workflows/${n8n_workflow_id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!n8nResponse.ok) {
        return NextResponse.json(
          { error: "Invalid n8n workflow ID or n8n API unavailable" },
          { status: 400 }
        );
      }

      const n8nWorkflow = await n8nResponse.json();

      // Use n8n workflow name if no name provided
      const workflowName = name || n8nWorkflow.name || `Workflow ${n8n_workflow_id}`;

      // Create workflow
      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        .insert({
          name: workflowName,
          description,
          n8n_workflow_id,
          trigger_component_id,
          config: config || {},
          status,
          workspace_id: workspaceId,
          user_id: user.id,
        })
        .select(`
          *,
          execution_stats:workflow_executions(count)
        `)
        .single();

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          { error: "Failed to create workflow", details: error.message },
          { status: 500 }
        );
      }

      // Log workflow creation
      console.log(`Workflow created: ${workflow.id} by user ${user.id} in workspace ${workspaceId}`);

      return NextResponse.json(
        {
          workflow: {
            ...workflow,
            execution_stats: workflow.execution_stats?.[0]?.count || 0
          },
          message: "Workflow created successfully",
        },
        { status: 201 }
      );

    } catch (n8nError) {
      console.error("Error validating n8n workflow:", n8nError);
      return NextResponse.json(
        { error: "Failed to validate n8n workflow" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in workflow creation API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}