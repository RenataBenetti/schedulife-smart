import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import { usePaymentLinks, useClients, useAddPaymentLink, useUpdatePaymentLink } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PagamentosTab = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [amount, setAmount] = useState("");
  const [externalLink, setExternalLink] = useState("");

  const { data: workspace } = useWorkspace();
  const { data: payments, isLoading } = usePaymentLinks(workspace?.id);
  const { data: clients } = useClients(workspace?.id);
  const addPayment = useAddPaymentLink();
  const updatePayment = useUpdatePaymentLink();
  const { toast } = useToast();

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

  const handleCreate = async () => {
    if (!workspace || !selectedClient || !amount) return;
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast({ variant: "destructive", title: "Valor inválido" });
      return;
    }
    try {
      await addPayment.mutateAsync({
        workspace_id: workspace.id,
        client_id: selectedClient,
        amount_cents: cents,
        external_link: externalLink || undefined,
      });
      toast({ title: "Cobrança criada!" });
      setDialogOpen(false);
      setSelectedClient("");
      setAmount("");
      setExternalLink("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleTogglePaid = async (paymentId: string, currentPaid: boolean) => {
    if (!workspace) return;
    try {
      await updatePayment.mutateAsync({ id: paymentId, workspace_id: workspace.id, paid: !currentPaid });
      toast({ title: !currentPaid ? "Marcado como pago!" : "Marcado como pendente." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" />
              Criar cobrança
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova cobrança</DialogTitle>
              <DialogDescription>Cole o link de pagamento do seu banco (Pix, cartão, boleto, etc.)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input placeholder="Ex: 150,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Link de pagamento (opcional)</Label>
                <Input placeholder="https://banco.com/pix/..." value={externalLink} onChange={(e) => setExternalLink(e.target.value)} />
                <p className="text-xs text-muted-foreground">Cole aqui o link de Pix, cartão ou boleto de qualquer banco.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="hero" onClick={handleCreate} disabled={addPayment.isPending || !selectedClient || !amount}>
                {addPayment.isPending ? "Criando..." : "Criar cobrança"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <button
                  onClick={() => handleTogglePaid(payment.id, isPaid)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit cursor-pointer transition-colors ${isPaid ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-secondary/10 text-secondary hover:bg-secondary/20"}`}
                >
                  {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                  {isPaid ? "Pago" : "Pendente"}
                </button>
                {payment.external_link ? (
                  <a href={payment.external_link} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <div className="h-8 w-8" />
                )}
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
