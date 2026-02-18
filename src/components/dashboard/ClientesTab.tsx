import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  MessageSquare,
  Link,
  CheckCircle,
} from "lucide-react";
import { useClients, useAddClient, useUpdateClient, useDeleteClient, useSessions, useAddSession, useUpdateSession, useMessageTemplates, useCreateRegistrationToken } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { useClientTemplates, useToggleClientTemplate } from "@/hooks/use-client-templates";
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
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [billingModel, setBillingModel] = useState("sessao_individual");
  const [sessionValue, setSessionValue] = useState("");
  const [billingTiming, setBillingTiming] = useState("depois_da_sessao");
  const [billingDayOfMonth, setBillingDayOfMonth] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const { data: workspace } = useWorkspace();
  const { data: clients, isLoading } = useClients(workspace?.id);
  const { data: templates } = useMessageTemplates(workspace?.id);
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const toggleTemplate = useToggleClientTemplate();
  const createToken = useCreateRegistrationToken();
  const { toast } = useToast();

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setCpf(""); setRg("");
    setAddressZip(""); setAddressStreet(""); setAddressNumber(""); setAddressComplement("");
    setAddressNeighborhood(""); setAddressCity(""); setAddressState("");
    setBillingModel("sessao_individual"); setSessionValue(""); setBillingTiming("depois_da_sessao");
    setBillingDayOfMonth(""); setClinicalNotes(""); setSelectedTemplateIds([]);
  };

  const handleCepLookup = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressStreet(data.logradouro ?? addressStreet);
        setAddressNeighborhood(data.bairro ?? addressNeighborhood);
        setAddressCity(data.localidade ?? addressCity);
        setAddressState(data.uf ?? addressState);
      }
    } catch {}
  };

  const handleGenerateLink = async (client: any) => {
    if (!workspace) return;
    try {
      const result = await createToken.mutateAsync({ workspace_id: workspace.id, client_id: client.id });
      const APP_URL = import.meta.env.VITE_APP_URL || "https://schedulife-smart.lovable.app";
      const url = `${APP_URL}/cadastro/${result.token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Link de cadastro copiado para a área de transferência." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const filtered = (clients ?? []).filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!workspace || !name.trim()) return;
    try {
      const newClient = await addClient.mutateAsync({
        workspace_id: workspace.id,
        full_name: name.trim(),
        email: email || undefined,
        phone: phone || undefined,
        notes: clinicalNotes || undefined,
        billing_model: billingModel,
        session_value_cents: sessionValue ? Math.round(parseFloat(sessionValue) * 100) : undefined,
        billing_timing: billingTiming,
        billing_day_of_month: billingModel === "pacote_mensal" && billingDayOfMonth ? parseInt(billingDayOfMonth) : undefined,
        cpf: cpf || undefined,
        rg: rg || undefined,
        address_zip: addressZip || undefined,
        address_street: addressStreet || undefined,
        address_number: addressNumber || undefined,
        address_complement: addressComplement || undefined,
        address_neighborhood: addressNeighborhood || undefined,
        address_city: addressCity || undefined,
        address_state: addressState || undefined,
      });
      // Save template associations
      for (const tplId of selectedTemplateIds) {
        await toggleTemplate.mutateAsync({
          clientId: newClient.id,
          templateId: tplId,
          workspaceId: workspace.id,
          enabled: true,
        });
      }

      // Auto-create first charge for "pacote_mensal" or "plano_recorrente"
      let chargeCreated = false;
      const valueCents = sessionValue ? Math.round(parseFloat(sessionValue) * 100) : 0;
      if (
        (billingModel === "pacote_mensal" || billingModel === "plano_recorrente") &&
        valueCents > 0
      ) {
        const now = new Date();
        const monthLabel = format(now, "MMMM/yyyy", { locale: ptBR });
        const desc = billingModel === "pacote_mensal"
          ? `Mensalidade - ${monthLabel}`
          : `Recorrência - ${monthLabel}`;
        const { error: payErr } = await supabase.from("payment_links").insert({
          workspace_id: workspace.id,
          client_id: newClient.id,
          amount_cents: valueCents,
          description: desc,
        });
        if (payErr) console.error("Erro ao criar cobrança:", payErr);
        else chargeCreated = true;
      }

      toast({
        title: "Paciente adicionado!",
        description: chargeCreated ? "Primeira cobrança gerada automaticamente." : undefined,
      });
      resetForm();
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
        notes: clinicalNotes || null,
        billing_model: billingModel,
        session_value_cents: sessionValue ? Math.round(parseFloat(sessionValue) * 100) : null,
        billing_timing: billingTiming,
        billing_day_of_month: billingModel === "pacote_mensal" && billingDayOfMonth ? parseInt(billingDayOfMonth) : null,
        cpf: cpf || null,
        rg: rg || null,
        address_zip: addressZip || null,
        address_street: addressStreet || null,
        address_number: addressNumber || null,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood || null,
        address_city: addressCity || null,
        address_state: addressState || null,
      });
      // Sync template associations: delete all, re-insert selected
      await supabase
        .from("client_message_templates" as any)
        .delete()
        .eq("client_id", selectedClient.id);
      for (const tplId of selectedTemplateIds) {
        await toggleTemplate.mutateAsync({
          clientId: selectedClient.id,
          templateId: tplId,
          workspaceId: workspace.id,
          enabled: true,
        });
      }
      toast({ title: "Paciente atualizado!" });
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
      toast({ title: "Paciente excluído!" });
      setDeleteOpen(false);
      setSelectedClient(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const openEdit = async (client: any) => {
    setSelectedClient(client);
    setName(client.full_name);
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setCpf(client.cpf ?? "");
    setRg(client.rg ?? "");
    setAddressZip(client.address_zip ?? "");
    setAddressStreet(client.address_street ?? "");
    setAddressNumber(client.address_number ?? "");
    setAddressComplement(client.address_complement ?? "");
    setAddressNeighborhood(client.address_neighborhood ?? "");
    setAddressCity(client.address_city ?? "");
    setAddressState(client.address_state ?? "");
    setBillingModel(client.billing_model ?? "sessao_individual");
    setSessionValue(client.session_value_cents ? (client.session_value_cents / 100).toFixed(2) : "");
    setBillingTiming(client.billing_timing ?? "depois_da_sessao");
    setBillingDayOfMonth(client.billing_day_of_month ? String(client.billing_day_of_month) : "");
    setClinicalNotes(client.notes ?? "");
    // Load assigned templates
    if (workspace?.id) {
      const { data } = await supabase
        .from("client_message_templates" as any)
        .select("template_id")
        .eq("client_id", client.id)
        .eq("workspace_id", workspace.id);
      setSelectedTemplateIds((data as any[] ?? []).map((r: any) => r.template_id));
    }
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
          <Input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Plus className="h-4 w-4" />
              Novo paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Paciente</DialogTitle>
              <p className="text-sm text-muted-foreground">Cadastre um novo paciente no sistema. Preencha as informações básicas e configure o modelo de cobrança.</p>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input placeholder="João da Silva" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input placeholder="(11) 98765-4321" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="joao@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input placeholder="00.000.000-0" value={rg} onChange={(e) => setRg(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modelo de Cobrança *</Label>
                <Select value={billingModel} onValueChange={setBillingModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sessao_individual">Sessão Individual</SelectItem>
                    <SelectItem value="pacote_mensal">Pacote Mensal</SelectItem>
                    <SelectItem value="plano_recorrente">Plano Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor por Sessão (R$) *</Label>
                  <Input type="number" placeholder="150.00" value={sessionValue} onChange={(e) => setSessionValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cobrança *</Label>
                  <Select value={billingTiming} onValueChange={setBillingTiming}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="antes_da_sessao">Antes da Sessão</SelectItem>
                      <SelectItem value="depois_da_sessao">Depois da Sessão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {billingModel === "pacote_mensal" && (
                <div className="space-y-2">
                  <Label>Dia de cobrança no mês *</Label>
                  <Input type="number" min="1" max="31" placeholder="Ex: 10" value={billingDayOfMonth} onChange={(e) => setBillingDayOfMonth(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notas Clínicas</Label>
                <Textarea placeholder="Informações adicionais sobre o paciente..." value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} />
              </div>
              {/* Template selection */}
              {templates && templates.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Mensagens automáticas
                  </Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                    {templates.map((tpl) => (
                      <label key={tpl.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={selectedTemplateIds.includes(tpl.id)}
                          onCheckedChange={(checked) => {
                            setSelectedTemplateIds((prev) =>
                              checked ? [...prev, tpl.id] : prev.filter((id) => id !== tpl.id)
                            );
                          }}
                        />
                        <span className="text-sm text-foreground">{tpl.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="hero" onClick={handleAdd} disabled={!name.trim() || addClient.isPending} className="w-full">
                {addClient.isPending ? "Salvando..." : "Cadastrar Paciente"}
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
            <div key={client.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_110px] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => openDetail(client)}>
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {client.full_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground hover:text-primary transition-colors">{client.full_name}</span>
                    {(client.cpf || client.address_city) && (
                      <span title="Cadastro completo"><CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" /></span>
                    )}
                  </div>
                  {client.cpf && <span className="text-xs text-muted-foreground">CPF: {client.cpf}</span>}
                </div>
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
                  onClick={() => handleGenerateLink(client)}
                  disabled={createToken.isPending}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-primary"
                  title="Gerar link de cadastro"
                >
                  <Link className="h-4 w-4" />
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
            {clients?.length === 0 ? "Nenhum paciente cadastrado ainda." : "Nenhum paciente encontrado."}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>RG</Label>
                <Input placeholder="00.000.000-0" value={rg} onChange={(e) => setRg(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input placeholder="00000-000" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} onBlur={(e) => handleCepLookup(e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-4">
              <div className="space-y-2">
                <Label>Rua</Label>
                <Input placeholder="Rua das Flores" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input placeholder="123" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input placeholder="Apto 12" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input placeholder="Centro" value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_70px] gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input placeholder="São Paulo" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input placeholder="SP" maxLength={2} value={addressState} onChange={(e) => setAddressState(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modelo de Cobrança *</Label>
              <Select value={billingModel} onValueChange={setBillingModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sessao_individual">Sessão Individual</SelectItem>
                  <SelectItem value="pacote_mensal">Pacote Mensal</SelectItem>
                  <SelectItem value="plano_recorrente">Plano Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor por Sessão (R$) *</Label>
                <Input type="number" placeholder="150.00" value={sessionValue} onChange={(e) => setSessionValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cobrança *</Label>
                <Select value={billingTiming} onValueChange={setBillingTiming}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="antes_da_sessao">Antes da Sessão</SelectItem>
                    <SelectItem value="depois_da_sessao">Depois da Sessão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {billingModel === "pacote_mensal" && (
              <div className="space-y-2">
                <Label>Dia de cobrança no mês *</Label>
                <Input type="number" min="1" max="31" placeholder="Ex: 10" value={billingDayOfMonth} onChange={(e) => setBillingDayOfMonth(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas Clínicas</Label>
              <Textarea placeholder="Informações adicionais sobre o paciente..." value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={3} />
            </div>
            {/* Template selection */}
            {templates && templates.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Mensagens automáticas
                </Label>
                <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                  {templates.map((tpl) => (
                    <label key={tpl.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={selectedTemplateIds.includes(tpl.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTemplateIds((prev) =>
                            checked ? [...prev, tpl.id] : prev.filter((id) => id !== tpl.id)
                          );
                        }}
                      />
                      <span className="text-sm text-foreground">{tpl.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
            <AlertDialogTitle>Excluir paciente</AlertDialogTitle>
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
      setDateFilter("");
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
      setDateFilter("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setSessionNotes("");
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

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-44"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter("")}>
            Limpar
          </Button>
        )}
      </div>

      {/* Inline note form */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-soft space-y-3">
        {editingSession && (
          <p className="text-xs text-muted-foreground font-medium">
            Editando observação de {format(new Date(editingSession.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
        <Textarea
          placeholder="Registre suas observações..."
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          rows={4}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="hero"
            size="sm"
            onClick={editingSession ? handleUpdateNote : handleAddNote}
            disabled={!sessionNotes.trim() || addSession.isPending || updateSession.isPending}
          >
            {(addSession.isPending || updateSession.isPending) ? "Salvando..." : editingSession ? "Salvar alterações" : "Adicionar observação"}
          </Button>
          {editingSession && (
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              Cancelar
            </Button>
          )}
        </div>
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
    </div>
  );
};

export default ClientesTab;
