
## Formatação automática de nome em Title Case

### O que será feito

No formulário público de cadastro (`src/pages/ClientRegistration.tsx`), ao digitar no campo **Nome Completo**, o texto será convertido automaticamente para Title Case — independentemente de como o usuário digitar (tudo maiúsculo, tudo minúsculo, etc.).

**Exemplo:**
- Digitado: `JOÃO DA SILVA` → Exibido: `João Da Silva`
- Digitado: `joão da silva` → Exibido: `João Da Silva`

### Implementação técnica

A mudança é mínima e cirúrgica. A função auxiliar `f()` (linha 129) será ajustada para aplicar a transformação **somente no campo `full_name`**:

```typescript
// Antes:
const f = (field: keyof ClientData) => ({
  value: form[field],
  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value })),
});

// Depois:
const toTitleCase = (str: string) =>
  str.replace(/\S+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

const f = (field: keyof ClientData) => ({
  value: form[field],
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "full_name"
      ? toTitleCase(e.target.value)
      : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  },
});
```

### Por que esta abordagem?

- A função `toTitleCase` usa `replace` com regex `\S+` (sequências de caracteres não-espaço), capturando cada palavra e tornando a primeira letra maiúscula e o restante minúsculo.
- A lógica fica isolada em uma função pura e reutilizável.
- Não afeta nenhum outro campo do formulário.
- Funciona em tempo real, a cada tecla pressionada.

### Arquivo a modificar

**`src/pages/ClientRegistration.tsx`** — apenas as linhas 129-133 (função `f`).
