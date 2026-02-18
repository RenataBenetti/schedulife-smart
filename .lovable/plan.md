
## Limpeza do Site: Foco no Profissional Solo e Cobranças via Link

### O que será alterado

**Arquivos envolvidos:**
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PricingSection.tsx`

---

### Mudanças detalhadas

**1. FeaturesSection.tsx**

- Remover o card **"Multi-profissional"** (título + descrição sobre workspaces separados por profissional/clínica)
- No card **"Dados Seguros"**, remover a menção "entre workspaces" — ficará: *"Criptografia e proteção total dos seus dados."*
- O grid passará de 8 para 7 cards (ajuste automático no layout)

**2. PricingSection.tsx**

Na lista de itens inclusos no plano:
- `"Cobranças automáticas via Asaas"` → `"Cobranças automáticas via link de pagamento"`
- `"Multi-profissional (workspace)"` → remover completamente

---

### O que NÃO muda

- `HeroSection`, `SolutionSection`, `HowItWorksSection` e `ProblemSection` já não mencionam multi-profissional nem Asaas — estão corretos.
- A lógica interna do dashboard (workspaces, etc.) não é alterada, apenas o que é exibido no site público.
