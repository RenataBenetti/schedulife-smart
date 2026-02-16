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
  Loader2,
} from "lucide-react";
import { usePaymentLinks } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import { format } from "date-fns";

const PagamentosTab = () => {
  const [search, setSearch] = useState("");
  const { data: workspace } = useWorkspace();
  const { data: payments, isLoading } = usePaymentLinks(workspace?.id);

  const filtered = (payments ?? []).filter((p) => {
    const clientName = (p.clients as any)?.full_name ?? "";
    return clientName.toLowerCase().includes(search.toLowerCase());
  });

  const paidTotal = (payments ?? []).filter((p) => p.paid).reduce((sum, p) => sum + p.amount_cents, 0);
  const pendingTotal = (payments ?? []).filter((p) => !p.paid).reduce((sum, p) => sum + p.amount_cents, 0);
  const totalLinks = (payments ?? []).length;

  const formatCents = (cents: number) => {
    return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

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
          <p className="text-sm text-muted-foreground mb-1">Total recebido</p>
          <p className="text-2xl font-bold text-foreground">{formatCents(paidTotal)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Pendente</p>
          <p className="text-2xl font-bold text-secondary">{formatCents(pendingTotal)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground mb-1">Links criados</p>
          <p className="text-2xl font-bold text-foreground">{totalLinks}</p>
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
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Cliente</span>
          <span>Valor</span>
          <span>Data</span>
          <span>Status</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((payment) => {
            const clientName = (payment.clients as any)?.full_name ?? "—";
            const isPaid = payment.paid;
            return (
              <div key={payment.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_40px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {clientName[0]}
                  </div>
                  <span className="font-medium text-foreground">{clientName}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{formatCents(payment.amount_cents)}</span>
                <span className="text-sm text-muted-foreground">{format(new Date(payment.created_at), "dd/MM/yyyy")}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${isPaid ? "bg-accent/10 text-accent" : "bg-secondary/10 text-secondary"}`}>
                  {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {isPaid ? "Pago" : "Pendente"}
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
          <p className="text-muted-foreground">
            {payments?.length === 0 ? "Nenhuma cobrança criada ainda." : "Nenhum pagamento encontrado."}
          </p>
        </div>
      )}
    </div>
  );
};

export default PagamentosTab;
