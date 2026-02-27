import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Loader2,
  Star,
} from "lucide-react";
import {
  useGenericPaymentLinks,
  useAddGenericPaymentLink,
  useUpdateGenericPaymentLink,
  useDeleteGenericPaymentLink,
} from "@/hooks/use-payment-links";
import { toast } from "sonner";

const typeLabels: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  checkout: "Checkout",
  other: "Outro",
};

interface Props {
  workspaceId: string;
}

interface FormState {
  name: string;
  type: string;
  url: string;
  is_default: boolean;
}

const defaultForm: FormState = {
  name: "",
  type: "pix",
  url: "",
  is_default: false,
};

export const PaymentLinksManager = ({ workspaceId }: Props) => {
  const { data: links, isLoading } = useGenericPaymentLinks(workspaceId);
  const addMutation = useAddGenericPaymentLink();
  const updateMutation = useUpdateGenericPaymentLink();
  const deleteMutation = useDeleteGenericPaymentLink();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...defaultForm });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setDialogOpen(true);
  };

  const openEdit = (link: any) => {
    setEditingId(link.id);
    setForm({
      name: link.name || "",
      type: link.type || "other",
      url: link.url || "",
      is_default: link.is_default || false,
    });
    setDialogOpen(true);
  };

  const isValidUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do link.");
      return;
    }
    if (!form.url.trim() || !isValidUrl(form.url.trim())) {
      toast.error("Informe uma URL válida (começando com http:// ou https://).");
      return;
    }
    if (form.name.length > 100) {
      toast.error("Nome deve ter no máximo 100 caracteres.");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          workspace_id: workspaceId,
          name: form.name.trim(),
          type: form.type,
          url: form.url.trim(),
          is_default: form.is_default,
        });
        toast.success("Link atualizado!");
      } else {
        await addMutation.mutateAsync({
          workspace_id: workspaceId,
          name: form.name.trim(),
          type: form.type,
          url: form.url.trim(),
          is_default: form.is_default,
        });
        toast.success("Link criado!");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar link.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, workspace_id: workspaceId });
      toast.success("Link excluído!");
    } catch {
      toast.error("Erro ao excluir link.");
    }
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Links de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre seus links de pagamento (PIX, cartão, etc.) para usar nas mensagens automáticas.
          </p>
        </div>
        <Button variant="hero" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo link
        </Button>
      </div>

      {(links ?? []).length === 0 ? (
        <div className="text-center py-8 rounded-xl border border-dashed border-border">
          <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum link cadastrado.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Aceita qualquer plataforma: Asaas, PagSeguro, MercadoPago, link PIX, etc.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(links ?? []).map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {link.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                    {typeLabels[link.type] || link.type}
                  </span>
                  {link.is_default && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent flex items-center gap-1 shrink-0">
                      <Star className="h-3 w-3" />
                      Padrão
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {link.url}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(link)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(link.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar link" : "Novo link de pagamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: PIX Nubank"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="checkout">Checkout</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL do link</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Cole o link de qualquer plataforma (Asaas, PagSeguro, MercadoPago, etc.)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Link padrão</p>
                <p className="text-xs text-muted-foreground">
                  Será usado automaticamente nas mensagens com link de pagamento.
                </p>
              </div>
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
