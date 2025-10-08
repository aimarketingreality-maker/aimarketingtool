"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

interface Funnel {
  id: string;
  name: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: string;
  funnel_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  components?: Component[];
}

interface Component {
  id: string;
  page_id: string;
  type: string;
  order: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function BuilderCanvas() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const funnelId = searchParams.get('funnel');

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get current user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      return user;
    };

    // Load funnel data
    const loadFunnelData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/auth/signin");
          return;
        }

        if (!funnelId) {
          setError("No funnel ID provided");
          setLoading(false);
          return;
        }

        // Get user's session token for API calls
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push("/auth/signin");
          return;
        }

        // Fetch funnel data
        const response = await fetch(`/api/funnels/${funnelId}/pages`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch funnel data");
        }

        const data = await response.json();
        setFunnel(data.funnel);
        setPages(data.pages || []);
        setLoading(false);
      } catch (err) {
        console.error("Error loading funnel data:", err);
        setError(err instanceof Error ? err.message : "Failed to load funnel");
        setLoading(false);
      }
    };

    loadFunnelData();
  }, [funnelId, router]);

  const handleSignOut = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p>Loading funnel...</p>
        </div>
      </div>
    );
  }

  if (error || !funnel) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-gray-400 mb-6">{error || "Funnel not found"}</p>
          <Link
            href="/templates"
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/templates" className="text-yellow-400 hover:text-yellow-300">
                ← Back to Templates
              </Link>
              <h1 className="text-xl font-semibold">{funnel.name}</h1>
              <span className={`px-2 py-1 rounded text-sm ${
                funnel.published
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}>
                {funnel.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Pages */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Pages</h2>
              {pages.length === 0 ? (
                <p className="text-gray-400 text-sm">No pages yet</p>
              ) : (
                <div className="space-y-2">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <h3 className="font-medium">{page.name}</h3>
                      <p className="text-sm text-gray-400">/{page.slug}</p>
                      {page.components && page.components.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {page.components.length} component{page.components.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-8 min-h-96">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Funnel Builder Canvas</h2>
                <p className="text-gray-400 mb-8">
                  This is the visual editor where you'll be able to drag and drop components to build your funnel pages.
                </p>

                {pages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No pages created yet.</p>
                    <p className="text-sm text-gray-500">
                      The funnel was created successfully, but page creation encountered an issue.
                    </p>
                  </div>
                ) : (
                  <div className="text-left">
                    <h3 className="text-lg font-semibold mb-4">Funnel Structure:</h3>
                    <div className="space-y-4">
                      {pages.map((page) => (
                        <div key={page.id} className="bg-gray-700 rounded-lg p-4">
                          <h4 className="font-medium mb-2">{page.name} (/{page.slug})</h4>
                          {page.components && page.components.length > 0 ? (
                            <div className="space-y-2">
                              {page.components.map((component) => (
                                <div key={component.id} className="bg-gray-600 rounded p-2 text-sm">
                                  <span className="font-medium capitalize">{component.type}</span>
                                  <span className="text-gray-400 ml-2">Order: {component.order}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No components yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-yellow-400 bg-opacity-10 border border-yellow-400 rounded-lg">
                <h3 className="text-yellow-400 font-semibold mb-2">✅ Funnel Created Successfully!</h3>
                <p className="text-yellow-200 text-sm">
                  Your funnel "{funnel.name}" has been created with ID: {funnel.id}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  The visual drag-and-drop editor will be implemented in the next phase of development.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}