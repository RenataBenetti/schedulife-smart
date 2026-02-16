import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";

const mockAppointments = [
  { id: "1", client: "Ana Souza", date: "16/02/2026", time: "09:00", duration: "50min", status: "confirmed" as const, type: "Sessão individual" },
  { id: "2", client: "Carlos Lima", date: "16/02/2026", time: "10:30", duration: "50min", status: "pending" as const, type: "Primeira consulta" },
  { id: "3", client: "Beatriz Costa", date: "16/02/2026", time: "14:00", duration: "50min", status: "confirmed" as const, type: "Sessão individual" },
  { id: "4", client: "Diego Martins", date: "16/02/2026", time: "16:00", duration: "50min", status: "pending" as const, type: "Retorno" },
  { id: "5", client: "Fernanda Rocha", date: "17/02/2026", time: "09:00", duration: "50min", status: "scheduled" as const, type: "Sessão individual" },
  { id: "6", client: "Ana Souza", date: "17/02/2026", time: "11:00", duration: "50min", status: "scheduled" as const, type: "Sessão individual" },
  { id: "7", client: "Carlos Lima", date: "18/02/2026", time: "10:30", duration: "50min", status: "canceled" as const, type: "Sessão individual" },
];

const statusConfig = {
  confirmed: { label: "Confirmado", icon: CheckCircle2, className: "bg-accent/10 text-accent" },
  pending: { label: "Pendente", icon: AlertCircle, className: "bg-secondary/10 text-secondary" },
  scheduled: { label: "Agendado", icon: Calendar, className: "bg-primary/10 text-primary" },
  canceled: { label: "Cancelado", icon: XCircle, className: "bg-destructive/10 text-destructive" },
};

const AgendamentosTab = () => {
  const [search, setSearch] = useState("");

  const filtered = mockAppointments.filter((a) =>
    a.client.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar agendamento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4" />
          Novo agendamento
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_100px_80px_80px_1fr_120px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Cliente</span>
          <span>Data</span>
          <span>Hora</span>
          <span>Duração</span>
          <span>Tipo</span>
          <span>Status</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((apt) => {
            const s = statusConfig[apt.status];
            return (
              <div key={apt.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px_80px_1fr_120px_40px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {apt.client[0]}
                  </div>
                  <span className="font-medium text-foreground">{apt.client}</span>
                </div>
                <span className="text-sm text-foreground">{apt.date}</span>
                <span className="text-sm font-mono text-foreground">{apt.time}</span>
                <span className="text-sm text-muted-foreground">{apt.duration}</span>
                <span className="text-sm text-muted-foreground">{apt.type}</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${s.className}`}>
                  <s.icon className="h-3.5 w-3.5" />
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
          <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default AgendamentosTab;
