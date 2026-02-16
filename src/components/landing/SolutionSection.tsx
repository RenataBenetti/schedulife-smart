import { motion } from "framer-motion";
import { CheckCircle2, MessageSquare, CreditCard, CalendarCheck } from "lucide-react";

const solutions = [
  {
    icon: MessageSquare,
    title: "Confirmação automática",
    description: "O Agendix envia mensagens de confirmação pelo WhatsApp automaticamente.",
  },
  {
    icon: CalendarCheck,
    title: "Agenda centralizada",
    description: "Todos os agendamentos, clientes e sessões em um único lugar.",
  },
  {
    icon: CreditCard,
    title: "Cobrança automatizada",
    description: "Links de pagamento enviados automaticamente. Receba sem cobrar manualmente.",
  },
];

export const SolutionSection = () => {
  return (
    <section id="solucao" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-accent uppercase tracking-wider">A solução</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            O Agendix resolve tudo isso para você
          </h2>
          <p className="text-muted-foreground text-lg">
            Uma plataforma completa que automatiza confirmações, cobranças e organiza sua agenda.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {solutions.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center p-8 rounded-2xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow duration-300"
            >
              <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-5">
                <item.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
