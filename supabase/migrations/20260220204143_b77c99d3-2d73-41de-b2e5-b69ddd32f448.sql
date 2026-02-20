
-- Table for QR Code WhatsApp instances
CREATE TABLE public.whatsapp_instances_qr (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_key TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one QR instance per workspace
CREATE UNIQUE INDEX idx_whatsapp_instances_qr_workspace ON public.whatsapp_instances_qr(workspace_id);

-- RLS
ALTER TABLE public.whatsapp_instances_qr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view QR instances"
  ON public.whatsapp_instances_qr FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert QR instances"
  ON public.whatsapp_instances_qr FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can update QR instances"
  ON public.whatsapp_instances_qr FOR UPDATE
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete QR instances"
  ON public.whatsapp_instances_qr FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_instances_qr_updated_at
  BEFORE UPDATE ON public.whatsapp_instances_qr
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add whatsapp_mode to workspaces
ALTER TABLE public.workspaces ADD COLUMN whatsapp_mode TEXT DEFAULT 'cloud_api';
