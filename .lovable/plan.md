
## Diagnóstico: Por que os agendamentos não aparecem no Google Calendar

### Causa raiz — dois problemas combinados

**Problema 1: Scopes apenas de leitura**

No arquivo `supabase/functions/google-calendar-auth/index.ts`, as permissões solicitadas ao Google são:
```
calendar.readonly
calendar.events.readonly
```
Ambas são **somente leitura**. O app nunca pediu permissão para **criar** eventos no Google Calendar.

**Problema 2: Não existe nenhum código que envia eventos para o Google**

Ao criar um agendamento em `AgendamentosTab.tsx`, o código apenas salva no banco de dados interno (`appointments`). Não existe nenhuma chamada para a API do Google Calendar para criar o evento lá. A integração atual só foi construída para autenticação — nunca houve a parte de "enviar evento".

### Resumo do fluxo atual (incompleto)

```text
Usuário cria agendamento
        ↓
Salvo no banco interno ✅
        ↓
Google Calendar ← NADA ENVIADO ❌
```

### Solução completa em 3 partes

---

**Parte 1 — Atualizar os scopes do OAuth para escrita**

Alterar `supabase/functions/google-calendar-auth/index.ts` para solicitar a permissão de criação de eventos:

```
Remover:  calendar.readonly, calendar.events.readonly
Adicionar: calendar.events  (leitura + escrita de eventos)
```

O usuário precisará **reconectar o Google Calendar** nas Configurações → Integrações para aceitar a nova permissão de escrita.

---

**Parte 2 — Criar edge function `sync-to-google-calendar`**

Nova função `supabase/functions/sync-to-google-calendar/index.ts` que:
1. Recebe `workspace_id`, `client_name`, `starts_at`, `ends_at`
2. Busca os tokens do Google Calendar no banco
3. Se o token estiver expirado, usa o `refresh_token` para renová-lo automaticamente e salva o novo token
4. Cria o evento no Google Calendar via API (`POST /calendars/primary/events`)
5. Retorna o `google_event_id` criado

---

**Parte 3 — Chamar a função ao criar agendamentos**

Em `AgendamentosTab.tsx`, após salvar os agendamentos no banco, chamar a edge function para cada agendamento criado. Se a sincronização falhar (ex: usuário sem Google Calendar conectado), o agendamento continua salvo normalmente e apenas uma mensagem informativa aparece.

---

### Fluxo após a solução

```text
Usuário cria agendamento
        ↓
Salvo no banco interno ✅
        ↓
sync-to-google-calendar chamada
        ↓
Token expirado? → Renova automaticamente
        ↓
Evento criado no Google Calendar ✅
```

---

### Arquivos a modificar/criar

| Arquivo | Ação |
|---|---|
| `supabase/functions/google-calendar-auth/index.ts` | Atualizar scopes para `calendar.events` |
| `supabase/functions/sync-to-google-calendar/index.ts` | Criar nova edge function |
| `src/components/dashboard/AgendamentosTab.tsx` | Chamar sync após criar agendamento |
| `supabase/config.toml` | Registrar nova função (verify_jwt = false não necessário, pois usará autenticação) |

### Importante: reconexão necessária

Após publicar as mudanças, a usuária precisará ir em **Configurações → Integrações → Google Calendar → Reconectar** para aceitar a nova permissão de escrita. Isso é obrigatório pelo Google — permissões novas sempre exigem nova autorização.
