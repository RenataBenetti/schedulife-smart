import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Zap } from "lucide-react";

const included = [
  "Confirmação automática via WhatsApp",
  "Agenda integrada com Google Calendar",
  "Cobranças automáticas via link de pagamento",
  "Prontuários e histórico de sessões",
  "Templates de mensagem personalizáveis",
  "Regras de envio inteligentes",
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
            Escolha o plano ideal para você
          </h2>
          <p className="text-muted-foreground text-lg">
            7 dias grátis para testar. Sem cartão de crédito.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Plano Mensal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="rounded-2xl border border-border bg-background shadow-soft p-8 h-full flex flex-col">
              <div className="mb-6">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest border border-border rounded-full px-3 py-1">
                  MENSAL
                </span>
                <h3 className="text-xl font-bold text-foreground mt-3 mb-1">Sem fidelidade</h3>
                <p className="text-sm text-muted-foreground">Cancele quando quiser</p>
              </div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-foreground">R$49</span>
                <span className="text-muted-foreground text-lg">,90/mês</span>
              </div>
              <Button variant="hero-outline" size="lg" className="w-full mb-6" asChild>
                <Link to="/signup">
                  Começar 7 dias grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <ul className="space-y-3 flex-1">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-6 text-center">
                7 dias grátis. Sem cartão. Cancele quando quiser.
              </p>
            </div>
          </motion.div>

          {/* Plano Anual */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="rounded-2xl border-2 border-primary bg-background shadow-elevated p-8 h-full flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 gradient-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-lg">
                MAIS POPULAR
              </div>
              <div className="mb-6">
                <span className="text-xs font-bold text-primary uppercase tracking-widest border border-primary/30 rounded-full px-3 py-1">
                  ANUAL
                </span>
                <h3 className="text-xl font-bold text-foreground mt-3 mb-1">12 meses</h3>
                <p className="text-sm text-muted-foreground">Maior economia</p>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-foreground">R$39</span>
                <span className="text-muted-foreground text-lg">,90/mês</span>
              </div>
              <div className="flex items-center gap-1.5 mb-6">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-semibold text-accent">Economize R$ 120/ano</span>
              </div>
              <Button variant="hero" size="lg" className="w-full mb-6" asChild>
                <Link to="/signup">
                  Começar 7 dias grátis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <ul className="space-y-3 flex-1">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-6 text-center">
                7 dias grátis. Sem cartão. 12 meses de fidelidade.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
