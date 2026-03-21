

## Problema

O Google exige três coisas para verificação:

1. A página inicial (`agendix.soriamarketing.com.br`) precisa ter um link visível para a Política de Privacidade
2. A Política de Privacidade precisa estar em HTML básico acessível (não uma SPA React)
3. A Política de Privacidade precisa estar no mesmo domínio qualificado (`agendix.soriamarketing.com.br`)

Atualmente, o footer da landing page aponta para `/privacidade.html` (arquivo estático que já existe em `public/`), mas os links internos dentro do `privacidade.html` apontam para `https://agendix.soriamarketing.com.br` — o que está correto. O problema é que o footer também precisa apontar para a versão `.html` no mesmo domínio, e a Política de Privacidade precisa ser servida como HTML puro (não via React router).

## Plano

### 1. Corrigir links do Footer da Landing Page
- Alterar o link de Privacidade de `/privacidade.html` para `/privacidade.html` (já está correto no código, mas confirmar que funciona como arquivo estático)
- Alterar o link de Termos de `/termos.html` para `/termos.html` (já correto)
- O arquivo `public/privacidade.html` já existe e será servido diretamente pelo Vite/servidor como HTML estático — isso atende ao requisito de "formato básico da Web"

### 2. Adicionar link de Privacidade visível na Navbar da Landing Page
- Adicionar um link "Política de Privacidade" no footer da landing page com mais destaque, garantindo que o Google crawler encontre facilmente
- O link deve apontar para `/privacidade.html`

### 3. Atualizar URLs internas no `privacidade.html`
- Garantir que os links de "Voltar ao início" apontem para `https://agendix.soriamarketing.com.br`
- Já estão corretos no arquivo atual

### 4. Publicar as mudanças
- Após publicar, a Política de Privacidade estará acessível em `https://agendix.soriamarketing.com.br/privacidade.html` como HTML puro
- O footer da página inicial terá o link visível

## Detalhes Técnicos

**Arquivo:** `src/components/landing/FooterSection.tsx`
- Manter link `/privacidade.html` (arquivo estático, não rota React)
- Garantir que o link é claro: "Política de Privacidade" em vez de apenas "Privacidade"

**Arquivo:** `public/privacidade.html`  
- Já existe e está completo — nenhuma alteração necessária

**Nota importante:** O domínio `agendix.soriamarketing.com.br` precisa estar configurado como domínio customizado apontando para este projeto Lovable para que `/privacidade.html` seja acessível nesse domínio. Se ainda não estiver configurado, será necessário fazer isso nas configurações do projeto.

