import { supabase } from "./db";
import type { User } from "@supabase/supabase-js";
import { ensureUserProfile } from "./db";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

// Sign up with email and password
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;

    // If user is created successfully, create profile
    if (data.user && !data.user.identities?.length) {
      // User already exists but needs verification
      return {
        user: null,
        message: "Please check your email to verify your account.",
      };
    }

    if (data.user) {
      await ensureUserProfile(data.user.id, email);
    }

    return { user: data.user, message: null };
  } catch (error: any) {
    console.error("Sign up error:", error);
    return {
      user: null,
      message: error.message || "Failed to sign up",
    };
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Ensure user profile exists
    if (data.user) {
      await ensureUserProfile(data.user.id, email);
    }

    return { user: data.user, error: null };
  } catch (error: any) {
    console.error("Sign in error:", error);
    return {
      user: null,
      error: error.message || "Failed to sign in",
    };
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    console.error("Sign out error:", error);
    return {
      error: error.message || "Failed to sign out",
    };
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;

    return user;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// Reset password
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error("Reset password error:", error);
    return {
      error: error.message || "Failed to send reset email",
    };
  }
}

// Update password
export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    return { error: null };
  } catch (error: any) {
    console.error("Update password error:", error);
    return {
      error: error.message || "Failed to update password",
    };
  }
}

// Check if user is authenticated (for server-side)
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

// Get user ID (for server-side)
export async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}