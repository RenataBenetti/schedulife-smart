import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileBarChart,
  Users,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  Timer,
} from "lucide-react";
import { format, startOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReportType = "clients" | "appointments" | "payments";

interface ReportModalProps {
  type: ReportType;
  data: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BILLING_MODEL_LABELS: Record<string, string> = {
  sessao_individual: "Sessão Individual",
  pacote_mensal: "Pacote Mensal",
  recorrente: "Plano Recorrente",
  plano_recorrente: "Plano Recorrente",
};

const formatCents = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const statusLabels: Record<string, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Faltou",
};

export function ReportModal({ type, data, open, onOpenChange }: ReportModalProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));

  const interval = {
    start: new Date(startDate + "T00:00:00"),
    end: new Date(endDate + "T23:59:59"),
  };

  const filtered = data.filter((item) => {
    const dateField =
      type === "appointments" ? item.starts_at : item.created_at;
    try {
      return isWithinInterval(parseISO(dateField), interval);
    } catch {
      return false;
    }
  });

  const titles: Record<ReportType, string> = {
    clients: "Relatório de Pacientes",
    appointments: "Relatório de Agendamentos",
    payments: "Relatório de Cobranças",
  };

  const renderContent = () => {
    if (type === "clients") {
      const billingCounts: Record<string, number> = {};
      filtered.forEach((c) => {
        const key = c.billing_model ?? "não definido";
        billingCounts[key] = (billingCounts[key] ?? 0) + 1;
      });

      return (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Novos pacientes</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <TrendingUp className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {filtered.filter((c) => c.session_value_cents).length}
              </p>
              <p className="text-xs text-muted-foreground">Com valor configurado</p>
            </div>
          </div>

          {/* By billing model */}
          {Object.keys(billingCounts).length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por modelo de cobrança</p>
              {Object.entries(billingCounts).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{BILLING_MODEL_LABELS[key] ?? key}</span>
                  <span className="font-semibold text-primary">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Patient list */}
          {filtered.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lista de pacientes</p>
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                      {c.full_name[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">{c.full_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.session_value_cents ? formatCents(c.session_value_cents) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (type === "appointments") {
      const byStatus: Record<string, number> = {};
      let totalMinutes = 0;
      filtered.forEach((a) => {
        const key = a.status ?? "scheduled";
        byStatus[key] = (byStatus[key] ?? 0) + 1;
        const min = Math.round(
          (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000
        );
        totalMinutes += min;
      });
      const totalHours = Math.floor(totalMinutes / 60);
      const remMin = totalMinutes % 60;

      const statusIcons: Record<string, any> = {
        confirmed: CheckCircle2,
        completed: CheckCircle2,
        scheduled: Calendar,
        canceled: XCircle,
        no_show: AlertCircle,
      };

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Calendar className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total de sessões</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Timer className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">
                {totalHours > 0 ? `${totalHours}h${remMin > 0 ? ` ${remMin}m` : ""}` : `${totalMinutes}m`}
              </p>
              <p className="text-xs text-muted-foreground">Tempo total</p>
            </div>
          </div>

          {Object.keys(byStatus).length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por status</p>
              {Object.entries(byStatus).map(([key, count]) => {
                const Icon = statusIcons[key] ?? Calendar;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {statusLabels[key] ?? key}
                    </span>
                    <span className="font-semibold text-primary">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (type === "payments") {
      const paid = filtered.filter((p) => p.paid);
      const pending = filtered.filter((p) => !p.paid);
      const paidTotal = paid.reduce((s, p) => s + p.amount_cents, 0);
      const pendingTotal = pending.reduce((s, p) => s + p.amount_cents, 0);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <CheckCircle2 className="h-5 w-5 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{formatCents(paidTotal)}</p>
              <p className="text-xs text-muted-foreground">Recebido ({paid.length})</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <Clock className="h-5 w-5 text-secondary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{formatCents(pendingTotal)}</p>
              <p className="text-xs text-muted-foreground">Pendente ({pending.length})</p>
            </div>
          </div>

          {filtered.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cobranças do período</p>
              {filtered.map((p) => {
                const clientName = (p.clients as any)?.full_name ?? "—";
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                        {clientName[0]}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">{clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-sm font-semibold text-foreground">{formatCents(p.amount_cents)}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${p.paid ? "bg-accent/10 text-accent" : "bg-secondary/10 text-secondary"}`}>
                        {p.paid ? "Pago" : "Pend."}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            {titles[type]}
          </DialogTitle>
        </DialogHeader>

        {/* Period selector */}
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <FileBarChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado neste período.</p>
          </div>
        ) : (
          renderContent()
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ReportButtonProps {
  type: ReportType;
  data: any[];
}

export function ReportButton({ type, data }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileBarChart className="h-4 w-4" />
        Relatório
      </Button>
      <ReportModal type={type} data={data} open={open} onOpenChange={setOpen} />
    </>
  );
}
