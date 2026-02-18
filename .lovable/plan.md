
# Correção: SetupWizard — Substituir WhatsApp Cloud API pelo QR Code (Evolution API)

## Causa raiz identificada

O dialog mostrado na imagem **não é o painel de Configurações** (ConfiguracoesTab). É a tela do `SetupWizard.tsx`, o assistente de boas-vindas que novos usuários veem ao criar a conta.

No arquivo `src/pages/SetupWizard.tsx`, o componente `WhatsAppStep` (linhas 118-148) ainda exibe o formulário antigo da Meta Cloud API:
- Campo: Business ID
- Campo: Phone Number ID
- Campo: Access Token
- Nota: "O custo das mensagens é pago diretamente por você à Meta"

Esse arquivo nunca foi atualizado durante a implementação anterior. A `ConfiguracoesTab.tsx` e o `WhatsAppEvolutionDialog.tsx` estão corretos — o problema está exclusivamente no `SetupWizard.tsx`.

---

## O que será alterado

### Arquivo: `src/pages/SetupWizard.tsx`

Substituir o componente `WhatsAppStep` (passo 0 do wizard) completamente:

**Antes (Meta Cloud API):**
- Título: "Conectar WhatsApp Cloud API"
- Campos: Business ID, Phone Number ID, Access Token
- Nota sobre custo da Meta

**Depois (Evolution API / QR Code):**
- Título: "Conectar WhatsApp via QR Code"
- Explicação simples do que é necessário: URL do servidor, API Key, nome da instância
- Dica amigável sobre usar um número dedicado (sem mencionar risco ou banimento)
- Botão "Configurar agora" que redireciona o usuário para a aba Integrações no dashboard
- Alternativa: o usuário pode pular e configurar depois em Configurações → Integrações

O wizard é apenas informativo/introdutório — a configuração real já acontece no `WhatsAppEvolutionDialog` do dashboard. Portanto, o step do wizard será simplificado para orientar o usuário a ir até Configurações após concluir o setup, em vez de duplicar o formulário inteiro.

---

## Mudança técnica

Apenas **um arquivo** precisa ser modificado:

| Arquivo | Mudança |
|---|---|
| `src/pages/SetupWizard.tsx` | Substituir o componente `WhatsAppStep` pelo novo fluxo QR Code |

---

## Resultado esperado

Ao acessar o SetupWizard (ex: usuário novo), o passo "WhatsApp" mostrará:
- Nome correto: "Conectar WhatsApp via QR Code"
- Instruções sobre a Evolution API
- Dica amigável sobre chip dedicado
- Orientação para finalizar a conexão em Configurações → Integrações
- Sem nenhuma referência à Meta, Business ID, Phone Number ID ou Access Token
