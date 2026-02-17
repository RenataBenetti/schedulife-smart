import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClients = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["clients", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useAddClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: { workspace_id: string; full_name: string; email?: string; phone?: string; notes?: string; billing_model?: string; session_value_cents?: number | null; billing_timing?: string; billing_day_of_month?: number | null }) => {
      const { data, error } = await supabase.from("clients").insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.workspace_id] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id, ...updates }: { id: string; workspace_id: string; full_name?: string; email?: string | null; phone?: string | null; notes?: string | null; billing_model?: string; session_value_cents?: number | null; billing_timing?: string; billing_day_of_month?: number | null }) => {
      const { data, error } = await supabase.from("clients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients", data.workspace_id] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients", variables.workspace_id] });
    },
  });
};

export const useSessions = (clientId: string | undefined, workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["sessions", clientId, workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, appointments(starts_at, title)")
        .eq("workspace_id", workspaceId!)
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId && !!workspaceId,
  });
};

export const useAddSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (session: { workspace_id: string; client_id: string; appointment_id?: string; session_notes?: string }) => {
      const { data, error } = await supabase.from("sessions").insert(session).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", data.client_id, data.workspace_id] });
    },
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client_id, workspace_id, ...rest }: { id: string; session_notes?: string; client_id: string; workspace_id: string }) => {
      const { data, error } = await supabase.from("sessions").update(rest).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", variables.client_id, variables.workspace_id] });
    },
  });
};

export const useAppointments = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["appointments", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(full_name)")
        .eq("workspace_id", workspaceId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useAddAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apt: { workspace_id: string; client_id: string; title?: string; starts_at: string; ends_at: string; notes?: string }) => {
      const { data, error } = await supabase.from("appointments").insert(apt).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", variables.workspace_id] });
    },
  });
};

export const usePaymentLinks = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["payment_links", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("*, clients(full_name)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useMessageTemplates = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["message_templates", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*, message_rules(*)")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useSubscription = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["subscription", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_status")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...updates }: { userId: string; full_name?: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profile", data.user_id] });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string }) => {
      const { data, error } = await supabase
        .from("workspaces")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
  });
};

export const useWhatsappConfig = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["whatsapp_config", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};

export const useAddPaymentLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (link: { workspace_id: string; client_id: string; amount_cents: number; external_link?: string }) => {
      const { data, error } = await supabase.from("payment_links").insert(link).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment_links", data.workspace_id] });
    },
  });
};

export const useUpdatePaymentLink = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id, ...updates }: { id: string; workspace_id: string; paid?: boolean }) => {
      const { data, error } = await supabase.from("payment_links").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["payment_links", data.workspace_id] });
    },
  });
};

export const useGoogleCalendarConfig = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["google_calendar_config", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_config")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });
};
