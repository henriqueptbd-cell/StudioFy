---
name: frontend-dev
description: Implementa e revisa código no frontend do StudioFy (React 19, Vite, Tailwind, TanStack Query, React Router, Axios). Use ao criar/alterar páginas, componentes, contextos, hooks, formulários ou chamadas de API na pasta frontend/.
---

# Frontend

Leia `.agents/frontend.md` e `docs/FRONTEND_ARCHITECTURE.md` antes de editar.

## Procedimento

1. Reuse componentes de `src/components/ui` e padrões das páginas existentes.
2. Estado de servidor com TanStack Query; chamadas HTTP em `src/services/`.
3. Tema do tenant por CSS Variables; layout mobile-first.
4. Rotas privadas via `ProtectedRoute`; o backend é a autoridade de autorização.
5. Exiba datas no timezone do tenant; envie UTC.
6. Trate loading, vazio, erro e indisponibilidade; feedback com `react-hot-toast`.
7. Formulário público coleta apenas nome e telefone.

## Validação

```bash
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Não invente endpoints: siga `docs/API_SPECIFICATION.md` e `src/services/`.

Ao concluir, registre a tarefa em `docs/WORKLOG.md` (sem apagar entradas anteriores).
