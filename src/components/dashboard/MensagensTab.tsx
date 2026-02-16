import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  Clock,
  FileText,
  Loader2,
  Pencil,
  Trash2,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { useMessageTemplates } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  useAddMessageTemplate,
  useUpdateMessageTemplate,
  useDeleteMessageTemplate,
  type RuleInput,
  type TemplateInput,
} from "@/hooks/use-message-templates";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type TriggerType = Database["public"]["Enums"]["trigger_type"];
type OffsetUnit = Database["public"]["Enums"]["offset_unit"];

const triggerLabels: Record<string, string> = {
  antes_da_sessao: "Antes da sessão",
  apos_confirmacao: "Após confirmação",
  apos_sessao: "Após sessão",
  manual: "Manual",
};

const unitLabels: Record<string, string> = {
  minutos: "minutos",
  horas: "horas",
  dias: "dias",
};

const emptyRule: RuleInput = {
  trigger: "antes_da_sessao",
  offset_value: 24,
  offset_unit: "horas",
};

interface FormState {
  name: string;
  body: string;
  message_type: "text" | "payment_link";
  rules: RuleInput[];
}

const defaultForm: FormState = {
  name: "",
  body: "",
  message_type: "text",
  rules: [{ ...emptyRule }],
};

const MensagensTab = () => {
  const { data: workspace } = useWorkspace();
  const { data: templates, isLoading } = useMessageTemplates(workspace?.id);
  const addMutation = useAddMessageTemplate();
  const updateMutation = useUpdateMessageTemplate();
  const deleteMutation = useDeleteMessageTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...defaultForm });

  const activeCount = (templates ?? []).filter((t) => {
    const rules = (t as any).message_rules ?? [];
    return rules.some((r: any) => r.active);
  }).length;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const openEdit = (tpl: any) => {
    const rules: RuleInput[] = (tpl.message_rules ?? []).map((r: any) => ({
      trigger: r.trigger,
      offset_value: r.offset_value,
      offset_unit: r.offset_unit,
      active: r.active,
    }));
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      body: tpl.body,
      message_type: (tpl as any).message_type ?? "text",
      rules: rules.length > 0 ? rules : [{ ...emptyRule }],
    });
    setDialogOpen(true);
  };

  const addRule = () => {
    setForm((f) => ({ ...f, rules: [...f.rules, { ...emptyRule }] }));
  };

  const removeRule = (idx: number) => {
    setForm((f) => ({ ...f, rules: f.rules.filter((_, i) => i !== idx) }));
  };

  const updateRule = (idx: number, field: string, value: any) => {
    setForm((f) => ({
      ...f,
      rules: f.rules.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    }));
  };

  const handleSave = async () => {
    if (!workspace?.id || !form.name.trim() || !form.body.trim()) {
      toast.error("Preencha nome e corpo da mensagem.");
      return;
    }
    if (form.rules.length === 0) {
      toast.error("Adicione pelo menos uma regra de disparo.");
      return;
    }
    try {
      const payload: TemplateInput = {
        workspace_id: workspace.id,
        name: form.name.trim(),
        body: form.body.trim(),
        message_type: form.message_type,
        rules: form.rules,
      };
      if (editingId) {
        await updateMutation.mutateAsync({ ...payload, id: editingId });
        toast.success("Template atualizado!");
      } else {
        await addMutation.mutateAsync(payload);
        toast.success("Template criado!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar template.");
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !workspace?.id) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteId, workspace_id: workspace.id });
      toast.success("Template excluído!");
    } catch {
      toast.error("Erro ao excluir template.");
    }
    setDeleteId(null);
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Templates criados</p>
          <p className="text-2xl font-bold text-foreground">{(templates ?? []).length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Com regras ativas</p>
          <p className="text-2xl font-bold text-accent">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Disparos (em breve)</p>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
        </div>
      </div>

      {/* Header + button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Templates de mensagem</h2>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo template
        </Button>
      </div>

      {/* List */}
      {(templates ?? []).length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum template criado ainda.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {(templates ?? []).map((tpl) => {
            const rules = (tpl as any).message_rules ?? [];
            const hasActiveRule = rules.some((r: any) => r.active);
            const msgType = (tpl as any).message_type ?? "text";

            return (
              <div
                key={tpl.id}
                className="rounded-xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          hasActiveRule
                            ? "bg-accent/10 text-accent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {hasActiveRule ? "Ativo" : "Sem regra"}
                      </span>
                      {msgType === "payment_link" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          <LinkIcon className="h-3 w-3" />
                          Link de pagamento
                        </span>
                      )}
                    </div>

                    {/* Rules */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {rules.map((r: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md"
                        >
                          {triggerLabels[r.trigger] ?? r.trigger} · {r.offset_value}{" "}
                          {unitLabels[r.offset_unit] ?? r.offset_unit}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.body}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(tpl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar template" : "Novo template"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome do template</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Lembrete de confirmação"
              />
            </div>

            <div>
              <Label>Tipo de mensagem</Label>
              <RadioGroup
                value={form.message_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, message_type: v as "text" | "payment_link" }))
                }
                className="flex gap-4 mt-1"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="text" id="type-text" />
                  <Label htmlFor="type-text" className="font-normal cursor-pointer">
                    Texto simples
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="payment_link" id="type-payment" />
                  <Label htmlFor="type-payment" className="font-normal cursor-pointer">
                    Com link de pagamento
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Corpo da mensagem</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Olá {{nome_cliente}}, sua sessão está agendada para {{data_sessao}}."
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Variáveis: {"{{nome_cliente}}"}, {"{{data_sessao}}"}, {"{{hora_sessao}}"}
                {form.message_type === "payment_link" && <>, {"{{link_pagamento}}"}</>}
              </p>
            </div>

            {/* Rules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Regras de disparo</Label>
                <Button variant="ghost" size="sm" onClick={addRule} type="button">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar regra
                </Button>
              </div>

              <div className="space-y-3">
                {form.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-end gap-2 p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1 space-y-2">
                      <Select
                        value={rule.trigger}
                        onValueChange={(v) => updateRule(idx, "trigger", v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="antes_da_sessao">Antes da sessão</SelectItem>
                          <SelectItem value="apos_confirmacao">Após confirmação</SelectItem>
                          <SelectItem value="apos_sessao">Após sessão</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>

                      {rule.trigger !== "manual" && (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min={0}
                            className="w-20 h-9"
                            value={rule.offset_value}
                            onChange={(e) =>
                              updateRule(idx, "offset_value", Number(e.target.value))
                            }
                          />
                          <Select
                            value={rule.offset_unit}
                            onValueChange={(v) => updateRule(idx, "offset_unit", v)}
                          >
                            <SelectTrigger className="w-28 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutos">minutos</SelectItem>
                              <SelectItem value="horas">horas</SelectItem>
                              <SelectItem value="dias">dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {form.rules.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRule(idx)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O template e todas as regras associadas serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MensagensTab;
