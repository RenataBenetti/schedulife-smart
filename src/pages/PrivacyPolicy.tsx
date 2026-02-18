import { Link } from "react-router-dom";
import { Calendar, ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
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
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 18 de fevereiro de 2026</p>

        <div className="prose prose-neutral max-w-none space-y-8 text-foreground/90">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p>
              A <strong>Agendix</strong> ("nós", "nosso" ou "Plataforma") respeita a sua privacidade e está comprometida em proteger os dados pessoais que você nos fornece. Esta Política de Privacidade descreve quais dados coletamos, como os utilizamos, com quem os compartilhamos e quais são os seus direitos.
            </p>
            <p className="mt-2">
              Ao utilizar a Agendix, você concorda com as práticas descritas nesta política.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados que Coletamos</h2>
            <p>Coletamos as seguintes categorias de dados:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Dados de cadastro:</strong> nome completo, endereço de e-mail e senha (armazenada de forma criptografada).</li>
              <li><strong>Dados do negócio:</strong> nome do consultório ou estabelecimento, informações de clientes cadastrados na plataforma (nome, telefone, e-mail, CPF, endereço e anotações clínicas).</li>
              <li><strong>Dados do Google Calendar:</strong> quando você conecta sua conta do Google, coletamos o token de acesso (access token) e o token de atualização (refresh token) para ler e criar eventos no seu Google Calendar. Esses dados incluem títulos, horários e descrições dos eventos.</li>
              <li><strong>Dados de uso:</strong> informações sobre como você utiliza a plataforma, como agendamentos criados, mensagens enviadas e configurações realizadas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Como Utilizamos os Dados</h2>
            <p>Utilizamos os seus dados para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Fornecer e operar os serviços da Agendix, incluindo gestão de agendamentos e clientes.</li>
              <li>Sincronizar seus agendamentos com o Google Calendar, criando e lendo eventos em seu nome.</li>
              <li>Enviar notificações e lembretes de agendamentos via WhatsApp, quando configurado por você.</li>
              <li>Melhorar a plataforma com base no comportamento de uso.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
            <p>A Agendix <strong>não vende seus dados pessoais a terceiros</strong>. Compartilhamos dados apenas nas seguintes situações:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Google LLC:</strong> Para a integração com o Google Calendar, seus tokens de acesso são utilizados diretamente nas APIs do Google, respeitando os <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Termos de Privacidade do Google</a>.</li>
              <li><strong>Meta Platforms (WhatsApp):</strong> Quando você configura o envio de mensagens via WhatsApp Business API, o conteúdo das mensagens é transmitido à plataforma da Meta.</li>
              <li><strong>Prestadores de serviço de infraestrutura:</strong> Utilizamos serviços de nuvem para armazenamento e processamento de dados, que operam sob contratos de confidencialidade.</li>
              <li><strong>Obrigações legais:</strong> Podemos divulgar dados se exigido por lei, ordem judicial ou autoridade governamental competente.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Uso de Dados do Google</h2>
            <p>
              O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo respeitam a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.
            </p>
            <p className="mt-2">
              Especificamente, utilizamos os dados do Google Calendar <strong>exclusivamente</strong> para sincronizar agendamentos no contexto da plataforma Agendix. Não utilizamos esses dados para publicidade, não os vendemos e não os compartilhamos com terceiros além do necessário para operar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Como Revogar o Acesso ao Google Calendar</h2>
            <p>Você pode revogar o acesso da Agendix ao seu Google Calendar a qualquer momento:</p>
            <ol className="list-decimal pl-6 mt-2 space-y-2">
              <li>Acesse <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/permissions</a>.</li>
              <li>Localize "Agendix" na lista de aplicativos com acesso.</li>
              <li>Clique em "Remover acesso".</li>
            </ol>
            <p className="mt-2">
              Após a revogação, a sincronização com o Google Calendar será interrompida. Seus dados já armazenados na Agendix não serão afetados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento da conta, seus dados serão excluídos ou anonimizados em até 90 dias, salvo obrigação legal de retenção por prazo maior.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Seus Direitos</h2>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem os seguintes direitos:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Acesso:</strong> solicitar uma cópia dos dados que temos sobre você.</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incorretos ou desatualizados.</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão dos seus dados pessoais.</li>
              <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados para outro serviço.</li>
              <li><strong>Revogação do consentimento:</strong> revogar consentimentos dados anteriormente.</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos, entre em contato conosco pelo e-mail indicado na seção abaixo.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo criptografia em trânsito (TLS) e em repouso, controle de acesso e monitoramento de segurança. Nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade, entre em contato com o responsável pelo tratamento de dados:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p><strong>Agendix</strong></p>
              <p>E-mail: <a href="mailto:privacidade@agendix.com.br" className="text-primary underline">privacidade@agendix.com.br</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou por aviso na plataforma. A data da última atualização estará sempre indicada no topo desta página.
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

export default PrivacyPolicy;
