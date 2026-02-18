
-- Add new columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS address_zip text;

-- Create client_registration_tokens table
CREATE TABLE IF NOT EXISTS public.client_registration_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage tokens
CREATE POLICY "Members can view tokens"
  ON public.client_registration_tokens
  FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert tokens"
  ON public.client_registration_tokens
  FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update tokens"
  ON public.client_registration_tokens
  FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete tokens"
  ON public.client_registration_tokens
  FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Public can read token by token value (for public registration page)
CREATE POLICY "Public can read token by value"
  ON public.client_registration_tokens
  FOR SELECT
  USING (true);
