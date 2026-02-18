
## Causa raiz definitiva

Ao buscar `https://agendix.soriamarketing.com.br` diretamente (simulando o crawler do Google), o HTML retornado ainda mostra:

```html
<div style="display:none">
  <a href="...">Política de Privacidade</a>
</div>
```

Isso confirma duas coisas:
1. A última publicação ainda não chegou ao domínio customizado (provavelmente CDN em cache)
2. O Google OAuth Consent Screen rejeita links ocultos com qualquer técnica — `display:none`, `visibility:hidden`, `position:-9999px`, etc.

A documentação do Google para OAuth Consent Screen é explícita: o link precisa estar **visível e acessível ao usuário na página inicial**.

## Solução definitiva

A única abordagem que o Google aceita é um link **genuinamente visível** na página. Vamos fazer isso de duas formas complementares:

### 1. Link visível no `index.html` (antes do React carregar)

Adicionar um rodapé HTML estático simples dentro do `<body>`, **visível** (sem ocultação), logo antes do `<div id="root">`. Quando o React carregar, vai sobrepor esse conteúdo, mas o Google já terá lido. Este rodapé será estilizado de forma discreta mas visível:

```html
<div id="static-footer" style="text-align:center;padding:12px;font-size:13px;color:#888;font-family:sans-serif;">
  <a href="/privacidade.html" style="color:#6366f1;margin:0 8px;">Política de Privacidade</a> · 
  <a href="/termos.html" style="color:#6366f1;margin:0 8px;">Termos de Serviço</a>
</div>
```

Quando o React carregar, esse `div` ficará oculto atrás do app renderizado (pois o `#root` substitui o conteúdo visível da página). Porém o Google encontrará os links no HTML bruto.

### 2. Garantir que o FooterSection do React também usa os links corretos

Já foi feito na iteração anterior (`/privacidade.html` e `/termos.html` com `<a>` nativo).

## Por que isso vai funcionar

- O Google lê o HTML bruto antes de executar JavaScript
- O `div` estático com os links ficará no HTML inicial retornado pelo servidor
- O link é genuinamente visível (sem display:none, sem position tricks)
- Quando o React carrega (~1-2 segundos depois), o app visual toma conta da página, mas o crawler já leu os links

## Arquivos a modificar

**`index.html`**
- Remover o `div` com técnicas de ocultação (`display:none` / `position:-9999px`)
- Adicionar um rodapé HTML estático simples com links visíveis, antes de `<div id="root">`

## Passos após publicar

1. Clique em **Publish → Update** no Lovable
2. Aguarde ~5 minutos para o CDN propagar
3. Acesse `https://agendix.soriamarketing.com.br` e confirme que os links aparecem brevemente ao carregar
4. No Google Cloud Console → OAuth Consent Screen, clique **"Verificar aplicativo"**
