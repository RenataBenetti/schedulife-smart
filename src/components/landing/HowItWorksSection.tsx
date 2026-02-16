import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Conecte suas ferramentas",
    description: "Integre WhatsApp e Google Calendar em poucos cliques.",
  },
  {
    number: "02",
    title: "Configure suas mensagens",
    description: "Crie templates personalizados com variáveis dinâmicas.",
  },
  {
    number: "03",
    title: "Deixe o Agendix trabalhar",
    description: "Confirmações, lembretes e cobranças acontecem automaticamente.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="como-funciona" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Como funciona</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Comece em 3 passos simples
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <span className="text-7xl font-black text-primary/10">{step.number}</span>
              <h3 className="font-bold text-lg text-foreground -mt-4 mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
