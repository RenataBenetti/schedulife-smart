import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Palette,
  Bell,
  CreditCard,
  Calendar,
  Loader2,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useProfile, useUpdateProfile, useUpdateWorkspace, useSubscription, useGoogleCalendarConfig } from "@/hooks/use-data";
import { WhatsAppMetaConnect } from "@/components/dashboard/WhatsAppMetaConnect";
import { WhatsAppQRConnect } from "@/components/dashboard/WhatsAppQRConnect";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { PaymentLinksManager } from "@/components/dashboard/PaymentLinksManager";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-notification-preferences";

const sections = [
{ id: "perfil", label: "Perfil", icon: User },
{ id: "marca", label: "Marca", icon: Palette },
{ id: "notificacoes", label: "Notificações", icon: Bell },
{ id: "integracoes", label: "Integrações", icon: Calendar },
{ id: "pagamentos", label: "Links de Pagamento", icon: LinkIcon },
{ id: "plano", label: "Plano", icon: CreditCard }];


const statusLabels: Record<string, {label: string;className: string;}> = {
  trial_active: { label: "Trial ativo", className: "bg-accent/10 text-accent" },
  active: { label: "Ativo", className: "bg-accent/10 text-accent" },
  overdue: { label: "Atrasado", className: "bg-destructive/10 text-destructive" },
  canceled: { label: "Cancelado", className: "bg-muted text-muted-foreground" }
};

const ConfiguracoesTab = () => {
  const [activeSection, setActiveSection] = useState("perfil");
  const [gcalDialogOpen, setGcalDialogOpen] = useState(false);
  const [savingGcal, setSavingGcal] = useState(false);
  const { data: notifPrefs } = useNotificationPreferences(workspace?.id);
  const updateNotifPrefs = useUpdateNotificationPreferences(workspace?.id);
  const { user } = useAuth();
  const { data: workspace, isLoading: wsLoading } = useWorkspace();
  const { data: profile } = useProfile(user?.id);
  const { data: subscription } = useSubscription(workspace?.id);
  const { data: gcalCfg, refetch: refetchGcal } = useGoogleCalendarConfig(workspace?.id);
  const updateProfile = useUpdateProfile();
  const updateWorkspace = useUpdateWorkspace();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form values when data loads
  const profileName = fullName || profile?.full_name || "";
  const wsName = workspaceName || workspace?.name || "";
  const currentPrimary = primaryColor || (workspace as any)?.primary_color || "#2563EB";
  const currentSecondary = secondaryColor || (workspace as any)?.secondary_color || "#0EA5E9";
  const currentLogo = (workspace as any)?.logo_url || "";

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>);

  }

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({ userId: user.id, full_name: profileName });
      toast({ title: "Perfil atualizado!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleSaveBrand = async () => {
    if (!workspace) return;
    try {
      await updateWorkspace.mutateAsync({
        id: workspace.id,
        name: wsName,
        primary_color: currentPrimary,
        secondary_color: currentSecondary
      });
      toast({ title: "Marca atualizada!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspace) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${workspace.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage.
      from("logos").
      upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage.from("logos").getPublicUrl(path);
      const logoUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      await updateWorkspace.mutateAsync({ id: workspace.id, logo_url: logoUrl });
      toast({ title: "Logo atualizado!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao enviar logo", description: err.message });
    } finally {
      setUploadingLogo(false);
    }
  };




  const handleConnectGoogleCalendar = async () => {
    if (!workspace) return;
    setSavingGcal(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspace.id })
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar URL");
      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
      setSavingGcal(false);
    }
  };

  const planInfo = subscription ? statusLabels[subscription.status] || statusLabels.trial_active : statusLabels.trial_active;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-56 shrink-0">
        <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {sections.map((section) =>
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeSection === section.id ?
            "bg-primary/10 text-primary" :
            "text-muted-foreground hover:bg-muted hover:text-foreground"}`
            }>

              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-2xl">
        {activeSection === "perfil" &&
        <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Perfil</h3>
              <p className="text-sm text-muted-foreground">Suas informações pessoais.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input placeholder="Seu nome" value={profileName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={user?.email || ""} disabled />
              </div>
              <Button variant="hero" size="sm" onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>
        }

        {activeSection === "marca" &&
        <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Personalização de Marca</h3>
              <p className="text-sm text-muted-foreground">Customize a aparência da sua empresa no sistema.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-6">
              {/* Company name */}
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input placeholder="Ex: Clínica Vida" value={wsName} onChange={(e) => setWorkspaceName(e.target.value)} />
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                    {currentLogo ?
                  <img src={currentLogo} alt="Logo" className="h-full w-full object-contain" /> :

                  <Upload className="h-8 w-8 text-muted-foreground" />
                  }
                  </div>
                  <div className="space-y-2">
                    <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload} />

                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}>

                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo ? "Enviando..." : "Fazer Upload"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Recomendado: 200x200px, PNG ou JPG</p>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Cor Primária</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                      type="color"
                      value={currentPrimary}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border border-border cursor-pointer" />

                    </div>
                    <Input
                    value={currentPrimary}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#2563EB" />

                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cor Secundária</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                      type="color"
                      value={currentSecondary}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border border-border cursor-pointer" />

                    </div>
                    <Input
                    value={currentSecondary}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 font-mono text-sm"
                    placeholder="#0EA5E9" />

                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
                <div className="rounded-lg bg-muted/50 p-4 flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl" style={{ backgroundColor: currentPrimary }} />
                  <div className="h-14 w-14 rounded-xl" style={{ backgroundColor: currentSecondary }} />
                </div>
              </div>

              <Button variant="hero" size="sm" onClick={handleSaveBrand} disabled={updateWorkspace.isPending}>
                {updateWorkspace.isPending ? "Salvando..." : "Salvar Personalização"}
              </Button>
            </div>
          </div>
        }

        {activeSection === "notificacoes" &&
        <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Notificações</h3>
              <p className="text-sm text-muted-foreground">Configure seus alertas.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Email ao receber confirmação</p>
                  <p className="text-xs text-muted-foreground">Receba um email quando o cliente confirmar a sessão.</p>
                </div>
                <Switch checked={notifPrefs?.notify_email_confirmation ?? false} onCheckedChange={(v) => updateNotifPrefs.mutate({ notify_email_confirmation: v })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Alerta de pagamento pendente</p>
                  <p className="text-xs text-muted-foreground">Notificação quando um pagamento estiver pendente por mais de 3 dias.</p>
                </div>
                <Switch checked={notifPrefs?.notify_payment_pending ?? false} onCheckedChange={(v) => updateNotifPrefs.mutate({ notify_payment_pending: v })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Resumo diário via WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Receba um resumo das sessões e pagamentos do dia pela manhã no WhatsApp.</p>
                </div>
                <Switch checked={notifPrefs?.notify_daily_summary ?? false} onCheckedChange={(v) => updateNotifPrefs.mutate({ notify_daily_summary: v })} />
              </div>
            </div>
          </div>
        }

        {activeSection === "integracoes" &&
        <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Integrações</h3>
              <p className="text-sm text-muted-foreground">Conecte suas ferramentas externas.</p>
            </div>
            <div className="space-y-4">
              {/* WhatsApp Oficial (Meta Cloud API) — hidden by feature flag */}
              {FEATURE_FLAGS.WHATSAPP_CLOUD_API && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">Oficial</span>
                    <span className="text-xs text-muted-foreground">WhatsApp Oficial (Meta Cloud API) — Indicado para empresas com CNPJ e alto volume</span>
                  </div>
                  {workspace && (
                    <WhatsAppMetaConnect
                      workspaceId={workspace.id}
                      compact
                      onConnected={() => {}}
                    />
                  )}
                </div>
              )}

              {/* WhatsApp QR Code */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">WhatsApp</span>
                  <span className="text-xs text-muted-foreground">Conecte seu WhatsApp via QR Code</span>
                </div>
                {workspace && (
                  <WhatsAppQRConnect
                    workspaceId={workspace.id}
                    compact
                    onConnected={() => {}}
                  />
                )}
              </div>

              {/* Google Calendar */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Google Calendar</p>
                    <p className={`text-xs ${(gcalCfg?.connected && gcalCfg?.access_token) ? "text-accent" : "text-destructive"}`}>
                      {(gcalCfg?.connected && gcalCfg?.access_token) ? "Conectado" : (gcalCfg?.connected && !gcalCfg?.access_token) ? "Tokens ausentes — reconecte" : "Não conectado"}
                    </p>
                  </div>
                </div>
                <Button
                  variant={(gcalCfg?.connected && gcalCfg?.access_token) ? "outline" : "hero"}
                  size="sm"
                  onClick={() => setGcalDialogOpen(true)}
                >
                  {(gcalCfg?.connected && gcalCfg?.access_token) ? "Configurar" : (gcalCfg?.connected && !gcalCfg?.access_token) ? "Reconectar" : "Conectar"}
                </Button>
              </div>
            </div>

            {/* Google Calendar Dialog */}
            <Dialog open={gcalDialogOpen} onOpenChange={setGcalDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conectar Google Calendar</DialogTitle>
                  <DialogDescription>Sincronize sua agenda para que seus agendamentos apareçam automaticamente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    A integração com Google Calendar será habilitada para sincronizar seus agendamentos automaticamente.
                  </p>
                  <Button variant="hero" className="w-full" onClick={handleConnectGoogleCalendar} disabled={savingGcal}>
                    {savingGcal ? "Redirecionando..." : gcalCfg?.connected ? "Reconectar" : "Conectar Google Calendar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }

        {activeSection === "pagamentos" && workspace && (
          <div className="space-y-6">
            <PaymentLinksManager workspaceId={workspace.id} />
          </div>
        )}

        {activeSection === "plano" && (() => {
          const MONTHLY_LINK = "https://www.asaas.com/c/tiyjqqddhp6pjeva";
          const ANNUAL_LINK = "https://www.asaas.com/c/ev0njmv7q0f0hohc";
          const subStatus = subscription?.status;
          const plan_type = (subscription as any)?.plan_type ?? "monthly";
          const paymentLink = plan_type === "annual" ? ANNUAL_LINK : MONTHLY_LINK;
          const planLabel = plan_type === "annual" ? "Plano Anual" : "Plano Mensal";
          const planPrice = plan_type === "annual" ? "R$ 39,90/mês" : "R$ 49,90/mês";

          return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Plano & Assinatura</h3>
                <p className="text-sm text-muted-foreground">Gerencie seu plano.</p>
              </div>

              {/* Overdue warning */}
              {subStatus === "overdue" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="font-semibold text-destructive">Pagamento em atraso</p>
                  <p className="text-sm text-muted-foreground">Regularize seu pagamento para continuar usando o Agendix.</p>
                  <Button variant="destructive" size="sm" className="w-full" onClick={() => window.open(paymentLink, "_blank")}>
                    Regularizar pagamento
                  </Button>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {subStatus === "trial_active" ? "Trial gratuito" : planLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {subStatus === "trial_active" ? "7 dias para experimentar" : planPrice}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planInfo.className}`}>
                    {planInfo.label}
                  </span>
                </div>

                {subscription && (
                  <div className="border-t border-border pt-4 space-y-2">
                    {subStatus === "trial_active" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Início do trial</span>
                          <span className="text-foreground">{format(new Date(subscription.trial_start), "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expira em</span>
                          <span className="text-foreground">{format(new Date(subscription.trial_end), "dd/MM/yyyy")}</span>
                        </div>
                      </>
                    )}
                    {subStatus === "active" && subscription.current_period_end && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Próxima renovação</span>
                        <span className="text-foreground">{format(new Date(subscription.current_period_end), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA based on status */}
                {subStatus === "trial_active" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center mb-3">Escolha um plano para continuar após o trial</p>
                    <Button variant="hero-outline" size="sm" className="w-full" onClick={() => window.open(MONTHLY_LINK, "_blank")}>
                      Assinar Mensal — R$ 49,90/mês
                    </Button>
                    <Button variant="hero" size="sm" className="w-full" onClick={() => window.open(ANNUAL_LINK, "_blank")}>
                      Assinar Anual — R$ 39,90/mês ✦ Economize R$ 120
                    </Button>
                  </div>
                )}

                {subStatus === "active" && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(paymentLink, "_blank")}>
                    Gerenciar assinatura
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>);

};

export default ConfiguracoesTab;