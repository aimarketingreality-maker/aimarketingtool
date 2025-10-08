import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import { createMailchimpService } from "@/lib/mailchimp";

// POST /api/workspaces/[workspaceId]/credentials/mailchimp/test - Test Mailchimp credential
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

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

    // Check user has permission to test credentials in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to test credentials in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { credentialId, testLists = false } = body;

    // Validate required fields
    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { error: "Credential ID is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if credential exists and belongs to this workspace
    const { data: existingCredential, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("id, name, is_valid")
      .eq("id", credentialId)
      .eq("workspace_id", workspaceId)
      .eq("service", "mailchimp")
      .single();

    if (fetchError || !existingCredential) {
      return NextResponse.json(
        { error: "Mailchimp credential not found or you don't have permission to test it" },
        { status: 404 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Test the connection
      const validation = await mailchimpService.validateConnection();

      const testResult: {
        credentialId: string;
        credentialName: string;
        isValid: boolean;
        error?: string;
        testedAt: string;
        lists?: {
          count?: number;
          data?: Array<{ id: string; name: string; stats: { member_count: number; unsubscribe_count: number } }>;
          error?: string;
        };
      } = {
        credentialId,
        credentialName: existingCredential.name,
        isValid: validation.isValid,
        error: validation.error,
        testedAt: new Date().toISOString()
      };

      // If connection is valid and lists testing is requested, fetch lists
      if (validation.isValid && testLists) {
        try {
          const listsResult = await mailchimpService.getListSummaries();
          testResult.lists = {
            count: listsResult.length,
            data: listsResult.slice(0, 10) // Return first 10 lists for preview
          };
        } catch (listError) {
          testResult.lists = {
            error: (listError as Error).message
          };
        }
      }

      // Update the credential's validation status
      await supabaseAdmin
        .from("credentials")
        .update({
          is_valid: validation.isValid,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", credentialId);

      return NextResponse.json({
        testResult,
        message: validation.isValid
          ? "Mailchimp credential test successful"
          : "Mailchimp credential test failed"
      });
    } catch (error) {
      console.error("Error testing Mailchimp credential:", error);

      // Update the credential as invalid
      await supabaseAdmin
        .from("credentials")
        .update({
          is_valid: false,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", credentialId);

      return NextResponse.json(
        {
          error: "Failed to test Mailchimp credential",
          details: (error as Error).message,
          testResult: {
            credentialId,
            credentialName: existingCredential.name,
            isValid: false,
            error: (error as Error).message,
            testedAt: new Date().toISOString()
          }
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp credential test API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/workspaces/[workspaceId]/credentials/mailchimp/test - Get lists for a credential
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;

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

    // Check user has permission to view credentials in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin', 'editor', 'viewer']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to view credentials in this workspace",
          requiredRole: "owner, admin, editor, or viewer",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get credential ID from query parameters
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID is required as a query parameter" },
        { status: 400 }
      );
    }

    // Check if credential exists and belongs to this workspace
    const { data: existingCredential, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("id, name, is_valid")
      .eq("id", credentialId)
      .eq("workspace_id", workspaceId)
      .eq("service", "mailchimp")
      .single();

    if (fetchError || !existingCredential) {
      return NextResponse.json(
        { error: "Mailchimp credential not found or you don't have permission to access it" },
        { status: 404 }
      );
    }

    if (!existingCredential.is_valid) {
      return NextResponse.json(
        { error: "Cannot fetch lists for invalid credential. Please test the credential first." },
        { status: 400 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Get lists
      const { lists, total } = await mailchimpService.getLists(limit);

      return NextResponse.json({
        credentialId,
        credentialName: existingCredential.name,
        lists,
        total,
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching Mailchimp lists:", error);

      // Mark credential as invalid if there's an auth error
      const errorWithStatus = error as { status?: number };
      if (errorWithStatus.status === 401) {
        await supabaseAdmin
          .from("credentials")
          .update({
            is_valid: false,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", credentialId);
      }

      return NextResponse.json(
        {
          error: "Failed to fetch Mailchimp lists",
          details: (error as Error).message
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp lists API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}