import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  User,
  Building2,
  Bell,
  MessageSquare,
  CreditCard,
  Calendar,
  Shield,
} from "lucide-react";

const sections = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "consultorio", label: "Consultório", icon: Building2 },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "integracoes", label: "Integrações", icon: Calendar },
  { id: "plano", label: "Plano", icon: CreditCard },
];

const ConfiguracoesTab = () => {
  const [activeSection, setActiveSection] = useState("perfil");

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Settings sidebar */}
      <div className="lg:w-56 shrink-0">
        <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === section.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl">
        {activeSection === "perfil" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Perfil</h3>
              <p className="text-sm text-muted-foreground">Suas informações pessoais.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input placeholder="Seu nome" defaultValue="" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="seu@email.com" disabled />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" />
              </div>
              <Button variant="hero" size="sm">Salvar alterações</Button>
            </div>
          </div>
        )}

        {activeSection === "consultorio" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Consultório</h3>
              <p className="text-sm text-muted-foreground">Configurações do seu workspace.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="space-y-2">
                <Label>Nome do consultório</Label>
                <Input placeholder="Ex: Clínica Vida" />
              </div>
              <div className="space-y-2">
                <Label>Duração padrão da sessão</Label>
                <Input type="number" placeholder="50" defaultValue="50" />
              </div>
              <div className="space-y-2">
                <Label>Fuso horário</Label>
                <Input defaultValue="America/Sao_Paulo" disabled />
              </div>
              <Button variant="hero" size="sm">Salvar</Button>
            </div>
          </div>
        )}

        {activeSection === "notificacoes" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Notificações</h3>
              <p className="text-sm text-muted-foreground">Configure seus alertas.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-5">
              {[
                { label: "Email ao receber confirmação", desc: "Receba um email quando o cliente confirmar a sessão." },
                { label: "Alerta de pagamento pendente", desc: "Notificação quando um pagamento estiver pendente por mais de 3 dias." },
                { label: "Resumo diário", desc: "Receba um resumo das sessões do dia pela manhã." },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "integracoes" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Integrações</h3>
              <p className="text-sm text-muted-foreground">Conecte suas ferramentas externas.</p>
            </div>
            <div className="space-y-4">
              {[
                { name: "WhatsApp Cloud API", icon: MessageSquare, status: "Não conectado", connected: false },
                { name: "Google Calendar", icon: Calendar, status: "Não conectado", connected: false },
                { name: "Asaas (Pagamentos)", icon: CreditCard, status: "Não conectado", connected: false },
              ].map((integration) => (
                <div key={integration.name} className="rounded-xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <integration.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{integration.name}</p>
                      <p className={`text-xs ${integration.connected ? "text-accent" : "text-muted-foreground"}`}>{integration.status}</p>
                    </div>
                  </div>
                  <Button variant={integration.connected ? "outline" : "hero"} size="sm">
                    {integration.connected ? "Configurar" : "Conectar"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "plano" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Plano & Assinatura</h3>
              <p className="text-sm text-muted-foreground">Gerencie seu plano.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Plano Profissional</p>
                  <p className="text-sm text-muted-foreground">R$ 69/mês</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">Trial ativo</span>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Início do trial</span>
                  <span className="text-foreground">16/02/2026</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expira em</span>
                  <span className="text-foreground">23/02/2026</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mensagens restantes</span>
                  <span className="text-foreground">373 de 500</span>
                </div>
              </div>
              <Button variant="hero" size="sm" className="w-full">Assinar agora — R$ 69/mês</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfiguracoesTab;
