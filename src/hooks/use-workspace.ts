import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWorkspace = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["workspace", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, role, workspaces(id, name, primary_color, secondary_color, logo_url)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No workspace found");

      const ws = data.workspaces as any;
      return {
        id: data.workspace_id,
        name: ws?.name as string,
        role: data.role,
        primary_color: ws?.primary_color as string | null,
        secondary_color: ws?.secondary_color as string | null,
        logo_url: ws?.logo_url as string | null,
      };
    },
    enabled: !!user,
  });
};
