import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

// Helper function to verify authentication and funnel ownership
async function authenticateAndValidate(request: NextRequest, funnelId: string) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null, funnel: null };
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return { error: "Invalid token", user: null, funnel: null };
    }

    // Verify funnel ownership
    const { data: funnel, error: funnelError } = await supabaseAdmin
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .eq("user_id", user.id)
      .single();

    if (funnelError || !funnel) {
      return { error: "Funnel not found or access denied", user: null, funnel: null };
    }

    return { error: null, user, funnel };
  } catch (error) {
    console.error("Authentication error:", error);
    return { error: "Authentication failed", user: null, funnel: null };
  }
}

// GET /api/funnels/{funnelId}/pages - List pages for a specific funnel
export async function GET(
  request: NextRequest,
  { params }: { params: { funnelId: string } }
) {
  try {
    const { error: authError, user, funnel } = await authenticateAndValidate(
      request,
      params.funnelId
    );

    if (authError || !user || !funnel) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch pages for the funnel
    const { data: pages, error } = await supabaseAdmin
      .from("pages")
      .select(`
        *,
        components (
          id,
          type,
          order,
          config,
          created_at
        )
      `)
      .eq("funnel_id", params.funnelId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch pages" },
        { status: 500 }
      );
    }

    // Sort components within each page by order
    const pagesWithSortedComponents = (pages || []).map(page => ({
      ...page,
      components: (page.components || []).sort((a, b) => a.order - b.order),
    }));

    return NextResponse.json({
      pages: pagesWithSortedComponents,
      funnel: {
        id: funnel.id,
        name: funnel.name,
        published: funnel.published,
        created_at: funnel.created_at,
        updated_at: funnel.updated_at,
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

// POST /api/funnels/{funnelId}/pages - Create a new page in a funnel
export async function POST(
  request: NextRequest,
  { params }: { params: { funnelId: string } }
) {
  try {
    const { error: authError, user, funnel } = await authenticateAndValidate(
      request,
      params.funnelId
    );

    if (authError || !user || !funnel) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, slug } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Slug is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if slug is already used in this funnel
    const { data: existingPage } = await supabaseAdmin
      .from("pages")
      .select("id")
      .eq("funnel_id", params.funnelId)
      .eq("slug", slug)
      .single();

    if (existingPage) {
      return NextResponse.json(
        { error: "A page with this slug already exists in this funnel" },
        { status: 409 }
      );
    }

    // Create page
    const { data: page, error } = await supabaseAdmin
      .from("pages")
      .insert({
        funnel_id: params.funnelId,
        name,
        slug,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        page,
        message: "Page created successfully",
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