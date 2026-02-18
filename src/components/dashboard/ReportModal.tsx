import { useState, useRef } from "react";
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
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  Timer,
  Printer,
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

const titles: Record<ReportType, string> = {
  clients: "Relatório de Pacientes",
  appointments: "Relatório de Agendamentos",
  payments: "Relatório de Cobranças",
};

export function ReportModal({ type, data, open, onOpenChange }: ReportModalProps) {
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(today, "yyyy-MM-dd"));
  const printRef = useRef<HTMLDivElement>(null);

  const interval = {
    start: new Date(startDate + "T00:00:00"),
    end: new Date(endDate + "T23:59:59"),
  };

  const filtered = data.filter((item) => {
    const dateField = type === "appointments" ? item.starts_at : item.created_at;
    try {
      return isWithinInterval(parseISO(dateField), interval);
    } catch {
      return false;
    }
  });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${titles[type]}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #111; padding: 32px; }
            h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
            .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; }
            .card-value { font-size: 22px; font-weight: 700; }
            .card-label { font-size: 11px; color: #666; margin-top: 2px; }
            .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; margin-top: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #666; padding: 8px 10px; border-bottom: 2px solid #e2e8f0; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            tr:last-child td { border-bottom: none; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
            .badge-paid { background: #dcfce7; color: #16a34a; }
            .badge-pending { background: #fef3c7; color: #d97706; }
            .badge-scheduled { background: #dbeafe; color: #2563eb; }
            .badge-confirmed { background: #dcfce7; color: #16a34a; }
            .badge-completed { background: #dcfce7; color: #16a34a; }
            .badge-canceled { background: #fee2e2; color: #dc2626; }
            .badge-no_show { background: #fee2e2; color: #dc2626; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const renderContent = () => {
    if (type === "clients") {
      const billingCounts: Record<string, number> = {};
      filtered.forEach((c) => {
        const key = c.billing_model ?? "não definido";
        billingCounts[key] = (billingCounts[key] ?? 0) + 1;
      });

      return (
        <>
          <div className="cards grid grid-cols-2 gap-3">
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="card-label text-xs text-muted-foreground">Novos pacientes</p>
            </div>
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-2xl font-bold text-foreground">
                {filtered.filter((c) => c.session_value_cents).length}
              </p>
              <p className="card-label text-xs text-muted-foreground">Com valor configurado</p>
            </div>
          </div>

          {Object.keys(billingCounts).length > 0 && (
            <>
              <p className="section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Por modelo de cobrança</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Modelo</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(billingCounts).map(([key, count]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 text-foreground">{BILLING_MODEL_LABELS[key] ?? key}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {filtered.length > 0 && (
            <>
              <p className="section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Lista de pacientes</p>
              <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto print-no-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Nome</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Modelo</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Valor/sessão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 font-medium text-foreground">{c.full_name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{BILLING_MODEL_LABELS[c.billing_model ?? ""] ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-foreground">{c.session_value_cents ? formatCents(c.session_value_cents) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
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

      const sortedAppointments = [...filtered].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );

      return (
        <>
          <div className="cards grid grid-cols-2 gap-3">
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-2xl font-bold text-foreground">{filtered.length}</p>
              <p className="card-label text-xs text-muted-foreground">Total de sessões</p>
            </div>
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-2xl font-bold text-foreground">
                {totalHours > 0 ? `${totalHours}h${remMin > 0 ? ` ${remMin}m` : ""}` : `${totalMinutes}m`}
              </p>
              <p className="card-label text-xs text-muted-foreground">Tempo total</p>
            </div>
          </div>

          {Object.keys(byStatus).length > 0 && (
            <>
              <p className="section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Por status</p>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Qtd.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(byStatus).map(([key, count]) => (
                      <tr key={key}>
                        <td className="px-3 py-2 text-foreground">{statusLabels[key] ?? key}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {sortedAppointments.length > 0 && (
            <>
              <p className="section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Pacientes agendados</p>
              <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto print-no-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Paciente</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Data</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Hora</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedAppointments.map((a) => {
                      const clientName = (a.clients as any)?.full_name ?? "—";
                      const statusKey = a.status ?? "scheduled";
                      const badgeClass: Record<string, string> = {
                        scheduled: "bg-primary/10 text-primary",
                        confirmed: "bg-accent/10 text-accent",
                        completed: "bg-accent/10 text-accent",
                        canceled: "bg-destructive/10 text-destructive",
                        no_show: "bg-destructive/10 text-destructive",
                      };
                      return (
                        <tr key={a.id}>
                          <td className="px-3 py-2 font-medium text-foreground">{clientName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{format(new Date(a.starts_at), "dd/MM/yyyy")}</td>
                          <td className="px-3 py-2 text-muted-foreground font-mono">{format(new Date(a.starts_at), "HH:mm")}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full badge badge-${statusKey} ${badgeClass[statusKey] ?? "bg-muted text-muted-foreground"}`}>
                              {statusLabels[statusKey] ?? statusKey}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      );
    }

    if (type === "payments") {
      const paid = filtered.filter((p) => p.paid);
      const pending = filtered.filter((p) => !p.paid);
      const paidTotal = paid.reduce((s, p) => s + p.amount_cents, 0);
      const pendingTotal = pending.reduce((s, p) => s + p.amount_cents, 0);

      return (
        <>
          <div className="cards grid grid-cols-2 gap-3">
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-lg font-bold text-foreground">{formatCents(paidTotal)}</p>
              <p className="card-label text-xs text-muted-foreground">Recebido ({paid.length})</p>
            </div>
            <div className="card rounded-lg border border-border bg-card p-4 text-center">
              <p className="card-value text-lg font-bold text-foreground">{formatCents(pendingTotal)}</p>
              <p className="card-label text-xs text-muted-foreground">Pendente ({pending.length})</p>
            </div>
          </div>

          {filtered.length > 0 && (
            <>
              <p className="section-title text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">Cobranças do período</p>
              <div className="rounded-lg border border-border overflow-hidden max-h-48 overflow-y-auto print-no-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Paciente</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Valor</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((p) => {
                      const clientName = (p.clients as any)?.full_name ?? "—";
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-medium text-foreground">{clientName}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{(p as any).description ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCents(p.amount_cents)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full badge ${p.paid ? "badge-paid bg-accent/10 text-accent" : "badge-pending bg-secondary/10 text-secondary"}`}>
                              {p.paid ? "Pago" : "Pendente"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      );
    }

    return null;
  };

  // Content to print
  const printableContent = () => {
    const periodLabel = `${format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} até ${format(new Date(endDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`;
    return (
      <div ref={printRef}>
        <h1>{titles[type]}</h1>
        <p className="subtitle">Período: {periodLabel}</p>
        {filtered.length === 0
          ? <p>Nenhum registro encontrado neste período.</p>
          : renderContent()}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-primary" />
              {titles[type]}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={filtered.length === 0}
              className="mr-6"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
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
          <div className="space-y-1">
            {printableContent()}
          </div>
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
