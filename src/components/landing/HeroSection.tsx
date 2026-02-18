import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, CalendarDays, Users, CreditCard, MessageSquare, Settings, Bell, LayoutDashboard } from "lucide-react";

const benefits = [
  "Confirmação automática via WhatsApp",
  "Cobrança integrada",
  "Agenda inteligente",
];

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 gradient-hero overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              7 dias grátis — sem cartão de crédito
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Pare de perder dinheiro com{" "}
            <span className="text-gradient">faltas</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            O Agendix confirma, organiza e cobra automaticamente para você.
            A agenda inteligente que profissionais de saúde e serviços precisam.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Começar teste grátis por 7 dias
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {benefits.map((benefit) => (
              <span key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {benefit}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview — realistic UI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card shadow-elevated overflow-hidden pointer-events-none select-none">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/60 border-b border-border">
              <div className="h-3 w-3 rounded-full bg-destructive/70" />
              <div className="h-3 w-3 rounded-full bg-secondary/70" />
              <div className="h-3 w-3 rounded-full bg-accent/70" />
              <div className="ml-3 flex-1 h-5 rounded bg-background/60 text-[10px] text-muted-foreground flex items-center px-2">
                app.agendix.com.br/dashboard
              </div>
            </div>

            {/* Dashboard layout */}
            <div className="flex h-[420px] text-left overflow-hidden">

              {/* Sidebar */}
              <div className="w-44 shrink-0 bg-card border-r border-border flex flex-col py-3">
                {/* Logo */}
                <div className="flex items-center gap-2 px-4 mb-5">
                  <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Agendix</span>
                </div>

                {/* Nav items */}
                {[
                  { icon: LayoutDashboard, label: "Dashboard", active: true },
                  { icon: Users, label: "Clientes", active: false },
                  { icon: CalendarDays, label: "Agendamentos", active: false },
                  { icon: MessageSquare, label: "Mensagens", active: false },
                  { icon: CreditCard, label: "Pagamentos", active: false },
                  { icon: Settings, label: "Configurações", active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2.5 px-3 py-2 mx-2 rounded-md text-xs font-medium mb-0.5 ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 flex flex-col bg-background overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
                  <div>
                    <div className="text-xs font-bold text-foreground">Dashboard</div>
                    <div className="text-[10px] text-muted-foreground">Visão geral do seu dia</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                      <Bell className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                      A
                    </div>
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3 px-5 pt-4 shrink-0">
                  {[
                    { label: "Sessões hoje", value: "4", sub: "2 confirmadas", color: "text-primary" },
                    { label: "Pendentes", value: "2", sub: "Aguardando", color: "text-secondary" },
                    { label: "Pag. pendentes", value: "R$ 480", sub: "3 em aberto", color: "text-destructive" },
                    { label: "Templates", value: "5", sub: "Mensagens ativas", color: "text-accent" },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
                      <div className={`text-base font-bold ${color}`}>{value}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Sessions table */}
                <div className="px-5 pt-4 flex-1 overflow-hidden">
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border">
                      <span className="text-xs font-semibold text-foreground">Sessões de hoje</span>
                    </div>
                    {/* Table header */}
                    <div className="grid grid-cols-4 px-4 py-1.5 bg-muted/40 text-[9px] text-muted-foreground font-medium">
                      <span>Cliente</span>
                      <span>Horário</span>
                      <span>Tipo</span>
                      <span>Status</span>
                    </div>
                    {/* Rows */}
                    {[
                      { name: "ZE", initial: "Z", time: "12:00", type: "Consulta", status: "Agendado", statusColor: "bg-secondary/15 text-secondary" },
                      { name: "Susane Oliveira", initial: "S", time: "15:00", type: "Retorno", status: "Agendado", statusColor: "bg-secondary/15 text-secondary" },
                      { name: "Carlos Mendes", initial: "C", time: "17:30", type: "Consulta", status: "Confirmado", statusColor: "bg-accent/15 text-accent" },
                    ].map(({ name, initial, time, type, status, statusColor }) => (
                      <div key={name} className="grid grid-cols-4 px-4 py-2.5 border-b border-border/50 last:border-0 items-center">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {initial}
                          </div>
                          <span className="text-[10px] text-foreground truncate">{name}</span>
                        </div>
                        <span className="text-[10px] text-foreground">{time}</span>
                        <span className="text-[10px] text-muted-foreground">{type}</span>
                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
