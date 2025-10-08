import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db";
import { createMailchimpService } from "@/lib/mailchimp";

// POST /api/mailchimp/subscribers - Add subscriber to Mailchimp list
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json();
    const {
      credentialId,
      listId,
      email,
      status = 'subscribed',
      mergeFields = {},
      tags = [],
      updateExisting = true
    } = body;

    // Validate required fields
    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { error: "Credential ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!listId || typeof listId !== "string") {
      return NextResponse.json(
        { error: "List ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify the credential exists and get workspace info
    const { data: credential, error: credentialError } = await supabaseAdmin
      .from("credentials")
      .select(`
        *,
        workspace:workspaces(id, name)
      `)
      .eq("id", credentialId)
      .eq("service", "mailchimp")
      .eq("is_valid", true)
      .single();

    if (credentialError || !credential) {
      return NextResponse.json(
        { error: "Valid Mailchimp credential not found" },
        { status: 404 }
      );
    }

    // Check user has permission to use this credential
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", credential.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have permission to use this credential" },
        { status: 403 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Add subscriber to list
      const member = await mailchimpService.addMember({
        list_id: listId,
        email_address: email,
        status: status as 'subscribed' | 'pending' | 'transactional',
        merge_fields: mergeFields,
        interests: {},
        tags,
        update_existing: updateExisting
      });

      // Log the subscription
      console.log(`Mailchimp subscription: ${email} added to list ${listId} in workspace ${credential.workspace_id}`);

      return NextResponse.json({
        success: true,
        member: {
          id: member.id,
          email_address: member.email_address,
          status: member.status,
          unique_email_id: member.unique_email_id
        },
        message: "Subscriber added successfully"
      });
    } catch (error) {
      console.error("Error adding Mailchimp subscriber:", error);

      const mailchimpError = error as { status?: number; detail?: string; message?: string };

      // Handle specific Mailchimp errors
      if (mailchimpError.status === 400) {
        if (mailchimpError.detail?.includes('already exists')) {
          return NextResponse.json(
            {
              error: "Email already exists in this list",
              details: mailchimpError.detail
            },
            { status: 409 }
          );
        }

        if (mailchimpError.detail?.includes('invalid email')) {
          return NextResponse.json(
            {
              error: "Invalid email address",
              details: mailchimpError.detail
            },
            { status: 400 }
          );
        }
      }

      // Mark credential as invalid if it's an auth error
      if (mailchimpError.status === 401) {
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
            error: "Mailchimp credential is no longer valid",
            details: "Please update the credential in your workspace settings"
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to add subscriber to Mailchimp",
          details: process.env.NODE_ENV === 'development' ? mailchimpError.detail || mailchimpError.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp subscriber API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// GET /api/mailchimp/subscribers - Get subscribers from a list
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");
    const listId = searchParams.get("listId");
    const status = searchParams.get("status") as 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending' | 'transactional' | undefined;
    const count = parseInt(searchParams.get("count") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate required parameters
    if (!credentialId || !listId) {
      return NextResponse.json(
        { error: "Both credentialId and listId are required" },
        { status: 400 }
      );
    }

    // Verify the credential exists and get workspace info
    const { data: credential, error: credentialError } = await supabaseAdmin
      .from("credentials")
      .select(`
        workspace_id
      `)
      .eq("id", credentialId)
      .eq("service", "mailchimp")
      .eq("is_valid", true)
      .single();

    if (credentialError || !credential) {
      return NextResponse.json(
        { error: "Valid Mailchimp credential not found" },
        { status: 404 }
      );
    }

    // Check user has permission to use this credential
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", credential.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have permission to use this credential" },
        { status: 403 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Get subscribers from list
      const { members, total } = await mailchimpService.getListMembers({
        list_id: listId,
        status,
        count,
        offset
      });

      return NextResponse.json({
        members: members.map(member => ({
          id: member.id,
          email_address: member.email_address,
          status: member.status,
          unique_email_id: member.unique_email_id,
          tags: member.tags,
          merge_fields: member.merge_fields,
          last_changed: member.last_changed,
          created_at: member.created_at
        })),
        total,
        pagination: {
          count,
          offset,
          hasMore: offset + count < total
        }
      });
    } catch (error) {
      console.error("Error fetching Mailchimp subscribers:", error);

      const mailchimpError = error as { status?: number; detail?: string; message?: string };

      // Mark credential as invalid if it's an auth error
      if (mailchimpError.status === 401) {
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
            error: "Mailchimp credential is no longer valid",
            details: "Please update the credential in your workspace settings"
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch subscribers from Mailchimp",
          details: process.env.NODE_ENV === 'development' ? mailchimpError.detail || mailchimpError.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp subscribers API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// PUT /api/mailchimp/subscribers - Update subscriber in a list
export async function PUT(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json();
    const {
      credentialId,
      listId,
      email,
      updates
    } = body;

    // Validate required fields
    if (!credentialId || !listId || !email || !updates) {
      return NextResponse.json(
        { error: "credentialId, listId, email, and updates are required" },
        { status: 400 }
      );
    }

    // Verify the credential exists and get workspace info
    const { data: credential, error: credentialError } = await supabaseAdmin
      .from("credentials")
      .select(`
        workspace_id
      `)
      .eq("id", credentialId)
      .eq("service", "mailchimp")
      .eq("is_valid", true)
      .single();

    if (credentialError || !credential) {
      return NextResponse.json(
        { error: "Valid Mailchimp credential not found" },
        { status: 404 }
      );
    }

    // Check user has permission to use this credential
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", credential.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have permission to use this credential" },
        { status: 403 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Update subscriber
      const member = await mailchimpService.updateMember(listId, email, updates);

      return NextResponse.json({
        success: true,
        member: {
          id: member.id,
          email_address: member.email_address,
          status: member.status,
          unique_email_id: member.unique_email_id
        },
        message: "Subscriber updated successfully"
      });
    } catch (error) {
      console.error("Error updating Mailchimp subscriber:", error);

      const mailchimpError = error as { status?: number; detail?: string; message?: string };

      return NextResponse.json(
        {
          error: "Failed to update subscriber in Mailchimp",
          details: process.env.NODE_ENV === 'development' ? mailchimpError.detail || mailchimpError.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp subscriber update API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mailchimp/subscribers - Remove subscriber from a list
export async function DELETE(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const credentialId = searchParams.get("credentialId");
    const listId = searchParams.get("listId");
    const email = searchParams.get("email");

    // Validate required parameters
    if (!credentialId || !listId || !email) {
      return NextResponse.json(
        { error: "credentialId, listId, and email are required" },
        { status: 400 }
      );
    }

    // Verify the credential exists and get workspace info
    const { data: credential, error: credentialError } = await supabaseAdmin
      .from("credentials")
      .select(`
        workspace_id
      `)
      .eq("id", credentialId)
      .eq("service", "mailchimp")
      .eq("is_valid", true)
      .single();

    if (credentialError || !credential) {
      return NextResponse.json(
        { error: "Valid Mailchimp credential not found" },
        { status: 404 }
      );
    }

    // Check user has permission to use this credential
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", credential.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You don't have permission to use this credential" },
        { status: 403 }
      );
    }

    try {
      // Create Mailchimp service instance
      const mailchimpService = await createMailchimpService(credentialId);

      // Remove subscriber from list
      await mailchimpService.removeMember(listId, email);

      return NextResponse.json({
        success: true,
        message: "Subscriber removed successfully"
      });
    } catch (error) {
      console.error("Error removing Mailchimp subscriber:", error);

      const mailchimpError = error as { status?: number; detail?: string; message?: string };

      return NextResponse.json(
        {
          error: "Failed to remove subscriber from Mailchimp",
          details: process.env.NODE_ENV === 'development' ? mailchimpError.detail || mailchimpError.message : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in Mailchimp subscriber removal API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}