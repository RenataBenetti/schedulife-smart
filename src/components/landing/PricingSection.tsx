import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";

const included = [
  "Confirmação automática via WhatsApp",
  "Agenda integrada com Google Calendar",
  "Cobranças automáticas via Asaas",
  "Prontuários e histórico de sessões",
  "Templates de mensagem personalizáveis",
  "Regras de envio inteligentes",
  "Multi-profissional (workspace)",
  "Suporte por email",
];

export const PricingSection = () => {
  return (
    <section id="preco" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Preço</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Simples e sem surpresas
          </h2>
          <p className="text-muted-foreground text-lg">
            Um único plano com tudo incluso. Comece grátis por 7 dias.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto"
        >
          <div className="rounded-2xl border-2 border-primary bg-background shadow-elevated p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 gradient-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-lg">
              POPULAR
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground mb-1">Plano Profissional</h3>
              <p className="text-sm text-muted-foreground">Tudo que você precisa para automatizar</p>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-black text-foreground">R$69</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <Button variant="hero" size="lg" className="w-full mb-6" asChild>
              <Link to="/signup">
                Começar 7 dias grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <ul className="space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Cancele quando quiser. Sem fidelidade.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
