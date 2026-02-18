import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    q: "Preciso de conhecimento técnico para usar o Agendix?",
    a: "Não! O setup é guiado passo a passo. Você conecta suas ferramentas em poucos cliques e já pode começar a usar.",
  },
  {
    q: "Como funciona a confirmação pelo WhatsApp?",
    a: "O Agendix usa a API oficial do WhatsApp Business (Meta) para enviar mensagens automaticamente. Você configura os templates e as regras — o sistema faz o resto.",
  },
  {
    q: "Quanto custa o envio de mensagens pelo WhatsApp?",
    a: "As mensagens são cobradas diretamente pela Meta (WhatsApp Business API). O valor varia por país, mas no Brasil cada conversa custa centavos. Esse custo é pago por você diretamente à Meta, não ao Agendix.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Depende do plano escolhido. No Plano Mensal, não há fidelidade — você pode cancelar quando quiser e terá acesso até o fim do período pago. No Plano Anual, o contrato é de 12 meses, mas você economiza R$ 120 ao ano em relação ao mensal.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Utilizamos criptografia, isolamento total entre workspaces e Row Level Security para garantir que seus dados nunca sejam acessados por terceiros.",
  },
  {
    q: "Funciona para clínicas com vários profissionais?",
    a: "Sim! O Agendix suporta workspaces com múltiplos profissionais, cada um com sua agenda, clientes e configurações.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Perguntas frequentes
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border rounded-xl px-6 bg-card"
              >
                <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
