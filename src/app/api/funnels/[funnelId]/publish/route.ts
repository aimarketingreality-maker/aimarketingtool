import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import {
  PublishFunnelSchema,
  IdSchema
} from "@/lib/validation/schemas";
import {
  validateRequestBody,
  validatePathParams
} from "@/lib/validation/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const { funnelId } = await params;

    // Validate funnelId path parameter
    const paramValidation = validatePathParams({ funnelId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, PublishFunnelSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const publishData = bodyValidation.data!;

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

    // Check if funnel exists and belongs to user
    const { data: funnel, error: funnelError } = await supabaseAdmin
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .eq("user_id", user.id)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json(
        { error: "Funnel not found or access denied" },
        { status: 404 }
      );
    }

    // Get all pages for the funnel with their components
    const { data: pages, error: pagesError } = await supabaseAdmin
      .from("pages")
      .select(`
        *,
        components (
          id,
          type,
          order,
          config
        )
      `)
      .eq("funnel_id", funnelId)
      .order("created_at", { ascending: true });

    if (pagesError) {
      console.error("Error fetching pages:", pagesError);
      return NextResponse.json(
        { error: "Failed to fetch funnel pages" },
        { status: 500 }
      );
    }

    // Validate funnel structure
    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: "Funnel must have at least one page" },
        { status: 400 }
      );
    }

    // Check if each page has at least one component
    for (const page of pages) {
      if (!page.components || page.components.length === 0) {
        return NextResponse.json(
          {
            error: `Page "${page.name}" must have at least one component before publishing. Add some components to the page first.`
          },
          { status: 400 }
        );
      }

      // Validate component configurations
      for (const component of page.components) {
        if (!component.config || Object.keys(component.config).length === 0) {
          return NextResponse.json(
            {
              error: `Component "${component.type}" on page "${page.name}" has no configuration. Please configure the component before publishing.`
            },
            { status: 400 }
          );
        }

        // Special validation for opt-in forms with n8n workflows
        if (component.type === "optin-form" && !component.config.n8nWorkflowId) {
          return NextResponse.json(
            {
              error: `Opt-in form on page "${page.name}" must be connected to an n8n workflow before publishing. Configure the workflow connection in the component properties.`
            },
            { status: 400 }
          );
        }
      }
    }

    // Generate a unique slug for the funnel if not already set
    let slug = funnel.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Make sure slug is unique by adding random suffix if needed
    let finalSlug = slug;
    let counter = 1;

    while (true) {
      const { data: existingSlug, error: slugError } = await supabaseAdmin
        .from("funnels")
        .select("slug")
        .eq("slug", finalSlug)
        .eq("user_id", user.id)
        .neq("id", funnelId)
        .single();

      if (slugError && slugError.code === 'PGRST116') {
        // No existing slug found, we can use this one
        break;
      }

      if (existingSlug) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      } else {
        break;
      }
    }

    // Update the funnel to mark it as published and set the slug
    const { data: updatedFunnel, error: updateError } = await supabaseAdmin
      .from("funnels")
      .update({
        published: publishData.published,
        slug: publishData.published ? finalSlug : null,
        custom_domain: publishData.custom_domain,
        updated_at: new Date().toISOString()
      })
      .eq("id", funnelId)
      .eq("user_id", user.id)
      .select()
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
    const publicUrl = `${baseUrl}/f/${finalSlug}`;

    const response = NextResponse.json({
      success: true,
      funnel: updatedFunnel,
      publicUrl: publishData.published ? publicUrl : null,
      message: publishData.published ? "Funnel published successfully!" : "Funnel unpublished successfully!"
    });

    return response;

  } catch (error: any) {
    console.error("Error in publish API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Note: DELETE method is deprecated. Use POST method with published: false instead.
// This method is kept for backward compatibility but will be removed in future versions.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const { funnelId } = await params;

    // Validate funnelId path parameter
    const paramValidation = validatePathParams({ funnelId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

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

    // Check if funnel exists and belongs to user
    const { data: funnel, error: funnelError } = await supabaseAdmin
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .eq("user_id", user.id)
      .single();

    if (funnelError || !funnel) {
      return NextResponse.json(
        { error: "Funnel not found or access denied" },
        { status: 404 }
      );
    }

    // Update the funnel to mark it as unpublished
    const { data: updatedFunnel, error: updateError } = await supabaseAdmin
      .from("funnels")
      .update({
        published: false,
        slug: null,
        custom_domain: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", funnelId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error unpublishing funnel:", updateError);
      return NextResponse.json(
        { error: "Failed to unpublish funnel" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      funnel: updatedFunnel,
      message: "Funnel unpublished successfully! (Note: This method is deprecated, use POST with published: false)"
    });

  } catch (error: any) {
    console.error("Error in unpublish API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}