import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Plus,
  Search,
  Send,
  Clock,
  CheckCheck,
  FileText,
} from "lucide-react";

const mockTemplates = [
  { id: "1", name: "Confirmação de sessão", trigger: "Antes da sessão", offset: "24h antes", active: true, sentCount: 87 },
  { id: "2", name: "Lembrete de pagamento", trigger: "Após sessão", offset: "1h após", active: true, sentCount: 34 },
  { id: "3", name: "Boas-vindas", trigger: "Manual", offset: "-", active: false, sentCount: 12 },
];

const mockRecentMessages = [
  { id: "1", client: "Ana Souza", template: "Confirmação de sessão", sentAt: "16/02 08:00", status: "delivered" as const },
  { id: "2", client: "Carlos Lima", template: "Confirmação de sessão", sentAt: "16/02 08:00", status: "read" as const },
  { id: "3", client: "Beatriz Costa", template: "Lembrete de pagamento", sentAt: "15/02 15:00", status: "delivered" as const },
  { id: "4", client: "Diego Martins", template: "Confirmação de sessão", sentAt: "15/02 14:00", status: "sent" as const },
];

const msgStatusConfig = {
  sent: { label: "Enviada", icon: Send, className: "text-muted-foreground" },
  delivered: { label: "Entregue", icon: CheckCheck, className: "text-secondary" },
  read: { label: "Lida", icon: CheckCheck, className: "text-accent" },
};

const MensagensTab = () => {
  const [tab, setTab] = useState<"templates" | "historico">("templates");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Mensagens este mês</p>
          <p className="text-2xl font-bold text-foreground">127</p>
          <p className="text-xs text-muted-foreground mt-1">de 500 disponíveis</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Taxa de entrega</p>
          <p className="text-2xl font-bold text-accent">98%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Templates ativos</p>
          <p className="text-2xl font-bold text-foreground">2</p>
        </div>
      </div>

      {/* Sub-tabs */}
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
          <div className="grid gap-4">
            {mockTemplates.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-border bg-card p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tpl.active ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {tpl.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tpl.trigger} · {tpl.offset} · {tpl.sentCount} envios
                  </p>
                </div>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "historico" && (
        <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_140px_100px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Cliente</span>
            <span>Template</span>
            <span>Enviado em</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-border">
            {mockRecentMessages.map((msg) => {
              const s = msgStatusConfig[msg.status];
              return (
                <div key={msg.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_100px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                      {msg.client[0]}
                    </div>
                    <span className="font-medium text-foreground">{msg.client}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{msg.template}</span>
                  <span className="text-sm text-muted-foreground">{msg.sentAt}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${s.className}`}>
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MensagensTab;
