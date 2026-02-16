import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TriggerType = Database["public"]["Enums"]["trigger_type"];
type OffsetUnit = Database["public"]["Enums"]["offset_unit"];

export interface RuleInput {
  trigger: TriggerType;
  offset_value: number;
  offset_unit: OffsetUnit;
  active?: boolean;
}

export interface TemplateInput {
  workspace_id: string;
  name: string;
  body: string;
  message_type: "text" | "payment_link";
  rules: RuleInput[];
}

export const useAddMessageTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TemplateInput) => {
      const { rules, ...tpl } = input;
      const { data, error } = await supabase
        .from("message_templates")
        .insert(tpl as any)
        .select()
        .single();
      if (error) throw error;

      if (rules.length > 0) {
        const { error: rErr } = await supabase.from("message_rules").insert(
          rules.map((r) => ({
            template_id: data.id,
            workspace_id: input.workspace_id,
            trigger: r.trigger,
            offset_value: r.offset_value,
            offset_unit: r.offset_unit,
            active: r.active ?? true,
          }))
        );
        if (rErr) throw rErr;
      }
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["message_templates", v.workspace_id] });
    },
  });
};

export const useUpdateMessageTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id, rules, ...updates }: TemplateInput & { id: string }) => {
      const { error } = await supabase
        .from("message_templates")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;

      // Delete old rules and re-insert
      await supabase.from("message_rules").delete().eq("template_id", id);
      if (rules.length > 0) {
        const { error: rErr } = await supabase.from("message_rules").insert(
          rules.map((r) => ({
            template_id: id,
            workspace_id,
            trigger: r.trigger,
            offset_value: r.offset_value,
            offset_unit: r.offset_unit,
            active: r.active ?? true,
          }))
        );
        if (rErr) throw rErr;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["message_templates", v.workspace_id] });
    },
  });
};

export const useDeleteMessageTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, workspace_id }: { id: string; workspace_id: string }) => {
      // Delete rules first, then template
      await supabase.from("message_rules").delete().eq("template_id", id);
      const { error } = await supabase.from("message_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["message_templates", v.workspace_id] });
    },
  });
};
