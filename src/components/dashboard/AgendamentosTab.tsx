import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  CalendarDays,
  Timer,
  Pencil,
  Trash2,
} from "lucide-react";
import { ReportButton } from "@/components/dashboard/ReportModal";
import { useAppointments, useClients } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format, addWeeks } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  confirmed: { label: "Confirmado", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", icon: AlertCircle, className: "bg-secondary/10 text-secondary" },
  scheduled: { label: "Agendado", icon: Calendar, className: "bg-primary/10 text-primary" },
  canceled: { label: "Cancelado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  completed: { label: "Concluído", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  no_show: { label: "Faltou", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const AgendamentosTab = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("50");
  const [recurring, setRecurring] = useState(false);
  const [weeks, setWeeks] = useState("4");
  const [saving, setSaving] = useState(false);
  const [detailApt, setDetailApt] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit state
  const [editApt, setEditApt] = useState<any>(null);
  const [editClientId, setEditClientId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("50");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteApt, setDeleteApt] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: workspace } = useWorkspace();
  const { data: appointments, isLoading } = useAppointments(workspace?.id);
  const { data: clients } = useClients(workspace?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = (appointments ?? []).filter((a) => {
    const clientName = (a.clients as any)?.full_name ?? "";
    return clientName.toLowerCase().includes(search.toLowerCase());
  });

  const handleAdd = async () => {
    if (!workspace || !clientId || !date || !time) return;
    setSaving(true);

    try {
      const durationMin = parseInt(duration) || 50;
      const totalWeeks = recurring ? Math.max(1, parseInt(weeks) || 1) : 1;

      const rows = Array.from({ length: totalWeeks }, (_, i) => {
        const baseDate = addWeeks(new Date(`${date}T${time}`), i);
        const startsAt = baseDate.toISOString();
        const endsAt = new Date(baseDate.getTime() + durationMin * 60000).toISOString();
        return {
          workspace_id: workspace.id,
          client_id: clientId,
          starts_at: startsAt,
          ends_at: endsAt,
        };
      });

      const { error } = await supabase.from("appointments").insert(rows);
      if (error) throw error;

      const client = (clients ?? []).find((c) => c.id === clientId);
      let chargesCreated = 0;
      const isSessionBilling = client?.billing_model === "sessao_individual";
      const hasSessionValue = (client?.session_value_cents ?? 0) > 0;
      if (isSessionBilling && !hasSessionValue) {
        toast({
          variant: "destructive",
          title: "Valor da sessão não configurado",
          description: `O cliente "${client?.full_name}" está como Sessão Individual, mas não tem valor de sessão definido. Configure o valor no cadastro do cliente para gerar cobranças automaticamente.`,
        });
      }
      if (isSessionBilling && hasSessionValue) {
        const paymentRows = rows.map((r) => ({
          workspace_id: workspace.id,
          client_id: clientId,
          amount_cents: client.session_value_cents!,
          description: `Sessão de ${format(new Date(r.starts_at), "dd/MM/yyyy")}`,
        }));
        const { error: payErr } = await supabase.from("payment_links").insert(paymentRows);
        if (payErr) console.error("Erro ao criar cobranças:", payErr);
        else chargesCreated = paymentRows.length;
        queryClient.invalidateQueries({ queryKey: ["payment_links", workspace.id] });
      }

      // Sync to Google Calendar (fire-and-forget, doesn't block UX)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const syncPromises = rows.map((r) =>
          supabase.functions.invoke("sync-to-google-calendar", {
            body: {
              workspace_id: workspace.id,
              client_name: client?.full_name ?? "Cliente",
              starts_at: r.starts_at,
              ends_at: r.ends_at,
            },
          })
        );
        const syncResults = await Promise.allSettled(syncPromises);
        const failedResult = syncResults.find(
          (r) => r.status === "rejected" || (r.status === "fulfilled" && r.value.error)
        );
        if (failedResult) {
          const errMsg = failedResult.status === "fulfilled" ? failedResult.value.error?.message || "" : "";
          const isNotConnected = errMsg.includes("not connected") || errMsg.includes("404");
          console.warn("Alguns agendamentos não foram sincronizados com Google Calendar", errMsg);
          toast({
            variant: "destructive",
            title: "Google Calendar não sincronizado",
            description: isNotConnected
              ? "Google Calendar não está conectado. Reconecte em Configurações → Integrações."
              : "Não foi possível sincronizar com o Google Calendar. Verifique a conexão nas Configurações.",
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["appointments", workspace.id] });
      const base = totalWeeks > 1 ? `${totalWeeks} agendamentos criados!` : "Agendamento criado!";
      toast({
        title: base,
        description: chargesCreated > 0 ? `${chargesCreated} cobrança(s) gerada(s) automaticamente.` : undefined,
      });
      setClientId(""); setDate(""); setTime(""); setDuration("50");
      setRecurring(false); setWeeks("4");
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (apt: any) => {
    const durationMin = Math.round(
      (new Date(apt.ends_at).getTime() - new Date(apt.starts_at).getTime()) / 60000
    );
    setEditApt(apt);
    setEditClientId(apt.client_id);
    setEditDate(format(new Date(apt.starts_at), "yyyy-MM-dd"));
    setEditTime(format(new Date(apt.starts_at), "HH:mm"));
    setEditDuration(String(durationMin));
  };

  const handleEdit = async () => {
    if (!editApt || !editClientId || !editDate || !editTime) return;
    setEditSaving(true);
    try {
      const durationMin = parseInt(editDuration) || 50;
      const startsAt = new Date(`${editDate}T${editTime}`).toISOString();
      const endsAt = new Date(new Date(`${editDate}T${editTime}`).getTime() + durationMin * 60000).toISOString();

      const { error } = await supabase
        .from("appointments")
        .update({ client_id: editClientId, starts_at: startsAt, ends_at: endsAt })
        .eq("id", editApt.id);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["appointments", workspace?.id] });
      toast({ title: "Agendamento atualizado!" });
      setEditApt(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteApt) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", deleteApt.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["appointments", workspace?.id] });
      toast({ title: "Agendamento excluído!" });
      setDeleteApt(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setDeleting(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar agendamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <ReportButton type="appointments" data={appointments ?? []} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="h-4 w-4" />
                Novo agendamento
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo agendamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tempo da sessão (minutos)</Label>
                <Input type="number" min="10" max="240" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="50" />
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Checkbox id="recurring" checked={recurring} onCheckedChange={(checked) => setRecurring(checked === true)} />
                  <Label htmlFor="recurring" className="cursor-pointer text-sm font-medium">
                    Gerar recorrência semanal (mesmo dia/hora)
                  </Label>
                </div>
                {recurring && (
                  <div className="space-y-2 pl-7">
                    <Label className="text-xs text-muted-foreground">Quantas semanas?</Label>
                    <Input type="number" min="2" max="52" value={weeks} onChange={(e) => setWeeks(e.target.value)} className="w-24" />
                  </div>
                )}
              </div>
              <Button variant="hero" onClick={handleAdd} disabled={!clientId || !date || !time || saving} className="w-full">
                {saving ? "Salvando..." : recurring ? `Criar ${Math.max(1, parseInt(weeks) || 1)} agendamentos` : "Criar agendamento"}
              </Button>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px_120px_96px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Cliente</span>
          <span>Data</span>
          <span>Hora</span>
          <span>Duração</span>
          <span>Status</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((apt) => {
            const clientName = (apt.clients as any)?.full_name ?? "—";
            const s = statusConfig[apt.status] || statusConfig.scheduled;
            const StatusIcon = s.icon;
            const durationMin = Math.round((new Date(apt.ends_at).getTime() - new Date(apt.starts_at).getTime()) / 60000);
            return (
              <div key={apt.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px_80px_120px_96px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {clientName[0]}
                  </div>
                  <span className="font-medium text-foreground">{clientName}</span>
                </div>
                <span className="text-sm text-foreground">{format(new Date(apt.starts_at), "dd/MM/yyyy")}</span>
                <span className="text-sm font-mono text-foreground">{format(new Date(apt.starts_at), "HH:mm")}</span>
                <span className="text-sm text-muted-foreground">{durationMin} min</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${s.className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {s.label}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDetailApt(apt)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                    title="Ver detalhes"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(apt)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteApt(apt)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-destructive"
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
          <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {appointments?.length === 0 ? "Nenhum agendamento criado ainda." : "Nenhum agendamento encontrado."}
          </p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailApt} onOpenChange={(open) => !open && setDetailApt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do agendamento</DialogTitle>
          </DialogHeader>
          {detailApt && (() => {
            const clientName = (detailApt.clients as any)?.full_name ?? "—";
            const s = statusConfig[detailApt.status] || statusConfig.scheduled;
            const StatusIcon = s.icon;
            const durationMin = Math.round((new Date(detailApt.ends_at).getTime() - new Date(detailApt.starts_at).getTime()) / 60000);

            const handleStatusChange = async (newStatus: string) => {
              setUpdatingStatus(true);
              try {
                const { error } = await supabase
                  .from("appointments")
                  .update({ status: newStatus as any })
                  .eq("id", detailApt.id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ["appointments", workspace?.id] });
                setDetailApt({ ...detailApt, status: newStatus });
                toast({ title: "Status atualizado!" });
              } catch (e: any) {
                toast({ variant: "destructive", title: "Erro", description: e.message });
              } finally {
                setUpdatingStatus(false);
              }
            };

            return (
              <div className="space-y-5 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {clientName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{clientName}</p>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {s.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 rounded-lg border border-border p-4">
                  <div className="flex flex-col items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Data</span>
                    <span className="text-sm font-medium text-foreground">{format(new Date(detailApt.starts_at), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Horário</span>
                    <span className="text-sm font-medium text-foreground">{format(new Date(detailApt.starts_at), "HH:mm")} - {format(new Date(detailApt.ends_at), "HH:mm")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Duração</span>
                    <span className="text-sm font-medium text-foreground">{durationMin} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Alterar status</Label>
                  <Select value={detailApt.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <val.icon className="h-3.5 w-3.5" />
                            {val.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {detailApt.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Observações</Label>
                    <p className="text-sm text-foreground">{detailApt.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editApt} onOpenChange={(open) => !open && setEditApt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={editClientId} onValueChange={setEditClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tempo da sessão (minutos)</Label>
              <Input type="number" min="10" max="240" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="50" />
            </div>
            <Button variant="hero" onClick={handleEdit} disabled={!editClientId || !editDate || !editTime || editSaving} className="w-full">
              {editSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteApt} onOpenChange={(open) => !open && setDeleteApt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteApt && `Sessão de ${(deleteApt.clients as any)?.full_name ?? "—"} em ${format(new Date(deleteApt.starts_at), "dd/MM/yyyy")} às ${format(new Date(deleteApt.starts_at), "HH:mm")} será excluída permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Excluindo...</> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendamentosTab;
