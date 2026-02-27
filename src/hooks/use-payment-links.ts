import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GenericPaymentLink {
  id: string;
  workspace_id: string;
  name: string | null;
  type: string;
  url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const useGenericPaymentLinks = (workspaceId: string | undefined) => {
  return useQuery({
    queryKey: ["generic_payment_links", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("id, workspace_id, name, type, url, is_default, created_at, updated_at")
        .eq("workspace_id", workspaceId!)
        .not("name", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as GenericPaymentLink[];
    },
    enabled: !!workspaceId,
  });
};

export const useAddGenericPaymentLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: {
      workspace_id: string;
      name: string;
      type: string;
      url: string;
      is_default?: boolean;
    }) => {
      // If setting as default, unset others of same type first
      if (link.is_default) {
        await supabase
          .from("payment_links")
          .update({ is_default: false } as any)
          .eq("workspace_id", link.workspace_id)
          .eq("type", link.type)
          .eq("is_default", true);
      }
      const { data, error } = await supabase
        .from("payment_links")
        .insert({
          workspace_id: link.workspace_id,
          name: link.name,
          type: link.type,
          url: link.url,
          is_default: link.is_default ?? false,
          amount_cents: 0,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["generic_payment_links", v.workspace_id] });
    },
  });
};

export const useUpdateGenericPaymentLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      workspace_id,
      ...updates
    }: {
      id: string;
      workspace_id: string;
      name?: string;
      type?: string;
      url?: string;
      is_default?: boolean;
    }) => {
      if (updates.is_default && updates.type) {
        await supabase
          .from("payment_links")
          .update({ is_default: false } as any)
          .eq("workspace_id", workspace_id)
          .eq("type", updates.type)
          .eq("is_default", true);
      }
      const { data, error } = await supabase
        .from("payment_links")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["generic_payment_links", v.workspace_id] });
    },
  });
};

export const useDeleteGenericPaymentLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      const { error } = await supabase.from("payment_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["generic_payment_links", v.workspace_id] });
    },
  });
};
