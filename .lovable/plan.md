

# Plano: Reorganizar abas e implementar sistema de mensagens automatizadas

## Resumo

Trocar a ordem das abas (Mensagens antes de Pagamentos) e transformar a aba Mensagens em um sistema completo de automacao de disparos via WhatsApp, com regras baseadas no tempo relativo ao agendamento e ao status do cliente (confirmacao, pagamento, etc.).

---

## 1. Inverter ordem das abas no Dashboard

Alterar o array `tabs` em `Dashboard.tsx` para que **Mensagens** apareça antes de **Pagamentos**:

```
Clientes > Agendamentos > Mensagens > Pagamentos > Configurações
```

---

## 2. Conceito do sistema de mensagens

O usuario cria **templates de mensagem** e para cada template define **regras de disparo** com:

- **Gatilho (trigger)**: quando a mensagem deve ser enviada
  - `antes_da_sessao` -- X tempo antes do horario agendado
  - `apos_confirmacao` -- X tempo apos o cliente confirmar
  - `apos_sessao` -- X tempo apos a sessao terminar
  - `manual` -- envio manual pelo usuario

- **Tempo (offset)**: valor + unidade (ex: 24 horas, 1 dia, 30 minutos)

- **Tipo de conteudo**: texto livre ou mensagem com link de pagamento

### Exemplos praticos:
- "Lembrete de confirmacao" -- disparo 24h antes da sessao
- "Lembrete pre-sessao" -- disparo 1h antes, apos cliente confirmar
- "Link de pagamento" -- disparo apos confirmacao ou apos sessao (usuario escolhe)

---

## 3. Alteracoes no banco de dados

### 3.1 Adicionar coluna `message_type` na tabela `message_templates`

Nova coluna para diferenciar mensagens de texto puro vs. mensagens com link de pagamento:

```sql
ALTER TABLE public.message_templates
ADD COLUMN message_type text NOT NULL DEFAULT 'text'
CHECK (message_type IN ('text', 'payment_link'));
```

### 3.2 Adicionar novo trigger_type ao enum (nao necessario)

Os triggers existentes ja cobrem os casos: `antes_da_sessao`, `apos_confirmacao`, `apos_sessao`, `manual`. Nao precisa alterar o enum.

---

## 4. Reformular a aba Mensagens (`MensagensTab.tsx`)

### 4.1 Criar template (Dialog com formulario)

O botao "Novo template" abrira um modal com:

- **Nome do template** (texto)
- **Tipo**: Texto simples ou Com link de pagamento (radio/select)
- **Corpo da mensagem** (textarea) com variaveis como `{{nome_cliente}}`, `{{data_sessao}}`, `{{link_pagamento}}`
- **Regra de disparo**:
  - Gatilho: dropdown (Antes da sessao / Apos confirmacao / Apos sessao / Manual)
  - Tempo: input numerico + unidade (minutos/horas/dias)
- Botao para **adicionar mais regras** ao mesmo template (ex: lembrete 24h + lembrete 1h)

### 4.2 Editar template

Mesmo formulario, preenchido com dados existentes.

### 4.3 Excluir template

Confirmacao via AlertDialog, exclui template e regras associadas (cascade via FK).

### 4.4 Listar templates

Cada card mostra: nome, tipo, regras ativas com seus gatilhos/tempos, preview do corpo.

---

## 5. Hooks de dados (`use-data.ts`)

Adicionar mutations:

- `useAddMessageTemplate` -- insere template + regras em sequencia
- `useUpdateMessageTemplate` -- atualiza template e sincroniza regras
- `useDeleteMessageTemplate` -- deleta template (regras deletam em cascade)
- `useAddMessageRule` / `useDeleteMessageRule` -- gerenciar regras individuais

---

## 6. Detalhes tecnicos

### Arquivos modificados:
1. **`src/pages/Dashboard.tsx`** -- inverter ordem de Mensagens/Pagamentos no array `tabs`
2. **`src/components/dashboard/MensagensTab.tsx`** -- reescrever com CRUD completo (criar, editar, excluir templates com regras)
3. **`src/hooks/use-data.ts`** -- adicionar hooks de mutacao para templates e regras

### Migracao SQL:
- Adicionar coluna `message_type` em `message_templates`

### Fluxo de disparo real (WhatsApp):
O disparo efetivo via WhatsApp depende da integracao configurada em `whatsapp_config`. Nesta etapa, o sistema **configura e salva as regras**. A execucao dos disparos (via scheduled_jobs + edge function) pode ser implementada numa etapa futura.

---

## 7. Resultado esperado

O usuario podera:
1. Criar mensagens ilimitadas com regras de tempo personalizadas
2. Definir se a mensagem e de texto ou inclui link de pagamento
3. Configurar multiplas regras por template (ex: 24h antes + 1h antes apos confirmacao)
4. Editar e excluir templates existentes
5. Visualizar todas as regras ativas de cada template

