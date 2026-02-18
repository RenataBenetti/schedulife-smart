
## Reformulação da Tela de Anotações do Cliente

### Problema atual
O formulário para adicionar uma nova observação está escondido dentro de um dialog (modal). O usuário precisa clicar em "Nova observação" para abrir o modal, digitar, salvar e fechar. Isso cria fricção e não permite ver a lista ao mesmo tempo.

### O que será feito

**1. Remover o dialog de nova observação**

O textarea e o botão "Adicionar observação" serão movidos para fora do modal e exibidos diretamente na tela, acima da lista de registros — sempre visíveis.

**2. Comportamento após salvar**

Ao clicar em "Adicionar observação":
- O texto do campo é limpo automaticamente (`setSessionNotes("")`)
- O filtro de data é limpo (`setDateFilter("")`), fazendo a lista mostrar **todos** os registros
- A nova observação aparece no topo da lista imediatamente (já é o comportamento atual via TanStack Query)

**3. Edição de observação existente**

Ao clicar no lápis (editar) em uma observação existente, o texto carrega no textarea inline (em vez do modal). O botão muda para "Salvar alterações" e aparece um botão "Cancelar" ao lado. Após salvar, o campo volta ao estado de "nova observação" e o filtro é limpo.

**4. Layout da tela reorganizado**

```text
[ Filtro de data ]  [ Limpar ]          ← barra de filtro (Limpar só aparece se data selecionada)

[ Textarea: "Registre suas observações..." ]
[ Adicionar observação ]                ← botão abaixo do textarea

────────────────────────────────────────
  Lista de observações existentes
  (mostra todas, ou filtradas por data)
────────────────────────────────────────
```

### Arquivo a modificar

**`src/components/dashboard/ClientesTab.tsx`** — componente `ClientDetail` (linhas 679-846):

- Remover o `<Dialog>` de adicionar/editar observação
- Mover o `<Textarea>` e o botão para inline na tela (após a barra de filtro)
- Atualizar `handleAddNote` para também limpar `dateFilter` após salvar
- Atualizar `handleUpdateNote` para limpar o campo e `dateFilter` após salvar
- Ao clicar em editar (lápis), preencher o textarea inline e mostrar botão "Cancelar edição"
- Manter o dialog apenas se o usuário quiser, caso contrário removê-lo completamente
