

## Problema

As notificações no sistema são apenas visuais (switches decorativos) — não persistem no banco e não disparam nenhuma ação real. O ícone de sino no dashboard não faz nada. Não existe resumo diário via WhatsApp.

## Plano

### 1. Criar tabela `notification_preferences` para persistir preferências

Colunas: `workspace_id`, `notify_email_confirmation` (bool), `notify_payment_pending` (bool), `notify_daily_summary` (bool). RLS por workspace member. Os switches em Configurações passam a ler/gravar nessa tabela.

### 2. Criar tabela `notifications` para alertas no dashboard

Colunas: `id`, `workspace_id`, `title`, `body`, `type` (appointment_reminder, payment_pending, daily_summary), `read` (bool), `created_at`, `related_id` (uuid opcional). RLS por workspace member.

### 3. Painel de notificações no Dashboard (sino)

- Ao clicar no ícone de sino, abre um popover/dropdown listando as notificações não lidas e recentes
- Badge com contador de não lidas no sino
- Botão "Marcar todas como lidas"
- Notificações clicáveis que direcionam para a aba relevante (agendamentos, pagamentos)

### 4. Edge Function `daily-summary` — resumo diário via WhatsApp

Nova Edge Function executada via pg_cron uma vez por dia (ex: 7h horário de Brasília). Para cada workspace com WhatsApp conectado e `notify_daily_summary = true`:

- Busca agendamentos do dia (status scheduled/confirmed)
- Busca pagamentos pendentes
- Monta texto resumo:
  ```
  📋 Resumo do dia - 30/03/2026

  📅 Sessões de hoje (3):
  • 09:00 - Maria Silva
  • 11:00 - João Santos
  • 14:30 - Ana Costa

  💰 Pagamentos pendentes (2):
  • Maria Silva - R$ 150,00
  • Pedro Lima - R$ 200,00

  Bom trabalho! 💪
  ```
- Envia para o número do próprio profissional (phone do workspace owner) via UazAPI
- Também insere uma notificação na tabela `notifications` para aparecer no dashboard

### 5. Geração de notificações automáticas

Adicionar lógica na Edge Function `process-message-rules` (que já roda a cada minuto) para, além de enfileirar mensagens WhatsApp, inserir registros na tabela `notifications`:

- Quando uma sessão está próxima (ex: 1h antes) → notificação no dashboard
- Quando um pagamento está pendente há mais de 3 dias → notificação no dashboard

### 6. Persistir preferências nos switches de Configurações

Os switches de Notificações passam a carregar e salvar na tabela `notification_preferences`, usando um hook `use-notification-preferences`.

---

## Detalhes Técnicos

**Migrações (2 tabelas):**
- `notification_preferences` — 1 row por workspace, 3 booleans
- `notifications` — append-only, com RLS de workspace member, UPDATE para marcar como lida

**Arquivos modificados:**
- `src/pages/Dashboard.tsx` — sino com popover e badge
- `src/components/dashboard/ConfiguracoesTab.tsx` — persistir switches
- `src/components/dashboard/NotificationsPopover.tsx` — novo componente
- `src/hooks/use-notifications.ts` — novo hook (fetch + mark read)
- `src/hooks/use-notification-preferences.ts` — novo hook
- `supabase/functions/daily-summary/index.ts` — nova Edge Function
- `supabase/functions/process-message-rules/index.ts` — adicionar insert em `notifications`

**pg_cron para resumo diário:**
```sql
SELECT cron.schedule('daily-summary', '0 10 * * *', ...);
```
(10:00 UTC = 7:00 BRT)

