import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { Database } from "@/types/database";
import {
  checkWorkspacePermission,
  generateUniqueSlug,
  validateFunnelStructure,
  getFunnelWithDetails
} from "@/lib/workspace-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; funnelId: string }> }
) {
  try {
    const { workspaceId, funnelId } = await params;

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

    // Check user has permission to publish in this workspace and get workspace details
    const permissionCheck = await checkWorkspacePermission(workspaceId, user.id);

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to publish funnels in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get funnel with workspace and pages data
    const funnelResult = await getFunnelWithDetails(funnelId, workspaceId);

    if (!funnelResult.success) {
      return NextResponse.json(
        { error: funnelResult.error },
        { status: 404 }
      );
    }

    const funnel = funnelResult.data;

    // Validate funnel structure before publishing
    const validation = await validateFunnelStructure(funnelId);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Funnel validation failed",
          details: validation.errors,
          summary: {
            pageCount: validation.pageCount,
            componentCount: validation.componentCount,
            errors: validation.errors.length
          }
        },
        { status: 400 }
      );
    }

    // Check if funnel is already published
    if (funnel.published && funnel.slug) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const publicUrl = `${baseUrl}/f/${permissionCheck.workspace.slug}/${funnel.slug}`;

      return NextResponse.json({
        success: true,
        message: "Funnel is already published",
        funnel: funnel,
        published_url: publicUrl
      });
    }

    // Generate a unique slug for the funnel within the workspace
    const slug = await generateUniqueSlug(
      workspaceId,
      funnel.name,
      funnelId
    );

    // Update the funnel to mark it as published and set the slug
    const { data: updatedFunnel, error: updateError } = await supabaseAdmin
      .from("funnels")
      .update({
        published: true,
        slug: slug,
        updated_at: new Date().toISOString()
      })
      .eq("id", funnelId)
      .eq("workspace_id", workspaceId)
      .select(`
        *,
        workspace:workspaces(id, name, slug)
      `)
      .single();

    if (updateError) {
      console.error("Error publishing funnel:", updateError);
      return NextResponse.json(
        { error: "Failed to publish funnel" },
        { status: 500 }
      );
    }

    // Generate the public URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/f/${permissionCheck.workspace.slug}/${slug}`;

    // Log the publishing action for audit
    console.log(`Funnel published: ${funnelId} by user ${user.id} in workspace ${workspaceId}`);

    return NextResponse.json({
      success: true,
      funnel: updatedFunnel,
      published_url: publicUrl,
      message: "Funnel published successfully!"
    });

  } catch (error: any) {
    console.error("Error in workspace funnel publish API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; funnelId: string }> }
) {
  try {
    const { workspaceId, funnelId } = await params;

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

    // Check user has permission to unpublish in this workspace
    const permissionCheck = await checkWorkspacePermission(workspaceId, user.id);

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to unpublish funnels in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Check if funnel exists and belongs to workspace
    const { data: funnel, error: funnelError } = await supabaseAdmin
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .eq("workspace_id", workspaceId)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json(
        { error: "Funnel not found in this workspace" },
        { status: 404 }
      );
    }

    // Check if funnel is currently published
    if (!funnel.published) {
      return NextResponse.json({
        success: true,
        message: "Funnel is already unpublished",
        funnel: funnel
      });
    }

    // Update the funnel to mark it as unpublished
    const { data: updatedFunnel, error: updateError } = await supabaseAdmin
      .from("funnels")
      .update({
        published: false,
        slug: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", funnelId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error("Error unpublishing funnel:", updateError);
      return NextResponse.json(
        { error: "Failed to unpublish funnel" },
        { status: 500 }
      );
    }

    // Log the unpublishing action for audit
    console.log(`Funnel unpublished: ${funnelId} by user ${user.id} in workspace ${workspaceId}`);

    return NextResponse.json({
      success: true,
      funnel: updatedFunnel,
      message: "Funnel unpublished successfully!"
    });

  } catch (error: any) {
    console.error("Error in workspace funnel unpublish API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}