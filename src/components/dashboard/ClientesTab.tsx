import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Loader2,
  Pencil,
  Trash2,
  FileText,
  ChevronLeft,
  CalendarDays,
} from "lucide-react";
import { useClients, useAddClient, useUpdateClient, useDeleteClient, useSessions, useAddSession, useUpdateSession } from "@/hooks/use-data";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "list" | "detail";

const ClientesTab = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const { data: workspace } = useWorkspace();
  const { data: clients, isLoading } = useClients(workspace?.id);
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const { toast } = useToast();

  const filtered = (clients ?? []).filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!workspace || !name.trim()) return;
    try {
      await addClient.mutateAsync({
        workspace_id: workspace.id,
        full_name: name.trim(),
        email: email || undefined,
        phone: phone || undefined,
      });
      toast({ title: "Cliente adicionado!" });
      setName(""); setEmail(""); setPhone("");
      setOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleEdit = async () => {
    if (!workspace || !selectedClient || !name.trim()) return;
    try {
      await updateClient.mutateAsync({
        id: selectedClient.id,
        workspace_id: workspace.id,
        full_name: name.trim(),
        email: email || null,
        phone: phone || null,
      });
      toast({ title: "Cliente atualizado!" });
      setEditOpen(false);
      setSelectedClient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!workspace || !selectedClient) return;
    try {
      await deleteClient.mutateAsync({ id: selectedClient.id, workspace_id: workspace.id });
      toast({ title: "Cliente excluído!" });
      setDeleteOpen(false);
      setSelectedClient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const openEdit = (client: any) => {
    setSelectedClient(client);
    setName(client.full_name);
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setEditOpen(true);
  };

  const openDetail = (client: any) => {
    setSelectedClient(client);
    setViewMode("detail");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (viewMode === "detail" && selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        workspaceId={workspace?.id}
        onBack={() => { setViewMode("list"); setSelectedClient(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input placeholder="Ex: Maria Silva" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="maria@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button variant="hero" onClick={handleAdd} disabled={!name.trim() || addClient.isPending} className="w-full">
                {addClient.isPending ? "Salvando..." : "Adicionar cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Email</span>
          <span>Telefone</span>
          <span>Ações</span>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((client) => (
            <div key={client.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_80px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(client)}>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {client.full_name[0]}
                </div>
                <span className="font-medium text-foreground hover:text-primary transition-colors">{client.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
                {client.email || "—"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 hidden sm:block" />
                {client.phone || "—"}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openDetail(client)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                  title="Ver sessões"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEdit(client)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setSelectedClient(client); setDeleteOpen(true); }}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {clients?.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button variant="hero" onClick={handleEdit} disabled={!name.trim() || updateClient.isPending} className="w-full">
              {updateClient.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selectedClient?.full_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteClient.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ── Client Detail with Session Notes ──

interface ClientDetailProps {
  client: any;
  workspaceId: string | undefined;
  onBack: () => void;
}

const ClientDetail = ({ client, workspaceId, onBack }: ClientDetailProps) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: sessions, isLoading } = useSessions(client.id, workspaceId);
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const { toast } = useToast();

  const filteredSessions = (sessions ?? []).filter((s) => {
    if (!dateFilter) return true;
    return format(new Date(s.created_at), "yyyy-MM-dd") === dateFilter;
  });

  const handleAddNote = async () => {
    if (!workspaceId || !sessionNotes.trim()) return;
    try {
      await addSession.mutateAsync({
        workspace_id: workspaceId,
        client_id: client.id,
        session_notes: sessionNotes.trim(),
      });
      toast({ title: "Observação adicionada!" });
      setSessionNotes("");
      setNoteOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleUpdateNote = async () => {
    if (!editingSession || !workspaceId) return;
    try {
      await updateSession.mutateAsync({
        id: editingSession.id,
        session_notes: sessionNotes.trim(),
        client_id: client.id,
        workspace_id: workspaceId,
      });
      toast({ title: "Observação atualizada!" });
      setSessionNotes("");
      setEditingSession(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {client.full_name[0]}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{client.full_name}</h2>
            <p className="text-sm text-muted-foreground">{client.email || client.phone || "Sem contato"}</p>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-44"
            placeholder="Filtrar por data"
          />
          {dateFilter && (
            <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
              Limpar
            </Button>
          )}
        </div>
        <Button variant="hero" size="sm" onClick={() => { setSessionNotes(""); setEditingSession(null); setNoteOpen(true); }}>
          <Plus className="h-4 w-4" />
          Nova observação
        </Button>
      </div>

      {/* Session notes list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {sessions?.length === 0 ? "Nenhuma observação registrada ainda." : "Nenhuma observação nesta data."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div key={session.id} className="rounded-xl border border-border bg-card p-5 shadow-soft group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(session.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  {(session.appointments as any)?.title && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {(session.appointments as any).title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingSession(session);
                    setSessionNotes(session.session_notes ?? "");
                    setNoteOpen(true);
                  }}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {session.session_notes || <span className="text-muted-foreground italic">Sem observações</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSession ? "Editar observação" : "Nova observação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Observações da sessão</Label>
              <Textarea
                placeholder="Registre aqui suas observações sobre a sessão..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={6}
              />
            </div>
            <Button
              variant="hero"
              onClick={editingSession ? handleUpdateNote : handleAddNote}
              disabled={!sessionNotes.trim() || addSession.isPending || updateSession.isPending}
              className="w-full"
            >
              {(addSession.isPending || updateSession.isPending) ? "Salvando..." : editingSession ? "Salvar alterações" : "Adicionar observação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientesTab;
