## Atualizar token da UazAPI

O erro 401 "Invalid token" vem da UazAPI rejeitando o valor atual do secret `UAZAPI_INSTANCE_TOKEN`. Não há nada a corrigir no código — todas as três variantes de autenticação (Bearer, header `token`, query param) já são tentadas pela camada `_shared/uazapi.ts` e todas retornam 401, o que confirma que o token armazenado está expirado ou inválido.

### Passos

1. **Você gera um novo token no painel da UazAPI**
   - Acesse o painel da UazAPI onde sua instância está hospedada
   - Vá em configurações da instância → tokens / API keys
   - Gere (ou copie) um novo token de instância válido
   - Se houver também um `admintoken`, anote — mas o principal é o `UAZAPI_INSTANCE_TOKEN`

2. **Eu solicito a atualização do secret**
   - Após sua confirmação, vou disparar o pedido para atualizar `UAZAPI_INSTANCE_TOKEN` no projeto
   - Você cola o novo valor na caixa segura — eu não vejo o conteúdo
   - Opcionalmente, atualizamos também `UAZAPI_BASE_URL` se o servidor mudou, e `UAZAPI_ADMIN_TOKEN` se aplicável

3. **Validação**
   - Após salvar, testo a função `whatsapp-qr-create` via curl para o seu workspace
   - Confirmo nos logs que a resposta deixa de ser 401 e o QR é gerado
   - Se o workspace antigo (`agendix-45bb3ba3`) estava causando ruído, podemos remover a linha órfã da tabela `whatsapp_instances_qr`

### Observações

- Nenhum arquivo do código será alterado — só o secret
- O workspace principal (`0c91acd4`) continua funcionando normalmente durante a troca; o novo token passa a valer instantaneamente para as próximas chamadas
- Se preferir, posso já deixar preparado um teste rápido (`whatsapp-qr-status`) para rodar logo após a atualização
