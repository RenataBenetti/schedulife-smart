import { useState, useEffect, useCallback, useRef } from "react";
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

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

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

const META_APP_ID = import.meta.env.VITE_META_APP_ID;

// Singleton promise so the SDK loads/inits only once across re-renders
let fbSdkPromise: Promise<void> | null = null;

function loadFacebookSDK(): Promise<void> {
  if (fbSdkPromise) return fbSdkPromise;

  fbSdkPromise = new Promise<void>((resolve) => {
    const doInit = () => {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: false,
        version: "v24.0",
      });
      resolve();
    };

    // FB already loaded and init already called (e.g. hot-reload)
    if (window.FB) {
      doInit();
      return;
    }

    // Script tag already injected but FB not ready yet — wait for fbAsyncInit
    if (document.getElementById("facebook-jssdk")) {
      const prev = window.fbAsyncInit;
      window.fbAsyncInit = () => {
        prev?.();
        doInit();
      };
      return;
    }

    // Fresh load: register fbAsyncInit BEFORE injecting the script
    window.fbAsyncInit = () => {
      doInit();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return fbSdkPromise;
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
  const [fbSdkReady, setFbSdkReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    loadFacebookSDK().then(() => {
      if (mountedRef.current) setFbSdkReady(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Buscar estado atual da conexão
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

  const handleConnect = () => {
    if (!fbSdkReady || !window.FB) {
      toast({
        variant: "destructive",
        title: "Aguarde",
        description: "O SDK do Facebook ainda está carregando. Tente novamente.",
      });
      return;
    }

    setConnecting(true);

    // FB.login MUST be a synchronous, non-async callback — FB SDK requirement
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const code = response.authResponse.code;

          supabase.functions
            .invoke("whatsapp-connect", {
              body: { code, workspace_id: workspaceId },
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
        } else {
          toast({
            variant: "destructive",
            title: "Login cancelado",
            description: "Você cancelou o login com Facebook. Tente novamente.",
          });
          setConnecting(false);
        }
      },
      {
        config_id: "4253053541617103",
        response_type: "code",
        override_default_response_type: true,
      }
    );
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
    // Versão compacta para uso no card de integrações
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
            <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
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
            <Button variant="hero" size="sm" onClick={handleConnect} disabled={connecting || !fbSdkReady}>
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

  // Versão completa para o Setup Wizard
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          Conectar WhatsApp Business
        </h2>
        <p className="text-sm text-muted-foreground">
          Conecte seu WhatsApp em 2 minutos. Você fará login com Facebook e confirmará seu número.
          O custo das conversas é cobrado pela Meta na sua conta.
        </p>
      </div>

      {/* Estado: não conectado ou erro */}
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
                  Uma janela do Facebook abrirá para você fazer login.
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
                  Seu WhatsApp estará pronto para enviar mensagens automáticas.
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
            disabled={connecting || !fbSdkReady}
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

          {!fbSdkReady && (
            <p className="text-xs text-center text-muted-foreground">
              Carregando SDK do Facebook...
            </p>
          )}
        </div>
      )}

      {/* Estado: conectado */}
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

          {/* Enviar mensagem de teste */}
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
              <Button
                variant="hero"
                onClick={handleSendTest}
                disabled={sendingTest}
              >
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
