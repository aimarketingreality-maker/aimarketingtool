import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
}

// Service role key validation only for server-side code
if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
  console.warn("Missing Supabase service role key. Some server-side operations may not work.");
}

// Client for use in browser/components
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Admin client for use in server-side code (API routes)
export const supabaseAdmin = supabaseServiceRoleKey ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}) : supabase;

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
        };
      };
      funnels: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          published: boolean;
          slug: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          published?: boolean;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          published?: boolean;
          slug?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          funnel_id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      components: {
        Row: {
          id: string;
          page_id: string;
          type: string;
          order: number;
          config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          type: string;
          order: number;
          config: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          type?: string;
          order?: number;
          config?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      workflows: {
        Row: {
          id: string;
          user_id: string;
          n8n_workflow_id: string;
          trigger_component_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          n8n_workflow_id: string;
          trigger_component_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          n8n_workflow_id?: string;
          trigger_component_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Helper function to create user profile if it doesn't exist
export async function ensureUserProfile(userId: string, email: string) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        email,
      },
      {
        onConflict: "id",
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error ensuring user profile:", error);
    throw error;
  }

  return data;
}