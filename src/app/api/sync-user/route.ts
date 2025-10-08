import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
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

// POST /api/sync-user - Ensure user exists in public.users table
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for authentication-related operations
    const rateLimitResult = await applyRateLimit(request, 'auth', {
      endpoint: '/api/sync-user',
      identifier: 'sync-user'
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

    // Ensure user exists in public.users table
    const { data: userData, error: userError } = await supabaseAdmin
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
      )
      .select()
      .single();

    if (userError) {
      console.error("Error syncing user:", userError);
      return NextResponse.json(
        { error: "Failed to sync user" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      user: userData,
      message: "User synced successfully",
    });

    // Add rate limit headers for successful responses
    if (rateLimitResult.success) {
      // Note: In a real implementation, you'd track the actual rate limit data
      // For now, we'll add basic headers
      addRateLimitHeaders(response, 5, 4, Date.now() + 60000);
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