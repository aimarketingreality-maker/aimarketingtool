-- Database setup script for credentials table
-- This script creates the credentials table for storing encrypted API keys
-- Run this in your Supabase SQL editor or migration system

-- Create the credentials table
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    service TEXT NOT NULL CHECK (service IN ('mailchimp', 'n8n', 'webhook', 'other')),
    name TEXT NOT NULL,
    encrypted_data JSONB NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credentials_workspace_id ON public.credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credentials_service ON public.credentials(service);
CREATE INDEX IF NOT EXISTS idx_credentials_workspace_service ON public.credentials(workspace_id, service);

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_credentials_updated_at
    BEFORE UPDATE ON public.credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security (RLS) policies
-- Enable RLS on the credentials table
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view credentials for workspaces they are members of
CREATE POLICY "Users can view workspace credentials"
    ON public.credentials FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Only owners and admins can insert credentials
CREATE POLICY "Owners and admins can insert credentials"
    ON public.credentials FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Policy: Only owners and admins can update credentials
CREATE POLICY "Owners and admins can update credentials"
    ON public.credentials FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Policy: Only owners and admins can delete credentials
CREATE POLICY "Owners and admins can delete credentials"
    ON public.credentials FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id
            FROM public.workspace_members
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Add helpful comments
COMMENT ON TABLE public.credentials IS 'Stores encrypted API credentials for various services, scoped by workspace';
COMMENT ON COLUMN public.credentials.encrypted_data IS 'JSONB field containing encrypted credential data (API keys, tokens, etc.)';
COMMENT ON COLUMN public.credentials.last_verified_at IS 'Timestamp of the last successful credential validation';
COMMENT ON COLUMN public.credentials.is_valid IS 'Whether the credential has been validated and is currently working';