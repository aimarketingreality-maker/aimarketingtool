import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { checkWorkspacePermission } from "@/lib/workspace-utils";
import {
  storeMailchimpCredential,
  updateMailchimpCredential,
  deleteMailchimpCredential,
  getMailchimpCredentials,
  createMailchimpService,
  validateApiKeyFormat
} from "@/lib/mailchimp";

// GET /api/workspaces/[workspaceId]/credentials/mailchimp - List Mailchimp credentials
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
      ['owner', 'admin', 'editor']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to view credentials in this workspace",
          requiredRole: "owner, admin, or editor",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeTest = searchParams.get("includeTest") === "true";

    // Get Mailchimp credentials
    const credentials = await getMailchimpCredentials(workspaceId);

    // If test requested, test the first valid credential
    let testResult = null;
    if (includeTest && credentials.length > 0 && credentials[0].is_valid) {
      try {
        const mailchimpService = await createMailchimpService(credentials[0].id);
        const validation = await mailchimpService.validateConnection();

        testResult = {
          credentialId: credentials[0].id,
          credentialName: credentials[0].name,
          isValid: validation.isValid,
          error: validation.error,
          testedAt: new Date().toISOString()
        };
      } catch (error) {
        testResult = {
          credentialId: credentials[0].id,
          credentialName: credentials[0].name,
          isValid: false,
          error: (error as Error).message,
          testedAt: new Date().toISOString()
        };
      }
    }

    return NextResponse.json({
      credentials,
      testResult
    });
  } catch (error) {
    console.error("Error in Mailchimp credentials list API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/workspaces/[workspaceId]/credentials/mailchimp - Create new Mailchimp credential
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

    // Check user has permission to create credentials in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to create credentials in this workspace",
          requiredRole: "owner or admin",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, apiKey } = body;

    // Validate required fields
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Credential name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      return NextResponse.json(
        {
          error: "Invalid API key format. Expected format: key-datacenter (e.g., your-key-us1)",
          hint: "Mailchimp API keys can be found in your Mailchimp account under Account > Extras > API keys"
        },
        { status: 400 }
      );
    }

    try {
      // Store the credential
      const credentialId = await storeMailchimpCredential(workspaceId, name, apiKey);

      // Get the created credential details (without sensitive data)
      const credentials = await getMailchimpCredentials(workspaceId);
      const createdCredential = credentials.find(c => c.id === credentialId);

      return NextResponse.json(
        {
          credential: createdCredential,
          message: "Mailchimp credential created successfully"
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error storing Mailchimp credential:", error);

      if ((error as Error).message.includes('Invalid API key') || (error as Error).message.includes('Failed to connect')) {
        return NextResponse.json(
          {
            error: "Failed to validate Mailchimp API key",
            details: (error as Error).message
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to store Mailchimp credential",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp credential creation API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces/[workspaceId]/credentials/mailchimp - Update existing Mailchimp credential
export async function PUT(
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

    // Check user has permission to update credentials in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to update credentials in this workspace",
          requiredRole: "owner or admin",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { credentialId, name, apiKey } = body;

    // Validate required fields
    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { error: "Credential ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Credential name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate API key format
    if (!validateApiKeyFormat(apiKey)) {
      return NextResponse.json(
        {
          error: "Invalid API key format. Expected format: key-datacenter (e.g., your-key-us1)"
        },
        { status: 400 }
      );
    }

    // Check if credential exists and belongs to this workspace
    const { data: existingCredential, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("id, name")
      .eq("id", credentialId)
      .eq("workspace_id", workspaceId)
      .eq("service", "mailchimp")
      .single();

    if (fetchError || !existingCredential) {
      return NextResponse.json(
        { error: "Mailchimp credential not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    try {
      // Update the credential
      await updateMailchimpCredential(credentialId, name, apiKey);

      // Get the updated credential details
      const credentials = await getMailchimpCredentials(workspaceId);
      const updatedCredential = credentials.find(c => c.id === credentialId);

      return NextResponse.json({
        credential: updatedCredential,
        message: "Mailchimp credential updated successfully"
      });
    } catch (error) {
      console.error("Error updating Mailchimp credential:", error);

      if ((error as Error).message.includes('Invalid API key') || (error as Error).message.includes('Failed to connect')) {
        return NextResponse.json(
          {
            error: "Failed to validate Mailchimp API key",
            details: (error as Error).message
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to update Mailchimp credential",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp credential update API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/[workspaceId]/credentials/mailchimp - Delete Mailchimp credential
export async function DELETE(
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

    // Check user has permission to delete credentials in this workspace
    const permissionCheck = await checkWorkspacePermission(
      workspaceId,
      user.id,
      ['owner', 'admin']
    );

    if (!permissionCheck.hasPermission) {
      return NextResponse.json(
        {
          error: "Insufficient permissions to delete credentials in this workspace",
          requiredRole: "owner or admin",
          currentRole: permissionCheck.role
        },
        { status: 403 }
      );
    }

    // Get credential ID from query parameters
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID is required as a query parameter" },
        { status: 400 }
      );
    }

    // Check if credential exists and belongs to this workspace
    const { data: existingCredential, error: fetchError } = await supabaseAdmin
      .from("credentials")
      .select("id, name")
      .eq("id", credentialId)
      .eq("workspace_id", workspaceId)
      .eq("service", "mailchimp")
      .single();

    if (fetchError || !existingCredential) {
      return NextResponse.json(
        { error: "Mailchimp credential not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    try {
      // Delete the credential
      await deleteMailchimpCredential(credentialId);

      return NextResponse.json({
        message: "Mailchimp credential deleted successfully",
        deletedCredential: {
          id: credentialId,
          name: existingCredential.name
        }
      });
    } catch (error) {
      console.error("Error deleting Mailchimp credential:", error);
      return NextResponse.json(
        {
          error: "Failed to delete Mailchimp credential",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp credential deletion API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}