import { motion } from "framer-motion";
import { XCircle } from "lucide-react";

const problems = [
  {
    title: "Faltas sem aviso",
    description: "Clientes não aparecem e você perde horários valiosos — e dinheiro.",
  },
  {
    title: "Confirmação manual",
    description: "Você gasta horas enviando mensagens de confirmação uma por uma.",
  },
  {
    title: "Cobrança desorganizada",
    description: "Pagamentos atrasados, sem controle e sem link de pagamento automatizado.",
  },
  {
    title: "Agenda caótica",
    description: "Planilhas, cadernos e apps desconectados que geram retrabalho.",
  },
];

export const ProblemSection = () => {
  return (
    <section id="problema" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-destructive uppercase tracking-wider">O problema</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Você está perdendo dinheiro sem perceber
          </h2>
          <p className="text-muted-foreground text-lg">
            A maioria dos profissionais perde até 30% da receita com faltas e desorganização.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-6 rounded-xl bg-background border border-border"
            >
              <XCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">{problem.title}</h3>
                <p className="text-sm text-muted-foreground">{problem.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
