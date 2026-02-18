
# Implementação do WhatsApp via QR Code (Evolution API) — Motor de Disparos

## Visão Geral

O objetivo é fazer o sistema funcionar de ponta a ponta com a Evolution API: o profissional conecta o WhatsApp via QR Code, e o sistema passa a enviar mensagens automaticamente com base nas regras de disparo já configuradas na aba Mensagens. O guia de instalação é secundário e será simplificado.

---

## O que será construído

### 1. Banco de dados — Migração da tabela `whatsapp_config`

A tabela atual guarda apenas credenciais da Meta API. Precisamos adicionar os campos da Evolution API e uma tabela de log de mensagens:

```sql
-- Adicionar campos Evolution API na tabela existente
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS integration_type text DEFAULT 'evolution_qr',
  ADD COLUMN IF NOT EXISTS evolution_api_url text,
  ADD COLUMN IF NOT EXISTS evolution_api_key text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'disconnected';

-- Tabela de log de mensagens enviadas (evita duplicatas e permite rastreio)
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  appointment_id uuid REFERENCES appointments(id),
  client_id uuid REFERENCES clients(id),
  template_id uuid REFERENCES message_templates(id),
  rule_id uuid REFERENCES message_rules(id),
  phone text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(),
  error_message text
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_member_logs" ON public.message_logs
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
```

---

### 2. Tela de Configuração do WhatsApp — substituir dialog atual

O dialog atual (que pede Business ID / Phone Number ID / Access Token da Meta) será substituído por uma nova interface com o fluxo QR Code:

**Novo `WhatsAppEvolutionDialog.tsx`:**
- Campo: URL do servidor Evolution API (ex: `http://meuservidor.com:8080`)
- Campo: API Key da Evolution
- Campo: Nome da instância (ex: `consultorio-maria`)
- Botão "Verificar conexão" — chama edge function que testa a instância
- Exibe status da instância: `connected` (verde), `disconnected` (cinza), `connecting` (amarelo)
- Se desconectada: botão "Gerar QR Code" que busca o QR da instância e exibe na tela para o profissional escanear com o celular

**Dica sobre chip separado (tom amigável, sem mencionar risco):**
> "Para manter sua organização, recomendamos usar um número dedicado ao consultório — diferente do seu WhatsApp pessoal. Assim as mensagens ficam separadas e com a identidade profissional da sua clínica."

---

### 3. Edge Function: `send-whatsapp-message`

Nova edge function que envia uma mensagem via Evolution API:

```
POST /functions/v1/send-whatsapp-message
Body: { workspace_id, phone, message, appointment_id?, client_id?, template_id?, rule_id? }
```

Internamente:
1. Busca `whatsapp_config` do workspace (com `evolution_api_url`, `evolution_api_key`, `evolution_instance`)
2. Formata o número de telefone (remove formatação, adiciona `@s.whatsapp.net`)
3. Chama `POST {evolution_api_url}/message/sendText/{instance}` com a mensagem
4. Registra o resultado na tabela `message_logs`

---

### 4. Edge Function: `process-message-rules`

Edge function agendada que varre os agendamentos futuros e dispara mensagens automaticamente:

```
POST /functions/v1/process-message-rules
```

Lógica:
1. Busca todos os workspaces com WhatsApp Evolution API conectado (`connection_status = 'connected'`)
2. Para cada workspace, busca as `message_rules` ativas
3. Para regras do tipo `antes_da_sessao`: verifica se há agendamentos cujo horário está a X horas/minutos do momento atual (dentro de uma janela de 5 min de tolerância)
4. Para cada agendamento elegível, verifica se já não foi enviada (consulta `message_logs` pela combinação `rule_id + appointment_id`)
5. Substitui variáveis no template: `{{nome_cliente}}`, `{{data_sessao}}`, `{{hora_sessao}}`
6. Chama `send-whatsapp-message` para disparar
7. Após sessão: regras `apos_sessao` funcionam da mesma forma

Esta função será chamada periodicamente via chamada manual (botão no dashboard) ou futuramente via cron.

---

### 5. Botão de Envio Manual na aba Agendamentos

Na aba de Agendamentos, cada card de agendamento ganhará um botão de ícone WhatsApp que abre um mini-dialog:
- Selecionar template
- Prévia da mensagem (com variáveis substituídas)
- Botão "Enviar agora"

---

### 6. Atualizar `ConfiguracoesTab.tsx`

Substituir o dialog antigo da Meta API pelo novo `WhatsAppEvolutionDialog` com:
- Card de status mostrando `Conectado` / `Desconectado` com cor
- Botão "Configurar" que abre o novo dialog
- Se conectado: mostra o nome da instância e status

---

## Arquivos a criar/modificar

| Arquivo | Ação | Descrição |
|---|---|---|
| `supabase/migrations/XXXX_evolution_api.sql` | Criar | Migração do banco de dados |
| `supabase/functions/send-whatsapp-message/index.ts` | Criar | Engine de envio via Evolution API |
| `supabase/functions/process-message-rules/index.ts` | Criar | Agendador automático de disparos |
| `src/components/dashboard/WhatsAppEvolutionDialog.tsx` | Criar | Novo dialog de configuração com QR Code |
| `src/components/dashboard/ConfiguracoesTab.tsx` | Modificar | Substituir dialog Meta API pelo novo |
| `src/components/dashboard/AgendamentosTab.tsx` | Modificar | Adicionar botão de envio manual |
| `src/hooks/use-data.ts` | Modificar | Adicionar hook `useMessageLogs` |

---

## Fluxo completo após implementação

```text
Profissional configura Evolution API
        |
        v
Informa URL + API Key + nome da instância
        |
        v
Sistema verifica conexão da instância
        |
        v
Se desconectada: exibe QR Code para escanear
        |
        v
Status muda para "connected"
        |
        v
Agendamento criado com cliente que tem telefone cadastrado
        |
        v
process-message-rules verifica regras ativas
(ex: "24h antes da sessão")
        |
        v
Substitui variáveis no template
        |
        v
send-whatsapp-message chama Evolution API
        |
        v
Mensagem entregue no WhatsApp do cliente
        |
        v
Log registrado em message_logs
```

---

## Observação sobre a linguagem do aviso do chip

A mensagem atual era agressiva. O novo tom será:
> "Para manter a organização e a identidade profissional do seu consultório, recomendamos usar um número exclusivo para o sistema — diferente do seu WhatsApp pessoal. Chips pré-pagos de operadoras como Claro, Vivo ou Tim funcionam bem para isso."

Sem mencionar banimento, risco ou limitações.
