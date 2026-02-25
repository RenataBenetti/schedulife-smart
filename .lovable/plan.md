

## Configurar Secrets da Evolution API

Para que a integração WhatsApp via QR Code funcione, precisamos adicionar dois secrets ao backend:

1. **EVOLUTION_API_URL** -- A URL do seu servidor Evolution API (ex: `https://meuservidor.com:8080`)
2. **EVOLUTION_API_KEY** -- A chave de autenticação da sua Evolution API

### O que vai acontecer

- Vou solicitar que voce insira cada um dos dois secrets de forma segura
- Depois de configurados, as Edge Functions `whatsapp-qr-create`, `whatsapp-qr-status`, `whatsapp-qr-send` e `whatsapp-qr-webhook` passarao a funcionar corretamente
- Nenhum codigo sera alterado -- apenas a configuracao de secrets

### Pre-requisitos

Tenha em maos:
- A URL completa do seu servidor Evolution API (com protocolo e porta, se aplicavel)
- A API Key configurada no seu servidor Evolution API

