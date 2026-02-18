
## Diagnóstico completo — por que os agendamentos não vão ao Google Calendar

### O problema real (encontrado no banco de dados)

O banco de dados revela a causa raiz:

| Workspace | Conectado | Access Token | Refresh Token |
|---|---|---|---|
| SEU workspace (`0c91acd4`) | Sim | AUSENTE | AUSENTE |
| Outro workspace (`02a1495c`) | Sim | Presente | Presente |

O seu workspace está marcado como `connected: true`, mas **sem nenhum token salvo**. Isso significa que a função `sync-to-google-calendar` encontra o registro, mas o `access_token` é nulo — e qualquer chamada à API do Google falha silenciosamente.

Isso aconteceu porque a primeira conexão (com os scopes antigos de leitura) ficou registrada sem tokens válidos, e a reconexão posterior salvou os tokens no registro errado, ou o update não funcionou corretamente.

### Por que não aparecia nenhum erro visível

A chamada à edge function em `AgendamentosTab.tsx` é "fire-and-forget" — ela não bloqueia o fluxo e falhas são apenas logadas no console como warnings. O agendamento é salvo normalmente no banco interno, mas o Google Calendar nunca recebe o evento.

### Solução — 3 ações em paralelo

**Ação 1: Corrigir o registro corrompido no banco**

O registro do seu workspace com `connected: true` mas sem tokens precisa ser limpo/corrigido via SQL para que a reconexão funcione corretamente:

```sql
UPDATE google_calendar_config 
SET connected = false 
WHERE workspace_id = '0c91acd4-011a-469b-8368-53f1520864b1' 
  AND access_token IS NULL;
```

Isso força o app a mostrar "Não conectado" corretamente, em vez de aparecer como conectado quando não está.

**Ação 2: Adicionar feedback visual claro na tela de agendamentos**

Quando a sincronização com Google Calendar falha, o usuário não vê nada — apenas um warning no console. Vamos adicionar um toast informativo claro que diga: "Google Calendar não conectado. Reconecte em Configurações → Integrações."

**Ação 3: Tornar o botão de Google Calendar na aba Configurações mais inteligente**

O botão deve verificar se o token está realmente presente (não só `connected: true`) e mostrar o status real: "Reconectar" se o token estiver ausente mesmo com `connected: true`.

### Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| Banco de dados (SQL) | Corrigir o registro corrompido do seu workspace |
| `src/components/dashboard/AgendamentosTab.tsx` | Exibir toast claro quando Google Calendar não está conectado |
| `src/components/dashboard/ConfiguracoesTab.tsx` | Mostrar status real baseado na presença do token, não só no campo `connected` |

### Após aplicar as mudanças

Você precisará clicar em "Reconectar" na aba **Configurações → Integrações → Google Calendar** uma última vez para salvar os tokens corretamente. Depois disso, todos os novos agendamentos serão enviados automaticamente ao Google Calendar sem nenhuma ação adicional sua.

### Por que isso não foi feito antes

O plano anterior corrigiu o código (scopes e edge function) corretamente, mas não verificou o estado atual dos dados no banco antes de pedir a reconexão. A auditoria do banco deveria ter sido o primeiro passo — e vou garantir que isso aconteça em todo trabalho futuro neste projeto.
