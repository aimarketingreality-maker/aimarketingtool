import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { workflowTemplateManager, WorkflowTemplateConfig } from "@/lib/n8n-workflows";

interface WorkflowTestRequest {
  templateId: string;
  templateConfig: WorkflowTemplateConfig;
}

// POST /api/workspaces/[workspaceId]/workflows/test-template - Test template with configuration
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
          error: "Insufficient permissions to test workflow templates in this workspace",
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
      templateConfig
    }: WorkflowTestRequest = body;

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

    try {
      // Test the template
      const testResult = await workflowTemplateManager.testTemplate(templateId, templateConfig);

      return NextResponse.json({
        success: true,
        result: testResult,
        message: "Template test completed successfully",
      });

    } catch (testError) {
      console.error("Error testing template:", testError);
      return NextResponse.json(
        {
          error: "Template test failed",
          details: (testError as Error).message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in template test API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}