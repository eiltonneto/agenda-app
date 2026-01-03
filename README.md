# 📱 ClubApp

O **ClubApp** é uma solução completa para gestão de clubes e associações. O sistema integra uma **Agenda de Eventos** interativa e um **Controle Financeiro** (Entradas e Saídas) com cálculo de saldo em tempo real.

O projeto é estruturado como um monorepo, contendo tanto o servidor (Backend) quanto o aplicativo móvel (Mobile) no mesmo repositório.

---

## 🚀 Tecnologias Utilizadas

### Backend (API)
- **Node.js** & **Express** - Servidor e rotas.
- **Prisma ORM** - Gerenciamento de banco de dados (SQLite/PostgreSQL).
- **JWT (JSON Web Token)** - Autenticação segura.
- **CORS** - Segurança de acesso a recursos.

### Mobile (Frontend)
- **React Native** (via **Expo**) - Framework para desenvolvimento mobile.
- **React Native Calendars** - Componente de calendário interativo.
- **Date-FNS** - Manipulação robusta de datas.
- **Axios** - Comunicação com a API.

---

## 🛠️ Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- Aplicativo **Expo Go** no seu celular (Android ou iOS) ou um emulador configurado.

---

## 📦 Como Rodar o Projeto

Siga os passos abaixo para instalar e executar tanto o servidor quanto o aplicativo.

### 1. Configurando o Backend (Servidor)

Abra um terminal na raiz do projeto e execute:

```bash
# Entre na pasta do backend
cd backend

# Instale as dependências
npm install

# Gere o banco de dados (Primeira vez)
npx prisma migrate dev --name init

# Inicie o servidor
npm run dev
O servidor rodará por padrão em: http://localhost:3333 (ou no seu IP local).

2. Configurando o Mobile (App)
Abra outro terminal na raiz do projeto (mantenha o do backend rodando) e execute:

Bash

# Entre na pasta do app
cd clubapp-mobile

# Instale as dependências
npm install

# Inicie o Expo
npx expo start
Um QR Code aparecerá no terminal.

No Celular: Abra o app Expo Go e escaneie o QR Code.

No PC (Web): Pressione a tecla w para abrir no navegador.

⚙️ Configuração de IP (Importante)
Para que o Celular consiga conversar com o seu Computador, eles precisam estar na mesma rede Wi-Fi.

Descubra o IP do seu computador (no Windows, digite ipconfig no terminal e pegue o IPv4, ex: 192.168.0.10).

Vá no arquivo src/services/api.js dentro da pasta clubapp-mobile.

Atualize a baseURL com o seu IP:

JavaScript

const api = axios.create({
  baseURL: "[http://192.168.0.10:3333](http://192.168.0.10:3333)", // Substitua pelo seu IP
});
📱 Funcionalidades Principais
🗓️ Agenda
Visualização de calendário mensal.

"Bolinhas" indicativas nos dias que possuem eventos.

Criação, Edição e Exclusão de eventos.

Bloqueio de conflitos de horário.

💰 Financeiro
Dashboard com Saldo em Caixa (Realizado), Receitas e Despesas.

Lista de transações filtrada por mês.

Previsão Inteligente: Cards pendentes mostram qual será o saldo futuro se confirmados.

Categorização de despesas e receitas.

🤝 Como Contribuir
Faça um Fork do projeto.

Crie uma Branch para sua Feature (git checkout -b feature/MinhaFeature).

Faça o Commit (git commit -m 'Adicionando uma feature incrível').

Faça o Push (git push origin feature/MinhaFeature).

Abra um Pull Request.

Desenvolvido com 💙 por Eilton Neto.