import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NotificationPrefs {
  notify_email_confirmation: boolean;
  notify_payment_pending: boolean;
  notify_daily_summary: boolean;
}

const defaults: NotificationPrefs = {
  notify_email_confirmation: false,
  notify_payment_pending: false,
  notify_daily_summary: false,
};

export function useNotificationPreferences(workspaceId?: string) {
  return useQuery({
    queryKey: ["notification_preferences", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<NotificationPrefs> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaults;
      return {
        notify_email_confirmation: (data as any).notify_email_confirmation ?? false,
        notify_payment_pending: (data as any).notify_payment_pending ?? false,
        notify_daily_summary: (data as any).notify_daily_summary ?? false,
      };
    },
  });
}

export function useUpdateNotificationPreferences(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<NotificationPrefs>) => {
      if (!workspaceId) throw new Error("No workspace");
      // Upsert
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { workspace_id: workspaceId, ...prefs } as any,
          { onConflict: "workspace_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_preferences", workspaceId] }),
  });
}
