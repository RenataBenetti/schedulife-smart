import { useState } from "react";
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
import { format, isToday } from "date-fns";
import ClientesTab from "@/components/dashboard/ClientesTab";
import AgendamentosTab from "@/components/dashboard/AgendamentosTab";
import PagamentosTab from "@/components/dashboard/PagamentosTab";
import MensagensTab from "@/components/dashboard/MensagensTab";
import ConfiguracoesTab from "@/components/dashboard/ConfiguracoesTab";

const statusMap: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmado", className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", className: "bg-secondary/10 text-secondary" },
  scheduled: { label: "Agendado", className: "bg-primary/10 text-primary" },
  canceled: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
  completed: { label: "Concluído", className: "bg-accent/10 text-accent" },
  no_show: { label: "Faltou", className: "bg-destructive/10 text-destructive" },
};

const tabs = [
  { icon: Calendar, label: "Dashboard", id: "dashboard", subtitle: "Visão geral do seu dia" },
  { icon: Users, label: "Clientes", id: "clientes", subtitle: "Gerencie seus clientes" },
  { icon: Clock, label: "Agendamentos", id: "agendamentos", subtitle: "Sua agenda completa" },
  { icon: CreditCard, label: "Pagamentos", id: "pagamentos", subtitle: "Cobranças e recebimentos" },
  { icon: MessageSquare, label: "Mensagens", id: "mensagens", subtitle: "Templates e histórico" },
  { icon: Settings, label: "Configurações", id: "configuracoes", subtitle: "Preferências do sistema" },
];

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];
  const userInitial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Agendix</span>
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

      <main className="flex-1 overflow-auto">
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{currentTab.label}</h1>
            <p className="text-sm text-muted-foreground">{currentTab.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {userInitial}
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === "dashboard" && <DashboardContent />}
          {activeTab === "clientes" && <ClientesTab />}
          {activeTab === "agendamentos" && <AgendamentosTab />}
          {activeTab === "pagamentos" && <PagamentosTab />}
          {activeTab === "mensagens" && <MensagensTab />}
          {activeTab === "configuracoes" && <ConfiguracoesTab />}
        </div>
      </main>
    </div>
  );
};

const DashboardContent = () => {
  const { data: workspace } = useWorkspace();
  const { data: appointments, isLoading: aptsLoading } = useAppointments(workspace?.id);
  const { data: clients } = useClients(workspace?.id);
  const { data: payments } = usePaymentLinks(workspace?.id);
  const { data: templates } = useMessageTemplates(workspace?.id);

  const todayAppointments = (appointments ?? []).filter((a) => isToday(new Date(a.starts_at)));
  const pendingCount = todayAppointments.filter((a) => a.status === "scheduled").length;
  const pendingPayments = (payments ?? []).filter((p) => !p.paid);
  const pendingPaymentTotal = pendingPayments.reduce((sum, p) => sum + p.amount_cents, 0);

  const formatCents = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Sessões hoje", value: String(todayAppointments.length), icon: Clock, change: `${clients?.length ?? 0} clientes` },
          { label: "Pendentes", value: String(pendingCount), icon: Bell, change: "aguardando confirmação" },
          { label: "Pagamentos pendentes", value: formatCents(pendingPaymentTotal), icon: CreditCard, change: `${pendingPayments.length} cobranças` },
          { label: "Templates", value: String((templates ?? []).length), icon: MessageSquare, change: "criados" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

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
              const clientName = (apt.clients as any)?.full_name ?? "—";
              const s = statusMap[apt.status] || statusMap.scheduled;
              return (
                <div key={apt.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-medium text-foreground w-14">
                      {format(new Date(apt.starts_at), "HH:mm")}
                    </span>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {clientName[0]}
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
    </div>
  );
};

export default Dashboard;
