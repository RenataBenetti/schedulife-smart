import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MoreHorizontal,
} from "lucide-react";

const mockClients = [
  { id: "1", name: "Ana Souza", email: "ana@email.com", phone: "(11) 98765-4321", sessions: 12, lastSession: "14/02/2026" },
  { id: "2", name: "Carlos Lima", email: "carlos@email.com", phone: "(11) 91234-5678", sessions: 8, lastSession: "13/02/2026" },
  { id: "3", name: "Beatriz Costa", email: "beatriz@email.com", phone: "(21) 99876-5432", sessions: 24, lastSession: "16/02/2026" },
  { id: "4", name: "Diego Martins", email: "diego@email.com", phone: "(31) 97654-3210", sessions: 3, lastSession: "10/02/2026" },
  { id: "5", name: "Fernanda Rocha", email: "fernanda@email.com", phone: "(41) 96543-2109", sessions: 16, lastSession: "15/02/2026" },
];

const ClientesTab = () => {
  const [search, setSearch] = useState("");

  const filtered = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="hero" size="sm">
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      {/* Client list */}
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_80px_100px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Email</span>
          <span>Telefone</span>
          <span>Sessões</span>
          <span>Última</span>
          <span></span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((client) => (
            <div
              key={client.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_80px_100px_40px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {client.name[0]}
                </div>
                <span className="font-medium text-foreground">{client.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
                {client.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
                {client.phone}
              </div>
              <span className="text-sm text-foreground">{client.sessions}</span>
              <span className="text-sm text-muted-foreground">{client.lastSession}</span>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default ClientesTab;
