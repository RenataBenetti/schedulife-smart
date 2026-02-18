import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, RefreshCw, Smartphone, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  existingConfig?: any;
  onSaved?: () => void;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "unknown";

const statusConfig: Record<ConnectionStatus, { label: string; className: string; icon: any }> = {
  connected: { label: "Conectado", className: "text-accent bg-accent/10", icon: CheckCircle2 },
  connecting: { label: "Conectando...", className: "text-secondary bg-secondary/10", icon: Loader2 },
  disconnected: { label: "Desconectado", className: "text-muted-foreground bg-muted", icon: XCircle },
  unknown: { label: "Verificando...", className: "text-muted-foreground bg-muted", icon: Loader2 },
};

export function WhatsAppEvolutionDialog({ open, onOpenChange, workspaceId, existingConfig, onSaved }: Props) {
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [instance, setInstance] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrPolling, setQrPolling] = useState<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (existingConfig) {
      setApiUrl((existingConfig as any).evolution_api_url || "");
      setApiKey((existingConfig as any).evolution_api_key || "");
      setInstance((existingConfig as any).evolution_instance || "");
      setConnectionStatus(((existingConfig as any).connection_status as ConnectionStatus) || "disconnected");
    }
  }, [existingConfig, open]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (qrPolling) clearInterval(qrPolling);
    };
  }, [qrPolling]);

  const cleanUrl = (url: string) => url.replace(/\/$/, "");

  const handleCheckConnection = async () => {
    if (!apiUrl || !apiKey || !instance) {
      toast({ variant: "destructive", title: "Preencha todos os campos antes de verificar." });
      return;
    }
    setChecking(true);
    setConnectionStatus("unknown");
    setQrCode(null);

    try {
      const url = `${cleanUrl(apiUrl)}/instance/connectionState/${instance}`;
      const res = await fetch(url, {
        headers: { apikey: apiKey },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Evolution API retorna state: "open" quando conectado
      const state = data?.instance?.state ?? data?.state ?? "";
      const isConnected = state === "open";
      const newStatus: ConnectionStatus = isConnected ? "connected" : "disconnected";
      setConnectionStatus(newStatus);

      // Salvar status no banco
      await saveConfig(newStatus);

      if (isConnected) {
        toast({ title: "WhatsApp conectado com sucesso! ✅" });
      }
    } catch (err: any) {
      setConnectionStatus("disconnected");
      toast({
        variant: "destructive",
        title: "Não foi possível conectar",
        description: "Verifique a URL, API Key e nome da instância.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!apiUrl || !apiKey || !instance) {
      toast({ variant: "destructive", title: "Preencha todos os campos antes de gerar o QR Code." });
      return;
    }
    setLoadingQr(true);
    setQrCode(null);

    try {
      // Primeiro salvar configuração
      await saveConfig("connecting");

      // Buscar QR Code da instância
      const url = `${cleanUrl(apiUrl)}/instance/connect/${instance}`;
      const res = await fetch(url, { headers: { apikey: apiKey } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const qr = data?.base64 ?? data?.qrcode?.base64 ?? null;
      if (qr) {
        setQrCode(qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`);
        setConnectionStatus("connecting");

        // Iniciar polling para verificar quando o QR for escaneado
        if (qrPolling) clearInterval(qrPolling);
        const interval = setInterval(async () => {
          try {
            const stateRes = await fetch(`${cleanUrl(apiUrl)}/instance/connectionState/${instance}`, {
              headers: { apikey: apiKey },
            });
            if (stateRes.ok) {
              const stateData = await stateRes.json();
              const state = stateData?.instance?.state ?? stateData?.state ?? "";
              if (state === "open") {
                clearInterval(interval);
                setQrPolling(null);
                setQrCode(null);
                setConnectionStatus("connected");
                await saveConfig("connected");
                toast({ title: "WhatsApp conectado com sucesso! ✅" });
              }
            }
          } catch (_) { /* silencioso */ }
        }, 5000);
        setQrPolling(interval);
      } else {
        throw new Error("QR Code não encontrado na resposta da API");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar QR Code",
        description: err.message,
      });
    } finally {
      setLoadingQr(false);
    }
  };

  const saveConfig = async (status?: ConnectionStatus) => {
    const payload: any = {
      workspace_id: workspaceId,
      integration_type: "evolution_qr",
      evolution_api_url: cleanUrl(apiUrl),
      evolution_api_key: apiKey,
      evolution_instance: instance,
    };
    if (status) payload.connection_status = status;

    if (existingConfig?.id) {
      const { error } = await supabase
        .from("whatsapp_config")
        .update(payload)
        .eq("id", existingConfig.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("whatsapp_config")
        .insert(payload);
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    if (!apiUrl || !apiKey || !instance) {
      toast({ variant: "destructive", title: "Preencha todos os campos." });
      return;
    }
    setSaving(true);
    try {
      await saveConfig();
      toast({ title: "Configuração salva!" });
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const s = statusConfig[connectionStatus];
  const StatusIcon = s.icon;
  const canGenerateQR = apiUrl && apiKey && instance && connectionStatus !== "connected";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-accent" />
            Configurar WhatsApp via QR Code
          </DialogTitle>
          <DialogDescription>
            Conecte sua instância da Evolution API para envio automático de mensagens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dica chip separado */}
          <div className="flex gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Dica de organização:</strong> Para manter a identidade profissional do seu consultório, recomendamos usar um número exclusivo para o sistema — diferente do seu WhatsApp pessoal. Chips pré-pagos de Claro, Vivo ou Tim funcionam muito bem para isso.
            </p>
          </div>

          {/* Status da conexão */}
          <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${s.className}`}>
            <StatusIcon className={`h-4 w-4 shrink-0 ${connectionStatus === "connecting" || connectionStatus === "unknown" ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">{s.label}</span>
            {connectionStatus === "connected" && instance && (
              <span className="text-xs opacity-70 ml-auto">instância: {instance}</span>
            )}
          </div>

          {/* Campos */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>URL do servidor Evolution API</Label>
              <Input
                placeholder="http://meuservidor.com:8080"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Sua chave de autenticação"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome da instância</Label>
              <Input
                placeholder="Ex: consultorio-maria"
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
              />
            </div>
          </div>

          {/* Botão verificar */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCheckConnection}
            disabled={checking || !apiUrl || !apiKey || !instance}
          >
            {checking ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Verificar conexão</>
            )}
          </Button>

          {/* QR Code Section */}
          {connectionStatus !== "connected" && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">ou escaneie o QR Code</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-accent/30 text-accent hover:bg-accent/5"
                onClick={handleGenerateQR}
                disabled={loadingQr || !canGenerateQR}
              >
                {loadingQr ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando QR Code...</>
                ) : (
                  <><Smartphone className="h-4 w-4 mr-2" /> Gerar QR Code</>
                )}
              </Button>

              {qrCode && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-accent/30 bg-accent/5 p-4">
                    <img src={qrCode} alt="QR Code WhatsApp" className="h-48 w-48 rounded-lg" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Escaneie com seu WhatsApp</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-secondary bg-secondary/10 rounded-lg px-3 py-2 w-full justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Aguardando escaneamento...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão salvar */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !apiUrl || !apiKey || !instance}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
