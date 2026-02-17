import { useState, useEffect } from "react";
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
  Info,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { usePaymentLinks, useClients, useAddPaymentLink, useUpdatePaymentLink, useDeletePaymentLink } from "@/hooks/use-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BILLING_MODEL_LABELS: Record<string, string> = {
  sessao_individual: "Sessão Individual",
  pacote_mensal: "Pacote Mensal",
  recorrente: "Plano Recorrente",
};

const BILLING_TIMING_LABELS: Record<string, string> = {
  antes_da_sessao: "antes da sessão",
  depois_da_sessao: "depois da sessão",
};

const formatCents = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const PagamentosTab = () => {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [amount, setAmount] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [description, setDescription] = useState("");
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExternalLink, setEditExternalLink] = useState("");
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const { data: workspace } = useWorkspace();
  const { data: payments, isLoading } = usePaymentLinks(workspace?.id);
  const { data: clients } = useClients(workspace?.id);
  const addPayment = useAddPaymentLink();
  const updatePayment = useUpdatePaymentLink();
  const deletePayment = useDeletePaymentLink();
  const { toast } = useToast();

  const selectedClientData = (clients ?? []).find((c) => c.id === selectedClient);

  // Auto-fill when patient is selected
  useEffect(() => {
    if (!selectedClientData) {
      return;
    }
    const model = selectedClientData.billing_model;
    const valueCents = selectedClientData.session_value_cents;

    if (valueCents) {
      setAmount((valueCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    } else {
      setAmount("");
    }

    const now = new Date();
    const monthYear = format(now, "MMMM/yyyy", { locale: ptBR });

    if (model === "sessao_individual") {
      setDescription(`Sessão de ${format(now, "dd/MM/yyyy")}`);
    } else if (model === "pacote_mensal") {
      setDescription(`Mensalidade - ${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}`);
    } else if (model === "recorrente") {
      setDescription(`Recorrência - ${monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}`);
    } else {
      setDescription("");
    }
  }, [selectedClient, selectedClientData]);

  const resetForm = () => {
    setSelectedClient("");
    setAmount("");
    setExternalLink("");
    setDescription("");
  };

  const filtered = (payments ?? []).filter((p) => {
    const clientName = (p.clients as any)?.full_name ?? "";
    const desc = (p as any).description ?? "";
    const q = search.toLowerCase();
    return clientName.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
  });

  const paidTotal = (payments ?? []).filter((p) => p.paid).reduce((sum, p) => sum + p.amount_cents, 0);
  const pendingTotal = (payments ?? []).filter((p) => !p.paid).reduce((sum, p) => sum + p.amount_cents, 0);
  const totalLinks = (payments ?? []).length;

  const handleCreate = async () => {
    if (!workspace || !selectedClient || !amount) return;
    const cents = Math.round(parseFloat(amount.replace(/\./g, "").replace(",", ".")) * 100);
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
        description: description || undefined,
      });
      toast({ title: "Cobrança criada!" });
      setDialogOpen(false);
      resetForm();
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

  const openEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setEditAmount((payment.amount_cents / 100).toFixed(2).replace(".", ","));
    setEditDescription(payment.description ?? "");
    setEditExternalLink(payment.external_link ?? "");
    setEditDialogOpen(true);
  };

  const handleEditPayment = async () => {
    if (!workspace || !editingPayment) return;
    const cents = Math.round(parseFloat(editAmount.replace(/\./g, "").replace(",", ".")) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast({ variant: "destructive", title: "Valor inválido" });
      return;
    }
    try {
      await updatePayment.mutateAsync({
        id: editingPayment.id,
        workspace_id: workspace.id,
        amount_cents: cents,
        description: editDescription || null,
        external_link: editExternalLink || null,
      });
      toast({ title: "Cobrança atualizada!" });
      setEditDialogOpen(false);
      setEditingPayment(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleDeletePayment = async () => {
    if (!workspace || !deletePaymentId) return;
    try {
      await deletePayment.mutateAsync({ id: deletePaymentId, workspace_id: workspace.id });
      toast({ title: "Cobrança excluída!" });
      setDeletePaymentId(null);
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
      {/* Summary cards */}
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

      {/* Search + Create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar pagamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" />
              Criar cobrança
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova cobrança</DialogTitle>
              <DialogDescription>Selecione o paciente para preencher automaticamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Patient select */}
              <div className="space-y-2">
                <Label>Paciente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Billing info badge */}
              {selectedClientData && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Info className="h-4 w-4 text-primary shrink-0" />
                    {BILLING_MODEL_LABELS[selectedClientData.billing_model ?? ""] ?? "Modelo não definido"}
                  </div>
                  {selectedClientData.billing_model === "sessao_individual" && selectedClientData.billing_timing && (
                    <p className="text-xs text-muted-foreground ml-6">
                      Cobrança {BILLING_TIMING_LABELS[selectedClientData.billing_timing] ?? selectedClientData.billing_timing}
                    </p>
                  )}
                  {selectedClientData.billing_model === "pacote_mensal" && selectedClientData.billing_day_of_month && (
                    <p className="text-xs text-muted-foreground ml-6">
                      Vencimento: dia {selectedClientData.billing_day_of_month} de cada mês
                    </p>
                  )}
                  {!selectedClientData.session_value_cents && (
                    <div className="flex items-center gap-1.5 text-xs text-secondary ml-6">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Este paciente não tem valor configurado
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input placeholder="Ex: 150,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição / Referência</Label>
                <Input placeholder="Ex: Sessão de 17/02, Mensalidade Fev..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              {/* External link */}
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

      {/* Payment list */}
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_120px_100px_100px_80px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Paciente</span>
          <span>Valor</span>
          <span>Data</span>
          <span>Status</span>
          <span>Ações</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((payment) => {
            const clientName = (payment.clients as any)?.full_name ?? "—";
            const isPaid = payment.paid;
            const desc = (payment as any).description;
            return (
              <div key={payment.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_100px_100px_80px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {clientName[0]}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-foreground block">{clientName}</span>
                    {desc && <span className="text-xs text-muted-foreground truncate block">{desc}</span>}
                  </div>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditPayment(payment)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletePaymentId(payment.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobrança</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link de pagamento</Label>
              <Input value={editExternalLink} onChange={(e) => setEditExternalLink(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="hero" onClick={handleEditPayment} disabled={updatePayment.isPending}>
              {updatePayment.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PagamentosTab;
