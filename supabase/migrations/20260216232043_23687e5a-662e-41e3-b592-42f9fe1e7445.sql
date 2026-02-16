-- Junction table: which templates apply to each client
CREATE TABLE public.client_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.message_templates(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, template_id)
);

ALTER TABLE public.client_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view client_message_templates"
  ON public.client_message_templates FOR SELECT
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert client_message_templates"
  ON public.client_message_templates FOR INSERT
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete client_message_templates"
  ON public.client_message_templates FOR DELETE
  USING (is_workspace_member(auth.uid(), workspace_id));