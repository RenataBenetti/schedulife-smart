
## Corrigir o Erro de Verificação do Google — Domínio agendix.soriamarketing.com.br

### Por que o Google rejeita as páginas atuais?

As páginas `/privacidade` e `/termos` são parte do app React. Quando o **robô do Google** tenta acessá-las, ele não executa JavaScript — ele só lê o HTML bruto. O que ele encontra é algo assim:

```html
<div id="root"></div>
<script src="/assets/index.js"></script>
```

Ou seja, página em branco do ponto de vista do robô. Por isso o Google diz "formatação incorreta" e rejeita.

### Solução: Criar arquivos HTML estáticos na pasta public/

Criar dois arquivos `.html` puros que o Google consegue ler sem precisar de JavaScript:

- `public/privacidade.html`
- `public/termos.html`

Esses arquivos são servidos diretamente pelo servidor web, sem passar pelo React. O conteúdo será **idêntico** ao das páginas já criadas, mas em HTML simples com CSS inline.

### URLs que você vai usar no Google Cloud Console

Após publicar, use estes links no Google OAuth Consent Screen:

| Campo | URL |
|---|---|
| URL da página inicial | `https://agendix.soriamarketing.com.br` |
| Política de Privacidade | `https://agendix.soriamarketing.com.br/privacidade.html` |
| Termos de Serviço | `https://agendix.soriamarketing.com.br/termos.html` |

### Arquivos a criar

**`public/privacidade.html`** — Política de Privacidade em HTML puro, com todo o conteúdo já presente na página React (`src/pages/PrivacyPolicy.tsx`), incluindo obrigatoriamente:
- Dados coletados do Google Calendar
- Declaração de não venda de dados a terceiros
- Como revogar o acesso ao Google Calendar
- Dados de contato

**`public/termos.html`** — Termos de Serviço em HTML puro, com todo o conteúdo já presente em `src/pages/TermsOfService.tsx`.

### Nenhuma mudança nas páginas React

As páginas `/privacidade` e `/termos` no app React continuam funcionando normalmente para os usuários. Os arquivos `.html` são exclusivos para o robô do Google.

### Passos após a implementação

1. Clique em **Publish → Update** no Lovable para publicar os arquivos estáticos
2. No Google Cloud Console → OAuth Consent Screen, corrija os campos:
   - Política de Privacidade: `https://agendix.soriamarketing.com.br/privacidade.html`
   - Termos de Serviço: `https://agendix.soriamarketing.com.br/termos.html`
3. Salve e tente a verificação novamente
