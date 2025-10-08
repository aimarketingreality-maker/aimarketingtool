import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { workflowTemplateManager, WorkflowTemplateConfig } from "@/lib/n8n-workflows";
import { n8nClient } from "@/lib/n8n";

interface WorkflowCreateFromTemplateRequest {
  templateId: string;
  templateConfig: WorkflowTemplateConfig;
  workflowName?: string;
  description?: string;
}

// POST /api/workspaces/[workspaceId]/workflows/create-from-template - Create workflow from template
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
      templateId,
      templateConfig,
      workflowName,
      description
    }: WorkflowCreateFromTemplateRequest = body;

    // Validate required fields
    if (!templateId || !templateConfig) {
      return NextResponse.json(
        { error: "templateId and templateConfig are required" },
        { status: 400 }
      );
    }

    // Validate template configuration
    const validation = workflowTemplateManager.validateTemplateConfig(templateId, templateConfig);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Invalid template configuration",
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Check if template exists
    const template = workflowTemplateManager.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    try {
      // Create workflow from template
      const n8nWorkflowId = await workflowTemplateManager.createWorkflowFromTemplate(
        templateId,
        templateConfig,
        workflowName || template.name
      );

      // Create workflow record in database
      const { data: workflow, error } = await supabaseAdmin
        .from("workflows")
        .insert({
          name: workflowName || template.name,
          description: description || template.description,
          n8n_workflow_id: n8nWorkflowId,
          trigger_component_id: null, // Will be set when connected to a form
          config: {
            templateId,
            templateConfig,
            createdAt: new Date().toISOString()
          },
          status: 'draft',
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
        // Clean up n8n workflow if database insert fails
        try {
          await n8nClient.deleteWorkflow(n8nWorkflowId);
        } catch (cleanupError) {
          console.error("Failed to cleanup n8n workflow:", cleanupError);
        }

        return NextResponse.json(
          { error: "Failed to create workflow", details: error.message },
          { status: 500 }
        );
      }

      // Log workflow creation
      console.log(`Workflow created from template: ${workflow.id} (template: ${templateId}) by user ${user.id} in workspace ${workspaceId}`);

      return NextResponse.json(
        {
          workflow: {
            ...workflow,
            execution_stats: workflow.execution_stats?.[0]?.count || 0
          },
          template: {
            id: template.id,
            name: template.name,
            version: template.version
          },
          message: "Workflow created successfully from template",
        },
        { status: 201 }
      );

    } catch (n8nError) {
      console.error("Error creating n8n workflow from template:", n8nError);
      return NextResponse.json(
        { error: "Failed to create n8n workflow from template" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in template workflow creation API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}