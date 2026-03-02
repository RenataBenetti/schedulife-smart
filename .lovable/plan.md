

# Plano: Corrigir fluxo de QR Code no WhatsApp

## Problema diagnosticado

A Edge Function `whatsapp-qr-create` tem dois bugs:

1. Quando a instancia ja existe na Evolution API, o `POST /instance/create` retorna `403 Forbidden` com "This name is already in use". O codigo ignora esse erro e segue para `/instance/connect/`, que nao retorna QR porque a instancia ja esta conectada.

2. Nao ha logica de "reconectar" -- para gerar um novo QR, e necessario primeiro desconectar/deletar a instancia antiga.

## Solucao

### 1. Atualizar `whatsapp-qr-create/index.ts`

Adicionar logica inteligente ao fluxo:

```text
1. Verificar se instancia ja existe (GET /instance/connectionState/{name})
2. Se existir E estiver conectada ("open"):
   a. Fazer POST /instance/logout/{name} para desconectar
   b. Aguardar brevemente
   c. Fazer GET /instance/connect/{name} para obter novo QR
3. Se existir mas NAO estiver conectada:
   a. Fazer GET /instance/connect/{name} para obter QR
4. Se NAO existir:
   a. Fazer POST /instance/create (como hoje)
   b. Fazer GET /instance/connect/{name}
5. Se o create retornar 403 (nome em uso):
   a. Tratar como "ja existe" e ir para o passo de connect
```

Alem disso, adicionar log do response do `/instance/connect/` para debugar o formato do QR retornado pela Evolution API.

### 2. Melhorar parsing do QR Code

A Evolution API pode retornar o QR em diferentes formatos dependendo da versao. Adicionar mais fallbacks:

- `connectData?.base64`
- `connectData?.qrcode?.base64`
- `connectData?.qrCode`
- `connectData?.code` (texto puro para gerar QR no frontend)
- `connectData?.pairingCode`

### 3. Adicionar logging detalhado

Logar o response completo do endpoint `/instance/connect/` para identificar exatamente o formato retornado, facilitando debug futuro.

## Arquivos alterados

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-qr-create/index.ts` | Reescrever logica para tratar instancia existente, fazer logout antes de reconectar, e melhorar parsing do QR |

## Nenhuma alteracao de banco de dados necessaria

O schema atual ja suporta o fluxo corretamente. O problema e exclusivamente na logica da Edge Function.

