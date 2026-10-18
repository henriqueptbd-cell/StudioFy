---
paths:
  - 'frontend/**'
---

# Frontend — StudioFy

Siga `.agents/frontend.md` e `docs/FRONTEND_ARCHITECTURE.md`.

- Mobile-first; tema do tenant por CSS Variables.
- Estado de servidor com TanStack Query; chamadas HTTP em `src/services/`.
- Rotas privadas passam por `ProtectedRoute`; o backend continua sendo a autoridade.
- Datas exibidas no timezone do tenant; envio em UTC.
- Formulário público coleta apenas nome e telefone.
- Trate loading, vazio, erro e indisponibilidade.
- Antes de concluir: `npm run typecheck --prefix frontend`,
  `npm run lint --prefix frontend` e `npm run build --prefix frontend`.
