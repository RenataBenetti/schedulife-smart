import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const META_APP_ID = "960475733312726";
const META_CONFIG_ID = "4253053541617103";
const META_REDIRECT_URI = "https://agendix.soriamarketing.com.br/dashboard";

interface WhatsAppConnection {
  status: "disconnected" | "connected" | "error";
  waba_id: string | null;
  phone_number_id: string | null;
  phone_display: string | null;
  last_error: string | null;
}

interface WhatsAppMetaConnectProps {
  workspaceId: string;
  onConnected?: () => void;
  compact?: boolean;
}

export const WhatsAppMetaConnect = ({
  workspaceId,
  onConnected,
  compact = false,
}: WhatsAppMetaConnectProps) => {
  const { toast } = useToast();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_connections" as any)
        .select("status, waba_id, phone_number_id, phone_display, last_error")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

      if (error) throw error;
      setConnection((data as unknown) as WhatsAppConnection | null);
    } catch (e: any) {
      console.error("Erro ao buscar conexão WhatsApp:", e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Handle the OAuth callback code from URL on mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) return;

    // Clean URL immediately
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.pathname + url.search);

    // Parse state to get workspace_id
    let parsedWorkspaceId = workspaceId;
    if (state) {
      try {
        const parsed = JSON.parse(atob(state));
        if (parsed.workspace_id) parsedWorkspaceId = parsed.workspace_id;
      } catch {
        // state might not be valid, use prop
      }
    }

    console.log("[WhatsApp] OAuth code received, exchanging token...");
    setConnecting(true);

    supabase.functions
      .invoke("whatsapp-connect", {
        body: {
          code,
          workspace_id: parsedWorkspaceId,
          redirect_uri: META_REDIRECT_URI,
        },
      })
      .then((res) => {
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
        return fetchConnection().then(() => {
          toast({
            title: "WhatsApp conectado! ✅",
            description: res.data?.message || "Conexão realizada com sucesso.",
          });
          onConnected?.();
        });
      })
      .catch((err: any) => {
        console.error("[WhatsApp] Token exchange error:", err.message);
        toast({
          variant: "destructive",
          title: "Erro ao conectar",
          description: err.message || "Tente novamente ou contate o suporte.",
        });
        fetchConnection();
      })
      .finally(() => {
        setConnecting(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect-based OAuth — navigate to Meta's OAuth dialog
  const handleConnect = () => {
    const state = btoa(JSON.stringify({ workspace_id: workspaceId }));

    const params = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: META_REDIRECT_URI,
      config_id: META_CONFIG_ID,
      response_type: "code",
      state,
    });

    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    console.log("[WhatsApp] Redirecting to Meta OAuth:", oauthUrl);
    window.location.href = oauthUrl;
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Informe o número",
        description: "Digite o número de destino para o teste.",
      });
      return;
    }

    setSendingTest(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-send-test", {
        body: { to_phone: testPhone, workspace_id: workspaceId },
      });

      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: "Mensagem enviada! ✅",
        description: `Verifique o WhatsApp do número ${testPhone}.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro no envio",
        description: err.message,
      });
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

  const isConnected = connection?.status === "connected";
  const hasError = connection?.status === "error";

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">WhatsApp Business</p>
              <p className="text-xs text-accent truncate">
                {connection?.phone_display || "Conectado"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reconectar
            </Button>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">WhatsApp Business</p>
              <p className="text-xs text-muted-foreground truncate">
                {hasError ? connection?.last_error || "Erro de conexão" : "Não conectado"}
              </p>
            </div>
            <Button
              variant="hero"
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {hasError ? "Reconectar" : "Conectar"}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          Conectar WhatsApp Business
        </h2>
        <p className="text-sm text-muted-foreground">
          Conecte seu WhatsApp em 2 minutos. Você será redirecionado ao Facebook para autorizar sua conta.
          O custo das conversas é cobrado pela Meta na sua conta.
        </p>
      </div>

      {!isConnected && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary-foreground">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Clique no botão abaixo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você será redirecionado ao Facebook para fazer login.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary-foreground">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Selecione sua conta Business</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escolha a conta do WhatsApp Business que você quer usar no Agendix.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary-foreground">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Pronto!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você será redirecionado de volta e seu WhatsApp estará conectado.
                </p>
              </div>
            </div>
          </div>

          {hasError && connection?.last_error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              <strong>Erro anterior:</strong> {connection.last_error}
            </div>
          )}

          <Button
            variant="hero"
            className="w-full"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                {hasError ? "Reconectar WhatsApp com Facebook" : "Conectar WhatsApp com Facebook"}
              </>
            )}
          </Button>
        </div>
      )}

      {isConnected && (
        <div className="space-y-4">
          <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">WhatsApp conectado! ✅</p>
              {connection?.phone_display && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Número: <strong>{connection.phone_display}</strong>
                </p>
              )}
              {connection?.waba_id && (
                <p className="text-xs text-muted-foreground">WABA ID: {connection.waba_id}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Enviar mensagem de teste</p>
            <p className="text-xs text-muted-foreground">
              Digite um número com DDD e código do país para confirmar que está tudo funcionando.
            </p>
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
                {sendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Testar
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
          >
            <RefreshCw className="h-4 w-4" />
            Reconectar com outra conta
          </Button>
        </div>
      )}
    </div>
  );
};
