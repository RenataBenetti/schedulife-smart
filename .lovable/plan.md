
## Resolver definitivamente: "Homepage não inclui link para Política de Privacidade"

### Causa raiz confirmada

O OAuth Consent Screen do Google requer que a homepage tenha um link **visível e clicável** para a Política de Privacidade. A abordagem `display:none` não é suficiente para essa validação específica — o Google inspeciona se um usuário real conseguiria encontrar o link.

Confirmado por diagnóstico:
- `/privacidade.html` está online e acessível
- `/termos.html` está online e acessível
- Os links estáticos no HTML existem, mas estão ocultos com `display:none`

### Solução

Adicionar links **visíveis** para `/privacidade.html` e `/termos.html` no rodapé do site React (`FooterSection.tsx`), substituindo ou complementando os links internos do React Router (`/privacidade` e `/termos`) que existem atualmente.

Dessa forma:
- O Google vê o link real no HTML renderizado (quando acessa com JavaScript habilitado)
- O crawler de HTML estático vê o link no bloco `display:none` (fallback já existente)
- Um usuário real consegue clicar e acessar as páginas

### Arquivos a modificar

**`src/components/landing/FooterSection.tsx`**
- Alterar os links de Privacidade e Termos para apontar para `/privacidade.html` e `/termos.html` com tags `<a href>` nativas (não React Router `<Link>`)
- Isso garante que as URLs absolutas funcionem corretamente

**`index.html`**
- Manter os links estáticos existentes (já estão corretos como fallback para crawlers sem JS)
- Remover o `display:none` do bloco de links estáticos para torná-los visíveis mesmo sem JavaScript

### Por que `<a href>` nativo e não React Router `<Link>`

O React Router renderiza links como `<a href="/privacidade">`, mas `/privacidade` é uma rota SPA (Single Page Application) — quando o Google acessa esse link, pode receber um 404 ou uma página em branco antes do React carregar. Já `/privacidade.html` é um arquivo estático real, sempre disponível.

### Resultado esperado

Após publicar:
1. Acesse `https://agendix.soriamarketing.com.br` — o rodapé terá links visíveis para Privacidade e Termos
2. No Google Cloud Console, clique em "Verificar aplicativo" novamente
3. O Google encontrará o link e o erro será resolvido
