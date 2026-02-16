import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useClientTemplates = (clientId: string | undefined, workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["client_message_templates", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_message_templates" as any)
        .select("template_id")
        .eq("client_id", clientId!)
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data as any[]).map((r) => r.template_id as string);
    },
    enabled: !!clientId && !!workspaceId,
  });
};

export const useToggleClientTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      clientId,
      templateId,
      workspaceId,
      enabled,
    }: {
      clientId: string;
      templateId: string;
      workspaceId: string;
      enabled: boolean;
    }) => {
      if (enabled) {
        const { error } = await supabase
          .from("client_message_templates" as any)
          .insert({ client_id: clientId, template_id: templateId, workspace_id: workspaceId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_message_templates" as any)
          .delete()
          .eq("client_id", clientId)
          .eq("template_id", templateId);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["client_message_templates", v.clientId] });
    },
  });
};
