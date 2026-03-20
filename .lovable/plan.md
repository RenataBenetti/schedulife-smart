

## Migração Evolution API → UazAPI

### Análise

A UazAPI tem endpoints e formatos de payload diferentes da Evolution API. A migração exige atualizar **6 Edge Functions** que fazem chamadas HTTP diretas à API.

### O que muda

1. **Secrets**: Substituir `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` pelas credenciais da UazAPI
2. **Criação de instância** (`whatsapp-qr-create`): Adaptar endpoint de criação + formato de resposta do QR code
3. **Status de conexão** (`whatsapp-qr-status`): Adaptar endpoint `connectionState` para o equivalente da UazAPI
4. **Webhook** (`whatsapp-qr-webhook`): Ajustar parsing dos eventos (`connection.update`, `qrcode.updated`) para o formato UazAPI
5. **Envio de mensagens** (`send-whatsapp-message`, `whatsapp-qr-send`, `whatsapp-worker`): Adaptar endpoint `/message/sendText/{instance}` e payload `{ number, text }` para o formato UazAPI
6. **Banco de dados**: Nenhuma mudança — as tabelas `whatsapp_instances_qr`, `whatsapp_outbox`, `message_logs` permanecem iguais

### Pré-requisitos

- URL base da UazAPI e token/chave de API
- Documentação dos endpoints da UazAPI (criação de instância, envio, status, webhook)

### Riscos

- UazAPI é WhatsApp não-oficial (mesmo risco da Evolution API)
- Período de transição pode causar interrupção no envio de mensagens
- Formato de webhook pode variar entre versões

### Recomendação

A migração é viável e de médio esforço (~6 arquivos). Se você já tem acesso à UazAPI e sua documentação, posso adaptar todas as funções. Precisaria que você:
1. Forneça a **URL base** e **chave de API** da UazAPI
2. Confirme os endpoints principais (envio de texto, criação de instância, status)

