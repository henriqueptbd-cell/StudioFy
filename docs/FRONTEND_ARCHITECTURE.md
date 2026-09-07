# 📱 Arquitetura e Engenharia de Frontend — StudioFy

Este documento especifica a arquitetura da aplicação cliente (_web/mobile-first_), a estratégia de roteamento com suporte a **domínios customizados**, a gestão de temas **White-Label**, o inventário de componentes UI e a integração com a API REST do backend.

---

## 📐 1. Princípios de Interface e Experiência do Usuário

1. **Abordagem Mobile-First:** A interface é desenhada prioritariamente para telas de smartphones (360px a 430px de largura). Telas maiores (tablets e desktops) expandem e centralizam os cards sem quebrar a experiência do celular.

2. **Zero Atrito para o Cliente Final:** O cliente não precisa criar conta, digitar senha ou confirmar e-mail para agendar. O fluxo exige apenas **Nome** e **Telefone** (LGPD / Minimização de dados).

3. **White-Label Dinâmico:** A identidade do StudioFy fica invisível na vitrine pública. Cores, logotipo e nome são injetados dinamicamente com base no estabelecimento (_Tenant_).

4. **Isolamento Completo entre Cliente e Administrador:** O cliente final enxerga apenas a vitrine e o formulário de agendamento, sem acesso a menus do sistema. O único ponto de acesso à gestão é um link discreto no rodapé da página (_"Área do Estabelecimento"_).

---

## 🌐 2. Estratégia de Roteamento e Resolução de Domínios Customizados

A aplicação React identifica o _tenant_ corrente antes de renderizar qualquer página pública.

```
[ Acesso no Navegador ]
          │
          ▼
  Hook `useTenantResolution` (Lê window.location.hostname)
          │
          ├──────────────────────────────────────────┐
          ▼                                          ▼
[ Domínio Padrão / Subdomínio ]            [ Domínio Customizado ]
Ex: studiofy.com.br/barbearia              Ex: www.barbeariasilva.com.br
          │                                          │
          ▼                                          ▼
Extrai o Slug da URL (`/:slug`)           Envia hostname para API:
                                          `GET /api/v1/public/tenants/by-domain`
          │                                          │
          └────────────────────┬─────────────────────┘
                               ▼
            [ Carrega TenantContext & Injeta CSS Variables ]
                               │
                               ▼
                    [ Renderiza a Interface ]

```

### Estrutura de Rotas (React Router DOM)

```tsx
// AppRoutes.tsx
<Routes>
  {/* Área Pública do Cliente (Domínio Customizado no '/' ou Slug no '/:slug') */}
  <Route path="/" element={<PublicLayout />}>
    <Route index element={<LandingPage />} />
    <Route path="agendar/servicos" element={<ServiceSelectionPage />} />
    <Route path="agendar/horario" element={<SlotSelectionPage />} />
    <Route path="agendar/dados" element={<CustomerDataPage />} />
    <Route path="agendar/confirmacao" element={<SuccessConfirmationPage />} />
  </Route>

  {/* Acesso via Slug no domínio principal */}
  <Route path="/:slug/*" element={<PublicLayout />} />

  {/* Área Administrativa (Autenticada) */}
  <Route path="/admin/login" element={<LoginPage />} />
  <Route
    path="/admin"
    element={
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    }
  >
    <Route path="dashboard" element={<DashboardPage />} />
    <Route path="agendamentos" element={<AppointmentsPage />} />
    <Route path="servicos" element={<ServicesManagementPage />} />
    <Route path="equipe" element={<TeamManagementPage />} />
    <Route path="configuracoes" element={<SettingsTabbedPage />} />
  </Route>
</Routes>
```

---

## 🎨 3. Sistema de Temas White-Label (CSS Variables)

As cores da interface são divididas em duas camadas: **Base Neutra** e **Destaques Dinâmicos**.

### Injeção de Variáveis CSS (`TenantContext.tsx`)

Quando os dados do _tenant_ são carregados da API, o React injeta as cores dinâmicas diretamente no nó raiz da aplicação:

```typescript
// Exemplo de injeção no carregamento
document.documentElement.style.setProperty('--primary-color', tenant.primaryColor);
document.documentElement.style.setProperty('--secondary-color', tenant.secondaryColor || '#1e293b');
```

### Configuração no Tailwind CSS (`tailwind.config.js`)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        tenant: {
          primary: 'var(--primary-color)',
          secondary: 'var(--secondary-color)',
        },
      },
    },
  },
};
```

---

## 🗺️ 4. Mapa de Telas & Fluxos de Navegação

### 🌐 Fluxo Público do Cliente (Mobile-First)

| Tela                              | Rota Conceitual | Principais Elementos                                                                 |
| --------------------------------- | --------------- | ------------------------------------------------------------------------------------ |
| **1. Vitrine do Estabelecimento** | `/` ou `/:slug` | Header com Logo + Nome, Contato, Endereço e Botão principal _"Iniciar Agendamento"_. |

|
| **2. Seleção de Serviços** | `/agendar/servicos` | Lista de `ServiceCard` ativos com duração, preço e seleção.

|
| **3. Seleção de Horário** | `/agendar/horario` | Carrossel horizontal de datas e grade `SlotPicker` com horários livres.

|
| **4. Dados do Cliente** | `/agendar/dados` | Inputs enxutos: Nome completo + Telefone com máscara `(XX) XXXXX-XXXX`.

|
| **5. Sucesso / Confirmação** | `/agendar/confirmacao` | Resumo da solicitação com status `PENDENTE` e botão direto para abrir conversa no WhatsApp.

|

### 🏢 Painel Administrativo do Estabelecimento

| Tela         | Rota Conceitual | Principais Elementos                                   |
| ------------ | --------------- | ------------------------------------------------------ |
| **6. Login** | `/admin/login`  | Formulário de E-mail/Senha para Admin e Profissionais. |

|
| **7. Dashboard** | `/admin/dashboard` | Resumo de agendamentos do dia, próximos horários e atalhos rápidos.

|
| **8. Gestão de Agenda** | `/admin/agendamentos` | Lista filtrável por data e status (`PENDENTE`, `CONFIRMADO`, `CONCLUIDO`, `CANCELADO`) com botão utilitário `wa.me`.

|
| **9. Gestão de Serviços** | `/admin/servicos` | CRUD de serviços (nome, duração, preço) e chave liga/desliga (Ativo/Inativo).

|
| **10. Gestão de Equipe** | `/admin/equipe` | Cadastro e convites via WhatsApp para novos profissionais.

|
| **11. Configurações em Abas** | `/admin/configuracoes` | Painel tabulado para ajuste geral da loja:

|
| └ _Aba 1: Perfil da Loja_ | | Nome, slug da URL, WhatsApp de contato e fuso horário.

|
| └ _Aba 2: Estética & Tema_ | | Color Pickers (Primária, Secundária), upload de Logo e **Live Preview Card**.

|
| └ _Aba 3: Horários_ | | Grade semanal de abertura/fechamento e dias fechados (`isClosed`).

|

---

## 🧩 5. Inventário de Componentes UI

```
src/components/
├── ui/
│   ├── Button.tsx              # Suporta variantes: primary (tenant color), secondary, outline, ghost
│   ├── Input.tsx               # Campo de texto estilizado
│   ├── PhoneInput.tsx          # Máscara automática de telefone (XX) XXXXX-XXXX
│   ├── Modal.tsx               # Diálogo genérico para confirmações
│   └── StatusBadge.tsx         # Badges com cores padronizadas (Verde, Amarelo, Vermelho, Cinza)
├── public/
│   ├── ServiceCard.tsx         # Exibe nome, descrição, duração e preço do serviço
│   ├── DatePickerHorizontal.tsx# Carrossel horizontal de seleção de dias
│   ├── SlotGrid.tsx            # Botões de seleção de horário disponível
│   └── PublicFooter.tsx        # Rodapé enxuto com link discreto "Área do Estabelecimento"
└── admin/
    ├── AdminHeader.tsx         # Contém o botão principal "Ver Minha Loja" (Abre nova aba)
    ├── TabNavigation.tsx       # Navegador por abas da tela de configurações
    ├── LivePreviewCard.tsx     # Simulação em tempo real da vitrine pública ao trocar cores
    └── AppointmentRow.tsx      # Linha da agenda com ações de transição e botão WhatsApp wa.me

```

---

## 🛡️ 6. Recursos Especiais na Interface do Administrador

1. **Botão "Ver Minha Loja" (Preview):**

- Localizado no cabeçalho fixo do painel administrativo.

- Ao ser clicado, executa um `window.open(tenantPublicUrl, '_blank')`, permitindo que o dono veja exatamente a experiência que seu cliente terá.

2. **Gerador de Mensagens do WhatsApp (`wa.me`):**

- Na lista de agendamentos do admin, cada registro possui um atalho para contato.

- Ao clicar em "Confirmar" ou "Recusar", o sistema atualiza o status na API e gera um link formatado:
  `[https://wa.me/5511999999999?text=Olá%20Ana!%20Seu%20agendamento%20foi%20CONFIRMADO](https://wa.me/5511999999999?text=Olá%20Ana!%20Seu%20agendamento%20foi%20CONFIRMADO).`[cite: 2, 3, 8]

---

## 📂 7. Estrutura do Diretório `/frontend`

```text
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/              # Logos estáticas e vetores
│   ├── components/          # Componentes reutilizáveis (UI, Public, Admin)
│   ├── contexts/            # AuthContext, TenantContext (Theme Injection)
│   ├── hooks/               # useTenant, useServices, useSlots, useAppointments
│   ├── layouts/             # PublicLayout.tsx, AdminLayout.tsx
│   ├── pages/               # Páginas divididas por contexto (Public, Auth, Admin)
│   ├── services/            # Instância do Axios e definição de rotas da API
│   ├── types/               # Tipagens TypeScript padronizadas com o Backend
│   ├── utils/               # Formatadores de Moeda, Máscaras e gerador wa.me
│   ├── App.tsx              # Configuração de Providers e Roteamento
│   └── main.tsx             # Ponto de entrada do React
├── tailwind.config.js       # Extensão com cores do tenant
├── tsconfig.json            # Configuração estrita do TypeScript
└── vite.config.ts           # Configuração de compilação do Vite

```
