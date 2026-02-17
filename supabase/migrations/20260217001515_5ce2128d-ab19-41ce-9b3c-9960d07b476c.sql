
-- Add billing fields to clients table
ALTER TABLE public.clients
  ADD COLUMN billing_model text DEFAULT 'sessao_individual',
  ADD COLUMN session_value_cents integer,
  ADD COLUMN billing_timing text DEFAULT 'depois_da_sessao';
