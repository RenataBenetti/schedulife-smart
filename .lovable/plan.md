

# Integração Real do Google Calendar

## Problema Atual
O botão "Conectar Google Calendar" apenas salva `connected: true` no banco, sem coletar nenhuma informação nem fazer autenticação real com o Google. Nada é conectado de fato.

## Solução Proposta

Implementar o fluxo OAuth 2.0 completo do Google Calendar usando uma edge function como intermediária.

### Como vai funcionar para o usuário
1. Clica em "Conectar Google Calendar"
2. E redirecionado para a tela de login do Google
3. Autoriza o acesso a agenda
4. Volta automaticamente para o app com status "Conectado"

### Etapas Tecnicas

#### 1. Configuracao de Credenciais Google
- O usuario precisara criar um projeto no Google Cloud Console e obter um **Client ID** e **Client Secret** para OAuth 2.0
- Esses valores serao armazenados como secrets no backend

#### 2. Edge Function: `google-calendar-auth`
- Gera a URL de autorizacao OAuth do Google com os escopos necessarios (`calendar.readonly` ou `calendar.events`)
- Recebe o callback com o codigo de autorizacao
- Troca o codigo por `access_token` e `refresh_token`
- Salva os tokens na tabela `google_calendar_config`

#### 3. Atualizar tabela `google_calendar_config`
- Adicionar colunas: `access_token`, `refresh_token`, `token_expires_at`
- Migracao SQL necessaria

#### 4. Atualizar o Dialog no Frontend
- Ao clicar "Conectar", chamar a edge function para obter a URL OAuth
- Redirecionar o usuario para o Google
- Ao voltar, verificar o estado e atualizar o status

#### 5. Edge Function: `google-calendar-sync` (opcional/futuro)
- Usar o `refresh_token` para buscar eventos da agenda
- Sincronizar com os agendamentos do sistema

### Pre-requisitos do Usuario
O usuario (dono do SaaS) precisara:
1. Criar um projeto no Google Cloud Console
2. Ativar a Google Calendar API
3. Criar credenciais OAuth 2.0 (Web Application)
4. Fornecer o **Client ID** e **Client Secret**

### Arquivos que serao criados/modificados
- `supabase/functions/google-calendar-auth/index.ts` (nova edge function)
- `supabase/migrations/...` (adicionar colunas de token)
- `src/components/dashboard/ConfiguracoesTab.tsx` (atualizar dialog e fluxo)
- `src/hooks/use-data.ts` (atualizar hook se necessario)

