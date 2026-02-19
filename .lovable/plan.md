
# WhatsApp Business — Meta Cloud API (Embedded Signup) ✅ CONCLUÍDO

## O que foi implementado

### Banco de dados
- Tabela `whatsapp_connections`: armazena `waba_id`, `phone_number_id`, `access_token_encrypted`, `token_expires_at`, `status`, `phone_display` por workspace
- Tabela `whatsapp_message_logs`: registra todos os envios (status, erro, provider_message_id)
- RLS ativo em ambas as tabelas (membros do workspace acessam apenas os próprios dados)

### Edge Functions
- `whatsapp-connect`: troca o `code` do Embedded Signup por access token via Meta Graph API, extrai WABA ID e phone_number_id, persiste criptografado no banco. NUNCA expõe token ao frontend.
- `whatsapp-send-test`: envia mensagem de teste via Cloud API usando credenciais do banco (service role). Registra em `whatsapp_message_logs`.

### Frontend
- `WhatsAppMetaConnect.tsx`: componente reutilizável com 2 modos (compact para ConfiguracoesTab, completo para SetupWizard)
- Carrega FB SDK dinamicamente apenas quando necessário
- Fluxo: botão → FB.login → Embedded Signup → backend troca code → estado "Conectado ✅"
- Botão "Enviar mensagem de teste" com campo de número destino
- SetupWizard: passo WhatsApp usa o novo componente; botão "Pular por agora" permite avançar sem conectar
- ConfiguracoesTab: card WhatsApp Business substituído pelo novo componente

### Segurança
- access_token NUNCA vai ao frontend
- Todas chamadas à Meta Graph API ocorrem no backend (Edge Functions)
- workspace_id validado via RLS e verificação de membro
- Erros comuns tratados com mensagens amigáveis

## Pendências (pós-MVP)
- Configurar URL de callback no Meta App (Redirect URI para o fluxo Embedded Signup)
- Criar template `agendix_test` na conta WhatsApp Business para mensagens fora da janela de 24h
- Webhooks inbound (receber respostas dos clientes) — próxima fase
- Refresh automático de token quando próximo de expirar
