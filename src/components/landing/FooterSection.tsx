import { Calendar } from "lucide-react";

export const FooterSection = () => {
  return (
    <footer className="py-12 bg-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-background">Agendix</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-background/60">
            <a href="/termos.html" className="hover:text-background transition-colors">Termos de Serviço</a>
            <a href="/privacidade.html" className="hover:text-background transition-colors">Política de Privacidade</a>
            <a href="mailto:contato@agendix.com.br" className="hover:text-background transition-colors">Contato</a>
          </div>
          <p className="text-sm text-background/40">
            © 2026 Agendix. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

