

# Cadastro Completo do Cliente com Link de Autopreenchimento

## O que sera feito

### 1. Novos campos no banco de dados
Adicionar as seguintes colunas na tabela `clients`:
- `cpf` (texto, opcional)
- `rg` (texto, opcional)
- `address_street` (texto - rua/logradouro)
- `address_number` (texto - numero)
- `address_complement` (texto - complemento)
- `address_neighborhood` (texto - bairro)
- `address_city` (texto - cidade)
- `address_state` (texto - estado)
- `address_zip` (texto - CEP)

### 2. Nova tabela de tokens de cadastro
Criar tabela `client_registration_tokens` para gerar links unicos:
- `id` (uuid)
- `workspace_id` (uuid)
- `client_id` (uuid) — vincula ao cliente ja criado
- `token` (texto unico) — codigo do link
- `expires_at` (timestamp) — expiracao do link (ex: 7 dias)
- `completed` (boolean) — se o cliente ja preencheu
- Politica RLS para membros do workspace + acesso publico via token

### 3. Pagina publica de cadastro
Criar uma pagina em `/cadastro/:token` que:
- Nao exige login (eh publica)
- Valida o token e verifica se nao expirou
- Mostra formulario com: Nome, CPF, RG, Endereco completo, Telefone, Email
- Preenche automaticamente os dados ja existentes do cliente
- Ao submeter, atualiza os dados do cliente via edge function (sem autenticacao)
- Mostra mensagem de sucesso apos preenchimento

### 4. Edge function para salvar dados publicamente
Criar `client-registration` edge function que:
- Recebe o token + dados do formulario
- Valida o token (existe, nao expirou, nao foi usado)
- Atualiza a tabela `clients` com os dados informados
- Marca o token como `completed = true`

### 5. Atualizar o frontend do dashboard
- Adicionar campos CPF, RG e endereco nos dialogs de criar/editar cliente
- Adicionar botao "Enviar link de cadastro" na listagem e no detalhe do cliente
- O botao gera o token, monta a URL e copia para a area de transferencia (ou abre opcao de envio via WhatsApp)
- Mostrar indicador se o cliente ja completou o cadastro

### 6. Fluxo do usuario

```text
Profissional                          Cliente
     |                                   |
     |-- Cria paciente (nome + tel) ---> |
     |-- Gera link de cadastro --------> |
     |-- Envia link (WhatsApp/copiar) -> |
     |                                   |-- Abre link no navegador
     |                                   |-- Preenche CPF, RG, endereco
     |                                   |-- Submete formulario
     |                                   |
     |<-- Dados atualizados no sistema --|
```

## Arquivos que serao criados/modificados
- **Migracao SQL**: adicionar colunas em `clients` + criar tabela `client_registration_tokens`
- `supabase/functions/client-registration/index.ts` (nova edge function)
- `src/pages/ClientRegistration.tsx` (nova pagina publica)
- `src/App.tsx` (adicionar rota `/cadastro/:token`)
- `src/components/dashboard/ClientesTab.tsx` (novos campos + botao de link)
- `src/hooks/use-data.ts` (atualizar tipos dos mutations)

