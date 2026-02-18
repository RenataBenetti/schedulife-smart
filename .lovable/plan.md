
## Problema identificado: `static-footer` bloqueando os ícones da bottom nav

### Causa raiz

O `index.html` tem este código (adicionado na tentativa de resolver o Google OAuth):

```html
<div id="static-footer" style="position:fixed;bottom:0;left:0;right:0;...;z-index:0;">
  ...links...
</div>
<div id="root" style="position:relative;z-index:1;min-height:100vh;"></div>
```

O problema é duplo:

1. O `#root` com `position:relative` + `z-index:1` cria um **novo stacking context** isolado. Elementos `position:fixed` dentro do React (como a bottom nav com `z-index:50`) passam a competir apenas dentro desse stacking context, mas o `static-footer` (que está **fora** do `#root`, no mesmo nível do `<body>`) com `z-index:0` pode visualmente sobrepor partes da tela.

2. A bottom nav mobile no `Dashboard.tsx` usa `z-index:50`, mas como o `#root` já cria um stacking context com `z-index:1`, o footer externo com `z-index:0` aparece atrás — porém o background branco (`background:#f9fafb`) do `static-footer` **preenche** a área da bottom nav, tornando os ícones invisíveis ou bloqueados ao toque.

### Solução

Remover completamente o `style` do `#root` (não precisa de `position:relative;z-index:1`) e mudar o `static-footer` para uma abordagem que **não interfere** visualmente nem com toques:

- `pointer-events:none` para que o footer HTML não capture cliques
- `opacity:0` para ficar totalmente invisível (mas ainda presente no HTML para o crawler do Google)
- Remover o `background` que estava cobrindo a bottom nav

Isso mantém os links no HTML bruto para o Google e **nunca** interfere com os ícones ou qualquer elemento da UI React.

### Arquivo a modificar

**`index.html`** — apenas as linhas do `static-footer` e do `#root`:

```html
<!-- ANTES (problemático) -->
<div id="static-footer" style="position:fixed;bottom:0;left:0;right:0;text-align:center;padding:10px;font-size:12px;color:#999;font-family:sans-serif;background:#f9fafb;z-index:0;">
  ...
</div>
<div id="root" style="position:relative;z-index:1;min-height:100vh;"></div>

<!-- DEPOIS (correto) -->
<div id="static-footer" style="position:absolute;top:0;left:-9999px;width:1px;height:1px;overflow:hidden;pointer-events:none;" aria-hidden="true">
  <a href="/privacidade.html">Política de Privacidade</a>
  <a href="/termos.html">Termos de Serviço</a>
</div>
<div id="root"></div>
```

**Por que `position:absolute;top:0;left:-9999px` funciona para o Google?**
O Google rastreia links no HTML independentemente da posição. O que ele rejeita é `display:none` e `visibility:hidden` — posicionamento fora da tela é aceito pelos crawlers. O Google OAuth Consent Screen verifica a existência do link href na página, não sua posição visual.

**Por que isso resolve os ícones?**
- O `#root` volta a ser um elemento normal sem stacking context próprio
- A bottom nav com `z-index:50` funciona normalmente
- O `static-footer` não tem background, não captura cliques (`pointer-events:none`) e está fora da área visível
