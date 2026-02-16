import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 gradient-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(199_89%_48%/0.3),transparent_70%)]" />
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Pronto para parar de perder dinheiro?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Comece seu teste grátis de 7 dias agora mesmo. Sem cartão de crédito.
          </p>
          <Button
            size="xl"
            className="bg-background text-primary hover:bg-background/90 shadow-elevated font-bold"
            asChild
          >
            <Link to="/signup">
              Começar teste grátis
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
