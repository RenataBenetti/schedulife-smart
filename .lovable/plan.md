
## Relatório por Período nas Abas Clientes, Agendamentos e Pagamentos

### O que será feito

Um botão com ícone de relatório (`FileBarChart`) será adicionado ao lado do botão principal em cada aba. Ao clicar, abre um modal com:

1. Seleção de período (data início e data fim)
2. Resumo dos dados filtrados naquele período

---

### Relatório de cada aba

**Clientes** — Mostra pacientes cadastrados no período:
- Total de novos pacientes no período
- Lista com nome, modelo de cobrança e valor da sessão

**Agendamentos** — Mostra agendamentos no período:
- Total de sessões
- Sessões por status (Confirmado, Concluído, Cancelado, Faltou, etc.)
- Total de horas atendidas

**Pagamentos** — Mostra cobranças criadas no período:
- Total recebido no período
- Total pendente no período
- Lista resumida com paciente, valor e status

---

### Arquivos que serão criados/editados

| Arquivo | Ação |
|---|---|
| `src/components/dashboard/ReportModal.tsx` | Criar — componente genérico de modal de relatório |
| `src/components/dashboard/ClientesTab.tsx` | Editar — adicionar botão de relatório |
| `src/components/dashboard/AgendamentosTab.tsx` | Editar — adicionar botão de relatório |
| `src/components/dashboard/PagamentosTab.tsx` | Editar — adicionar botão de relatório |

---

### Como ficará visualmente

Na barra superior de cada aba, ao lado do botão de ação principal:

```text
[ 🔍 Buscar... ]                    [ 📊 Relatório ]  [ + Novo ... ]
```

O modal terá:

```text
┌─────────────────────────────────────┐
│  Relatório de Agendamentos          │
│  Período: [01/02/2026] → [28/02/2026] │
│─────────────────────────────────────│
│  📅 Total de sessões: 18            │
│  ✅ Concluídas: 12                  │
│  ❌ Canceladas: 2                   │
│  ⏱ Total de horas: 15h             │
└─────────────────────────────────────┘
```

---

### Detalhes técnicos

- O `ReportModal` receberá as props: `type` ("clients" | "appointments" | "payments"), `data` (já carregados na aba), e filtrará localmente pelo período selecionado — sem chamadas extras ao banco.
- Os filtros de data usarão `<Input type="date" />` simples para agilidade, sem necessidade de um datepicker complexo.
- O período padrão ao abrir será o mês atual (dia 1 até hoje).
