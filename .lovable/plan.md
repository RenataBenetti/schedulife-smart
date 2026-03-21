

## Diagnóstico

A mensagem falhou com erro **405 Method Not Allowed** em todos os endpoints de envio. A causa raiz é que a UazAPI exige o parâmetro `?instance=<nome>` na URL de envio de mensagem (assim como exige para conexão e status), mas as funções de envio não passam esse parâmetro.

O `whatsapp-qr-create` já faz isso corretamente para conexão:
```
/instance/connect?instance=agendix-45bb3ba3
```

Mas o worker e as funções de envio usam apenas:
```
/message/sendText  (sem ?instance=...)
```

## Plano de Correção

### 1. Corrigir `whatsapp-worker` (envio automático)
- Usar o `instance_name` que já existe em cada mensagem da fila (`msg.instance_name`)
- Adicionar `?instance=<instance_name>` nos pathCandidates do sendText

### 2. Corrigir `send-whatsapp-message` (envio manual do dashboard)
- Já busca `qrInstance.instance_key` do banco
- Adicionar `?instance=<instance_key>` nos pathCandidates

### 3. Corrigir `whatsapp-qr-send` (teste de conexão)
- Já busca `instance.instance_key` do banco
- Adicionar `?instance=<instance_key>` nos pathCandidates

### 4. Reprocessar mensagem falhada
- Atualizar a mensagem `ee119410` na outbox de `failed` para `queued` para que o worker tente novamente

### 5. Deploy e teste
- Redeploiar as 3 funções corrigidas
- Verificar nos logs se a mensagem é enviada com sucesso

### Detalhes Técnicos

Exemplo da correção no worker (linha 101-106):
```typescript
const encodedInstance = encodeURIComponent(msg.instance_name);
await uazApiFetch(config, {
  method: "POST",
  pathCandidates: [
    `/message/sendText?instance=${encodedInstance}`,
    `/v1/message/sendText?instance=${encodedInstance}`,
  ],
  body: { number: phone, text: fullText },
  timeoutMs: 30000,
});
```

O mesmo padrão será aplicado às outras duas funções.

