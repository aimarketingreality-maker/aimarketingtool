import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

// Helper function to verify authentication and page ownership
async function authenticateAndValidatePage(request: NextRequest, pageId: string) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null, page: null };
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

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
  { params }: { params: { pageId: string } }
) {
  try {
    const { error: authError, user, page } = await authenticateAndValidatePage(
      request,
      params.pageId
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
      .eq("page_id", params.pageId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch components" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      components: components || [],
      page: {
        id: page.id,
        name: page.name,
        slug: page.slug,
        funnel_id: page.funnel_id,
      },
    });
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
  { params }: { params: { pageId: string } }
) {
  try {
    const { error: authError, user, page } = await authenticateAndValidatePage(
      request,
      params.pageId
    );

    if (authError || !user || !page) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type, config, order } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Component type is required and must be a string" },
        { status: 400 }
      );
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Component config is required and must be an object" },
        { status: 400 }
      );
    }

    // If order is not specified, place it at the end
    let componentOrder = order;
    if (componentOrder === undefined || componentOrder === null) {
      const { data: lastComponent } = await supabaseAdmin
        .from("components")
        .select("order")
        .eq("page_id", params.pageId)
        .order("order", { ascending: false })
        .limit(1)
        .single();

      componentOrder = lastComponent ? lastComponent.order + 1 : 0;
    }

    // Create component
    const { data: component, error } = await supabaseAdmin
      .from("components")
      .insert({
        page_id: params.pageId,
        type,
        config,
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

    return NextResponse.json(
      {
        component,
        message: "Component created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}