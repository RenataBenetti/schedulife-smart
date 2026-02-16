

# Plano: Corrigir modelo de pagamentos e integrações

## Entendimento correto

- **Asaas** e usado apenas por voce (Agendix) para cobrar a assinatura R$69/mes dos seus clientes (profissionais). Isso ja esta no fluxo de assinatura (aba Plano). Nao aparece como integracao para o cliente.
- **Pagamentos dos pacientes**: o profissional (seu cliente) cobra os pacientes dele do jeito que quiser -- Pix de qualquer banco, link de credito, etc. Ele simplesmente cola um link de pagamento na plataforma. A tabela `payment_links` ja tem o campo `external_link` para isso.

---

## Mudancas necessarias

### 1. Remover "Asaas (Pagamentos)" da aba Integracoes

A integracao Asaas nao faz sentido para o cliente. Ele nao precisa configurar nada de Asaas. Remover esse card do `ConfiguracoesTab.tsx`.

As integracoes ficam apenas:
- **WhatsApp Cloud API** -- para disparos automaticos de mensagens
- **Google Calendar** -- para sincronizar agendamentos

### 2. Aba Pagamentos -- manter como esta

A aba Pagamentos ja funciona com o modelo correto:
- O profissional cria uma cobranca informando valor e cliente
- Cola um link de pagamento externo (de qualquer banco, Pix, cartao, etc.)
- Marca como pago/pendente

O campo `external_link` da tabela `payment_links` ja suporta isso. O botao "Criar cobranca" precisa ser implementado com um formulario simples:
- Selecionar cliente
- Valor (R$)
- Link de pagamento (URL de qualquer banco/plataforma)

### 3. Sua cobranca via Asaas (assinatura do Agendix)

A cobranca que voce faz dos seus clientes (R$69/mes) sera gerenciada:
- Na aba **Plano & Assinatura** (ja existe em Configuracoes)
- O botao "Assinar agora" vai integrar com o Asaas para gerar a cobranca da assinatura
- Essa integracao e interna (suas credenciais do Asaas), o cliente nao precisa saber

---

## Implementacao tecnica

### Arquivo: `src/components/dashboard/ConfiguracoesTab.tsx`
- Remover o card "Asaas (Pagamentos)" da lista de integracoes
- Manter apenas WhatsApp e Google Calendar

### Arquivo: `src/components/dashboard/PagamentosTab.tsx`
- Implementar o formulario "Criar cobranca" com Dialog:
  - Select de cliente (do workspace)
  - Input de valor em reais
  - Input de link externo (URL -- qualquer banco, Pix, cartao)
- Adicionar mutation `useAddPaymentLink` no `use-data.ts`
- Permitir marcar como pago/nao pago

### Arquivo: `src/hooks/use-data.ts`
- Adicionar `useAddPaymentLink` mutation
- Adicionar `useUpdatePaymentLink` mutation (para marcar pago)

### Nao criar tabela `asaas_config`
- A integracao Asaas sera implementada futuramente como logica interna do Agendix (para cobrar assinatura), nao como integracao do cliente

---

## Resumo

| O que | Quem | Como |
|---|---|---|
| Assinatura R$69/mes | Agendix cobra o profissional | Asaas (interno, aba Plano) |
| Cobranca do paciente | Profissional cobra o paciente | Link externo de qualquer banco (aba Pagamentos) |
| WhatsApp | Profissional configura | Integracao na aba Configuracoes |
| Google Calendar | Profissional configura | Integracao na aba Configuracoes |

