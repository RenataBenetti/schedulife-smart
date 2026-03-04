import { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Clock,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAppointments, useClients, usePaymentLinks, useMessageTemplates } from "@/hooks/use-data";
import { addDays, addHours, addMinutes, format, isToday } from "date-fns";
import ClientesTab from "@/components/dashboard/ClientesTab";
import AgendamentosTab from "@/components/dashboard/AgendamentosTab";
import PagamentosTab from "@/components/dashboard/PagamentosTab";
import MensagensTab from "@/components/dashboard/MensagensTab";
import ConfiguracoesTab from "@/components/dashboard/ConfiguracoesTab";
import type { Database } from "@/integrations/supabase/types";

const statusMap: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", className: "bg-secondary/10 text-secondary" },
  scheduled: { label: "Agendado", className: "bg-primary/10 text-primary" },
  canceled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
  completed: { label: "Concluído", className: "bg-accent/10 text-accent" },
  no_show: { label: "Faltou", className: "bg-destructive/10 text-destructive" },
};

type AppointmentWithClient = Database["public"]["Tables"]["appointments"]["Row"] & {
  clients?: { full_name?: string | null } | null;
};

type PaymentLinkWithClient = Database["public"]["Tables"]["payment_links"]["Row"] & {
  clients?: { full_name?: string | null } | null;
};

type MessageRule = Database["public"]["Tables"]["message_rules"]["Row"];

type MessageTemplateWithRules = Database["public"]["Tables"]["message_templates"]["Row"] & {
  message_rules?: MessageRule[] | null;
};

const DEFAULT_OFFSET_UNIT: MessageRule["offset_unit"] = "horas";

const tabs = [
  { icon: Calendar, label: "Dashboard", id: "dashboard", subtitle: "Visão geral do seu dia" },
  { icon: Users, label: "Clientes", id: "clientes", subtitle: "Gerencie seus clientes" },
  { icon: Clock, label: "Agendamentos", id: "agendamentos", subtitle: "Sua agenda completa" },
  { icon: MessageSquare, label: "Mensagens", id: "mensagens", subtitle: "Automação de disparos" },
  { icon: CreditCard, label: "Pagamentos", id: "pagamentos", subtitle: "Cobranças e recebimentos" },
  { icon: Settings, label: "Configurações", id: "configuracoes", subtitle: "Preferências do sistema" },
];

// Helper: convert hex color to "H S% L%" for CSS HSL vars
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Mobile bottom nav tabs (without "Dashboard" – shown as Home icon)
const mobileTabs = [
  { icon: Calendar, label: "Início", id: "dashboard" },
  { icon: Users, label: "Clientes", id: "clientes" },
  { icon: Clock, label: "Agenda", id: "agendamentos" },
  { icon: MessageSquare, label: "Mensagens", id: "mensagens" },
  { icon: CreditCard, label: "Pagamentos", id: "pagamentos" },
  { icon: Settings, label: "Config.", id: "configuracoes" },
];

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data: workspace } = useWorkspace();

  // Apply workspace brand colors as CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const primary = workspace?.primary_color;
    const secondary = workspace?.secondary_color;
    if (primary && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
      root.style.setProperty("--primary", hexToHsl(primary));
    }
    if (secondary && /^#[0-9A-Fa-f]{6}$/.test(secondary)) {
      root.style.setProperty("--secondary", hexToHsl(secondary));
    }
  }, [workspace?.primary_color, workspace?.secondary_color]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card shrink-0">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            {workspace?.logo_url ? (
              <img src={workspace.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Calendar className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-foreground">{workspace?.name || "Agendix"}</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col min-h-screen">
        {/* Top header */}
        <div className="border-b border-border bg-card px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
          {/* Mobile: show logo on left */}
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              {workspace?.logo_url ? (
                <img src={workspace.logo_url} alt="Logo" className="h-7 w-7 rounded-lg object-contain" />
              ) : (
                <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center">
                  <Calendar className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-foreground leading-tight">{currentTab.label}</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{currentTab.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="h-8 w-8 md:h-9 md:w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {userInitial}
            </div>
            {/* Mobile sign out button */}
            <button
              onClick={handleSignOut}
              className="md:hidden h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tab content - with bottom padding on mobile for bottom nav */}
        <div className="flex-1 p-3 md:p-6 pb-24 md:pb-6">
          {activeTab === "dashboard" && <DashboardContent />}
          {activeTab === "clientes" && <ClientesTab />}
          {activeTab === "agendamentos" && <AgendamentosTab />}
          {activeTab === "pagamentos" && <PagamentosTab />}
          {activeTab === "mensagens" && <MensagensTab />}
          {activeTab === "configuracoes" && <ConfiguracoesTab />}
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-stretch">
          {mobileTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors min-h-[56px] ${
                activeTab === item.id
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${activeTab === item.id ? "text-primary" : "text-muted-foreground"}`} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

const DashboardContent = () => {
  const { data: workspace } = useWorkspace();
  const { data: appointments, isLoading: aptsLoading } = useAppointments(workspace?.id);
  const { data: clients } = useClients(workspace?.id);
  const { data: payments, isLoading: paymentsLoading } = usePaymentLinks(workspace?.id);
  const { data: templates, isLoading: templatesLoading } = useMessageTemplates(workspace?.id);

  const typedAppointments = (appointments ?? []) as AppointmentWithClient[];
  const typedPayments = (payments ?? []) as PaymentLinkWithClient[];
  const typedTemplates = (templates ?? []) as MessageTemplateWithRules[];

  const todayAppointments = typedAppointments.filter((a) => isToday(new Date(a.starts_at)));
  const pendingCount = todayAppointments.filter((a) => a.status === "scheduled").length;
  const pendingPayments = typedPayments.filter((p) => !p.paid);
  const paymentDateFromDescription = (description?: string | null) => {
    const match = description?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    if (parsed.getDate() !== day || parsed.getMonth() !== month - 1 || parsed.getFullYear() !== year) {
      return null;
    }
    return parsed;
  };
  const paymentDueDate = (payment: PaymentLinkWithClient) =>
    paymentDateFromDescription(payment.description) ?? new Date(payment.created_at);
  const paymentsDueToday = pendingPayments.filter((p) => isToday(paymentDueDate(p)));
  const paymentsDueTotal = paymentsDueToday.reduce((sum, p) => sum + p.amount_cents, 0);

  const getClientInitial = (name?: string | null) => {
    const trimmed = name?.trim() ?? "";
    if (!trimmed) return "?";
    return trimmed.charAt(0);
  };

  const validOffsetUnits = new Set<MessageRule["offset_unit"]>(["minutos", "horas", "dias"]);
  const normalizeOffsetUnit = (offsetUnit?: MessageRule["offset_unit"] | null) =>
    offsetUnit && validOffsetUnits.has(offsetUnit) ? offsetUnit : DEFAULT_OFFSET_UNIT;

  const applyOffset = (
    baseDate: Date,
    offsetValue: number,
    offsetUnit: MessageRule["offset_unit"] | null | undefined,
    offsetDirection: 1 | -1
  ) => {
    const value = offsetValue * offsetDirection;
    const safeUnit = normalizeOffsetUnit(offsetUnit);
    switch (safeUnit) {
      case "minutos":
        return addMinutes(baseDate, value);
      case "horas":
        return addHours(baseDate, value);
      case "dias":
        return addDays(baseDate, value);
      default:
        return baseDate;
    }
  };

  const scheduledMessagesToday = typedAppointments
    .filter((apt) => apt.status !== "canceled")
    .flatMap((apt) => {
      const clientName = apt.clients?.full_name ?? "—";
      return typedTemplates.flatMap((tpl) => {
        const rules = tpl.message_rules ?? [];
        return rules
          .filter((rule) => rule.active && rule.trigger !== "manual")
          .flatMap((rule) => {
            const baseDate =
              rule.trigger === "apos_sessao"
                ? new Date(apt.ends_at ?? apt.starts_at)
                : new Date(apt.starts_at);
            const offsetDirection = rule.trigger === "antes_da_sessao" ? -1 : 1;
            const scheduledAt = applyOffset(baseDate, rule.offset_value ?? 0, rule.offset_unit, offsetDirection);
            if (!isToday(scheduledAt)) return [];
            return [
              {
                id: `${apt.id}-${tpl.id}-${rule.id}`,
                scheduledAt,
                templateName: tpl.name,
                clientName,
              },
            ];
          });
      });
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const formatCents = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Sessões hoje", value: String(todayAppointments.length), icon: Clock, subtitle: `${clients?.length ?? 0} clientes` },
          { label: "Pendentes", value: String(pendingCount), icon: Bell, subtitle: "aguardando confirmação" },
          { label: "Pagamentos hoje", value: formatCents(paymentsDueTotal), icon: CreditCard, subtitle: `${paymentsDueToday.length} cobranças` },
          { label: "Mensagens hoje", value: String(scheduledMessagesToday.length), icon: MessageSquare, subtitle: "programadas" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Sessões de hoje</h2>
            <Button variant="ghost" size="sm">
              Ver todas
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {aptsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma sessão agendada para hoje.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {todayAppointments.map((apt) => {
                const clientName = apt.clients?.full_name ?? "—";
                const clientInitial = getClientInitial(clientName);
                const s = statusMap[apt.status] || statusMap.scheduled;
                return (
                  <div key={apt.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-medium text-foreground w-14">
                        {format(new Date(apt.starts_at), "HH:mm")}
                      </span>
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {clientInitial}
                      </div>
                      <span className="font-medium text-foreground">{clientName}</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Pagamentos a receber hoje</h2>
          </div>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : paymentsDueToday.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma cobrança pendente para hoje.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paymentsDueToday.map((payment) => {
                const clientName = payment.clients?.full_name ?? "—";
                const clientInitial = getClientInitial(clientName);
                return (
                  <div key={payment.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-12">Hoje</span>
                      <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-xs">
                        {clientInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{clientName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {payment.description ?? "Cobrança pendente"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-secondary">{formatCents(payment.amount_cents)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card shadow-soft">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Mensagens programadas hoje</h2>
          </div>
          {aptsLoading || templatesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : scheduledMessagesToday.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhuma mensagem programada para hoje.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {scheduledMessagesToday.map((msg) => (
                <div key={msg.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-12">
                      {format(msg.scheduledAt, "HH:mm")}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{msg.templateName}</p>
                      <p className="text-xs text-muted-foreground truncate">{msg.clientName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Programado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
