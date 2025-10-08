-- Initial setup for our marketing funnel builder database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the auth.users table structure that Supabase Auth expects
-- This will be managed by Supabase Auth service, but we create the basic structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        CREATE SCHEMA auth;
    END IF;
END $$;

-- Create auth.users table if it doesn't exist (Supabase Auth will manage this)
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ,
    confirmation_token TEXT,
    recovery_token TEXT,
    email_change_token_current TEXT,
    email_change_token_new TEXT,
    last_sign_in_at TIMESTAMPTZ,
    raw_app_meta_data JSONB,
    raw_user_meta_data JSONB,
    is_super_admin BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT users_email_check CHECK (char_length(email) >= 6)
);

-- Set up real-time schema (required by Supabase Realtime)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'realtime') THEN
        CREATE SCHEMA realtime;
    END IF;
END $$;

-- Set up storage schema (required by Supabase Storage)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        CREATE SCHEMA storage;
    END IF;
END $$;

-- Create users table (public user info, auth data is in auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Add constraints
    CONSTRAINT users_email_check CHECK (char_length(email) >= 6)
);

-- Create funnels table
CREATE TABLE IF NOT EXISTS public.funnels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    published BOOLEAN DEFAULT false NOT NULL,
    slug TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Add constraints
    CONSTRAINT funnels_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT funnels_slug_unique UNIQUE (slug)
);

-- Create pages table
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Add constraints
    CONSTRAINT pages_name_check CHECK (char_length(name) >= 1),
    CONSTRAINT pages_slug_check CHECK (char_length(slug) >= 1),
    -- Ensure slug is unique within a funnel
    CONSTRAINT pages_funnel_slug_unique UNIQUE (funnel_id, slug)
);

-- Create components table
CREATE TABLE IF NOT EXISTS public.components (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Add constraints
    CONSTRAINT components_type_check CHECK (char_length(type) >= 1),
    CONSTRAINT components_order_check CHECK ("order" >= 0)
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    n8n_workflow_id TEXT NOT NULL,
    trigger_component_id UUID REFERENCES public.components(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Add constraints
    CONSTRAINT workflows_n8n_workflow_id_check CHECK (char_length(n8n_workflow_id) >= 1)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON public.funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnels_published ON public.funnels(published);
CREATE INDEX IF NOT EXISTS idx_funnels_slug ON public.funnels(slug);
CREATE INDEX IF NOT EXISTS idx_pages_funnel_id ON public.pages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_components_page_id ON public.components(page_id);
CREATE INDEX IF NOT EXISTS idx_components_order ON public.components(page_id, "order");
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_component_id ON public.workflows(trigger_component_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Funnels policies
CREATE POLICY "Users can view own funnels" ON public.funnels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own funnels" ON public.funnels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own funnels" ON public.funnels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own funnels" ON public.funnels
    FOR DELETE USING (auth.uid() = user_id);

-- Pages policies
CREATE POLICY "Users can view own pages" ON public.pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.funnels
            WHERE funnels.id = pages.funnel_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own pages" ON public.pages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.funnels
            WHERE funnels.id = pages.funnel_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own pages" ON public.pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.funnels
            WHERE funnels.id = pages.funnel_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own pages" ON public.pages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.funnels
            WHERE funnels.id = pages.funnel_id
            AND funnels.user_id = auth.uid()
        )
    );

-- Components policies
CREATE POLICY "Users can view own components" ON public.components
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.pages
            JOIN public.funnels ON funnels.id = pages.funnel_id
            WHERE pages.id = components.page_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own components" ON public.components
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pages
            JOIN public.funnels ON funnels.id = pages.funnel_id
            WHERE pages.id = components.page_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own components" ON public.components
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.pages
            JOIN public.funnels ON funnels.id = pages.funnel_id
            WHERE pages.id = components.page_id
            AND funnels.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own components" ON public.components
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.pages
            JOIN public.funnels ON funnels.id = pages.funnel_id
            WHERE pages.id = components.page_id
            AND funnels.user_id = auth.uid()
        )
    );

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON public.workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workflows" ON public.workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows" ON public.workflows
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows" ON public.workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_funnels_updated_at
    BEFORE UPDATE ON public.funnels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_components_updated_at
    BEFORE UPDATE ON public.components
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_workflows_updated_at
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;