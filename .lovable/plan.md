

# Plano: Gerar cobranca automaticamente ao criar agendamento (Sessao Individual)

## Resumo

Quando o profissional criar um agendamento para um paciente com modelo "Sessao Individual" (`sessao_individual`), o sistema criara automaticamente uma cobranca na aba Pagamentos com o valor da sessao e a descricao "Sessao de dd/mm/aaaa".

## Mudanca

### Arquivo: `src/components/dashboard/AgendamentosTab.tsx`

Na funcao `handleAdd`, apos inserir o(s) agendamento(s) com sucesso:

1. Buscar o paciente selecionado na lista `clients` para acessar `billing_model` e `session_value_cents`
2. Se `billing_model === "sessao_individual"` **e** `session_value_cents > 0`:
   - Para **cada agendamento** criado (incluindo recorrencias), inserir um registro em `payment_links` com:
     - `workspace_id`: workspace atual
     - `client_id`: paciente selecionado
     - `amount_cents`: `session_value_cents` do cadastro do paciente
     - `description`: "Sessao de dd/mm/aaaa" (usando a data do respectivo agendamento)
3. Exibir no toast uma mensagem complementar informando que a(s) cobranca(s) tambem foram criadas
4. Invalidar a query `payment_links` para atualizar a aba Pagamentos

### Importacoes necessarias

- Importar `supabase` (ja importado)
- Nenhum hook novo necessario -- a insercao sera feita diretamente via `supabase.from("payment_links").insert()` dentro do `handleAdd`, mantendo o padrao ja usado no componente para appointments

### Nenhuma mudanca no banco de dados

A tabela `payment_links` ja possui todos os campos necessarios (`client_id`, `amount_cents`, `description`, `workspace_id`).

## Exemplo pratico

Paciente "Maria" tem modelo "Sessao Individual" com valor R$ 200,00. O profissional cria um agendamento para 20/02/2026 com recorrencia de 4 semanas. O sistema cria:
- 4 agendamentos (20/02, 27/02, 06/03, 13/03)
- 4 cobrancas automaticas de R$ 200,00 cada ("Sessao de 20/02/2026", "Sessao de 27/02/2026", etc.)

