-- Criar tabela principal de conexões WhatsApp (Cloud API oficial Meta)
CREATE TABLE public.whatsapp_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  created_by UUID NOT NULL,
  waba_id TEXT NULL,
  phone_number_id TEXT NULL,
  phone_display TEXT NULL,
  access_token_encrypted TEXT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  last_error TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_connections_workspace_id_key UNIQUE (workspace_id),
  CONSTRAINT whatsapp_connections_status_check CHECK (status IN ('disconnected', 'connected', 'error'))
);

CREATE INDEX idx_whatsapp_connections_workspace_id ON public.whatsapp_connections(workspace_id);

-- Criar tabela de logs de mensagens WhatsApp
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  to_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'template',
  template_name TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT NULL,
  error TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_message_logs_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

CREATE INDEX idx_whatsapp_message_logs_workspace_id ON public.whatsapp_message_logs(workspace_id);

-- Ativar RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_connections
CREATE POLICY "Members can view own workspace connection"
  ON public.whatsapp_connections FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert own workspace connection"
  ON public.whatsapp_connections FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update own workspace connection"
  ON public.whatsapp_connections FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Políticas RLS para whatsapp_message_logs
CREATE POLICY "Members can view own workspace message logs"
  ON public.whatsapp_message_logs FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert own workspace message logs"
  ON public.whatsapp_message_logs FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- Trigger para updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
