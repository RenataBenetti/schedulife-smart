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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const todaySessions = [
  { time: "09:00", client: "Ana Souza", status: "confirmed" as const },
  { time: "10:30", client: "Carlos Lima", status: "pending" as const },
  { time: "14:00", client: "Beatriz Costa", status: "confirmed" as const },
  { time: "16:00", client: "Diego Martins", status: "pending" as const },
];

const statusMap = {
  confirmed: { label: "Confirmado", className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", className: "bg-secondary/10 text-secondary" },
};

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
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
          {[
            { icon: Calendar, label: "Dashboard", id: "dashboard" },
            { icon: Users, label: "Clientes", id: "clientes" },
            { icon: Clock, label: "Agendamentos", id: "agendamentos" },
            { icon: CreditCard, label: "Pagamentos", id: "pagamentos" },
            { icon: MessageSquare, label: "Mensagens", id: "mensagens" },
            { icon: Settings, label: "Configurações", id: "configuracoes" },
          ].map((item) => (
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
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do seu dia</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
              <Bell className="h-4 w-4" />
            </button>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              A
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Sessões hoje", value: "4", icon: Clock, change: "+2 vs ontem" },
              { label: "Pendentes", value: "2", icon: Bell, change: "aguardando confirmação" },
              { label: "Pagamentos pendentes", value: "R$ 580", icon: CreditCard, change: "3 cobranças" },
              { label: "Mensagens no mês", value: "127", icon: MessageSquare, change: "de 500" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
            ))}
          </div>

          {/* Today's sessions */}
          <div className="rounded-xl border border-border bg-card shadow-soft">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Sessões de hoje</h2>
              <Button variant="ghost" size="sm">
                Ver todas
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {todaySessions.map((session) => (
                <div
                  key={session.time + session.client}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono font-medium text-foreground w-14">
                      {session.time}
                    </span>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {session.client[0]}
                    </div>
                    <span className="font-medium text-foreground">{session.client}</span>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusMap[session.status].className}`}
                  >
                    {statusMap[session.status].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
