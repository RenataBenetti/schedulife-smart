
-- =============================================
-- AGENDIX MULTI-TENANT DATABASE SCHEMA
-- =============================================

-- 1. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  setup_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 3. Workspace members
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Security definer function for workspace membership check
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- RLS for workspaces (members can see their workspaces)
CREATE POLICY "Members can view workspace" ON public.workspaces FOR SELECT
  USING (public.is_workspace_member(auth.uid(), id));
CREATE POLICY "Owner can update workspace" ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Authenticated can create workspace" ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- RLS for workspace_members
CREATE POLICY "Members can view members" ON public.workspace_members FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "User can insert own membership" ON public.workspace_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Subscription status
CREATE TYPE public.plan_status AS ENUM ('trial_active', 'active', 'overdue', 'canceled');

CREATE TABLE public.subscription_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status public.plan_status NOT NULL DEFAULT 'trial_active',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscription" ON public.subscription_status FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update subscription" ON public.subscription_status FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert subscription" ON public.subscription_status FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 5. Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view clients" ON public.clients FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert clients" ON public.clients FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update clients" ON public.clients FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete clients" ON public.clients FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 6. Appointments
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'canceled', 'no_show');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view appointments" ON public.appointments FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert appointments" ON public.appointments FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update appointments" ON public.appointments FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete appointments" ON public.appointments FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 7. Sessions (clinical records)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sessions" ON public.sessions FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert sessions" ON public.sessions FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update sessions" ON public.sessions FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 8. Message templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view templates" ON public.message_templates FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert templates" ON public.message_templates FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update templates" ON public.message_templates FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete templates" ON public.message_templates FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 9. Message rules
CREATE TYPE public.trigger_type AS ENUM ('antes_da_sessao', 'apos_confirmacao', 'apos_sessao', 'manual');
CREATE TYPE public.offset_unit AS ENUM ('minutos', 'horas', 'dias');

CREATE TABLE public.message_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE CASCADE,
  trigger public.trigger_type NOT NULL,
  offset_value INT NOT NULL DEFAULT 0,
  offset_unit public.offset_unit NOT NULL DEFAULT 'horas',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rules" ON public.message_rules FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert rules" ON public.message_rules FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update rules" ON public.message_rules FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can delete rules" ON public.message_rules FOR DELETE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 10. Payment links
CREATE TABLE public.payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount_cents INT NOT NULL,
  external_link TEXT,
  paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view payment_links" ON public.payment_links FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert payment_links" ON public.payment_links FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update payment_links" ON public.payment_links FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 11. Scheduled jobs
CREATE TABLE public.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB,
  run_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view jobs" ON public.scheduled_jobs FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert jobs" ON public.scheduled_jobs FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

-- 12. WhatsApp config per workspace
CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  business_id TEXT,
  phone_number_id TEXT,
  access_token TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view whatsapp config" ON public.whatsapp_config FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert whatsapp config" ON public.whatsapp_config FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update whatsapp config" ON public.whatsapp_config FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- 13. Google Calendar config per workspace
CREATE TABLE public.google_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calendar_id TEXT,
  refresh_token TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view gcal config" ON public.google_calendar_config FOR SELECT
  USING (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can insert gcal config" ON public.google_calendar_config FOR INSERT
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));
CREATE POLICY "Members can update gcal config" ON public.google_calendar_config FOR UPDATE
  USING (public.is_workspace_member(auth.uid(), workspace_id));

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscription_status_updated_at BEFORE UPDATE ON public.subscription_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_google_calendar_config_updated_at BEFORE UPDATE ON public.google_calendar_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + workspace on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Create workspace
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Consultório'), NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add as workspace owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  -- Create trial subscription
  INSERT INTO public.subscription_status (workspace_id)
  VALUES (new_workspace_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
