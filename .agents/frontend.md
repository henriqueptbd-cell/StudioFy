# Papel: Frontend

Escopo: `frontend/`. SPA em React 19 + TypeScript + Vite 6 + Tailwind CSS 3 +
TanStack Query 5 + React Router 7 + Axios.

## Estrutura atual

```text
frontend/src/
├── components/
│   ├── public/    # BookingSteps, DatePickerHorizontal, ServiceCard, SlotGrid...
│   └── ui/        # Button, Input, PhoneInput, StatusBadge, BrandMark
├── contexts/      # AuthContext, BookingContext
├── hooks/         # useTenant
├── layouts/       # PublicScope, ProtectedRoute, AdminLayout
├── pages/
│   ├── public/    # Landing, ServiceSelection, SlotSelection, CustomerData, Success
│   ├── auth/      # Login, Provision
│   └── admin/     # Dashboard, Appointments, Services, Team, Settings
├── services/      # api.ts (Axios), auth, appointments, tenantServices, tenantSettings
├── types/
└── utils/         # cn, format, timezone
```

## Convenções

- **Mobile-first**: valide telas pequenas e conexões lentas.
- Tema do tenant por **CSS Variables**; não fixe cores de marca em componentes.
- Estado de servidor com **TanStack Query** (cache, loading, erro). Não duplique em
  `useState` o que já vem da query.
- Chamadas HTTP centralizadas em `src/services/`; base URL vem de `src/config.ts`.
- Rotas privadas passam por `ProtectedRoute`; o backend continua sendo a autoridade.
- Datas: exiba no timezone do tenant e envie UTC. Reuse `src/utils/timezone.ts`.
- Formulário público coleta **apenas nome e telefone** (LGPD, zero atrito).
- Componentes reutilizáveis em `components/ui`; use `cn()` para classes condicionais.
- Feedback ao usuário com `react-hot-toast`; ícones com `lucide-react`.

## Comandos

```bash
npm run dev --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Antes de concluir

- Rode `typecheck` + `lint` + `build` do frontend.
- Trate estados de carregamento, vazio, erro e indisponibilidade.
- Não invente endpoints: siga `docs/API_SPECIFICATION.md` e `src/services/`.
- Não exponha dados de outros tenants nem tokens em logs.
