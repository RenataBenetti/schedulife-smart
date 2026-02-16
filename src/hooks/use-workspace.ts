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
        .select("workspace_id, role, workspaces(id, name)")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No workspace found");

      return {
        id: data.workspace_id,
        name: (data.workspaces as any)?.name as string,
        role: data.role,
      };
    },
    enabled: !!user,
  });
};
