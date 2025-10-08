import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { workflowTemplateManager } from "@/lib/n8n-workflows";

// GET /api/workspaces/[workspaceId]/workflows/templates - List available templates
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
          error: "Insufficient permissions to view workflow templates in this workspace",
          requiredRole: "owner, admin, editor, or viewer",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Get templates
    let templates = workflowTemplateManager.getTemplates();

    // Filter by category if specified
    if (category) {
      templates = templates.filter(template => template.category === category);
    }

    // Filter by search if specified
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Remove the n8nTemplate field to reduce response size
    const templateSummaries = templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      version: template.version,
      author: template.author,
      tags: template.tags,
      variables: template.variables,
      requirements: template.requirements,
      // Don't include the full workflow definition in list responses
    }));

    return NextResponse.json({
      templates: templateSummaries,
      categories: [...new Set(templates.map(t => t.category))],
      total: templateSummaries.length,
    });

  } catch (error) {
    console.error("Error in workflow templates API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}