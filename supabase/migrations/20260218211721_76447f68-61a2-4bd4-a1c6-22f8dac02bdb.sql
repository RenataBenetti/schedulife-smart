
-- Adicionar campos Evolution API na tabela existente
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS integration_type text DEFAULT 'evolution_qr',
  ADD COLUMN IF NOT EXISTS evolution_api_url text,
  ADD COLUMN IF NOT EXISTS evolution_api_key text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'disconnected';

-- Tabela de log de mensagens enviadas (evita duplicatas e permite rastreio)
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  appointment_id uuid REFERENCES appointments(id),
  client_id uuid REFERENCES clients(id),
  template_id uuid REFERENCES message_templates(id),
  rule_id uuid REFERENCES message_rules(id),
  phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  error_message text
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_member_logs" ON public.message_logs
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
