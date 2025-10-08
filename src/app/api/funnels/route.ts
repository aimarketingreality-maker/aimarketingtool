import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import {
  CreateFunnelSchema,
  PaginationSchema,
  SearchSchema
} from "@/lib/validation/schemas";
import {
  validateRequestBody,
  validateQueryParams
} from "@/lib/validation/utils";
import { applyRateLimit, addRateLimitHeaders } from "@/lib/rate-limiting";

// Helper function to verify authentication
async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null };
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
    // Apply rate limiting for general API operations
    const rateLimitResult = await applyRateLimit(request, 'general', {
      endpoint: '/api/funnels',
      identifier: 'get-funnels'
    });

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Authenticate the request
    const { error: authError, user } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate query parameters
    const paginationValidation = validateQueryParams(request, PaginationSchema);
    if (paginationValidation.error) {
      return paginationValidation.error;
    }

    const searchValidation = validateQueryParams(request, SearchSchema);
    if (searchValidation.error) {
      return searchValidation.error;
    }

    const paginationData = paginationValidation.data!;
    const searchData = searchValidation.data!;

    // Get published filter from query params manually since it's not in schemas
    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");

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
      `, { count: 'exact' })
      .eq("user_id", user.id)
      .order(searchData.sort, { ascending: searchData.order === 'asc' })
      .range(paginationData.offset, paginationData.offset + paginationData.limit - 1);

    // Add search filter if specified
    if (searchData.search) {
      query = query.ilike("name", `%${searchData.search}%`);
    }

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

    const response = NextResponse.json({
      funnels: funnels || [],
      pagination: {
        limit: paginationData.limit,
        offset: paginationData.offset,
        total: count || 0,
        hasMore: (count || 0) > paginationData.offset + paginationData.limit,
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

// POST /api/funnels - Create a new funnel
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for sensitive operations (funnel creation)
    const rateLimitResult = await applyRateLimit(request, 'sensitive', {
      endpoint: '/api/funnels',
      identifier: 'create-funnel'
    });

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response;
    }

    // Authenticate the request
    const { error: authError, user } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, CreateFunnelSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const funnelData = bodyValidation.data!;

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
        name: funnelData.name,
        description: funnelData.description,
        template_id: funnelData.template_id,
        workspace_id: funnelData.workspace_id,
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

    // If template_id is specified, create initial pages and components
    if (funnelData.template_id) {
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

    const response = NextResponse.json(
      {
        funnel,
        message: "Funnel created successfully",
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