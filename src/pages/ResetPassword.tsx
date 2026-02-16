import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, ArrowLeft } from "lucide-react";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    // TODO: integrate with Supabase auth
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
          <h1 className="text-2xl font-bold text-foreground">Redefinir senha</h1>
          <p className="text-muted-foreground mt-1">
            {sent
              ? "Verifique seu email para o link de redefinição."
              : "Informe seu email para receber o link de redefinição."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button variant="hero" size="lg" className="w-full" type="submit">
              Enviar link de redefinição
            </Button>
          </form>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-foreground font-medium mb-2">Email enviado!</p>
            <p className="text-sm text-muted-foreground">
              Se o email estiver cadastrado, você receberá o link em instantes.
            </p>
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
