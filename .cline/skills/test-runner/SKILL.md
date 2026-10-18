---
name: test-runner
description: Cria, atualiza e executa testes do StudioFy com Vitest/Supertest, além de typecheck, lint e build. Use ao validar uma entrega, reproduzir um bug, cobrir uma regra de negócio ou investigar falhas na suíte.
---

# Testes e qualidade

Leia `.agents/testing.md` e `docs/TESTING.md` antes de editar.

## Procedimento

1. Identifique o comportamento a validar e o teste existente mais próximo.
2. Escreva o teste em `backend/src/**/*.spec.ts`, isolando os dados criados.
3. Cubra sucesso, validação, autorização e erro.
4. Para agendamentos, cubra conflito, concorrência, expiração e transições inválidas.
5. Nunca use credenciais, tokens ou dados reais.
6. Execute a suíte e o lint; corrija a causa, não o teste.

## Comandos

```bash
npm test
npm run lint
npm run test --prefix backend
npm run test --prefix backend -- src/modules/appointments/useCases/phase4Step3.spec.ts
```

## Relatório

Informe quais comandos rodaram, quantos testes passaram e o que ficou pendente. Registre
o resultado em `docs/WORKLOG.md` (sem apagar entradas anteriores).
