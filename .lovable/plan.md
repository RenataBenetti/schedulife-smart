

# Plano: Melhorar formulario de Nova Cobranca com logica inteligente por modelo

## Contexto

Hoje o formulario "Nova cobranca" tem campos genericos (paciente, valor, link). Mas cada paciente ja tem configurado um **modelo de cobranca** (Sessao Individual, Pacote Mensal, Plano Recorrente) com valor e timing. O formulario precisa ser inteligente e adaptar-se ao modelo do paciente selecionado.

---

## Cenarios de cobranca

```text
+-------------------------+-------------------+--------------------+-------------------+
| Modelo                  | Valor             | Quando cobrar      | Descricao         |
+-------------------------+-------------------+--------------------+-------------------+
| Sessao Individual       | Valor da sessao   | Antes ou depois    | Uma cobranca por  |
|                         | (do cadastro)     | de cada sessao     | sessao realizada   |
+-------------------------+-------------------+--------------------+-------------------+
| Pacote Mensal           | Valor do pacote   | Uma vez no mes     | Cobranca fixa no  |
|                         | (definido no      | (dia especifico)   | dia X do mes      |
|                         |  cadastro)        |                    |                   |
+-------------------------+-------------------+--------------------+-------------------+
| Plano Recorrente        | Valor recorrente  | Mensal (automatico)| Valor fixo mensal |
|                         | (do cadastro)     |                    |                   |
+-------------------------+-------------------+--------------------+-------------------+
```

---

## Comportamento do formulario

### 1. Ao selecionar o paciente
- Carregar as configuracoes de cobranca do paciente (`billing_model`, `session_value_cents`, `billing_timing`, `billing_day_of_month`)
- Preencher automaticamente o campo **Valor** com o valor cadastrado
- Exibir um **resumo informativo** do modelo de cobranca (ex: "Sessao Individual -- cobranca depois da sessao")

### 2. Campos adaptaveis por modelo

**Sessao Individual:**
- Valor: pre-preenchido com `session_value_cents` do paciente (editavel)
- Referencia: campo opcional "Sessao de dd/mm/aaaa" (texto livre)
- Link de pagamento: campo para colar URL

**Pacote Mensal:**
- Valor: pre-preenchido com valor do pacote (editavel)
- Referencia: pre-preenchido com "Mensalidade - Mes/Ano" (editavel)
- Vencimento: exibir info "Vence no dia X" (do cadastro do paciente)
- Link de pagamento: campo para colar URL

**Plano Recorrente:**
- Valor: pre-preenchido com valor recorrente (editavel)
- Referencia: pre-preenchido com "Recorrencia - Mes/Ano"
- Link de pagamento: campo para colar URL

### 3. Se o paciente nao tem valor configurado
- Campos ficam vazios para preenchimento manual
- Exibir aviso sutil: "Este paciente nao tem valor de sessao configurado"

---

## Mudancas tecnicas

### Banco de dados
- Adicionar coluna `description` (text, nullable) na tabela `payment_links` para guardar a referencia/descricao da cobranca (ex: "Sessao de 17/02", "Mensalidade Fev/2026")

### Arquivo: `src/components/dashboard/PagamentosTab.tsx`
- Ao selecionar paciente no Select, buscar dados de billing do paciente na lista `clients`
- Auto-preencher valor com `session_value_cents / 100`
- Adicionar campo **Descricao/Referencia** (texto livre, pre-preenchido conforme modelo)
- Exibir badge informativo com o modelo de cobranca do paciente
- Para Pacote Mensal: exibir "Vencimento: dia X" como informacao
- Exibir a descricao na listagem de cobranças (nova coluna ou subtitulo abaixo do nome)

### Arquivo: `src/hooks/use-data.ts`
- Atualizar `useAddPaymentLink` para aceitar o campo `description`

### Labels e terminologia
- Trocar "Cliente" por "Paciente" nos campos do formulario de cobranca
- Manter consistencia com o restante da plataforma

---

## Resultado visual esperado

O formulario fica mais inteligente: ao escolher o paciente, os campos se adaptam e pre-preenchem. O profissional so precisa colar o link de pagamento e confirmar. A descricao ajuda a identificar do que se trata cada cobranca na listagem.

