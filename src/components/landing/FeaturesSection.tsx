import { motion } from "framer-motion";
import {
  MessageSquare,
  CalendarDays,
  CreditCard,
  FileText,
  Bell,
  Users,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  { icon: MessageSquare, title: "WhatsApp Automático", desc: "Confirmações e lembretes enviados automaticamente." },
  { icon: CalendarDays, title: "Google Calendar", desc: "Sincronização bidirecional com sua agenda." },
  { icon: CreditCard, title: "Cobranças via Asaas", desc: "Links de pagamento com acompanhamento em tempo real." },
  { icon: FileText, title: "Prontuários", desc: "Histórico completo de sessões por cliente." },
  { icon: Bell, title: "Lembretes Inteligentes", desc: "Regras personalizáveis para cada tipo de mensagem." },
  { icon: Users, title: "Multi-profissional", desc: "Workspaces separados para cada profissional ou clínica." },
  { icon: Shield, title: "Dados Seguros", desc: "Criptografia e isolamento total entre workspaces." },
  { icon: Zap, title: "Setup Rápido", desc: "Wizard guiado para começar em menos de 5 minutos." },
];

export const FeaturesSection = () => {
  return (
    <section id="recursos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Recursos</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Tudo que você precisa em uma plataforma
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-card transition-all duration-300 group"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feat.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{feat.title}</h3>
              <p className="text-sm text-muted-foreground">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
