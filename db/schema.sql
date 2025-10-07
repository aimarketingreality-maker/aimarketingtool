-- Marketing Funnel Builder Database Schema
-- Based on specs/001-marketing-funnel-builder/data-model.md

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores public user information
-- Private authentication data is managed by Supabase Auth
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email TEXT UNIQUE NOT NULL
);

-- Funnels table - represents a marketing funnel created by a user
CREATE TABLE IF NOT EXISTS funnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pages table - represents a single page within a funnel
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funnel_id UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure slug is unique within a funnel
    UNIQUE(funnel_id, slug)
);

-- Components table - represents a component on a page
CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflows table - represents an n8n workflow associated with a trigger
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    n8n_workflow_id TEXT NOT NULL,
    trigger_component_id UUID REFERENCES components(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnels_published ON funnels(published);
CREATE INDEX IF NOT EXISTS idx_pages_funnel_id ON pages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_components_page_id ON components(page_id);
CREATE INDEX IF NOT EXISTS idx_components_type ON components(type);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_n8n_workflow_id ON workflows(n8n_workflow_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON funnels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Funnels policies
CREATE POLICY "Users can view own funnels" ON funnels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own funnels" ON funnels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own funnels" ON funnels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own funnels" ON funnels FOR DELETE USING (auth.uid() = user_id);

-- Pages policies
CREATE POLICY "Users can view pages of own funnels" ON pages FOR SELECT USING (
    EXISTS (SELECT 1 FROM funnels WHERE funnels.id = pages.funnel_id AND funnels.user_id = auth.uid())
);
CREATE POLICY "Users can insert pages into own funnels" ON pages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM funnels WHERE funnels.id = pages.funnel_id AND funnels.user_id = auth.uid())
);
CREATE POLICY "Users can update pages of own funnels" ON pages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM funnels WHERE funnels.id = pages.funnel_id AND funnels.user_id = auth.uid())
);
CREATE POLICY "Users can delete pages of own funnels" ON pages FOR DELETE USING (
    EXISTS (SELECT 1 FROM funnels WHERE funnels.id = pages.funnel_id AND funnels.user_id = auth.uid())
);

-- Components policies
CREATE POLICY "Users can view components of own funnels" ON components FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM pages
        JOIN funnels ON funnels.id = pages.funnel_id
        WHERE pages.id = components.page_id AND funnels.user_id = auth.uid()
    )
);
CREATE POLICY "Users can insert components into pages of own funnels" ON components FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM pages
        JOIN funnels ON funnels.id = pages.funnel_id
        WHERE pages.id = components.page_id AND funnels.user_id = auth.uid()
    )
);
CREATE POLICY "Users can update components of own funnels" ON components FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM pages
        JOIN funnels ON funnels.id = pages.funnel_id
        WHERE pages.id = components.page_id AND funnels.user_id = auth.uid()
    )
);
CREATE POLICY "Users can delete components of own funnels" ON components FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM pages
        JOIN funnels ON funnels.id = pages.funnel_id
        WHERE pages.id = components.page_id AND funnels.user_id = auth.uid()
    )
);

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workflows" ON workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workflows" ON workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workflows" ON workflows FOR DELETE USING (auth.uid() = user_id);