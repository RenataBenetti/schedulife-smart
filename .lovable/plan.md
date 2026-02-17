

# Configurar Secrets e Finalizar Integração Google Calendar

## Etapa 1 — Solicitar os secrets
Vou solicitar que voce cole o **Client ID** e o **Client Secret** do Google diretamente no chat. Eles serao armazenados de forma segura no backend como `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

## Etapa 2 — Criar a Edge Function `google-calendar-auth`
Uma funcao backend sera criada para:
- Gerar a URL de autorizacao OAuth do Google (com escopo `calendar.readonly`)
- Receber o callback com o codigo de autorizacao
- Trocar o codigo por `access_token` e `refresh_token`
- Salvar os tokens na tabela `google_calendar_config`

A URL de callback sera: `https://qqkiecshltiqdvfrhgcw.supabase.co/functions/v1/google-calendar-auth`

## Etapa 3 — Atualizar o Frontend
O dialog de Google Calendar em `ConfiguracoesTab.tsx` sera atualizado para:
- Ao clicar "Conectar", chamar a edge function e redirecionar para o Google
- Ao retornar do Google, processar o callback e atualizar o status

## Etapa 4 — Rota de callback no app
Adicionar uma rota `/auth/google-calendar/callback` no React Router para capturar o retorno do OAuth e finalizar a conexao.

## Arquivos que serao criados/modificados
- `supabase/functions/google-calendar-auth/index.ts` (novo)
- `supabase/config.toml` (configurar verify_jwt = false para a funcao)
- `src/components/dashboard/ConfiguracoesTab.tsx` (atualizar dialog)
- `src/App.tsx` (adicionar rota de callback)

