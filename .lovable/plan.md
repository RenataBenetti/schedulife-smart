
## Problema

O link de cadastro do cliente está sendo gerado com `window.location.origin`, que aponta para a URL de **preview do Lovable** (protegida por autenticação da plataforma). Quando o cliente abre o link, encontra o popup "Request access" do Lovable, bloqueando o acesso ao formulário.

## Solução

Substituir `window.location.origin` pela URL publicada do projeto (`https://schedulife-smart.lovable.app`) ao montar o link de cadastro do cliente.

## Arquivo a modificar

**`src/components/dashboard/ClientesTab.tsx`** — linha 128:

```
// Antes (problemático):
const url = `${window.location.origin}/cadastro/${result.token}`;

// Depois (correto):
const APP_URL = import.meta.env.VITE_APP_URL || "https://schedulife-smart.lovable.app";
const url = `${APP_URL}/cadastro/${result.token}`;
```

## Por que esta abordagem?

- A URL de preview (`id-preview--...lovable.app`) é protegida pela plataforma Lovable e exige autenticação.
- A URL publicada (`schedulife-smart.lovable.app`) é pública e acessível por qualquer pessoa sem login.
- Usar uma variável de ambiente `VITE_APP_URL` com fallback para a URL publicada é a abordagem mais robusta: permite sobrescrever se o domínio mudar, e funciona tanto em preview (para testes internos) quanto em produção.

## Impacto

- Mudança mínima (uma linha).
- O link gerado passará a apontar para o domínio público do app, permitindo que o cliente acesse o formulário sem nenhuma barreira.
