import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import {
  CreateComponentSchema,
  BatchUpdateComponentsSchema,
  IdSchema
} from "@/lib/validation/schemas";
import {
  validateRequestBody,
  validatePathParams
} from "@/lib/validation/utils";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/rate-limiting";

// Helper function to verify authentication and page ownership
async function authenticateAndValidatePage(request: NextRequest, pageId: string) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null, page: null };
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { error: "Invalid token", user: null, page: null };
    }

    // Verify page ownership through funnel
    const { data: page, error: pageError } = await supabaseAdmin
      .from("pages")
      .select(`
        *,
        funnels!inner (
          user_id
        )
      `)
      .eq("id", pageId)
      .eq("funnels.user_id", user.id)
      .single();

    if (pageError || !page) {
      return { error: "Page not found or access denied", user: null, page: null };
    }

    return { error: null, user, page };
  } catch (error) {
    console.error("Authentication error:", error);
    return { error: "Authentication failed", user: null, page: null };
  }
}

// GET /api/pages/{pageId}/components - List components for a specific page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;

    // Apply rate limiting for general API operations
    const rateLimitResult = await applyRateLimit(request, 'general', {
      endpoint: '/api/pages/[pageId]/components',
      identifier: `get-components-${pageId}`
    });

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Validate pageId path parameter
    const paramValidation = validatePathParams({ pageId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, page } = await authenticateAndValidatePage(
      request,
      pageId
    );

    if (authError || !user || !page) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch components for the page
    const { data: components, error } = await supabaseAdmin
      .from("components")
      .select("*")
      .eq("page_id", pageId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch components" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      components: components || [],
      page: {
        id: page.id,
        name: page.name,
        slug: page.slug,
        funnel_id: page.funnel_id,
      },
    });

    // Add rate limit headers for successful responses
    if (rateLimitResult.success) {
      addRateLimitHeaders(response, 100, 99, Date.now() + 60000);
    }

    return response;
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/pages/{pageId}/components - Create a new component on a page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;

    // Apply rate limiting for sensitive operations (component creation)
    const rateLimitResult = await applyRateLimit(request, 'sensitive', {
      endpoint: '/api/pages/[pageId]/components',
      identifier: `create-component-${pageId}`
    });

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Validate pageId path parameter
    const paramValidation = validatePathParams({ pageId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, page } = await authenticateAndValidatePage(
      request,
      pageId
    );

    if (authError || !user || !page) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, CreateComponentSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const componentData = bodyValidation.data!;

    // If order is not specified, place it at the end
    let componentOrder = componentData.order;
    if (componentOrder === undefined || componentOrder === null) {
      const { data: lastComponent } = await supabaseAdmin
        .from("components")
        .select("order")
        .eq("page_id", pageId)
        .order("order", { ascending: false })
        .limit(1)
        .single();

      componentOrder = lastComponent ? lastComponent.order + 1 : 0;
    }

    // Create component
    const { data: component, error } = await supabaseAdmin
      .from("components")
      .insert({
        page_id: pageId,
        type: componentData.type,
        config: componentData.config,
        order: componentOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create component" },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        component,
        message: "Component created successfully",
      },
      { status: 201 }
    );

    // Add rate limit headers for successful responses
    if (rateLimitResult.success) {
      addRateLimitHeaders(response, 10, 9, Date.now() + 60000);
    }

    return response;
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/pages/{pageId}/components - Batch update components on a page
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;

    // Apply rate limiting for sensitive operations (batch component updates)
    const rateLimitResult = await applyRateLimit(request, 'sensitive', {
      endpoint: '/api/pages/[pageId]/components',
      identifier: `update-components-${pageId}`
    });

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Validate pageId path parameter
    const paramValidation = validatePathParams({ pageId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, page } = await authenticateAndValidatePage(
      request,
      pageId
    );

    if (authError || !user || !page) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, BatchUpdateComponentsSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const batchData = bodyValidation.data!;

    // Perform batch update
    const updates = batchData.components.map(component => {
      const updateData: any = {};
      if (component.order !== undefined) {
        updateData.order = component.order;
      }
      if (component.config !== undefined) {
        updateData.config = component.config;
      }

      return supabaseAdmin
        .from("components")
        .update(updateData)
        .eq("id", component.id)
        .eq("page_id", pageId); // Ensure component belongs to this page
    });

    // Execute all updates concurrently
    const results = await Promise.allSettled(updates);

    // Check for any failed updates
    const failures = results.filter(result =>
      result.status === 'rejected' ||
      (result.status === 'fulfilled' && result.value.error)
    );

    if (failures.length > 0) {
      console.error("Some component updates failed:", failures);
      return NextResponse.json(
        {
          error: "Some component updates failed",
          details: `${failures.length} out of ${batchData.components.length} updates failed`
        },
        { status: 207 } // Multi-Status
      );
    }

    const response = NextResponse.json({
      message: "Components updated successfully",
      updated: batchData.components.length,
    });

    // Add rate limit headers for successful responses
    if (rateLimitResult.success) {
      addRateLimitHeaders(response, 10, 9, Date.now() + 60000);
    }

    return response;
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}