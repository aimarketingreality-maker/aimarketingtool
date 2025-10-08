import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

// Helper function to verify authentication
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null };
  }

  const token = authHeader.substring(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { error: "Invalid token", user: null };
    }

    return { error: null, user };
  } catch (error) {
    console.error("Authentication error:", error);
    return { error: "Authentication failed", user: null };
  }
}

// GET /api/funnels - List funnels for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const { error: authError, user } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabaseAdmin
      .from("funnels")
      .select(`
        *,
        pages (
          id,
          name,
          slug,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Add published filter if specified
    if (published !== null) {
      query = query.eq("published", published === "true");
    }

    const { data: funnels, error, count } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch funnels" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      funnels: funnels || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
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

// POST /api/funnels - Create a new funnel
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { error: authError, user } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, template } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    // Ensure user exists in public.users table
    const { error: userSyncError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email!,
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

    if (userSyncError) {
      console.error("Error syncing user:", userSyncError);
      return NextResponse.json(
        { error: "Failed to sync user data" },
        { status: 500 }
      );
    }

    // Create funnel
    const { data: funnel, error } = await supabaseAdmin
      .from("funnels")
      .insert({
        name,
        user_id: user.id,
        published: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create funnel" },
        { status: 500 }
      );
    }

    // If template is specified, create initial pages and components
    if (template) {
      // Template-specific initialization can be added here
      // For now, we'll create a basic landing page
      const { data: page, error: pageError } = await supabaseAdmin
        .from("pages")
        .insert({
          funnel_id: funnel.id,
          name: "Landing Page",
          slug: "landing",
        })
        .select()
        .single();

      if (pageError) {
        console.error("Failed to create initial page:", pageError);
        // Don't fail the entire operation if page creation fails
      }
    }

    return NextResponse.json(
      {
        funnel,
        message: "Funnel created successfully",
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