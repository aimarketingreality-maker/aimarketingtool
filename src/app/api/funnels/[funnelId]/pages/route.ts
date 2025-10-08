import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import {
  CreatePageSchema,
  IdSchema
} from "@/lib/validation/schemas";
import {
  validateRequestBody,
  validatePathParams
} from "@/lib/validation/utils";

// Helper function to verify authentication and funnel ownership
async function authenticateAndValidate(request: NextRequest, funnelId: string) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null, funnel: null };
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

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
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const { funnelId } = await params;

    // Validate funnelId path parameter
    const paramValidation = validatePathParams({ funnelId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, funnel } = await authenticateAndValidate(
      request,
      funnelId
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
      .eq("funnel_id", funnelId)
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
  { params }: { params: Promise<{ funnelId: string }> }
) {
  try {
    const { funnelId } = await params;

    // Validate funnelId path parameter
    const paramValidation = validatePathParams({ funnelId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, funnel } = await authenticateAndValidate(
      request,
      funnelId
    );

    if (authError || !user || !funnel) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, CreatePageSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const pageData = bodyValidation.data!;
    let slug = pageData.slug;

    // Check if slug is already used in this funnel
    console.log("Checking for duplicate slug:", { funnel_id: funnelId, original_slug: slug });

    let { data: existingPage, error: checkError } = await supabaseAdmin
      .from("pages")
      .select("id")
      .eq("funnel_id", funnelId)
      .eq("slug", slug)
      .single();

    // Handle the case where the check query fails (e.g., due to database issues)
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
      console.error("Error checking for duplicate slug:", checkError);
      return NextResponse.json(
        { error: "Database error while checking slug uniqueness", details: checkError.message },
        { status: 500 }
      );
    }

    if (existingPage) {
      console.log("Duplicate slug found, generating unique slug:", { original_slug: slug, existing_page_id: existingPage.id });

      // If slug exists, try to generate a unique slug by appending a number
      let uniqueSlug = slug;
      let counter = 1;
      let maxAttempts = 100; // Prevent infinite loops
      let attempts = 0;

      while (attempts < maxAttempts) {
        uniqueSlug = `${slug}-${counter}`;
        console.log("Trying slug:", uniqueSlug);

        const { data: counterPage, error: counterError } = await supabaseAdmin
          .from("pages")
          .select("id")
          .eq("funnel_id", funnelId)
          .eq("slug", uniqueSlug)
          .single();

        // Handle database errors during slug checking
        if (counterError && counterError.code !== 'PGRST116') {
          console.error("Error checking slug counter:", counterError);
          return NextResponse.json(
            { error: "Database error while generating unique slug", details: counterError.message },
            { status: 500 }
          );
        }

        if (!counterPage) {
          console.log("Found unique slug:", uniqueSlug);
          break;
        }

        console.log("Slug still in use:", uniqueSlug, "trying next...");
        counter++;
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Unable to generate unique slug after maximum attempts" },
          { status: 500 }
        );
      }

      // Update slug to the unique version
      slug = uniqueSlug;
      console.log("Final slug after deduplication:", slug);
    } else {
      console.log("No duplicate slug found, using original:", slug);
    }

    // Create page
    const { data: page, error } = await supabaseAdmin
      .from("pages")
      .insert({
        funnel_id: funnelId,
        name: pageData.name,
        slug,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error creating page:", error);
      console.error("Error details:", {
        funnel_id: funnelId,
        name: pageData.name,
        slug,
        error_code: error.code,
        error_message: error.message,
        error_details: error.details
      });
      return NextResponse.json(
        { error: "Failed to create page", details: error.message },
        { status: 500 }
      );
    }

    console.log("Page created successfully:", {
      page_id: page.id,
      funnel_id: funnelId,
      name: page.name,
      slug: page.slug
    });

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