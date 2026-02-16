import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

const mockPayments = [
  { id: "1", client: "Ana Souza", amount: "R$ 200,00", date: "14/02/2026", status: "paid" as const, method: "PIX" },
  { id: "2", client: "Carlos Lima", amount: "R$ 180,00", date: "15/02/2026", status: "pending" as const, method: "Link" },
  { id: "3", client: "Beatriz Costa", amount: "R$ 200,00", date: "16/02/2026", status: "paid" as const, method: "PIX" },
  { id: "4", client: "Diego Martins", amount: "R$ 200,00", date: "16/02/2026", status: "pending" as const, method: "Link" },
  { id: "5", client: "Fernanda Rocha", amount: "R$ 200,00", date: "13/02/2026", status: "overdue" as const, method: "Link" },
];

const statusConfig = {
  paid: { label: "Pago", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", icon: Clock, className: "bg-secondary/10 text-secondary" },
  overdue: { label: "Atrasado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const PagamentosTab = () => {
  const [search, setSearch] = useState("");

  const filtered = mockPayments.filter((p) =>
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = mockPayments
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + parseFloat(p.amount.replace("R$ ", "").replace(".", "").replace(",", ".")), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Total recebido (mês)</p>
          <p className="text-2xl font-bold text-foreground">R$ 2.400,00</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Pendente</p>
          <p className="text-2xl font-bold text-secondary">R$ {totalPending.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Links enviados</p>
          <p className="text-2xl font-bold text-foreground">18</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar pagamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4" />
          Criar cobrança
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_100px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Cliente</span>
          <span>Valor</span>
          <span>Data</span>
          <span>Método</span>
          <span>Status</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((payment) => {
            const s = statusConfig[payment.status];
            return (
              <div key={payment.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_100px_40px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {payment.client[0]}
                  </div>
                  <span className="font-medium text-foreground">{payment.client}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{payment.amount}</span>
                <span className="text-sm text-muted-foreground">{payment.date}</span>
                <span className="text-sm text-muted-foreground">{payment.method}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${s.className}`}>
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </span>
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum pagamento encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default PagamentosTab;
