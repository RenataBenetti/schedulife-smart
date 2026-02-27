
-- Add generic payment link fields to payment_links
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for updated_at on payment_links
CREATE TRIGGER update_payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add payment link fields to message_templates
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS payment_link_id UUID REFERENCES public.payment_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_link_override TEXT;

-- Index for quick default link lookup
CREATE INDEX IF NOT EXISTS idx_payment_links_workspace_default
  ON public.payment_links (workspace_id, is_default) WHERE is_default = true;
