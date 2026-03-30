import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  workspace_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

export function useNotifications(workspaceId?: string) {
  return useQuery({
    queryKey: ["notifications", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadCount(workspaceId?: string) {
  const { data } = useNotifications(workspaceId);
  return (data ?? []).filter((n) => !n.read).length;
}

export function useMarkAllRead(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!workspaceId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("workspace_id", workspaceId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", workspaceId] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
