import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "Confirmação automática via WhatsApp",
  "Cobrança integrada",
  "Agenda inteligente",
];

export const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 gradient-hero overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              7 dias grátis — sem cartão de crédito
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Pare de perder dinheiro com{" "}
            <span className="text-gradient">faltas</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            O Agendix confirma, organiza e cobra automaticamente para você.
            A agenda inteligente que profissionais de saúde e serviços precisam.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Começar teste grátis por 7 dias
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {benefits.map((benefit) => (
              <span key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {benefit}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview mock */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="rounded-xl border border-border bg-card shadow-elevated p-2">
            <div className="rounded-lg bg-muted/50 aspect-[16/9] flex items-center justify-center">
              <div className="text-center p-8">
                <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-3 w-3 rounded-full bg-destructive" />
                  <div className="h-3 w-3 rounded-full bg-secondary" />
                  <div className="h-3 w-3 rounded-full bg-accent" />
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg bg-card shadow-soft p-4 space-y-2">
                      <div className="h-2 w-16 rounded bg-primary/20" />
                      <div className="h-6 w-12 rounded bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
                        {i * 12}
                      </div>
                      <div className="h-2 w-20 rounded bg-muted" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 max-w-lg mx-auto">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-lg bg-card shadow-soft p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10" />
                      <div className="space-y-1 flex-1">
                        <div className="h-2 w-20 rounded bg-muted" />
                        <div className="h-2 w-14 rounded bg-muted/60" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                        {i % 2 === 0 ? "Pago" : "14:00"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
