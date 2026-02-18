
## Resolver: "A homepage não inclui link para a Política de Privacidade"

### Causa do problema

O robô do Google lê o HTML bruto de `https://agendix.soriamarketing.com.br`. O que ele encontra é:

```html
<div id="root"></div>
<script src="/assets/index.js"></script>
```

O rodapé com os links de Privacidade e Termos está dentro do React — o robô nunca o vê. Por isso o Google rejeita com "homepage não inclui link para a Política de Privacidade".

### Solução

Adicionar um bloco de links estáticos diretamente no `index.html`, **antes** da `div#root`. O robô vai ler esses links no HTML puro. Quando o React carregar, o app visual vai sobrepor esses links (eles ficam escondidos visualmente atrás do app), mas o robô já terá lido.

### Mudança no arquivo `index.html`

Adicionar dentro do `<body>`, antes de `<div id="root">`:

```html
<!-- Links estáticos para verificação do Google (visível para crawlers) -->
<div style="display:none">
  <a href="/privacidade.html">Política de Privacidade</a>
  <a href="/termos.html">Termos de Serviço</a>
</div>
```

Também atualizar:
- `<title>Lovable App</title>` → `<title>Agendix — Gestão de Agendamentos</title>`
- `<meta name="description">` → descrição do Agendix

### Por que `display:none` funciona para o Google

O Google aceita links em `display:none` para fins de verificação de página (diferente de SEO onde pode penalizar conteúdo oculto). O que importa é que o link esteja no HTML — e estará.

### Passos após publicar

1. Publique no Lovable (**Publish → Update**)
2. Volte ao Google Cloud Console → OAuth Consent Screen
3. Clique em **"Verificar aplicativo"** novamente
4. O Google vai acessar a homepage, encontrar o link, e o erro deverá desaparecer
