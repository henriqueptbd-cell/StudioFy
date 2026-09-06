# Visão do Produto — StudioFy

## 1. Identificação

**Nome do produto:** StudioFy

**Tipo:** Plataforma web de agendamento e gestão para negócios que trabalham com atendimento por horário.

**Público inicial:** Salões de beleza, barbearias e profissionais/estabelecimentos de estética e beleza.

**Visão de longo prazo:** Tornar o StudioFy uma plataforma genérica e escalável para diferentes negócios baseados em agendamento, sem ficar limitado ao segmento de estética.

---

## 2. Visão do Produto

O StudioFy será uma plataforma de agendamento e organização para estabelecimentos que trabalham com atendimento por horário.

O sistema deverá permitir que cada estabelecimento utilize a plataforma com sua própria identidade, configurando nome, logotipo, cores, serviços, profissionais e horários.

O objetivo é oferecer uma experiência extremamente simples para o cliente final, reduzindo ao máximo a quantidade de etapas necessárias para solicitar um atendimento.

Ao mesmo tempo, profissionais e administradores terão uma área autenticada com recursos adequados às suas responsabilidades, permitindo organizar a agenda, gerenciar solicitações, profissionais, serviços e clientes.

O StudioFy deverá ser desenvolvido desde o início considerando a possibilidade de atender múltiplos estabelecimentos, evitando uma arquitetura dependente de uma única empresa.

---

## 3. Problema

Pequenos salões, barbearias e profissionais de atendimento frequentemente organizam seus horários por meio de WhatsApp, mensagens, agendas manuais ou ferramentas que exigem processos complexos.

Isso pode gerar:

- conflitos de horários;
- dificuldade para visualizar a agenda;
- perda de solicitações;
- demora na confirmação;
- dificuldade para organizar diferentes profissionais;
- informações espalhadas em conversas;
- desistência de clientes quando o processo de agendamento é burocrático.

O StudioFy busca centralizar a organização da agenda sem criar uma experiência complicada para o cliente.

---

## 4. Princípios do Produto

### 4.1 Simplicidade para o cliente

O cliente não deverá precisar criar uma conta para solicitar um agendamento.

A experiência deve ser próxima à de serviços digitais simples de pedido:

```text
Acessar o estabelecimento
        ↓
Visualizar serviços
        ↓
Escolher serviço
        ↓
Escolher horário disponível
        ↓
Informar nome e telefone
        ↓
Solicitar agendamento
```

Quanto menor o atrito, melhor.

### 4.2 Personalização por estabelecimento

O StudioFy não deverá impor uma identidade visual única.

Cada estabelecimento poderá configurar sua própria apresentação, incluindo inicialmente:

- nome;
- logotipo;
- cores;
- serviços;
- profissionais;
- horários de atendimento.

O cliente deverá ter a sensação de estar acessando diretamente o estabelecimento, enquanto o StudioFy funciona como a plataforma tecnológica por trás.

### 4.3 Escalabilidade

O sistema deverá ser projetado como uma plataforma multi-estabelecimento.

Conceitualmente:

```text
StudioFy
│
├── Estabelecimento A
│   ├── Profissionais
│   ├── Serviços
│   ├── Clientes
│   └── Agendamentos
│
├── Estabelecimento B
│   ├── Profissionais
│   ├── Serviços
│   ├── Clientes
│   └── Agendamentos
│
└── Estabelecimento C
    ├── Profissionais
    ├── Serviços
    ├── Clientes
    └── Agendamentos
```

### 4.4 Minimização de dados

O sistema deverá solicitar e armazenar somente os dados necessários para o funcionamento do serviço.

Inicialmente, o cliente deverá informar:

- nome;
- telefone.

Não haverá cadastro obrigatório de cliente, senha ou email no MVP.

---

## 5. Perfis de Usuário

### 5.1 Cliente

O cliente terá uma experiência pública e simplificada.

Poderá:

- visualizar os serviços disponíveis;
- visualizar horários disponíveis;
- solicitar um agendamento;
- informar nome e telefone;
- consultar informações relacionadas ao próprio agendamento por mecanismos que forem definidos posteriormente;
- utilizar links para comunicação via WhatsApp.

O cliente não terá acesso à agenda completa do estabelecimento nem aos dados de outros clientes.

### 5.2 Profissional

A profissional terá uma área autenticada própria.

Poderá, conforme suas permissões:

- visualizar sua agenda;
- visualizar solicitações pendentes;
- confirmar agendamentos;
- recusar agendamentos;
- cancelar agendamentos;
- visualizar informações necessárias das clientes;
- utilizar o WhatsApp para comunicação;
- visualizar seus horários de atendimento.

### 5.3 Administrador

O administrador terá uma visão mais ampla do estabelecimento.

Poderá:

- visualizar a agenda geral;
- cadastrar profissionais;
- editar profissionais;
- ativar ou desativar profissionais;
- cadastrar serviços;
- editar serviços;
- ativar ou desativar serviços;
- configurar horários;
- gerenciar informações do estabelecimento;
- configurar identidade visual;
- acompanhar os agendamentos;
- visualizar clientes vinculados ao estabelecimento.

O administrador poderá ser, por exemplo, a proprietária do salão.

---

## 6. Agendamento

O fluxo principal será baseado em uma solicitação de agendamento.

### Fluxo

```text
Cliente
   ↓
Escolhe serviço
   ↓
Escolhe horário
   ↓
Informa nome + telefone
   ↓
Solicita agendamento
   ↓
Status: PENDENTE
   ↓
Profissional/Admin analisa
   ├── CONFIRMA
   └── RECUSA
```

Após a confirmação:

```text
CONFIRMADO
    ↓
Comunicação via WhatsApp
```

### Status previstos

- `PENDENTE`
- `CONFIRMADO`
- `RECUSADO`
- `CANCELADO`
- `CONCLUIDO`

As transições entre estados deverão ser controladas pelas regras de negócio e não apenas pela interface.

---

## 7. Escolha da Profissional

O cliente não deverá precisar escolher uma profissional durante o agendamento.

Essa decisão foi tomada para permitir que o mesmo fluxo funcione para estabelecimentos com:

- uma profissional;
- duas profissionais;
- várias profissionais.

A distribuição do atendimento ficará sob responsabilidade do estabelecimento.

Isso também permite que o sistema evolua posteriormente para regras mais sofisticadas de distribuição de agenda, caso sejam necessárias.

---

## 8. Serviços

Os serviços não serão definidos diretamente no código da aplicação.

Cada estabelecimento poderá cadastrar seus próprios serviços.

Um serviço deverá possuir inicialmente informações como:

- nome;
- descrição, se necessária;
- duração;
- preço, se aplicável;
- situação ativo/inativo.

Exemplos:

```text
Manicure
Pedicure
Design de sobrancelhas
Corte masculino
Barba
Alongamento de unhas
Limpeza de pele
```

O sistema não deverá depender de uma lista fixa de procedimentos.

Novos tipos de serviço deverão poder ser cadastrados pelo administrador sem necessidade de alteração no código.

A estrutura final dos serviços ainda poderá evoluir conforme o domínio seja melhor compreendido.

---

## 9. WhatsApp

O WhatsApp será utilizado como canal de comunicação, mas não haverá integração direta com a API do WhatsApp no MVP.

O sistema deverá gerar links utilizando mecanismos como `wa.me`, com mensagens previamente montadas.

Exemplo conceitual:

```text
[Enviar confirmação pelo WhatsApp]
```

Ao clicar no celular:

```text
StudioFy
   ↓
gera mensagem
   ↓
abre WhatsApp
   ↓
profissional envia a mensagem
```

O sistema será responsável por preparar a comunicação, mas o envio continuará sendo realizado manualmente pelo usuário.

Essa decisão reduz custos e complexidade na primeira versão.

---

## 10. Dados e Banco de Dados

O projeto utilizará:

- PostgreSQL;
- Neon Database.

O banco será responsável pelos dados de negócio da aplicação.

A autenticação será necessária para profissionais e administradores, enquanto o cliente final não terá autenticação obrigatória no MVP.

A modelagem deverá considerar o estabelecimento como uma entidade central, permitindo isolamento dos dados entre diferentes estabelecimentos.

---

## 11. Arquitetura Inicial

Stack planejada:

### Frontend

- React;
- TypeScript;
- aplicação mobile-first.

### Backend

- Node.js;
- TypeScript;
- Express;
- API REST.

### Banco

- PostgreSQL;
- Neon Database.

### Comunicação

- WhatsApp por links gerados pela aplicação.

A escolha de tecnologias ainda poderá ser refinada durante a fase de arquitetura técnica, mas React + TypeScript e Node.js + TypeScript são a direção atual do projeto.

---

## 12. Segurança

O sistema deverá diferenciar claramente:

- autenticação;
- autorização;
- dados públicos;
- dados privados do estabelecimento.

O cliente deverá acessar somente informações públicas necessárias para realizar um agendamento.

Profissionais deverão acessar apenas os recursos permitidos para sua função.

Administradores terão permissões ampliadas dentro do estabelecimento.

A segurança deverá ser aplicada no backend e no banco, não somente escondendo informações na interface.

---

## 13. Privacidade e LGPD

O StudioFy deverá seguir o princípio de minimização de dados.

No MVP, não serão coletadas informações desnecessárias do cliente.

Dados inicialmente previstos:

```text
Nome
Telefone
```

O projeto deverá posteriormente definir:

- finalidade do tratamento;
- política de privacidade;
- período de retenção;
- mecanismos de alteração/exclusão;
- controle de acesso;
- proteção dos dados;
- tratamento de logs.

Informações sensíveis, especialmente dados de saúde, não fazem parte do escopo inicial.

---

## 14. Experiência Mobile

Embora o StudioFy seja uma aplicação web, o projeto será desenvolvido com abordagem **mobile-first**.

O principal cenário esperado é:

```text
Cliente recebe/acessa o link
        ↓
Celular
        ↓
Escolhe serviço
        ↓
Escolhe horário
        ↓
Informa dados
        ↓
Solicita
```

A interface deverá priorizar:

- poucos passos;
- botões grandes;
- leitura fácil;
- carregamento rápido;
- navegação simples;
- boa experiência em telas pequenas.

A interface para profissionais e administradores também deverá funcionar em dispositivos móveis, sem impedir o uso em computadores.

---

## 15. MVP

A primeira versão deverá se concentrar no problema principal: **organização e solicitação de agendamentos**.

### Incluído no MVP

- estabelecimento;
- personalização básica;
- profissionais;
- serviços;
- horários de atendimento;
- clientes sem cadastro;
- solicitação de agendamento;
- status de agendamento;
- confirmação/recusa;
- agenda profissional;
- visão administrativa;
- geração de links para WhatsApp;
- autenticação de profissionais/administradores;
- PostgreSQL;
- interface mobile-first.

### Fora do MVP inicialmente

- integração oficial com WhatsApp;
- pagamentos;
- programa de fidelidade;
- estoque;
- financeiro;
- campanhas de marketing;
- chatbot;
- inteligência artificial;
- aplicativo nativo;
- funcionalidades complexas de CRM.

Essas funcionalidades poderão ser avaliadas posteriormente conforme o produto seja validado.

---

## 16. Direção de Evolução

O StudioFy deverá começar resolvendo um problema específico:

> **Organizar e simplificar o agendamento de negócios que trabalham com horários.**

Depois da validação, poderá evoluir para recursos como:

- lembretes;
- histórico de atendimentos;
- regras de cancelamento;
- relatórios;
- gestão de clientes;
- diferentes tipos de agenda;
- recorrência;
- pagamentos;
- fidelização;
- métricas do estabelecimento;
- integrações;
- outras ferramentas de gestão.

A evolução deverá ser guiada pelas necessidades reais dos estabelecimentos e não apenas pela quantidade de funcionalidades.

---

## 17. Decisões Atuais

| Item | Decisão |
|---|---|
| Nome | **StudioFy** |
| Modelo | Plataforma escalável |
| Público inicial | Salões, barbearias e estética |
| Cliente | Sem cadastro obrigatório |
| Dados do cliente | Nome + telefone inicialmente |
| Profissional | Possui acesso autenticado |
| Administrador | Possui acesso administrativo |
| Profissional escolhida pelo cliente | Não |
| Serviços | Cadastrados pelo estabelecimento |
| Personalização | Nome, logo, cores e configurações |
| Banco | PostgreSQL |
| Provider | Neon Database |
| Frontend | React + TypeScript |
| Backend | Node.js + TypeScript |
| API | REST |
| WhatsApp | Links `wa.me` |
| WhatsApp API | Fora do MVP |
| Mobile | Mobile-first |
| Multi-estabelecimento | Princípio arquitetural desde o início |
| Firebase | Fora da arquitetura atual |
| Cliente autenticado | Fora do MVP |

---

## 18. Princípio Central

O StudioFy deverá seguir uma ideia simples:

> **O cliente deve conseguir agendar com o mínimo de atrito, enquanto o estabelecimento ganha organização e controle sobre sua agenda.**

A tecnologia deve trabalhar para tornar esse processo simples, seguro e escalável.
