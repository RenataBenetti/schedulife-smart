Identifiquei que o erro continua no mesmo ponto: a função `whatsapp-qr-create` está falhando ao chamar `/instance/init` da UazAPI com `401 Unauthorized`.

O problema provável agora não é só o valor do token, mas também a forma como a função está autenticando na UazAPI. A documentação/SDK público da UazAPI v2 indica que:

- operações admin, como `POST /instance/init`, usam somente o header `admintoken`;
- operações da instância, como `/instance/status`, `/instance/connect` e `/send/text`, usam o header `token` com o token da instância;
- o código atual tenta Bearer, header `token` e query string antes/depois, o que pode continuar gerando 401 no endpoint admin.

Plano para corrigir:

1. Ajustar o helper da UazAPI
   - Separar claramente os modos de autenticação:
     - `admin`: envia apenas `admintoken`.
     - `instance`: envia apenas `token`.
   - Manter logs seguros com tokens mascarados.
   - Remover/evitar tentativas inadequadas como `Authorization: Bearer` e query string para endpoints UazAPI v2.

2. Corrigir criação do QR Code
   - Em `whatsapp-qr-create`, chamar `/instance/init` com autenticação admin correta.
   - Usar body compatível com UazAPI v2: `name` e, se necessário, `systemName`.
   - Melhorar a extração do token retornado (`instance.token`, além dos formatos já previstos).
   - Em seguida, usar o token da instância para `/instance/connect`, `/instance/status` e webhook.

3. Corrigir funções dependentes do token da instância
   - Garantir que `whatsapp-qr-status`, `whatsapp-qr-send`, `send-whatsapp-message` e `whatsapp-worker` usem autenticação por header `token`, não Bearer/query.
   - Garantir que workspaces antigos sem `instance_token` retornem uma mensagem clara pedindo reconexão por QR Code.

4. Validar sem expor segredo
   - Consultar novamente logs da função após a alteração.
   - Testar a função `whatsapp-qr-create` pelo backend usando a sessão atual.
   - Se continuar 401 mesmo com header `admintoken`, o próximo diagnóstico será: o token salvo ainda não é o Admin Token correto para o `UAZAPI_BASE_URL` configurado, ou o Base URL aponta para outra instância/ambiente da UazAPI.

5. Entregar uma mensagem de erro mais útil no app
   - Trocar o erro genérico “Erro ao criar instância” por orientação mais clara quando a falha for 401: “Token administrativo da UazAPI inválido para este servidor”.

Também notei que há registros antigos em `whatsapp_instances_qr` marcados como `connected`, mas sem `instance_token`. Esses registros não conseguem mais enviar mensagens pelo fluxo novo; eles precisarão reconectar para salvar o token da instância corretamente.