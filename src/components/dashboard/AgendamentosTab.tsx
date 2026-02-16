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
} from "lucide-react";
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

      queryClient.invalidateQueries({ queryKey: ["appointments", workspace.id] });
      toast({ title: totalWeeks > 1 ? `${totalWeeks} agendamentos criados!` : "Agendamento criado!" });
      setClientId(""); setDate(""); setTime(""); setDuration("50");
      setRecurring(false); setWeeks("4");
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setSaving(false);
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
                <Input
                  type="number"
                  min="10"
                  max="240"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="recurring"
                    checked={recurring}
                    onCheckedChange={(checked) => setRecurring(checked === true)}
                  />
                  <Label htmlFor="recurring" className="cursor-pointer text-sm font-medium">
                    Gerar recorrência semanal (mesmo dia/hora)
                  </Label>
                </div>
                {recurring && (
                  <div className="space-y-2 pl-7">
                    <Label className="text-xs text-muted-foreground">Quantas semanas?</Label>
                    <Input
                      type="number"
                      min="2"
                      max="52"
                      value={weeks}
                      onChange={(e) => setWeeks(e.target.value)}
                      className="w-24"
                    />
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

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px_120px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              <div key={apt.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px_80px_120px_40px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
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
                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <Eye className="h-4 w-4" />
                </button>
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
    </div>
  );
};

export default AgendamentosTab;
