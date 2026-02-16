import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
  }, []);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      setSent(true);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Erro", description: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(newPassword);
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Senha atualizada!", description: "Faça login com sua nova senha." });
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Agendix</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {isRecovery ? "Nova senha" : "Redefinir senha"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isRecovery
              ? "Defina sua nova senha abaixo."
              : sent
              ? "Verifique seu email para o link de redefinição."
              : "Informe seu email para receber o link de redefinição."}
          </p>
        </div>

        {isRecovery ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" placeholder="Mínimo 8 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </form>
        ) : !sent ? (
          <form onSubmit={handleSendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-foreground font-medium mb-2">Email enviado!</p>
            <p className="text-sm text-muted-foreground">Se o email estiver cadastrado, você receberá o link em instantes.</p>
          </div>
        )}

        <Link to="/login" className="flex items-center gap-2 text-sm text-primary hover:underline justify-center">
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
