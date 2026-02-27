
-- Tabela de configurações de WhatsApp por workspace
CREATE TABLE public.whatsapp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  send_delay_seconds INTEGER NOT NULL DEFAULT 5,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view settings"
  ON public.whatsapp_settings FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert settings"
  ON public.whatsapp_settings FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update settings"
  ON public.whatsapp_settings FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de fila de envio (outbox)
CREATE TABLE public.whatsapp_outbox (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for worker performance
CREATE INDEX idx_whatsapp_outbox_queue ON public.whatsapp_outbox (status, scheduled_for)
  WHERE status = 'queued';
CREATE INDEX idx_whatsapp_outbox_workspace ON public.whatsapp_outbox (workspace_id);
CREATE INDEX idx_whatsapp_outbox_daily ON public.whatsapp_outbox (workspace_id, created_at)
  WHERE status IN ('sent', 'sending');

-- Enable RLS
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view outbox"
  ON public.whatsapp_outbox FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert outbox"
  ON public.whatsapp_outbox FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update outbox"
  ON public.whatsapp_outbox FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Service role needs direct access for the worker (bypasses RLS)
-- The worker uses supabaseAdmin with service_role_key

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_outbox_updated_at
  BEFORE UPDATE ON public.whatsapp_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
