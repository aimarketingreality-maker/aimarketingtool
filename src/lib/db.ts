import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Allow development with placeholder values
const isDevelopment = process.env.NODE_ENV === 'development';
const usingPlaceholders = supabaseUrl?.includes('your-supabase-url') || !supabaseUrl;

if (!isDevelopment && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error("Missing Supabase environment variables");
}

// Create mock client for development with placeholders
const createMockClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: new Error("Not configured") }),
    signUp: () => Promise.resolve({ data: { user: null }, error: new Error("Not configured") }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: Function) => {
      // Immediately call with null session for development
      callback('SIGNED_OUT', null);
      // Return unsubscribe function in the expected format
      return {
        data: { subscription: { unsubscribe: () => {} } },
        subscription: { unsubscribe: () => {} }
      };
    },
    getCurrentUser: () => Promise.resolve({ data: { user: null }, error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: new Error("Not configured") }),
    refreshSession: () => Promise.resolve({ data: { session: null }, error: null })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        data: [],
        error: new Error("Not configured")
      })
    })
  })
});

// Client for use in browser/components
export const supabase = usingPlaceholders ? createMockClient() : createClient(supabaseUrl!, supabaseAnonKey!);

// Admin client for use in server-side code (API routes)
export const supabaseAdmin = usingPlaceholders ? createMockClient() : createClient(supabaseUrl!, supabaseServiceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          published?: boolean;
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