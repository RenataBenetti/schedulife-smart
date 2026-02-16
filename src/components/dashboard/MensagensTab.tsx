import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Plus,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { useMessageTemplates } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";

const triggerLabels: Record<string, string> = {
  antes_da_sessao: "Antes da sessão",
  apos_confirmacao: "Após confirmação",
  apos_sessao: "Após sessão",
  manual: "Manual",
};

const MensagensTab = () => {
  const [tab, setTab] = useState<"templates" | "historico">("templates");
  const { data: workspace } = useWorkspace();
  const { data: templates, isLoading } = useMessageTemplates(workspace?.id);

  const activeCount = (templates ?? []).filter((t) => {
    const rules = (t as any).message_rules ?? [];
    return rules.some((r: any) => r.active);
  }).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <p className="text-sm text-muted-foreground mb-1">Mensagens (em breve)</p>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "templates" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setTab("historico")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "historico" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Histórico
        </button>
      </div>

      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" />
              Novo template
            </Button>
          </div>

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
                const firstRule = rules[0];
                const triggerLabel = firstRule ? triggerLabels[firstRule.trigger] ?? firstRule.trigger : "Sem regra";
                const offsetLabel = firstRule ? `${firstRule.offset_value} ${firstRule.offset_unit}` : "";

                return (
                  <div key={tpl.id} className="rounded-xl border border-border bg-card p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${hasActiveRule ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                          {hasActiveRule ? "Ativo" : "Sem regra"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {triggerLabel}{offsetLabel ? ` · ${offsetLabel}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tpl.body}</p>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <div className="text-center py-12">
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Histórico de mensagens estará disponível em breve.</p>
        </div>
      )}
    </div>
  );
};

export default MensagensTab;
