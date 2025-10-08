import { supabaseAdmin } from "./db";
import { Database } from "@/types/database";

/**
 * Check if a user has the required permissions in a workspace
 */
export async function checkWorkspacePermission(
  workspaceId: string,
  userId: string,
  requiredRoles: Array<'owner' | 'admin' | 'editor' | 'viewer'> = ['owner', 'admin', 'editor']
): Promise<{ hasPermission: boolean; role?: string; workspace?: any }> {
  try {
    // Get workspace and user membership in one query
    const { data: membership, error } = await supabaseAdmin
      .from("workspace_members")
      .select(`
        role,
        workspace:workspaces(id, name, slug)
      `)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (error || !membership) {
      return { hasPermission: false };
    }

    const hasPermission = requiredRoles.includes(membership.role);

    return {
      hasPermission,
      role: membership.role,
      workspace: membership.workspace
    };
  } catch (error) {
    console.error("Error checking workspace permission:", error);
    return { hasPermission: false };
  }
}

/**
 * Generate SEO-friendly slug from name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Generate unique slug within workspace context
 */
export async function generateUniqueSlug(
  workspaceId: string,
  funnelName: string,
  excludeFunnelId?: string
): Promise<string> {
  const baseSlug = generateSlug(funnelName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    let query = supabaseAdmin
      .from("funnels")
      .select("slug")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug);

    if (excludeFunnelId) {
      query = query.neq("id", excludeFunnelId);
    }

    const { data: existingSlug, error: slugError } = await query.maybeSingle();

    if (slugError && slugError.code === 'PGRST116') {
      // No existing slug found, we can use this one
      break;
    }

    if (!existingSlug) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Validate funnel structure before publishing
 */
export async function validateFunnelStructure(funnelId: string): Promise<{
  isValid: boolean;
  errors: string[];
  pageCount: number;
  componentCount: number;
}> {
  const errors: string[] = [];
  let componentCount = 0;

  try {
    // Get all pages for the funnel with their components
    const { data: pages, error: pagesError } = await supabaseAdmin
      .from("pages")
      .select(`
        *,
        components (
          id,
          type,
          order,
          config
        )
      `)
      .eq("funnel_id", funnelId)
      .order("created_at", { ascending: true });

    if (pagesError) {
      errors.push("Failed to fetch funnel pages");
      return { isValid: false, errors, pageCount: 0, componentCount: 0 };
    }

    // Validate funnel has pages
    if (!pages || pages.length === 0) {
      errors.push("Funnel must have at least one page before publishing");
      return { isValid: false, errors, pageCount: 0, componentCount: 0 };
    }

    // Validate each page has components
    for (const page of pages) {
      if (!page.components || page.components.length === 0) {
        errors.push(`Page "${page.name}" must have at least one component before publishing`);
        continue;
      }

      componentCount += page.components.length;

      // Validate component configurations
      for (const component of page.components) {
        if (!component.config || Object.keys(component.config).length === 0) {
          errors.push(`Component "${component.type}" on page "${page.name}" has no configuration`);
        }

        // Special validation for opt-in forms with n8n workflows
        if (component.type === "optin-form" && !component.config.n8nWorkflowId) {
          errors.push(`Opt-in form on page "${page.name}" must be connected to an n8n workflow before publishing`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      pageCount: pages.length,
      componentCount
    };
  } catch (error) {
    console.error("Error validating funnel structure:", error);
    errors.push("Failed to validate funnel structure");
    return { isValid: false, errors, pageCount: 0, componentCount: 0 };
  }
}

/**
 * Get funnel with workspace and pages data
 */
export async function getFunnelWithDetails(funnelId: string, workspaceId: string) {
  try {
    const { data: funnel, error } = await supabaseAdmin
      .from("funnels")
      .select(`
        *,
        workspace:workspaces(id, name, slug),
        pages:pages(
          id,
          name,
          slug,
          components:components(
            id,
            type,
            order,
            config
          )
        )
      `)
      .eq("id", funnelId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: funnel };
  } catch (error) {
    console.error("Error getting funnel details:", error);
    return { success: false, error: "Failed to fetch funnel details" };
  }
}