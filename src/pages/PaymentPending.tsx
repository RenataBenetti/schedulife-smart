import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/use-workspace";
import { useSubscription } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MONTHLY_LINK = "https://www.asaas.com/c/tiyjqqddhp6pjeva";
const ANNUAL_LINK = "https://www.asaas.com/c/ev0njmv7q0f0hohc";

const PaymentPending = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: workspace } = useWorkspace();
  const { data: subscription } = useSubscription(workspace?.id);

  const plan_type = (subscription as any)?.plan_type ?? "monthly";
  const paymentLink = plan_type === "annual" ? ANNUAL_LINK : MONTHLY_LINK;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Acesso suspenso</h1>
          <p className="text-muted-foreground">
            Identificamos um pagamento em atraso na sua assinatura. Regularize para continuar usando o Agendix.
          </p>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1 text-sm text-left">
          <p className="font-medium text-destructive">O que aconteceu?</p>
          <p className="text-muted-foreground">
            {subscription?.status === "canceled"
              ? "Sua assinatura foi cancelada. Para reativar, escolha um plano abaixo."
              : "Seu pagamento está pendente. Acesse o link para regularizar sua situação."}
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => window.open(paymentLink, "_blank")}
          >
            Regularizar pagamento
            <ExternalLink className="h-4 w-4" />
          </Button>

          <p className="text-xs text-muted-foreground">
            Precisa de ajuda?{" "}
            <a href="mailto:suporte@agendix.com.br" className="text-primary hover:underline">
              suporte@agendix.com.br
            </a>
          </p>

          <Button variant="ghost" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPending;
