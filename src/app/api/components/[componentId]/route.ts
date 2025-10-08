import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import {
  UpdateComponentSchema,
  IdSchema
} from "@/lib/validation/schemas";
import {
  validateRequestBody,
  validatePathParams
} from "@/lib/validation/utils";

// Helper function to verify authentication and component ownership
async function authenticateAndValidateComponent(request: NextRequest, componentId: string) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing or invalid authorization header", user: null, component: null };
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { error: "Invalid token", user: null, component: null };
    }

    // Verify component ownership through page and funnel
    const { data: component, error: componentError } = await supabaseAdmin
      .from("components")
      .select(`
        *,
        pages!inner (
          funnel_id
        ),
        funnels!inner (
          user_id
        )
      `)
      .eq("id", componentId)
      .eq("funnels.user_id", user.id)
      .single();

    if (componentError || !component) {
      return { error: "Component not found or access denied", user: null, component: null };
    }

    return { error: null, user, component };
  } catch (error) {
    console.error("Authentication error:", error);
    return { error: "Authentication failed", user: null, component: null };
  }
}

// GET /api/components/{componentId} - Get a specific component
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params;

    // Validate componentId path parameter
    const paramValidation = validatePathParams({ componentId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, component } = await authenticateAndValidateComponent(
      request,
      componentId
    );

    if (authError || !user || !component) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      component,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/components/{componentId} - Update a component
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params;

    // Validate componentId path parameter
    const paramValidation = validatePathParams({ componentId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, component } = await authenticateAndValidateComponent(
      request,
      componentId
    );

    if (authError || !user || !component) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate request body
    const bodyValidation = await validateRequestBody(request, UpdateComponentSchema);
    if (bodyValidation.error) {
      return bodyValidation.error;
    }

    const updateData = bodyValidation.data!;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update component
    const { data: updatedComponent, error } = await supabaseAdmin
      .from("components")
      .update(updateData)
      .eq("id", componentId)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to update component" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      component: updatedComponent,
      message: "Component updated successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/components/{componentId} - Delete a component
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ componentId: string }> }
) {
  try {
    const { componentId } = await params;

    // Validate componentId path parameter
    const paramValidation = validatePathParams({ componentId }, IdSchema);
    if (paramValidation.error) {
      return paramValidation.error;
    }

    const { error: authError, user, component } = await authenticateAndValidateComponent(
      request,
      componentId
    );

    if (authError || !user || !component) {
      return NextResponse.json(
        { error: authError || "Unauthorized" },
        { status: 401 }
      );
    }

    // Delete component
    const { error } = await supabaseAdmin
      .from("components")
      .delete()
      .eq("id", componentId);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to delete component" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Component deleted successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}