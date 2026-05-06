## Diagnóstico

Investiguei o banco e os logs das funções e identifiquei **três problemas distintos** que estão impedindo as notificações de chegarem por WhatsApp.

### 1. Lembretes de sessão (`process-message-rules` + `whatsapp-worker`)
- A regra ativa do seu workspace **está rodando**: a cada 1 min `process-message-rules` enfileira lembretes corretamente.
- Porém, **TODAS** as últimas tentativas na fila `whatsapp_outbox` estão com `status = failed` e o erro é sempre o mesmo:
  ```
  UazAPI request failed: [401] bearer /send/text ... | [401] token_header /send/text ... | [401] query /send/text?token=*** ...
  ```
- Esse erro é da **versão antiga** do `whatsapp-worker` (que tentava 3 estratégias: Bearer, header `token` e query string). Já reescrevemos o `_shared/uazapi.ts` e o worker para usar só `token` header, **mas o worker ainda não foi redeployado** — as mensagens novas continuariam falhando exatamente da mesma forma até deploy.

### 2. Resumo diário (`daily-summary`)
- A função `daily-summary` **nunca foi atualizada** junto com o resto do fluxo QR. Ela ainda:
  - Lê uma variável global inexistente `UAZAPI_INSTANCE_TOKEN` (hoje cada workspace tem seu próprio `instance_token` na tabela `whatsapp_instances_qr`).
  - Chama o endpoint errado `/message/sendText?instance=...` com `Authorization: Bearer` (formato UazAPI v1, não v2).
- Por isso a notificação "Resumo do dia" **aparece no sino** (é inserida em `notifications`), mas **nunca sai por WhatsApp**.

### 3. Alerta de pagamento pendente
- Não existe nenhuma função/cron que processe `notify_payment_pending`. O toggle está ligado mas **não há código** que envie esse alerta. Vamos criar.

### O que está funcionando
- As notificações no sino do dashboard (ícone de sino) estão sendo criadas corretamente em `notifications` — você pode confirmar abrindo o sino.
- A conexão do WhatsApp do seu workspace (`5519981628004`) está como `connected` e tem `instance_token` salvo.

---

## Plano de correção

### Passo 1 — Redeploy do `whatsapp-worker` e `send-whatsapp-message`
As funções já têm o código novo (header `token` apenas), mas precisam ser deployadas. Após o deploy, os próximos lembretes da fila vão usar a autenticação correta da UazAPI v2.

### Passo 2 — Reescrever `supabase/functions/daily-summary/index.ts`
- Trocar a lógica de envio para usar o helper `getUazApiConfigForToken` + `uazApiFetch` (mesmo padrão de `send-whatsapp-message`).
- Buscar o `instance_token` da `whatsapp_instances_qr` por workspace (em vez do secret global).
- Usar o endpoint correto `/send/text` com header `token`.
- Manter a inserção em `notifications` (já funciona).
- Adicionar log de erro em `notifications` quando o envio falhar, para você ver no sino que algo deu errado.

### Passo 3 — Criar função `payment-pending-check`
- Edge function que roda 1x ao dia (cron) e:
  - Para cada workspace com `notify_payment_pending = true`,
  - Busca `payment_links` com `paid = false` e `created_at < now() - 3 days`,
  - Envia 1 mensagem agregada via WhatsApp para o telefone do dono (`whatsapp_instances_qr.phone_number`),
  - Cria notificação no sino.
- Agendar via `pg_cron` para 09:00 BRT (12:00 UTC) diariamente.

### Passo 4 — Reprocessar mensagens falhadas (opcional)
Os 4 lembretes do seu workspace que falharam por 401 já passaram da hora; **não faz sentido reenviar** (cliente já passou pela sessão). Vou apenas marcar uma flag de visualização para limpar a fila visualmente.

### Passo 5 — Melhorar o erro retornado ao usuário
- Quando o `whatsapp-worker` falhar com 401, criar uma `notification` automática no sino do tipo `system_error` dizendo "WhatsApp desconectado — reconecte em Configurações → Integrações". Hoje o erro fica só na coluna `last_error` e o usuário não percebe.

### Passo 6 — Teste end-to-end
- Disparar manualmente `process-message-rules` e `daily-summary` via `curl_edge_functions` e verificar:
  - `whatsapp_outbox.status = sent`
  - `message_logs.status = sent`
  - Mensagem chegou no telefone `5519981628004`.

---

## Detalhes técnicos

```text
Fluxo atual (quebrado)
process-message-rules ─► whatsapp_outbox(queued) ─► whatsapp-worker
                                                       │
                                                       └─ uazApiFetch (CÓDIGO ANTIGO em produção)
                                                          → 401 Bearer / 401 token / 401 query
                                                          → status=failed

daily-summary (cron 10:00 UTC)
   └─ fetch /message/sendText (endpoint errado)
      Authorization: Bearer UAZAPI_INSTANCE_TOKEN (secret inexistente)
      → falha silenciosa, mas grava notifications row
```

```text
Fluxo após o fix
process-message-rules ─► whatsapp_outbox ─► whatsapp-worker (REDEPLOY)
                                              └─ uazApiFetch(authType:"instance")
                                                 POST /send/text   header: token=<instance_token>
                                                 → 200 ok → status=sent

daily-summary (cron)
   └─ por workspace: lê instance_token da DB
      → uazApiFetch(authType:"instance") POST /send/text
      → notifications + message_logs

payment-pending-check (NOVA, cron 12:00 UTC diário)
   └─ workspaces com notify_payment_pending=true
      → resumo de pagamentos vencidos > 3 dias
      → uazApiFetch + notifications
```

---

## O que você precisa fazer
Apenas **aprovar este plano**. Não preciso de mais nenhum dado da UazAPI — o token correto da sua instância já está salvo no banco (não dependemos mais do `UAZAPI_INSTANCE_TOKEN` global).
