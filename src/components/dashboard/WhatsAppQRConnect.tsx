import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Smartphone,
  AlertTriangle,
  Send,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppQRConnectProps {
  workspaceId: string;
  onConnected?: () => void;
  compact?: boolean;
}

type QRStatus = "disconnected" | "connecting" | "connected";

export const WhatsAppQRConnect = ({
  workspaceId,
  onConnected,
  compact = false,
}: WhatsAppQRConnectProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<QRStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await supabase.functions.invoke("whatsapp-qr-status", {
        body: { workspace_id: workspaceId },
      });
      if (res.data) {
        setStatus(res.data.connected ? "connected" : res.data.status === "connecting" ? "connecting" : "disconnected");
        setPhoneNumber(res.data.phone_number || null);
        if (res.data.connected) {
          setQrCode(null);
        }
      }
    } catch (e: any) {
      console.error("[WhatsAppQR] Status error:", e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Cleanup polling
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleCreate = async () => {
    setCreating(true);
    setQrCode(null);
    try {
      const res = await supabase.functions.invoke("whatsapp-qr-create", {
        body: { workspace_id: workspaceId },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      if (res.data?.already_connected) {
        setStatus("connected");
        toast({ title: "WhatsApp já está conectado! ✅", description: "Use o teste de mensagem para verificar." });
        onConnected?.();
      } else if (res.data?.qr) {
        setQrCode(res.data.qr);
        setStatus("connecting");

        // Start polling for connection
        if (pollingInterval) clearInterval(pollingInterval);
        const interval = setInterval(async () => {
          try {
            const statusRes = await supabase.functions.invoke("whatsapp-qr-status", {
              body: { workspace_id: workspaceId },
            });
            if (statusRes.data?.connected) {
              clearInterval(interval);
              setPollingInterval(null);
              setQrCode(null);
              setStatus("connected");
              setPhoneNumber(statusRes.data.phone_number || null);
              toast({ title: "WhatsApp conectado via QR Code! ✅" });
              onConnected?.();
            }
          } catch (_) { /* silent */ }
        }, 5000);
        setPollingInterval(interval);
      } else {
        toast({
          variant: "destructive",
          title: "QR Code não gerado",
          description: "Tente novamente em instantes.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar instância",
        description: err.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast({ variant: "destructive", title: "Informe o número de destino." });
      return;
    }
    setSendingTest(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-qr-send", {
        body: { workspace_id: workspaceId, to_phone: testPhone },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Mensagem enviada! ✅", description: `Verifique o WhatsApp do número ${testPhone}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no envio", description: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  const isConnected = status === "connected";

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">WhatsApp QR Code</p>
                <p className="text-xs text-accent truncate">{phoneNumber || "Conectado"}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reconectar
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">WhatsApp QR Code</p>
                <p className="text-xs text-muted-foreground truncate">Não conectado</p>
              </div>
              <Button variant="hero" size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                Conectar
              </Button>
            </>
          )}
        </div>

        {qrCode && (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-accent/30 bg-accent/5 p-4">
            <img src={qrCode} alt="QR Code WhatsApp" className="h-48 w-48 rounded-lg" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Escaneie com seu WhatsApp</p>
              <p className="text-xs text-muted-foreground mt-1">
                Abra o WhatsApp → Dispositivos conectados → Conectar
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 w-full justify-center">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Aguardando escaneamento...
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          WhatsApp via QR Code
        </h2>
        <p className="text-sm text-muted-foreground">
          Conecte seu WhatsApp escaneando um QR Code, similar ao WhatsApp Web.
          Ideal para profissionais autônomos.
        </p>
      </div>

      {/* Tip */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Dica importante 💡</p>
            <p className="text-sm text-muted-foreground mt-1">
              Para uso profissional, recomendamos conectar um número separado do seu WhatsApp pessoal,
              de preferência no <strong>WhatsApp Business</strong> (chip exclusivo). Isso evita misturar
              conversas pessoais com clientes e reduz risco de bloqueios.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground ml-7 mt-2">
          Ao conectar, você concorda que o uso é de sua responsabilidade.
        </p>
      </div>

      {!isConnected && (
        <div className="space-y-4">
          <Button
            variant="hero"
            className="w-full"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando QR Code...</>
            ) : (
              <><Smartphone className="h-4 w-4" /> Conectar via QR Code</>
            )}
          </Button>

          {qrCode && (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-accent/30 bg-accent/5 p-6">
              <img src={qrCode} alt="QR Code WhatsApp" className="h-52 w-52 rounded-lg" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Escaneie com seu WhatsApp</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 w-full justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando escaneamento...
              </div>
            </div>
          )}
        </div>
      )}

      {isConnected && (
        <div className="space-y-4">
          <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">WhatsApp conectado via QR Code! ✅</p>
              {phoneNumber && (
                <p className="text-sm text-muted-foreground mt-0.5">Número: <strong>{phoneNumber}</strong></p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Enviar mensagem de teste</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="sr-only">Número destino</Label>
                <Input
                  placeholder="Ex: 5511999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <Button variant="hero" onClick={handleSendTest} disabled={sendingTest}>
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Testar
              </Button>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleCreate} disabled={creating}>
            <RefreshCw className="h-4 w-4" /> Reconectar
          </Button>
        </div>
      )}
    </div>
  );
};
