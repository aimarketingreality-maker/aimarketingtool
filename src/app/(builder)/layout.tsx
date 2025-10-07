"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/theme";

export default function BuilderLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/builder/templates" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">AI</span>
                </div>
                <span className="text-white font-semibold">Marketing Funnel Builder</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/builder/templates"
                className={cn(
                  "text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-gray-800"
                )}
              >
                Templates
              </Link>
              <Link
                href="/builder/canvas"
                className={cn(
                  "text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-gray-800"
                )}
              >
                Canvas
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-300 text-sm">{user.email}</span>
              <button
                onClick={() => {
                  // Handle sign out
                  router.push("/");
                }}
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}