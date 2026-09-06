# 📱 StudioFy — Frontend

Este diretório contém a aplicação web client-side do **StudioFy**, desenvolvida com foco na experiência **Mobile-first** e separação clara entre a interface pública do cliente e o painel administrativo.

---

## 🛠️ Tecnologias Utilizadas

- **React + TypeScript:** Construção de interfaces reativas e fortemente tipadas.
- **Tailwind CSS:** Estilização utilitária e responsiva.
- **CSS Variables:** Utilizadas para suporte a temas customizados por estabelecimento (_White-label_).
- **TanStack Query (React Query):** Gerenciamento de cache, re-fetch e estado das requisições REST.
- **React Router Dom:** Roteamento client-side com separação de áreas públicas e privadas.

---

## 📂 Estrutura de Pastas

```text
src/
├── assets/        # Imagens, logos e ícones estáticos
├── components/    # Componentes reutilizáveis (Botões, Modais, Inputs)
├── contexts/      # Contextos globais (Autenticação, Tema do Tenant)
├── hooks/         # Custom Hooks (ex: useAppointments, useTenant)
├── pages/
│   ├── public/    # Fluxo público de agendamento (Cliente)
│   ├── auth/      # Login para Profissionais/Admins
│   └── admin/     # Painel de gestão da agenda e configurações
├── services/      # Cliente HTTP (Axios) e integração com a API
└── utils/         # Formatadores (Moeda, Data, WhatsApp wa.me)

```

---

## 🚀 Como Executar

1. Instale as dependências:

```bash
npm install

```

2. Configure o arquivo `.env`:

```env
VITE_API_URL=http://localhost:3333/api/v1

```

3. Inicie o servidor de desenvolvimento:

```bash
npm run dev

```
