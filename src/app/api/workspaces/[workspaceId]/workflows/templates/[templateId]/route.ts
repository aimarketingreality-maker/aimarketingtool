import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { workflowTemplateManager } from "@/lib/n8n-workflows";

// GET /api/workspaces/[workspaceId]/workflows/templates/[templateId] - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; templateId: string }> }
) {
  try {
    const { workspaceId, templateId } = await params;

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
          error: "Insufficient permissions to view workflow templates in this workspace",
          requiredRole: "owner, admin, editor, or viewer",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get template
    const template = workflowTemplateManager.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        version: template.version,
        author: template.author,
        tags: template.tags,
        variables: template.variables,
        requirements: template.requirements,
        // Include the full workflow definition for individual template requests
        n8nWorkflow: template.n8nTemplate,
      }
    });

  } catch (error) {
    console.error("Error in workflow template API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}