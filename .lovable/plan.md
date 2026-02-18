
## Adicionar Meta Tag de Verificação do Google Search Console

### O que será feito

Adicionar a meta tag fornecida pelo Google no `<head>` do arquivo `index.html`:

```html
<meta name="google-site-verification" content="IF1SDrhMpbWxMIdg-ZqHO2GUKp5vywVsLojIaubL1zQ" />
```

### Arquivo alterado

- **`index.html`** — Inserir a meta tag dentro do `<head>`, junto com as demais meta tags existentes.

### Passos após a publicação

1. Lovable publica o `index.html` atualizado
2. Você acessa o Google Search Console e clica em **"Verificar"**
3. O Google encontra a meta tag e confirma a propriedade do domínio
4. Com o domínio verificado, o Erro 1 ("domínio não registrado") é resolvido
5. Você pode então submeter novamente a verificação no Google Cloud Console → OAuth Consent Screen
