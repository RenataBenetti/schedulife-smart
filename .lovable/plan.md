
## Criar Páginas de Política de Privacidade e Termos de Serviço

### O que o Google está pedindo

Conforme a imagem enviada, o Google exige dois links públicos:
1. **Link da Política de Privacidade** — explicando quais dados o app coleta e como usa
2. **Link dos Termos de Serviço** — regras de uso da plataforma

### Links que você vai receber ao final

Após a implementação e publicação, você colará estes dois links no Google Cloud Console:

- Política de Privacidade: `https://schedulife-smart.lovable.app/privacidade`
- Termos de Serviço: `https://schedulife-smart.lovable.app/termos`

### O que será criado

**1. Página de Política de Privacidade** — `src/pages/PrivacyPolicy.tsx`

Página pública com conteúdo completo e real exigido pelo Google, incluindo:
- Dados coletados: nome, e-mail, dados do Google Calendar (eventos, horários)
- Finalidade: agendamentos, notificações via WhatsApp
- Compartilhamento com Google e Meta/WhatsApp
- Que o app **não vende dados a terceiros**
- Como revogar o acesso ao Google Calendar
- Direitos do usuário (acesso, correção, exclusão)
- Dados de contato do responsável
- Data de vigência

**2. Página de Termos de Serviço** — `src/pages/TermsOfService.tsx`

Página pública com os termos de uso da plataforma Agendix, incluindo:
- Descrição do serviço (gestão de agendamentos para profissionais)
- Responsabilidades do usuário
- Política de assinatura e cancelamento
- Limitação de responsabilidade

**3. Atualizar rotas** — `src/App.tsx`

Adicionar duas rotas públicas (sem necessidade de login):
```
/privacidade → <PrivacyPolicy />
/termos      → <TermsOfService />
```

**4. Atualizar rodapé** — `src/components/landing/FooterSection.tsx`

Trocar os links `href="#"` por links reais apontando para as novas páginas, usando o componente `<Link>` do React Router.

### Passos após a implementação

1. Clique em **Publish → Update** no Lovable para publicar as páginas
2. Acesse o Google Cloud Console → OAuth Consent Screen
3. Cole os dois links nos campos correspondentes:
   - Política de Privacidade: `https://schedulife-smart.lovable.app/privacidade`
   - Termos de Serviço: `https://schedulife-smart.lovable.app/termos`
4. Salve e solicite a verificação do app para remover o aviso de "acesso bloqueado"
