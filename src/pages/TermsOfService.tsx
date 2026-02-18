import { Link } from "react-router-dom";
import { Calendar, ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Agendix</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 18 de fevereiro de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao se cadastrar e utilizar a plataforma <strong>Agendix</strong>, você concorda com estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p>
              A Agendix é uma plataforma de gestão de agendamentos voltada para profissionais autônomos e prestadores de serviço. A plataforma oferece:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Gerenciamento de agenda e agendamentos com clientes.</li>
              <li>Cadastro e gerenciamento de clientes.</li>
              <li>Integração com o Google Calendar para sincronização de eventos.</li>
              <li>Envio de notificações e lembretes via WhatsApp Business API.</li>
              <li>Controle financeiro básico (pagamentos e cobranças).</li>
              <li>Modelos de mensagens personalizáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Elegibilidade</h2>
            <p>
              Para utilizar a Agendix, você deve ter pelo menos 18 anos de idade e capacidade legal para celebrar contratos. Ao aceitar estes Termos, você declara que atende a esses requisitos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Conta e Responsabilidades do Usuário</h2>
            <p>Ao criar uma conta na Agendix, você é responsável por:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Fornecer informações verdadeiras, precisas e atualizadas no cadastro.</li>
              <li>Manter a confidencialidade de sua senha e não compartilhá-la com terceiros.</li>
              <li>Notificar imediatamente a Agendix sobre qualquer acesso não autorizado à sua conta.</li>
              <li>Garantir que os dados dos seus clientes cadastrados foram obtidos com o consentimento adequado, em conformidade com a LGPD.</li>
              <li>Utilizar a plataforma exclusivamente para fins lícitos e legítimos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Uso Aceitável</h2>
            <p>É vedado ao usuário:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Utilizar a plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.</li>
              <li>Enviar mensagens não solicitadas (spam) ou conteúdo ofensivo através das integrações de WhatsApp.</li>
              <li>Tentar acessar sistemas ou dados de outros usuários da plataforma.</li>
              <li>Reverter engenharia, descompilar ou tentar extrair o código-fonte da plataforma.</li>
              <li>Utilizar a plataforma de forma que possa prejudicar sua disponibilidade ou desempenho.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Planos e Pagamentos</h2>
            <p>
              A Agendix oferece um período de avaliação gratuita (trial). Após o período de trial, a continuidade do uso está condicionada à contratação de um plano pago.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Cobrança:</strong> As cobranças são realizadas de forma recorrente (mensal ou anual), conforme o plano escolhido.</li>
              <li><strong>Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento. O acesso continuará ativo até o fim do período já pago.</li>
              <li><strong>Reembolso:</strong> Não realizamos reembolsos proporcionais por cancelamento antecipado, exceto quando exigido por lei.</li>
              <li><strong>Inadimplência:</strong> Em caso de falha no pagamento, o acesso à plataforma poderá ser suspenso até a regularização.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da plataforma Agendix — incluindo software, design, logotipos e textos — é de propriedade exclusiva da Agendix e está protegido por leis de propriedade intelectual. É concedida ao usuário uma licença limitada, não exclusiva e intransferível para uso da plataforma durante o período de vigência da assinatura.
            </p>
            <p className="mt-2">
              Os dados inseridos pelo usuário (clientes, agendamentos, etc.) permanecem de sua propriedade. A Agendix não reivindica direitos sobre esses dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Disponibilidade do Serviço</h2>
            <p>
              Buscamos manter a plataforma disponível 24 horas por dia, 7 dias por semana. No entanto, não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência sempre que possível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
            <p>
              A Agendix não será responsável por danos indiretos, incidentais, especiais ou consequenciais decorrentes do uso ou incapacidade de uso da plataforma, incluindo:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Perda de dados decorrente de falhas técnicas.</li>
              <li>Falhas nas integrações com serviços de terceiros (Google, WhatsApp).</li>
              <li>Prejuízos causados por acesso não autorizado à conta do usuário.</li>
            </ul>
            <p className="mt-2">
              A responsabilidade total da Agendix, em qualquer hipótese, será limitada ao valor pago pelo usuário nos últimos 3 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Rescisão</h2>
            <p>
              A Agendix reserva-se o direito de suspender ou encerrar sua conta, sem aviso prévio, em caso de violação destes Termos ou de conduta que prejudique a plataforma ou outros usuários.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste instrumento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contato</h2>
            <p>Para dúvidas sobre estes Termos de Serviço, entre em contato:</p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p><strong>Agendix</strong></p>
              <p>E-mail: <a href="mailto:contato@agendix.com.br" className="text-primary underline">contato@agendix.com.br</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Notificaremos sobre alterações relevantes por e-mail ou aviso na plataforma. O uso continuado após a notificação implica aceitação dos novos termos.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Agendix. Todos os direitos reservados. · <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link> · <Link to="/termos" className="hover:text-foreground">Termos</Link></p>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;
